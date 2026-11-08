import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { transaction: { findMany: mocks.findMany } } }));

import { getPortfolioData } from "@/lib/portfolio-data";

const row = (
  side: "buy" | "sell",
  quantity: string,
  price: string,
  at: string,
  id = "tx-1",
  comments: string | null = null,
) => ({
  id,
  tickerName: "BTC",
  assetType: "crypto" as const,
  side,
  quantity: new Prisma.Decimal(quantity),
  price: new Prisma.Decimal(price),
  comments,
  executedAt: new Date(at),
});

describe("getPortfolioData", () => {
  it("queries only the user transactions", async () => {
    mocks.findMany.mockResolvedValue([]);
    await getPortfolioData("user-9");
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({ userId: "user-9" });
  });

  it("returns empty without transactions", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(await getPortfolioData("u")).toEqual({
      holdings: [],
      history: [],
      transactions: [],
    });
  });

  it("serializes holdings and history to plain types", async () => {
    mocks.findMany.mockResolvedValue([
      row("buy", "2", "100.123", "2024-01-01T00:00:00Z", "tx-1"),
      row("sell", "1", "500", "2024-01-02T00:00:00Z", "tx-2", "sold half"),
    ]);
    const data = await getPortfolioData("u");
    expect(data.holdings).toEqual([
      { ticker: "BTC", type: "crypto", balance: "1", averageCost: 100.123 },
    ]);
    expect(data.history).toEqual([
      { date: "2024-01-01", value: 200.25 },
      { date: "2024-01-02", value: 100.12 },
    ]);
    expect(data.transactions).toEqual([
      {
        id: "tx-1",
        ticker: "BTC",
        assetType: "crypto",
        side: "buy",
        quantity: 2,
        price: 100.123,
        comments: null,
        executedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "tx-2",
        ticker: "BTC",
        assetType: "crypto",
        side: "sell",
        quantity: 1,
        price: 500,
        comments: "sold half",
        executedAt: "2024-01-02T00:00:00.000Z",
      },
    ]);
  });
});
