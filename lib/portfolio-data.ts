import { Prisma } from "@prisma/client";
import { prisma as db } from "@/lib/db";
import {
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
    realizedPnl: (realizedByTicker.get(h.ticker) ?? new Prisma.Decimal(0))
      .toDecimalPlaces(2)
      .toNumber(),
  }));

  const heldTickers = new Set(holdings.map((h) => h.ticker));
  const closedByTicker = new Map<
    string,
    { type: ClosedPosition["type"]; bought: Prisma.Decimal; sold: Prisma.Decimal }
  >();
  for (const t of rawTransactions) {
    if (heldTickers.has(t.tickerName)) continue;
    const entry = closedByTicker.get(t.tickerName) ?? {
      type: t.assetType,
      bought: new Prisma.Decimal(0),
      sold: new Prisma.Decimal(0),
    };
    const amount = new Prisma.Decimal(t.quantity).times(t.price);
    if (t.side === "buy") entry.bought = entry.bought.plus(amount);
    else entry.sold = entry.sold.plus(amount);
    closedByTicker.set(t.tickerName, entry);
  }
  const closedPositions = Array.from(closedByTicker.entries())
    .map(([ticker, entry]) => ({
      ticker,
      type: entry.type,
      totalBought: entry.bought.toDecimalPlaces(2).toNumber(),
      totalSold: entry.sold.toDecimalPlaces(2).toNumber(),
      realizedPnl: (realizedByTicker.get(ticker) ?? new Prisma.Decimal(0))
        .toDecimalPlaces(2)
        .toNumber(),
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
