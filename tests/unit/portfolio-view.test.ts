import { describe, expect, it } from "vitest";
import { buildAssets, getProviderSymbols, totalValue } from "@/lib/portfolio-view";
import type { Holding, Quote } from "@/lib/types";

const btc: Holding = { ticker: "BTC", type: "crypto", balance: "2", averageCost: 100 };
const aapl: Holding = { ticker: "AAPL", type: "stock", balance: "10", averageCost: 50 };

const quotes: Quote[] = [
  { symbol: "BINANCE:BTCUSDT", price: 150 },
  { symbol: "AAPL", price: 40 },
];

describe("getProviderSymbols", () => {
  it("maps, deduplicates and sorts", () => {
    expect(getProviderSymbols([btc, aapl, btc])).toEqual(["AAPL", "BINANCE:BTCUSDT"]);
  });

  it("returns empty without holdings", () => {
    expect(getProviderSymbols([])).toEqual([]);
  });
});

describe("buildAssets", () => {
  it("computes price, value and change", () => {
    const [a, b] = buildAssets([btc, aapl], quotes);
    expect(a).toMatchObject({ name: "BTC", price: 150, value: 300, change: 50 });
    expect(b).toMatchObject({ price: 40, value: 400, change: -20 });
  });

  it("uses price 0 and change 0 without a quote", () => {
    const [a] = buildAssets([btc], []);
    expect(a).toMatchObject({ price: 0, value: 0, change: 0 });
  });

  it("quote without price counts as 0", () => {
    const [a] = buildAssets([btc], [{ symbol: "BINANCE:BTCUSDT" }]);
    expect(a.price).toBe(0);
    expect(a.change).toBe(0);
  });

  it("change 0 if the average cost is 0", () => {
    const [a] = buildAssets([{ ...btc, averageCost: 0 }], [
      { symbol: "BINANCE:BTCUSDT", price: 10 },
    ]);
    expect(a.change).toBe(0);
  });

  it("supports decimal balances", () => {
    const [a] = buildAssets([{ ...btc, balance: "0.5" }], [
      { symbol: "BINANCE:BTCUSDT", price: 100 },
    ]);
    expect(a.value).toBe(50);
  });
});

describe("totalValue", () => {
  it("sums the values", () => {
    expect(totalValue(buildAssets([btc, aapl], quotes))).toBe(700);
  });

  it("is 0 without assets", () => {
    expect(totalValue([])).toBe(0);
  });
});
