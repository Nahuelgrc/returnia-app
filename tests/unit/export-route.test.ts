import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findMany: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/db", () => ({
  prisma: { transaction: { findMany: mocks.findMany } },
}));

import { GET } from "@/app/api/transactions/export/route";

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.rateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 1 });
  mocks.findMany.mockResolvedValue([
    {
      executedAt: new Date("2024-01-10T12:00:00Z"),
      side: "buy",
      assetType: "crypto",
      tickerName: "BTC",
      quantity: new Prisma.Decimal("0.5"),
      price: new Prisma.Decimal("42000"),
      comments: "=evil",
    },
  ]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/transactions/export", () => {
  it("401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("429 when rate limited", async () => {
    mocks.rateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 12 });
    const res = await GET();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns the CSV of the session user only, in chronological order", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="transactions.csv"',
    );
    expect(await res.text()).toBe(
      "date,type,assetType,ticker,quantity,price,comments\r\n" +
        "2024-01-10T12:00:00.000Z,buy,crypto,BTC,0.5,42000,'=evil\r\n",
    );
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "user-1" });
    expect(args.orderBy[0]).toEqual({ executedAt: "asc" });
  });

  it("500 without leaking details", async () => {
    mocks.findMany.mockRejectedValue(new Error("password=secret"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
  });
});
