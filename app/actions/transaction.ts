"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const addTransaction = async (data: {
  type: "buy" | "sell";
  assetType: "crypto" | "stock";
  ticker: string;
  quantity: number;
  price: number;
  date: string;
  comments?: string;
}) => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    // Validate sell quantity against current holdings
    if (data.type === "sell") {
      const existingTransactions = await db.transaction.findMany({
        where: {
          userId: session.user.id,
          tickerName: data.ticker,
        },
        select: { side: true, quantity: true },
      });

      const currentBalance = existingTransactions.reduce((balance, tx) => {
        const qty = Number(tx.quantity);
        return tx.side === "buy" ? balance + qty : balance - qty;
      }, 0);

      if (data.quantity > currentBalance) {
        return {
          error: `No podés vender ${data.quantity} ${data.ticker}. Tu balance actual es ${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${data.ticker}.`,
        };
      }
    }

    const transaction = await db.transaction.create({
      data: {
        userId: session.user.id,
        assetType: data.assetType,
        tickerName: data.ticker,
        tickerProvider:
          data.assetType === "crypto"
            ? `BINANCE:${data.ticker}USDT`
            : data.ticker,
        side: data.type,
        quantity: data.quantity,
        price: data.price,
        executedAt: new Date(data.date),
        comments: data?.comments || "",
      },
    });

    revalidatePath("/dashboard");
    
    // Convert Prisma Decimal objects to standard JS numbers for Client Components
    const serializedTransaction = {
      ...transaction,
      quantity: Number(transaction.quantity),
      price: Number(transaction.price),
    };

    return { success: true, transaction: serializedTransaction };
  } catch (error: any) {
    console.error("Failed to add transaction:", error);
    return {
      error: `Error al guardar la transacción: ${error?.message || error}`,
    };
  }
};

export const deleteAssetTransactions = async (tickerName: string) => {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await db.transaction.deleteMany({
      where: {
        userId: session.user.id,
        tickerName,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete transactions:", error);
    return {
      error: `Error al eliminar las transacciones: ${error?.message || error}`,
    };
  }
};
