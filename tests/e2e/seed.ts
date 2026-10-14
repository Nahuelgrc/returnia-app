import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { E2E_DB_URL, assertLocalDatabase } from "./env";

export const PASSWORD = "e2e-password-123";

export const ALICE = { email: "alice@e2e.test", name: "Alice Seed" };
export const BOB = { email: "bob@e2e.test", name: "Bob Seed" };

export interface SeedTransaction {
  ticker: string;
  assetType: "crypto" | "stock";
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executedAt: string;
}

const ALICE_TRANSACTIONS: SeedTransaction[] = [
  {
    ticker: "BTC",
    assetType: "crypto",
    side: "buy",
    quantity: 2,
    price: 30000,
    executedAt: "2024-01-10T10:00:00Z",
  },
  {
    ticker: "AAPL",
    assetType: "stock",
    side: "buy",
    quantity: 10,
    price: 150,
    executedAt: "2024-02-10T10:00:00Z",
  },
];

const BOB_TRANSACTIONS: SeedTransaction[] = [
  {
    ticker: "ETH",
    assetType: "crypto",
    side: "buy",
    quantity: 5,
    price: 2000,
    executedAt: "2024-03-10T10:00:00Z",
  },
];

export function createClient() {
  assertLocalDatabase(E2E_DB_URL);
  return new PrismaClient({ datasourceUrl: E2E_DB_URL });
}

export async function createUser(
  db: PrismaClient,
  email: string,
  name: string,
  transactions: SeedTransaction[] = [],
) {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  return db.user.create({
    data: {
      email,
      name,
      passwordHash,
      transactions: {
        create: transactions.map((t) => ({
          tickerName: t.ticker,
          assetType: t.assetType,
          side: t.side,
          quantity: t.quantity,
          price: t.price,
          executedAt: new Date(t.executedAt),
        })),
      },
    },
  });
}

export async function resetAndSeed(db: PrismaClient) {
  await db.$executeRawUnsafe('TRUNCATE TABLE "Transaction", "User" CASCADE');
  await createUser(db, ALICE.email, ALICE.name, ALICE_TRANSACTIONS);
  await createUser(db, BOB.email, BOB.name, BOB_TRANSACTIONS);
}
