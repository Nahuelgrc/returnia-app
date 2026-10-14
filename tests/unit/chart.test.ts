import { describe, expect, it } from "vitest";
import { PERIODS, filterHistoryByPeriod } from "@/lib/chart";

const now = new Date("2024-06-30T12:00:00Z");
const history = [
  { date: "2023-01-01", value: 10 },
  { date: "2024-06-01", value: 20 },
  { date: "2024-06-29", value: 30 },
];

describe("filterHistoryByPeriod", () => {
  it("exposes the expected periods", () => {
    expect(PERIODS).toEqual(["1D", "1W", "1M", "1Y", "ALL"]);
  });

  it("ALL returns everything", () => {
    expect(filterHistoryByPeriod(history, "ALL", now)).toEqual(history);
  });

  it("empty history returns empty", () => {
    expect(filterHistoryByPeriod([], "1M", now)).toEqual([]);
  });

  it("1W filters the last week", () => {
    expect(filterHistoryByPeriod(history, "1W", now)).toEqual([history[2]]);
  });

  it("1M filters the last 30 days", () => {
    expect(filterHistoryByPeriod(history, "1M", now)).toEqual([history[1], history[2]]);
  });

  it("1Y excludes points older than a year", () => {
    expect(filterHistoryByPeriod(history, "1Y", now)).toEqual([history[1], history[2]]);
  });

  it("with no points in range uses the last previous value at the cutoff", () => {
    expect(filterHistoryByPeriod([{ date: "2024-01-01", value: 5 }], "1D", now)).toEqual([
      { date: "2024-06-29", value: 5 },
    ]);
  });
});
