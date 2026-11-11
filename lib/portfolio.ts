import { Prisma } from "@prisma/client";
import type { AssetType, Side } from "@/lib/schemas/transaction";

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export interface PortfolioTransaction {
  tickerName: string;
  assetType: AssetType;
  side: Side;
  quantity: Prisma.Decimal.Value;
  price: Prisma.Decimal.Value;
  executedAt: Date;
}

export interface ComputedHolding {
  ticker: string;
  type: AssetType;
  balance: Decimal;
  totalInvested: Decimal;
  averageCost: Decimal;
}

export interface HistoryEntry {
  date: string;
  invested: Decimal;
}

export interface ClosedCycle {
  ticker: string;
  type: AssetType;
  totalBought: Decimal;
  totalSold: Decimal;
  realizedPnl: Decimal;
}

interface Position {
  type: AssetType;
  balance: Decimal;
  totalInvested: Decimal;
  realizedPnl: Decimal;
  cycleBought: Decimal;
  cycleSold: Decimal;
  cycleRealized: Decimal;
  closedCycles: Omit<ClosedCycle, "ticker" | "type">[];
}

const sortChronologically = (transactions: PortfolioTransaction[]) =>
  [...transactions].sort((a, b) => {
    const diff = a.executedAt.getTime() - b.executedAt.getTime();
    if (diff !== 0) return diff;
    if (a.side === b.side) return 0;
    return a.side === "buy" ? -1 : 1;
  });

const positionFor = (
  positions: Map<string, Position>,
  tx: PortfolioTransaction,
) => {
  let position = positions.get(tx.tickerName);
  if (!position) {
    position = {
      type: tx.assetType,
      balance: new Decimal(0),
      totalInvested: new Decimal(0),
      realizedPnl: new Decimal(0),
      cycleBought: new Decimal(0),
      cycleSold: new Decimal(0),
      cycleRealized: new Decimal(0),
      closedCycles: [],
    };
    positions.set(tx.tickerName, position);
  }
  return position;
};

const applyTransaction = (position: Position, tx: PortfolioTransaction) => {
  const quantity = new Decimal(tx.quantity);
  if (tx.side === "buy") {
    position.balance = position.balance.plus(quantity);
    position.totalInvested = position.totalInvested.plus(
      quantity.times(tx.price),
    );
    position.cycleBought = position.cycleBought.plus(quantity.times(tx.price));
    return;
  }
  if (position.balance.lte(0)) return;
  const averageCost = position.totalInvested.div(position.balance);
  const soldQuantity = Decimal.min(quantity, position.balance);
  const pnl = soldQuantity.times(new Decimal(tx.price).minus(averageCost));
  position.realizedPnl = position.realizedPnl.plus(pnl);
  position.cycleRealized = position.cycleRealized.plus(pnl);
  position.cycleSold = position.cycleSold.plus(quantity.times(tx.price));
  position.balance = position.balance.minus(quantity);
  position.totalInvested = position.totalInvested.minus(
    quantity.times(averageCost),
  );
  if (position.balance.lte(0)) {
    position.balance = new Decimal(0);
    position.totalInvested = new Decimal(0);
    position.closedCycles.push({
      totalBought: position.cycleBought,
      totalSold: position.cycleSold,
      realizedPnl: position.cycleRealized,
    });
    position.cycleBought = new Decimal(0);
    position.cycleSold = new Decimal(0);
    position.cycleRealized = new Decimal(0);
  }
};

export const computeHoldings = (
  transactions: PortfolioTransaction[],
): ComputedHolding[] => {
  const positions = new Map<string, Position>();

  for (const tx of sortChronologically(transactions)) {
    applyTransaction(positionFor(positions, tx), tx);
  }

  return Array.from(positions.entries())
    .filter(([, position]) => position.balance.gt(0))
    .map(([ticker, position]) => ({
      ticker,
      type: position.type,
      balance: position.balance,
      totalInvested: position.totalInvested,
      averageCost: position.totalInvested.div(position.balance),
    }));
};

export const computeRealizedPnl = (
  transactions: PortfolioTransaction[],
): Map<string, Decimal> => {
  const positions = new Map<string, Position>();

  for (const tx of sortChronologically(transactions)) {
    applyTransaction(positionFor(positions, tx), tx);
  }

  return new Map(
    Array.from(positions.entries()).map(([ticker, position]) => [
      ticker,
      position.realizedPnl,
    ]),
  );
};

export const computeClosedCycles = (
  transactions: PortfolioTransaction[],
): ClosedCycle[] => {
  const positions = new Map<string, Position>();

  for (const tx of sortChronologically(transactions)) {
    applyTransaction(positionFor(positions, tx), tx);
  }

  return Array.from(positions.entries()).flatMap(([ticker, position]) =>
    position.closedCycles.map((cycle) => ({
      ticker,
      type: position.type,
      ...cycle,
    })),
  );
};

export const computeHistory = (
  transactions: PortfolioTransaction[],
): HistoryEntry[] => {
  const positions = new Map<string, Position>();
  const byDate = new Map<string, Decimal>();

  for (const tx of sortChronologically(transactions)) {
    applyTransaction(positionFor(positions, tx), tx);

    let invested = new Decimal(0);
    for (const p of positions.values()) invested = invested.plus(p.totalInvested);

    byDate.set(tx.executedAt.toISOString().split("T")[0], invested);
  }

  return Array.from(byDate.entries()).map(([date, invested]) => ({
    date,
    invested,
  }));
};
