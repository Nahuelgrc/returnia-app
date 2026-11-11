"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { firstNegativeBalance } from "@/lib/transaction-timeline";
import { rateLimit } from "@/lib/rate-limit";
import {
  MAX_IMPORT_BYTES,
  parseTransactionsCsv,
  type ImportResult,
} from "@/lib/transactions-csv";
import {
  tickerSchema,
  transactionSchema,
  type TransactionPayload,
} from "@/lib/schemas/transaction";

const formatBalance = (balance: Prisma.Decimal) =>
  balance.toNumber().toLocaleString("en-US", { maximumFractionDigits: 8 });

const runSerializable = async <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const conflict =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!conflict || attempt >= 2) throw e;
    }
  }
};

const idSchema = z.string().trim().min(1).max(64);

export const addTransaction = async (input: TransactionPayload) => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid data" };
  }
  const data = parsed.data;

  try {
    const result = await runSerializable(
      async (tx) => {
        if (data.type === "sell") {
          const existing = await tx.transaction.findMany({
            where: { userId, tickerName: data.ticker },
            select: { side: true, quantity: true, executedAt: true },
          });

          const negative = firstNegativeBalance([
            ...existing,
            { side: "sell", quantity: data.quantity, executedAt: data.date },
          ]);
          if (negative) {
            return {
              error: `You cannot sell ${data.quantity} ${data.ticker} on that date: the balance would be negative (${formatBalance(negative)}).`,
            };
          }
        }

        const created = await tx.transaction.create({
          data: {
            userId,
            assetType: data.assetType,
            tickerName: data.ticker,
            side: data.type,
            quantity: data.quantity,
            price: data.price,
            executedAt: data.date,
            comments: data.comments || null,
          },
        });
        return { transaction: created };
      },
    );

    if ("error" in result) return { error: result.error };

    revalidatePath("/dashboard");

    const serializedTransaction = {
      ...result.transaction,
      quantity: Number(result.transaction.quantity),
      price: Number(result.transaction.price),
    };

    return { success: true, transaction: serializedTransaction };
  } catch (error) {
    console.error("Failed to add transaction:", error);
    return { error: "Error saving the transaction" };
  }
};

const negativeBalanceError = (ticker: string, balance: Prisma.Decimal) =>
  `This change would make the ${ticker} balance negative (${formatBalance(balance)}).`;

export const updateTransaction = async (id: string, input: TransactionPayload) => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Invalid transaction" };
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid data" };
  }
  const data = parsed.data;

  try {
    const result = await runSerializable(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id: parsedId.data, userId },
        select: { tickerName: true },
      });
      if (!current) return { error: "Transaction not found" };

      const tickers = Array.from(new Set([current.tickerName, data.ticker]));
      const others = await tx.transaction.findMany({
        where: {
          userId,
          tickerName: { in: tickers },
          NOT: { id: parsedId.data },
        },
        select: {
          tickerName: true,
          side: true,
          quantity: true,
          executedAt: true,
        },
      });

      for (const ticker of tickers) {
        const entries = others.filter((t) => t.tickerName === ticker);
        if (ticker === data.ticker) {
          entries.push({
            tickerName: ticker,
            side: data.type,
            quantity: new Prisma.Decimal(data.quantity),
            executedAt: data.date,
          });
        }
        const negative = firstNegativeBalance(entries);
        if (negative) return { error: negativeBalanceError(ticker, negative) };
      }

      const updated = await tx.transaction.update({
        where: { id: parsedId.data, userId },
        data: {
          assetType: data.assetType,
          tickerName: data.ticker,
          side: data.type,
          quantity: data.quantity,
          price: data.price,
          executedAt: data.date,
          comments: data.comments || null,
        },
      });
      return { transaction: updated };
    });

    if ("error" in result) return { error: result.error };

    revalidatePath("/dashboard");

    return {
      success: true,
      transaction: {
        ...result.transaction,
        quantity: Number(result.transaction.quantity),
        price: Number(result.transaction.price),
      },
    };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { error: "Error saving the transaction" };
  }
};

export const deleteTransaction = async (id: string) => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Invalid transaction" };

  try {
    const result = await runSerializable(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id: parsedId.data, userId },
        select: { tickerName: true },
      });
      if (!current) return { error: "Transaction not found" };

      const others = await tx.transaction.findMany({
        where: {
          userId,
          tickerName: current.tickerName,
          NOT: { id: parsedId.data },
        },
        select: { side: true, quantity: true, executedAt: true },
      });
      const negative = firstNegativeBalance(others);
      if (negative) {
        return { error: negativeBalanceError(current.tickerName, negative) };
      }

      await tx.transaction.deleteMany({ where: { id: parsedId.data, userId } });
      return { success: true as const };
    });

    if ("error" in result) return { error: result.error };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { error: "Error deleting the transaction" };
  }
};

export const importTransactions = async (content: string): Promise<ImportResult> => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  if (typeof content !== "string") return { error: "Invalid file" };
  if (Buffer.byteLength(content) > MAX_IMPORT_BYTES) {
    return { error: `The file is too large (max ${MAX_IMPORT_BYTES / 1024} KB)` };
  }

  const limit = rateLimit(`action:import:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return { error: `Too many imports. Try again in ${limit.retryAfterSeconds} seconds.` };
  }

  const parsed = parseTransactionsCsv(content);
  if ("error" in parsed) return { error: parsed.error };
  if ("errors" in parsed) return { errors: parsed.errors };
  const { transactions } = parsed;
  const tickers = Array.from(new Set(transactions.map((t) => t.ticker)));

  try {
    const result = await runSerializable(async (tx) => {
      const existing = await tx.transaction.findMany({
        where: { userId, tickerName: { in: tickers } },
        select: { tickerName: true, side: true, quantity: true, executedAt: true },
      });

      for (const ticker of tickers) {
        const negative = firstNegativeBalance([
          ...existing.filter((t) => t.tickerName === ticker),
          ...transactions
            .filter((t) => t.ticker === ticker)
            .map((t) => ({ side: t.type, quantity: t.quantity, executedAt: t.date })),
        ]);
        if (negative) {
          return {
            error: `Importing would make the ${ticker} balance negative (${formatBalance(negative)}).`,
          };
        }
      }

      const created = await tx.transaction.createMany({
        data: transactions.map((t) => ({
          userId,
          assetType: t.assetType,
          tickerName: t.ticker,
          side: t.type,
          quantity: t.quantity,
          price: t.price,
          executedAt: t.date,
          comments: t.comments || null,
        })),
      });
      return { imported: created.count };
    });

    if (result.error !== undefined) return { error: result.error };

    revalidatePath("/dashboard");
    return { success: true, imported: result.imported };
  } catch (error) {
    console.error("Failed to import transactions:", error);
    return { error: "Error importing the transactions" };
  }
};

export const deleteAssetTransactions =async (input: string) => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsedTicker = tickerSchema.safeParse(input);
  if (!parsedTicker.success) return { error: "Invalid ticker" };
  const tickerName = parsedTicker.data;

  try {
    await db.transaction.deleteMany({
      where: {
        userId: session.user.id,
        tickerName,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transactions:", error);
    return { error: "Error deleting the transactions" };
  }
};
