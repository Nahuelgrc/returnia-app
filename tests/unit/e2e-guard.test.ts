import { describe, expect, it } from "vitest";
import { E2E_DB_URL, appServerEnv, assertLocalDatabase } from "../e2e/env";

describe("assertLocalDatabase", () => {
  it.each([
    "postgresql://u:p@127.0.0.1:54329/postgres",
    "postgresql://u:p@localhost:5432/db",
    "postgresql://u:p@[::1]:5432/db",
  ])("acepta %s", (url) => {
    expect(() => assertLocalDatabase(url)).not.toThrow();
  });

  it.each([
    "postgresql://u:p@ep-cool-123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    "postgresql://u:p@db.example.com:5432/db",
    "postgresql://u:p@127.0.0.1.evil.com:5432/db",
    "postgresql://u:p@10.0.0.5:5432/db",
  ])("aborts with remote host %s", (url) => {
    expect(() => assertLocalDatabase(url)).toThrow(/E2E aborted/);
  });

  it("aborts without a connection string or with an invalid URL", () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/E2E aborted/);
    expect(() => assertLocalDatabase("")).toThrow(/E2E aborted/);
    expect(() => assertLocalDatabase("not-a-url")).toThrow(/E2E aborted/);
  });

  it("the e2e configuration points to a local database", () => {
    expect(() => assertLocalDatabase(E2E_DB_URL)).not.toThrow();
    expect(() => assertLocalDatabase(appServerEnv().CONNECTION_STRING)).not.toThrow();
  });
});
