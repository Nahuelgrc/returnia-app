import { Prisma } from "@prisma/client";
import { prisma as db } from "@/lib/db";
import {
  computeClosedCycles,
  computeHistory,
  computeHoldings,
  computeRealizedPnl,
} from "@/lib/portfolio";
import type {
  ClosedPosition,
  Holding,
  HistoryPoint,
  TransactionRecord,
} from "@/lib/types";

export async function getPortfolioData(userId: string): Promise<{
  holdings: Holding[];
  closedPositions: ClosedPosition[];
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
  }));

  const closedPositions = computeClosedCycles(rawTransactions)
    .map((cycle) => ({
      ticker: cycle.ticker,
      type: cycle.type,
      totalBought: cycle.totalBought.toDecimalPlaces(2).toNumber(),
      totalSold: cycle.totalSold.toDecimalPlaces(2).toNumber(),
      realizedPnl: cycle.realizedPnl.toDecimalPlaces(2).toNumber(),
    }))
    .sort((a, b) => b.realizedPnl - a.realizedPnl);

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
    closedPositions,
    history,
    transactions,
    realizedPnl: totalRealized.toDecimalPlaces(2).toNumber(),
  };
}
