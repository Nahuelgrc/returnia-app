import type { HistoryPoint } from "@/lib/types";

export const PERIODS = ["1D", "1W", "1M", "1Y", "ALL"] as const;
export type Period = (typeof PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_DAYS: Record<Exclude<Period, "ALL">, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "1Y": 365,
};

export const filterHistoryByPeriod = (
  history: HistoryPoint[],
  period: Period,
  now: Date = new Date(),
): HistoryPoint[] => {
  if (history.length === 0 || period === "ALL") return history;

  const cutoff = new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS);
  const filtered = history.filter((p) => new Date(p.date) >= cutoff);
  if (filtered.length > 0) return filtered;

  const lastBefore = [...history]
    .reverse()
    .find((p) => new Date(p.date) < cutoff);
  return lastBefore
    ? [{ date: cutoff.toISOString().split("T")[0], value: lastBefore.value }]
    : [];
};
