"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";

export async function getUserPortfolio() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const transactions = await db.transaction.findMany({
      where: { userId: session.user.id },
    });

    const holdingsMap = new Map();

    // Sort transactions by execution date to ensure chronological order for cost basis
    const sortedTransactions = [...transactions].sort(
      (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
    );

    sortedTransactions.forEach((tx) => {
      const { tickerName, tickerProvider, assetType, side, quantity, price } = tx;

      if (!holdingsMap.has(tickerName)) {
        holdingsMap.set(tickerName, {
          name: tickerName,
          ticker: tickerName,
          tickerProvider,
          type: assetType,
          balance: 0,
          totalInvested: 0,
        });
      }

      const holding = holdingsMap.get(tickerName);
      const qtyNum = Number(quantity);
      const priceNum = Number(price);

      if (side === "buy") {
        holding.balance += qtyNum;
        holding.totalInvested += qtyNum * priceNum;
      } else if (side === "sell") {
        if (holding.balance > 0) {
          const avgCost = holding.totalInvested / holding.balance;
          holding.balance -= qtyNum;
          // Deduct from totalInvested proportionally to the sold amount
          holding.totalInvested -= qtyNum * avgCost;
          if (holding.balance <= 0) {
            holding.balance = 0;
            holding.totalInvested = 0;
          }
        }
      }
    });

    const assets = Array.from(holdingsMap.values())
      .filter((h) => h.balance > 0)
      .map((h, i) => {
        const avgCost = h.balance > 0 ? h.totalInvested / h.balance : 0;
        return {
          id: i + 1,
          name: h.name,
          ticker: h.ticker,
          tickerProvider: h.tickerProvider,
          averageCost: avgCost,
          price: 0, 
          balance: h.balance.toString(),
          value: 0, 
          change: 0, 
          icon: h.type === "crypto" ? "currency_bitcoin" : "show_chart",
          iconColor: "text-slate-500",
          bgColor: "bg-slate-500/10",
          type: h.type as "crypto" | "stock",
        };
      });

    return { assets };
  } catch (error) {
    console.error("Failed to fetch portfolio:", error);
    return { error: "Error interno del servidor al obtener portafolio" };
  }
}

export async function getPortfolioHistory() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", history: [] };

  try {
    const transactions = await db.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { executedAt: "asc" },
    });

    if (transactions.length === 0) return { history: [] };

    // Build a timeline: at each transaction, compute cumulative invested value
    let cumulativeInvested = 0;
    const timelinePoints: { date: Date; value: number }[] = [];

    transactions.forEach((tx) => {
      const qty = Number(tx.quantity);
      const price = Number(tx.price);

      if (tx.side === "buy") {
        cumulativeInvested += qty * price;
      } else {
        cumulativeInvested -= qty * price;
        if (cumulativeInvested < 0) cumulativeInvested = 0;
      }

      timelinePoints.push({
        date: tx.executedAt,
        value: Math.round(cumulativeInvested * 100) / 100,
      });
    });

    // Group by date string (collapse multiple transactions on same day)
    const groupedByDate = new Map<string, number>();
    timelinePoints.forEach((point) => {
      const dateKey = point.date.toISOString().split("T")[0]; // YYYY-MM-DD
      groupedByDate.set(dateKey, point.value); // Last value of the day wins
    });

    const history = Array.from(groupedByDate.entries()).map(([date, value]) => ({
      date,
      value,
    }));

    return { history };
  } catch (error) {
    console.error("Failed to fetch portfolio history:", error);
    return { error: "Error al obtener historial", history: [] };
  }
}
