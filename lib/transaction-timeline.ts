import { Prisma } from "@prisma/client";
import type { Side } from "@/lib/schemas/transaction";

export interface TimelineEntry {
  side: Side;
  quantity: Prisma.Decimal.Value;
  executedAt: Date;
}

export const firstNegativeBalance = (entries: TimelineEntry[]) => {
  const timeline = [...entries].sort((a, b) => {
    const diff = a.executedAt.getTime() - b.executedAt.getTime();
    if (diff !== 0) return diff;
    if (a.side === b.side) return 0;
    return a.side === "buy" ? -1 : 1;
  });

  let balance = new Prisma.Decimal(0);
  for (const t of timeline) {
    balance =
      t.side === "buy"
        ? balance.plus(t.quantity)
        : balance.minus(t.quantity);
    if (balance.isNegative()) return balance;
  }
  return null;
};
