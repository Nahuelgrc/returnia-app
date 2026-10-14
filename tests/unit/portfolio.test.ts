import { describe, expect, it } from "vitest";
import {
  computeHistory,
  computeHoldings,
  type PortfolioTransaction,
} from "@/lib/portfolio";

const tx = (
  side: "buy" | "sell",
  quantity: string | number,
  price: string | number,
  at: string,
  tickerName = "BTC",
  assetType: "crypto" | "stock" = "crypto",
): PortfolioTransaction => ({
  tickerName,
  assetType,
  side,
  quantity,
  price,
  executedAt: new Date(at),
});

describe("computeHoldings", () => {
  it("returns empty without transactions", () => {
    expect(computeHoldings([])).toEqual([]);
  });

  it("computes average cost with several buys", () => {
    const [h] = computeHoldings([
      tx("buy", 1, 100, "2024-01-01T00:00:00Z"),
      tx("buy", 3, 200, "2024-01-02T00:00:00Z"),
    ]);
    expect(h.balance.toFixed()).toBe("4");
    expect(h.totalInvested.toFixed()).toBe("700");
    expect(h.averageCost.toFixed()).toBe("175");
    expect(h.ticker).toBe("BTC");
    expect(h.type).toBe("crypto");
  });

  it("a partial sell keeps the average cost", () => {
    const [h] = computeHoldings([
      tx("buy", 2, 100, "2024-01-01T00:00:00Z"),
      tx("buy", 2, 200, "2024-01-02T00:00:00Z"),
      tx("sell", 1, 999, "2024-01-03T00:00:00Z"),
    ]);
    expect(h.balance.toFixed()).toBe("3");
    expect(h.averageCost.toFixed()).toBe("150");
    expect(h.totalInvested.toFixed()).toBe("450");
  });

  it("a full sell removes the position", () => {
    expect(
      computeHoldings([
        tx("buy", 2, 100, "2024-01-01T00:00:00Z"),
        tx("sell", 2, 300, "2024-01-02T00:00:00Z"),
      ]),
    ).toEqual([]);
  });

  it("rebuying after a full sell starts with a new cost", () => {
    const [h] = computeHoldings([
      tx("buy", 2, 100, "2024-01-01T00:00:00Z"),
      tx("sell", 2, 300, "2024-01-02T00:00:00Z"),
      tx("buy", 1, 50, "2024-01-03T00:00:00Z"),
    ]);
    expect(h.averageCost.toFixed()).toBe("50");
    expect(h.balance.toFixed()).toBe("1");
  });

  it("sorts chronologically even if they arrive unordered", () => {
    const [h] = computeHoldings([
      tx("sell", 1, 10, "2024-01-02T00:00:00Z"),
      tx("buy", 2, 100, "2024-01-01T00:00:00Z"),
    ]);
    expect(h.balance.toFixed()).toBe("1");
    expect(h.totalInvested.toFixed()).toBe("100");
  });

  it("at the same instant the buy is applied before the sell", () => {
    const [h] = computeHoldings([
      tx("sell", 1, 10, "2024-01-01T00:00:00Z"),
      tx("buy", 2, 100, "2024-01-01T00:00:00Z"),
    ]);
    expect(h.balance.toFixed()).toBe("1");
  });

  it("ignores sells on a zero balance", () => {
    expect(computeHoldings([tx("sell", 1, 10, "2024-01-01T00:00:00Z")])).toEqual([]);
  });

  it("selling more than the balance leaves the position at zero", () => {
    expect(
      computeHoldings([
        tx("buy", 1, 10, "2024-01-01T00:00:00Z"),
        tx("sell", 5, 10, "2024-01-02T00:00:00Z"),
      ]),
    ).toEqual([]);
  });

  it("keeps independent positions per ticker", () => {
    const holdings = computeHoldings([
      tx("buy", 1, 100, "2024-01-01T00:00:00Z", "BTC", "crypto"),
      tx("buy", 10, 5, "2024-01-01T00:00:00Z", "AAPL", "stock"),
    ]);
    expect(holdings.map((h) => `${h.ticker}:${h.type}`).sort()).toEqual([
      "AAPL:stock",
      "BTC:crypto",
    ]);
  });

  it("does not lose precision with decimals", () => {
    const [h] = computeHoldings([
      tx("buy", "0.1", "0.2", "2024-01-01T00:00:00Z"),
      tx("buy", "0.2", "0.1", "2024-01-02T00:00:00Z"),
    ]);
    expect(h.balance.toFixed()).toBe("0.3");
    expect(h.totalInvested.toFixed()).toBe("0.04");
  });

  it("accepts quantities with 8 decimals", () => {
    const [h] = computeHoldings([
      tx("buy", "0.00000001", "50000", "2024-01-01T00:00:00Z"),
    ]);
    expect(h.balance.toFixed()).toBe("0.00000001");
    expect(h.averageCost.toFixed()).toBe("50000");
  });
});

describe("computeHistory", () => {
  it("returns empty without transactions", () => {
    expect(computeHistory([])).toEqual([]);
  });

  it("accumulates the invested amount by date", () => {
    const history = computeHistory([
      tx("buy", 1, 100, "2024-01-01T10:00:00Z"),
      tx("buy", 1, 300, "2024-01-02T10:00:00Z"),
    ]);
    expect(history.map((h) => [h.date, h.invested.toFixed()])).toEqual([
      ["2024-01-01", "100"],
      ["2024-01-02", "400"],
    ]);
  });

  it("a sell reduces the invested amount at the average cost", () => {
    const history = computeHistory([
      tx("buy", 2, 100, "2024-01-01T10:00:00Z"),
      tx("sell", 1, 500, "2024-01-02T10:00:00Z"),
    ]);
    expect(history[1].invested.toFixed()).toBe("100");
  });

  it("a full sell leaves the invested amount at zero", () => {
    const history = computeHistory([
      tx("buy", 2, 100, "2024-01-01T10:00:00Z"),
      tx("sell", 2, 500, "2024-01-02T10:00:00Z"),
    ]);
    expect(history[1].invested.toFixed()).toBe("0");
  });

  it("several transactions on the same day collapse into the last value", () => {
    const history = computeHistory([
      tx("buy", 1, 100, "2024-01-01T08:00:00Z"),
      tx("buy", 1, 100, "2024-01-01T20:00:00Z"),
    ]);
    expect(history).toHaveLength(1);
    expect(history[0].invested.toFixed()).toBe("200");
  });

  it("sums several tickers", () => {
    const history = computeHistory([
      tx("buy", 1, 100, "2024-01-01T10:00:00Z", "BTC", "crypto"),
      tx("buy", 2, 50, "2024-01-02T10:00:00Z", "AAPL", "stock"),
    ]);
    expect(history[1].invested.toFixed()).toBe("200");
  });
});
