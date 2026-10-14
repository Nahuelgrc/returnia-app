import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { PASSWORD, createClient, createUser } from "./seed";

const QUOTES: Record<string, number> = {
  "BINANCE:BTCUSDT": 40000,
  "BINANCE:ETHUSDT": 3000,
  AAPL: 200,
};

const SEARCH_CATALOG = [
  { description: "BTC/USDT", displaySymbol: "BTC", symbol: "BINANCE:BTCUSDT", type: "crypto" },
  { description: "ETH/USDT", displaySymbol: "ETH", symbol: "BINANCE:ETHUSDT", type: "crypto" },
  { description: "APPLE INC", displaySymbol: "AAPL", symbol: "AAPL", type: "stock" },
];

export async function mockMarket(page: Page) {
  await page.route("**/api/prices", async (route) => {
    const { symbols } = route.request().postDataJSON() as { symbols: string[] };
    await route.fulfill({
      json: symbols.map((symbol) =>
        QUOTES[symbol] ? { symbol, price: QUOTES[symbol] } : { symbol },
      ),
    });
  });
  await page.route("**/api/search*", async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get("q") ?? "").toUpperCase();
    const type = url.searchParams.get("type");
    await route.fulfill({
      json: SEARCH_CATALOG.filter(
        (item) => item.type === type && item.displaySymbol.startsWith(q),
      ),
    });
  });
}

export async function createFreshUser(
  transactions: Parameters<typeof createUser>[3] = [],
) {
  const email = `user-${randomUUID()}@e2e.test`;
  const db = createClient();
  try {
    await createUser(db, email, "Fresh User", transactions);
  } finally {
    await db.$disconnect();
  }
  return { email, password: PASSWORD };
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /Log In with Email/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /@e2e\.test/ }).first().click();
  await page.getByRole("button", { name: /Log Out/ }).click();
  await expect(page).toHaveURL(/\/login/);
}

export async function fillTransaction(
  page: Page,
  options: {
    side: "buy" | "sell";
    assetType: "crypto" | "stock";
    ticker: string;
    quantity: string;
    suggestion: string;
  },
) {
  await page.getByRole("button", { name: "Add Transaction" }).click();
  await page.getByRole("button", { name: options.side === "buy" ? "Buy" : "Sell" }).click();
  await page
    .getByRole("button", { name: options.assetType === "crypto" ? "Crypto" : "Stocks" })
    .click();
  await page.getByPlaceholder(options.assetType === "crypto" ? "BTC" : "AAPL").fill(options.ticker);
  await page.getByText(options.suggestion).click();
  await expect(page.getByPlaceholder("$0.00", { exact: true })).not.toHaveValue("");
  await page.getByPlaceholder("0.00", { exact: true }).fill(options.quantity);
  await page.getByRole("button", { name: "Add", exact: true }).click();
}
