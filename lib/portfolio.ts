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

interface Position {
  type: AssetType;
  balance: Decimal;
  totalInvested: Decimal;
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
    return;
  }
  if (position.balance.lte(0)) return;
  const averageCost = position.totalInvested.div(position.balance);
  position.balance = position.balance.minus(quantity);
  position.totalInvested = position.totalInvested.minus(
    quantity.times(averageCost),
  );
  if (position.balance.lte(0)) {
    position.balance = new Decimal(0);
    position.totalInvested = new Decimal(0);
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
