import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  findMany: vi.fn(),
  createMany: vi.fn(),
  $transaction: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/db", () => ({
  prisma: { $transaction: mocks.$transaction, transaction: {} },
}));

import { importTransactions } from "@/app/actions/transaction";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from "@/lib/transactions-csv";

const HEADER = "date,type,assetType,ticker,quantity,price,comments";
const csv = (...rows: string[]) => [HEADER, ...rows].join("\r\n");

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

const txClient = () => ({
  transaction: { findMany: mocks.findMany, createMany: mocks.createMany },
});

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.rateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 1 });
  mocks.findMany.mockResolvedValue([]);
  mocks.createMany.mockImplementation(async ({ data }) => ({ count: data.length }));
  mocks.$transaction.mockImplementation(async (fn) => fn(txClient()));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("importTransactions", () => {
  it("rejects without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect(await importTransactions(csv("2024-01-10,buy,crypto,BTC,1,100,"))).toEqual({
      error: "Unauthorized",
    });
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("imports valid rows with the session userId in a single createMany", async () => {
    const result = await importTransactions(
      csv(
        "2024-01-10T00:00:00Z,buy,crypto,btc,2,100,hello",
        "2024-01-11T00:00:00Z,sell,crypto,BTC,1,110,",
      ),
    );
    expect(result).toEqual({ success: true, imported: 2 });
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.createMany.mock.calls[0][0].data).toEqual([
      {
        userId: "user-1",
        assetType: "crypto",
        tickerName: "BTC",
        side: "buy",
        quantity: 2,
        price: 100,
        executedAt: new Date("2024-01-10T00:00:00Z"),
        comments: "hello",
      },
      {
        userId: "user-1",
        assetType: "crypto",
        tickerName: "BTC",
        side: "sell",
        quantity: 1,
        price: 110,
        executedAt: new Date("2024-01-11T00:00:00Z"),
        comments: null,
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("ignores any user id in the file and queries only the session user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-2" } });
    await importTransactions(
      "userId,date,type,assetType,ticker,quantity,price\nuser-1,2024-01-10,buy,crypto,BTC,1,100",
    );
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      userId: "user-2",
      tickerName: { in: ["BTC"] },
    });
    expect(mocks.createMany.mock.calls[0][0].data[0].userId).toBe("user-2");
  });

  it("returns row errors and imports nothing when a row is invalid", async () => {
    const result = await importTransactions(
      csv("2024-01-10,buy,crypto,BTC,1,100,", "2024-01-10,buy,crypto,BTC,0,100,"),
    );
    expect(result).toEqual({
      errors: [{ row: 3, message: expect.stringContaining("quantity") }],
    });
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects when the combined balance goes negative against existing transactions", async () => {
    mocks.findMany.mockResolvedValue([
      {
        tickerName: "BTC",
        side: "buy",
        quantity: new Prisma.Decimal(1),
        executedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);
    const result = await importTransactions(csv("2024-01-10,sell,crypto,BTC,2,100,"));
    expect(result).toEqual({
      error: "Importing would make the BTC balance negative (-1).",
    });
    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an imported sell dated before its buy", async () => {
    const result = await importTransactions(
      csv("2024-01-05,sell,crypto,BTC,1,100,", "2024-01-10,buy,crypto,BTC,1,100,"),
    );
    expect(result).toMatchObject({ error: expect.stringContaining("BTC balance negative") });
    expect(mocks.createMany).not.toHaveBeenCalled();
  });

  it("accepts a sell covered by an existing buy", async () => {
    mocks.findMany.mockResolvedValue([
      {
        tickerName: "BTC",
        side: "buy",
        quantity: new Prisma.Decimal(2),
        executedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);
    expect(await importTransactions(csv("2024-01-10,sell,crypto,BTC,2,100,"))).toEqual({
      success: true,
      imported: 1,
    });
  });

  it("checks every affected ticker independently", async () => {
    const result = await importTransactions(
      csv("2024-01-10,buy,crypto,BTC,1,100,", "2024-01-10,sell,crypto,ETH,1,100,"),
    );
    expect(result).toMatchObject({ error: expect.stringContaining("ETH balance negative") });
  });

  it("rejects files over the size limit and does not parse them", async () => {
    const result = await importTransactions("x".repeat(MAX_IMPORT_BYTES + 1));
    expect(result).toMatchObject({ error: expect.stringContaining("too large") });
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("rejects files over the row limit", async () => {
    const rows = Array(MAX_IMPORT_ROWS + 1).fill("2024-01-10,buy,crypto,BTC,1,100,");
    expect(await importTransactions(csv(...rows))).toEqual({
      error: `Too many rows (max ${MAX_IMPORT_ROWS})`,
    });
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-string content", async () => {
    expect(await importTransactions(undefined as unknown as string)).toEqual({
      error: "Invalid file",
    });
  });

  it("applies the rate limit per user", async () => {
    mocks.rateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 30 });
    const result = await importTransactions(csv("2024-01-10,buy,crypto,BTC,1,100,"));
    expect(result).toMatchObject({ error: expect.stringContaining("30 seconds") });
    expect(mocks.rateLimit.mock.calls[0][0]).toBe("action:import:user-1");
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("uses Serializable isolation and retries on P2034", async () => {
    mocks.$transaction
      .mockRejectedValueOnce(knownError("P2034"))
      .mockImplementationOnce(async (fn) => fn(txClient()));
    const result = await importTransactions(csv("2024-01-10,buy,crypto,BTC,1,100,"));
    expect(result).toEqual({ success: true, imported: 1 });
    expect(mocks.$transaction).toHaveBeenCalledTimes(2);
    expect(mocks.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("returns a generic error if the database fails", async () => {
    mocks.$transaction.mockRejectedValue(new Error("password=secret"));
    expect(await importTransactions(csv("2024-01-10,buy,crypto,BTC,1,100,"))).toEqual({
      error: "Error importing the transactions",
    });
  });
});
