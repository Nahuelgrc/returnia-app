import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assetTypeSchema,
  sideSchema,
  tickerSchema,
  transactionSchema,
} from "@/lib/schemas/transaction";
import {
  pricesBodySchema,
  searchParamsSchema,
  symbolSchema,
} from "@/lib/schemas/market";

const valid = {
  type: "buy",
  assetType: "crypto",
  ticker: "btc",
  quantity: 1.5,
  price: 100,
  date: "2024-01-01T10:00:00Z",
};

describe("transactionSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid transaction and normalizes the ticker", () => {
    const r = transactionSchema.safeParse({ ...valid, ticker: " btc " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ticker).toBe("BTC");
      expect(r.data.date).toBeInstanceOf(Date);
    }
  });

  it("accepts optional comments and trims them", () => {
    const r = transactionSchema.safeParse({ ...valid, comments: "  hola  " });
    expect(r.success && r.data.comments).toBe("hola");
  });

  it.each([
    ["invalid type", { type: "hold" }],
    ["invalid assetType", { assetType: "bond" }],
    ["empty ticker", { ticker: "" }],
    ["ticker with symbols", { ticker: "BTC$" }],
    ["ticker too long", { ticker: "A".repeat(21) }],
    ["zero quantity", { quantity: 0 }],
    ["negative quantity", { quantity: -1 }],
    ["NaN quantity", { quantity: Number.NaN }],
    ["Infinity quantity", { quantity: Number.POSITIVE_INFINITY }],
    ["quantity as string", { quantity: "1" }],
    ["excessive quantity", { quantity: 1e16 }],
    ["zero price", { price: 0 }],
    ["negative price", { price: -5 }],
    ["excessive price", { price: 1e13 }],
    ["invalid date", { date: "not-a-date" }],
    ["future date", { date: "2024-06-05T00:00:00Z" }],
    ["date before 2000", { date: "1999-12-31T12:00:00Z" }],
    ["comments too long", { comments: "x".repeat(501) }],
  ])("rejects %s", (_name, patch) => {
    expect(transactionSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it("tolerates up to 24h of date skew", () => {
    const r = transactionSchema.safeParse({ ...valid, date: "2024-06-01T23:00:00Z" });
    expect(r.success).toBe(true);
  });

  it("rejects a future date with a specific message", () => {
    const r = transactionSchema.safeParse({ ...valid, date: "2025-01-01T00:00:00Z" });
    expect(!r.success && r.error.issues[0].message).toBe("The date cannot be in the future");
  });

  it("rejects missing fields", () => {
    expect(transactionSchema.safeParse({}).success).toBe(false);
  });
});

describe("tickerSchema / enums", () => {
  it("normalizes to uppercase", () => {
    expect(tickerSchema.parse(" brk.b ")).toBe("BRK.B");
  });

  it.each(["", "a b", "A/B", "A".repeat(21)])("rejects ticker %j", (t) => {
    expect(tickerSchema.safeParse(t).success).toBe(false);
  });

  it("validates enums", () => {
    expect(assetTypeSchema.safeParse("crypto").success).toBe(true);
    expect(assetTypeSchema.safeParse("x").success).toBe(false);
    expect(sideSchema.safeParse("sell").success).toBe(true);
    expect(sideSchema.safeParse("x").success).toBe(false);
  });
});

describe("market schemas", () => {
  it.each(["AAPL", "BINANCE:BTCUSDT", "BRK.B", "BTC-USD", "A".repeat(20)])(
    "symbolSchema accepts %s",
    (s) => {
      expect(symbolSchema.safeParse(s).success).toBe(true);
    },
  );

  it.each(["", "aapl", "A B", "A&B=1", "A".repeat(21), "../x", "A\n"])(
    "symbolSchema rejects %j",
    (s) => {
      expect(symbolSchema.safeParse(s).success).toBe(false);
    },
  );

  it("pricesBodySchema accepts 1 to 100 symbols", () => {
    expect(pricesBodySchema.safeParse({ symbols: ["AAPL"] }).success).toBe(true);
    expect(
      pricesBodySchema.safeParse({ symbols: Array.from({ length: 100 }, () => "A") }).success,
    ).toBe(true);
  });

  it("pricesBodySchema rejects empty, more than 100 and wrong types", () => {
    expect(pricesBodySchema.safeParse({ symbols: [] }).success).toBe(false);
    expect(
      pricesBodySchema.safeParse({ symbols: Array.from({ length: 101 }, () => "A") }).success,
    ).toBe(false);
    expect(pricesBodySchema.safeParse({ symbols: "AAPL" }).success).toBe(false);
    expect(pricesBodySchema.safeParse({}).success).toBe(false);
    expect(pricesBodySchema.safeParse({ symbols: ["bad symbol"] }).success).toBe(false);
  });

  it("searchParamsSchema accepts q and optional type", () => {
    expect(searchParamsSchema.parse({ q: " btc " })).toEqual({ q: "btc" });
    expect(searchParamsSchema.parse({ q: "btc", type: "crypto" }).type).toBe("crypto");
  });

  it("searchParamsSchema rejects empty or long q or invalid type", () => {
    expect(searchParamsSchema.safeParse({ q: "   " }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ q: "a".repeat(51) }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ q: "a", type: "bond" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({}).success).toBe(false);
  });
});
