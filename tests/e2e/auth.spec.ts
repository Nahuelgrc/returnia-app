import { expect, test } from "@playwright/test";
import { ALICE, PASSWORD } from "./seed";
import { login, logout, mockMarket } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockMarket(page);
});

test("sign-up, logout and login return to the dashboard", async ({ page }) => {
  const email = `new-${Date.now()}@e2e.test`;

  await page.goto("/register");
  await page.getByPlaceholder("First name", { exact: true }).fill("New");
  await page.getByPlaceholder("Last name (optional)").fill("User");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder("Confirm Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Total Balance")).toBeVisible();
  await expect(page.getByRole("heading", { name: "$0.00" })).toBeVisible();

  await logout(page);
  await login(page, email);
  await expect(page.getByText("New User").first()).toBeVisible();
});

test("sign-up rejects mismatched passwords", async ({ page }) => {
  await page.goto("/register");
  await page.getByPlaceholder("First name", { exact: true }).fill("New");
  await page.getByPlaceholder("name@example.com").fill("distintas@e2e.test");
  await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder("Confirm Password").fill(`${PASSWORD}x`);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByText("Passwords do not match")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test("sign-up rejects an already registered email", async ({ page }) => {
  await page.goto("/register");
  await page.getByPlaceholder("First name", { exact: true }).fill("Alice");
  await page.getByPlaceholder("name@example.com").fill(ALICE.email);
  await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder("Confirm Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByText("Email is already registered")).toBeVisible();
});

test("dashboard without a session redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /Log In with Email/ })).toBeVisible();
});

test("root without a session redirects to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("invalid credentials show an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill(ALICE.email);
  await page.getByPlaceholder("Password").fill("wrong-password-999");
  await page.getByRole("button", { name: /Log In with Email/ }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("nonexistent user shows the same error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill("nobody@e2e.test");
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Log In with Email/ }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("login with external callbackUrl ends on the dashboard", async ({ page }) => {
  await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example.com");
  await page.getByPlaceholder("name@example.com").fill(ALICE.email);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Log In with Email/ }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/dashboard$/);
});

test("logout ends the session and protects the dashboard", async ({ page }) => {
  await login(page, ALICE.email);
  await logout(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("market APIs require a session", async ({ request }) => {
  const prices = await request.post("/api/prices", { data: { symbols: ["AAPL"] } });
  expect(prices.status()).toBe(401);
  const search = await request.get("/api/search?q=aapl");
  expect(search.status()).toBe(401);
});
