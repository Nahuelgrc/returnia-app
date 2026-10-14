"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  tickerSchema,
  transactionSchema,
  type TransactionPayload,
} from "@/lib/schemas/transaction";

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
    const run = () =>
      db.$transaction(
      async (tx) => {
        if (data.type === "sell") {
          const existing = await tx.transaction.findMany({
            where: { userId, tickerName: data.ticker },
            select: { side: true, quantity: true, executedAt: true },
          });

          const timeline = [
            ...existing.map((t) => ({
              side: t.side,
              qty: t.quantity,
              at: t.executedAt.getTime(),
            })),
            {
              side: "sell" as const,
              qty: new Prisma.Decimal(data.quantity),
              at: data.date.getTime(),
            },
          ].sort((a, b) =>
            a.at !== b.at ? a.at - b.at : a.side === "buy" ? -1 : 1,
          );

          let balance = new Prisma.Decimal(0);
          for (const t of timeline) {
            balance = t.side === "buy" ? balance.plus(t.qty) : balance.minus(t.qty);
            if (balance.isNegative()) {
              return {
                error: `You cannot sell ${data.quantity} ${data.ticker} on that date: the balance would be negative (${balance.toNumber().toLocaleString("en-US", { maximumFractionDigits: 8 })}).`,
              };
            }
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
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    let result: Awaited<ReturnType<typeof run>>;
    for (let attempt = 0; ; attempt++) {
      try {
        result = await run();
        break;
      } catch (e) {
        const conflict =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
        if (!conflict || attempt >= 2) throw e;
      }
    }

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

export const deleteAssetTransactions = async (input: string) => {
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
