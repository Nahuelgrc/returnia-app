import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.$transaction,
    transaction: { deleteMany: mocks.deleteMany },
  },
}));

import { addTransaction, deleteAssetTransactions } from "@/app/actions/transaction";

const payload = {
  type: "buy" as const,
  assetType: "crypto" as const,
  ticker: "btc",
  quantity: 2,
  price: 100,
  date: "2024-01-10T00:00:00Z",
};

const existing = (side: "buy" | "sell", quantity: number, at: string) => ({
  side,
  quantity: new Prisma.Decimal(quantity),
  executedAt: new Date(at),
});

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2024-06-01T00:00:00Z"));
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.findMany.mockResolvedValue([]);
  mocks.create.mockImplementation(async ({ data }) => ({
    id: "tx-1",
    ...data,
    quantity: new Prisma.Decimal(data.quantity),
    price: new Prisma.Decimal(data.price),
  }));
  mocks.$transaction.mockImplementation(async (fn) =>
    fn({ transaction: { findMany: mocks.findMany, create: mocks.create } }),
  );
  mocks.deleteMany.mockResolvedValue({ count: 1 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("addTransaction", () => {
  it("rejects without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect(await addTransaction(payload)).toEqual({ error: "Unauthorized" });
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a session without id", async () => {
    mocks.auth.mockResolvedValue({ user: {} });
    expect(await addTransaction(payload)).toEqual({ error: "Unauthorized" });
  });

  it("returns the first validation error without touching the database", async () => {
    const result = await addTransaction({ ...payload, quantity: -1 });
    expect(result.error).toBeTruthy();
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a future date", async () => {
    const result = await addTransaction({ ...payload, date: "2030-01-01T00:00:00Z" });
    expect(result).toEqual({ error: "The date cannot be in the future" });
  });

  it("rejects an invalid ticker", async () => {
    const result = await addTransaction({ ...payload, ticker: "BT C" });
    expect(result.error).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a buy with the session userId and uppercase ticker", async () => {
    const result = await addTransaction(payload);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        assetType: "crypto",
        tickerName: "BTC",
        side: "buy",
        quantity: 2,
        price: 100,
        executedAt: new Date("2024-01-10T00:00:00Z"),
        comments: null,
      },
    });
    expect(result).toMatchObject({
      success: true,
      transaction: { id: "tx-1", quantity: 2, price: 100 },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("a buy does not query the previous balance", async () => {
    await addTransaction(payload);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("stores non-empty comments", async () => {
    await addTransaction({ ...payload, comments: "nota" });
    expect(mocks.create.mock.calls[0][0].data.comments).toBe("nota");
  });

  it("uses Serializable isolation", async () => {
    await addTransaction(payload);
    expect(mocks.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("selling without a position returns an error", async () => {
    const result = await addTransaction({ ...payload, type: "sell" });
    expect(result.error).toContain("You cannot sell");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("selling more than the balance returns an error", async () => {
    mocks.findMany.mockResolvedValue([existing("buy", 1, "2024-01-01T00:00:00Z")]);
    const result = await addTransaction({ ...payload, type: "sell", quantity: 2 });
    expect(result.error).toContain("You cannot sell 2 BTC");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("selling exactly the balance is valid", async () => {
    mocks.findMany.mockResolvedValue([existing("buy", 2, "2024-01-01T00:00:00Z")]);
    const result = await addTransaction({ ...payload, type: "sell", quantity: 2 });
    expect(result).toMatchObject({ success: true });
    expect(mocks.create.mock.calls[0][0].data.side).toBe("sell");
  });

  it("selling within the remaining balance after previous sells is valid", async () => {
    mocks.findMany.mockResolvedValue([
      existing("buy", 10, "2024-01-01T00:00:00Z"),
      existing("sell", 4, "2024-01-05T00:00:00Z"),
    ]);
    const result = await addTransaction({ ...payload, type: "sell", quantity: 6 });
    expect(result).toMatchObject({ success: true });
  });

  it("rejects overselling considering previous sells", async () => {
    mocks.findMany.mockResolvedValue([
      existing("buy", 10, "2024-01-01T00:00:00Z"),
      existing("sell", 4, "2024-01-05T00:00:00Z"),
    ]);
    const result = await addTransaction({ ...payload, type: "sell", quantity: 7 });
    expect(result.error).toContain("You cannot sell");
  });

  it("a sell with a past date that would make a later sell negative is rejected", async () => {
    mocks.findMany.mockResolvedValue([
      existing("buy", 10, "2024-01-01T00:00:00Z"),
      existing("sell", 8, "2024-01-20T00:00:00Z"),
    ]);
    const result = await addTransaction({
      ...payload,
      type: "sell",
      quantity: 5,
      date: "2024-01-10T00:00:00Z",
    });
    expect(result.error).toContain("You cannot sell");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("a sell dated before the buy is rejected", async () => {
    mocks.findMany.mockResolvedValue([existing("buy", 10, "2024-01-10T00:00:00Z")]);
    const result = await addTransaction({
      ...payload,
      type: "sell",
      quantity: 1,
      date: "2024-01-05T00:00:00Z",
    });
    expect(result.error).toContain("You cannot sell");
  });

  it("at the same instant the buy counts before the sell", async () => {
    mocks.findMany.mockResolvedValue([existing("buy", 3, "2024-01-10T00:00:00Z")]);
    const result = await addTransaction({
      ...payload,
      type: "sell",
      quantity: 3,
      date: "2024-01-10T00:00:00Z",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("queries only the transactions of the user and the normalized ticker", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-2" } });
    mocks.findMany.mockResolvedValue([existing("buy", 5, "2024-01-01T00:00:00Z")]);
    await addTransaction({ ...payload, type: "sell", ticker: " eth ", quantity: 1 });
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      userId: "user-2",
      tickerName: "ETH",
    });
    expect(mocks.create.mock.calls[0][0].data.userId).toBe("user-2");
  });

  it("does not leak internal details on unexpected errors", async () => {
    mocks.$transaction.mockRejectedValue(new Error("password=secret host=db.internal"));
    const result = await addTransaction(payload);
    expect(result).toEqual({ error: "Error saving the transaction" });
    expect(console.error).toHaveBeenCalled();
  });

  it("retries on P2034 serialization conflict", async () => {
    mocks.$transaction
      .mockRejectedValueOnce(knownError("P2034"))
      .mockRejectedValueOnce(knownError("P2034"))
      .mockImplementationOnce(async (fn) =>
        fn({ transaction: { findMany: mocks.findMany, create: mocks.create } }),
      );
    const result = await addTransaction(payload);
    expect(result).toMatchObject({ success: true });
    expect(mocks.$transaction).toHaveBeenCalledTimes(3);
  });

  it("gives up after 3 serialization conflicts", async () => {
    mocks.$transaction.mockRejectedValue(knownError("P2034"));
    const result = await addTransaction(payload);
    expect(result).toEqual({ error: "Error saving the transaction" });
    expect(mocks.$transaction).toHaveBeenCalledTimes(3);
  });

  it("does not retry on other Prisma errors", async () => {
    mocks.$transaction.mockRejectedValue(knownError("P2002"));
    await addTransaction(payload);
    expect(mocks.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("deleteAssetTransactions", () => {
  it("rejects without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect(await deleteAssetTransactions("BTC")).toEqual({ error: "Unauthorized" });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid ticker", async () => {
    expect(await deleteAssetTransactions("")).toEqual({ error: "Invalid ticker" });
    expect(await deleteAssetTransactions("A;DROP")).toEqual({ error: "Invalid ticker" });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes only the user ones with the normalized ticker", async () => {
    const result = await deleteAssetTransactions(" btc ");
    expect(result).toEqual({ success: true });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", tickerName: "BTC" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("isolates by userId between users", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-2" } });
    await deleteAssetTransactions("BTC");
    expect(mocks.deleteMany.mock.calls[0][0].where.userId).toBe("user-2");
  });

  it("returns a generic error if the database fails", async () => {
    mocks.deleteMany.mockRejectedValue(new Error("connection string leaked"));
    const result = await deleteAssetTransactions("BTC");
    expect(result).toEqual({ error: "Error deleting the transactions" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
