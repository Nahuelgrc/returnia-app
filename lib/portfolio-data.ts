import { prisma as db } from "@/lib/db";
import { computeHistory, computeHoldings } from "@/lib/portfolio";
import type { Holding, HistoryPoint } from "@/lib/types";

export async function getPortfolioData(userId: string): Promise<{
  holdings: Holding[];
  history: HistoryPoint[];
}> {
  const transactions = await db.transaction.findMany({
    where: { userId },
    select: {
      tickerName: true,
      assetType: true,
      side: true,
      quantity: true,
      price: true,
      executedAt: true,
    },
  });

  const holdings = computeHoldings(transactions).map((h) => ({
    ticker: h.ticker,
    type: h.type,
    balance: h.balance.toFixed(),
    averageCost: h.averageCost.toNumber(),
  }));

  const history = computeHistory(transactions).map((entry) => ({
    date: entry.date,
    value: entry.invested.toDecimalPlaces(2).toNumber(),
  }));

  return { holdings, history };
}
