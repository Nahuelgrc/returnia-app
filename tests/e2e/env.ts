export const E2E_DB_PORT = Number(process.env.E2E_DB_PORT ?? 54329);
export const E2E_APP_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_APP_PORT}`;
export const E2E_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${E2E_DB_PORT}/postgres?sslmode=disable&connection_limit=1&pgbouncer=true`;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function assertLocalDatabase(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error("E2E aborted: no connection string for the test database.");
  }
  let host: string;
  try {
    host = new URL(connectionString).hostname;
  } catch {
    throw new Error("E2E aborted: the test connection string is not a valid URL.");
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `E2E aborted: the test database must be on 127.0.0.1 or localhost (received: ${host}).`,
    );
  }
}

export const appServerEnv = () => ({
  CONNECTION_STRING: E2E_DB_URL,
  DIRECT_URL: E2E_DB_URL,
  DATABASE_URL: E2E_DB_URL,
  AUTH_SECRET: "e2e-only-secret-not-for-production-0123456789",
  AUTH_URL: E2E_BASE_URL,
  AUTH_TRUST_HOST: "true",
  FINNHUB_API_KEY: "e2e-unused",
  PORT: String(E2E_APP_PORT),
});
