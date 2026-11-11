import { Prisma } from "@prisma/client";
import { prisma as db } from "@/lib/db";
import {
  computeHistory,
  computeHoldings,
  computeRealizedPnl,
} from "@/lib/portfolio";
import type { Holding, HistoryPoint, TransactionRecord } from "@/lib/types";

export async function getPortfolioData(userId: string): Promise<{
  holdings: Holding[];
  history: HistoryPoint[];
  transactions: TransactionRecord[];
  realizedPnl: number;
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

  const realizedByTicker = computeRealizedPnl(rawTransactions);
  let totalRealized = new Prisma.Decimal(0);
  for (const value of realizedByTicker.values()) {
    totalRealized = totalRealized.plus(value);
  }

  const holdings = computeHoldings(rawTransactions).map((h) => ({
    ticker: h.ticker,
    type: h.type,
    balance: h.balance.toFixed(),
    averageCost: h.averageCost.toNumber(),
    realizedPnl: (realizedByTicker.get(h.ticker) ?? new Prisma.Decimal(0))
      .toDecimalPlaces(2)
      .toNumber(),
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

  return {
    holdings,
    history,
    transactions,
    realizedPnl: totalRealized.toDecimalPlaces(2).toNumber(),
  };
}
