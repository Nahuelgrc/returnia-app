import { expect, test } from "@playwright/test";
import { ALICE, BOB, type SeedTransaction } from "./seed";
import { createFreshUser, fillTransaction, login, mockMarket } from "./helpers";

const btc = (quantity: number): SeedTransaction => ({
  ticker: "BTC",
  assetType: "crypto",
  side: "buy",
  quantity,
  price: 30000,
  executedAt: "2024-01-10T10:00:00Z",
});

const row = (page: import("@playwright/test").Page, ticker: string) =>
  page.locator("tbody tr", { hasText: ticker });

test.beforeEach(async ({ page }) => {
  await mockMarket(page);
});

test("the dashboard shows the seed assets and balance", async ({ page }) => {
  await login(page, ALICE.email);
  await expect(row(page, "BTC")).toContainText("2 BTC");
  await expect(row(page, "AAPL")).toContainText("10 AAPL");
  await expect(page.getByRole("heading", { name: "$82,000.00" })).toBeVisible();
});

test("adding a buy creates the asset", async ({ page }) => {
  const user = await createFreshUser([btc(1)]);
  await login(page, user.email);

  await fillTransaction(page, {
    side: "buy",
    assetType: "crypto",
    ticker: "eth",
    quantity: "1.5",
    suggestion: "ETH/USDT",
  });

  await expect(row(page, "ETH")).toContainText("1.5 ETH");
  await expect(page.getByRole("heading", { name: "$44,500.00" })).toBeVisible();
});

test("buying a stock adds to the existing position", async ({ page }) => {
  const user = await createFreshUser([
    { ...btc(1), ticker: "AAPL", assetType: "stock", price: 100 },
  ]);
  await login(page, user.email);

  await fillTransaction(page, {
    side: "buy",
    assetType: "stock",
    ticker: "aapl",
    quantity: "5",
    suggestion: "APPLE INC",
  });

  await expect(row(page, "AAPL")).toContainText("6 AAPL");
});

test("selling more than owned shows the error", async ({ page }) => {
  const user = await createFreshUser([btc(2)]);
  await login(page, user.email);

  await fillTransaction(page, {
    side: "sell",
    assetType: "crypto",
    ticker: "BTC",
    quantity: "5",
    suggestion: "BTC/USDT",
  });

  await expect(page.getByText(/You cannot sell 5 BTC/)).toBeVisible();
  await expect(row(page, "BTC")).toContainText("2 BTC");
});

test("a partial sell reduces the quantity", async ({ page }) => {
  const user = await createFreshUser([btc(2)]);
  await login(page, user.email);

  await fillTransaction(page, {
    side: "sell",
    assetType: "crypto",
    ticker: "BTC",
    quantity: "0.5",
    suggestion: "BTC/USDT",
  });

  await expect(row(page, "BTC")).toContainText("1.5 BTC");
});

test("deleting an asset requires confirmation", async ({ page }) => {
  const user = await createFreshUser([btc(2)]);
  await login(page, user.email);

  await row(page, "BTC").locator('button[title="Delete"]').click();
  await expect(page.getByText("Delete asset")).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(row(page, "BTC")).toBeVisible();

  await row(page, "BTC").locator('button[title="Delete"]').click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row(page, "BTC")).toHaveCount(0);
});

test("each user sees only their own assets", async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();
  await mockMarket(alicePage);
  await mockMarket(bobPage);

  await login(alicePage, ALICE.email);
  await login(bobPage, BOB.email);

  await expect(row(alicePage, "BTC")).toBeVisible();
  await expect(row(alicePage, "ETH")).toHaveCount(0);
  await expect(row(bobPage, "ETH")).toBeVisible();
  await expect(row(bobPage, "BTC")).toHaveCount(0);

  await aliceContext.close();
  await bobContext.close();
});

test("deleting an asset does not affect another user with the same ticker", async ({ browser }) => {
  const first = await createFreshUser([btc(2)]);
  const second = await createFreshUser([btc(3)]);
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  await mockMarket(firstPage);
  await mockMarket(secondPage);

  await login(firstPage, first.email);
  await login(secondPage, second.email);

  await row(secondPage, "BTC").locator('button[title="Delete"]').click();
  await secondPage.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row(secondPage, "BTC")).toHaveCount(0);

  await firstPage.reload();
  await expect(row(firstPage, "BTC")).toContainText("2 BTC");

  await firstContext.close();
  await secondContext.close();
});
