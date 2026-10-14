import { defineConfig, devices } from "@playwright/test";
import {
  E2E_BASE_URL,
  E2E_DB_PORT,
  E2E_DB_URL,
  appServerEnv,
  assertLocalDatabase,
} from "./tests/e2e/env";

assertLocalDatabase(E2E_DB_URL);
assertLocalDatabase(appServerEnv().CONNECTION_STRING);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: E2E_BASE_URL,
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/db-server.mjs",
      port: E2E_DB_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run build && npm run start",
      url: `${E2E_BASE_URL}/login`,
      reuseExistingServer: false,
      timeout: 600_000,
      env: appServerEnv(),
    },
  ],
});
