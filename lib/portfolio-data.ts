import { prisma as db } from "@/lib/db";
import { computeHistory, computeHoldings } from "@/lib/portfolio";
import type { Holding, HistoryPoint, TransactionRecord } from "@/lib/types";

export async function getPortfolioData(userId: string): Promise<{
  holdings: Holding[];
  history: HistoryPoint[];
  transactions: TransactionRecord[];
}> {
  const rawTransactions = await db.transaction.findMany({
    where: { userId },
    select: {
      id: true,
      tickerName: true,
      assetType: true,
      side: true,
      quantity: true,
      price: true,
      comments: true,
      executedAt: true,
    },
    orderBy: { executedAt: "desc" },
  });

  const holdings = computeHoldings(rawTransactions).map((h) => ({
    ticker: h.ticker,
    type: h.type,
    balance: h.balance.toFixed(),
    averageCost: h.averageCost.toNumber(),
  }));

  const history = computeHistory(rawTransactions).map((entry) => ({
    date: entry.date,
    value: entry.invested.toDecimalPlaces(2).toNumber(),
  }));

  const transactions = rawTransactions.map((t) => ({
    id: t.id,
    ticker: t.tickerName,
    assetType: t.assetType,
    side: t.side,
    quantity: Number(t.quantity),
    price: Number(t.price),
    comments: t.comments,
    executedAt: t.executedAt.toISOString(),
  }));

  return { holdings, history, transactions };
}
