import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.E2E_DB_PORT ?? 54329);
const migrationsDir = join(process.cwd(), "prisma", "migrations");

const db = await PGlite.create();

const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of migrations) {
  await db.exec(readFileSync(join(migrationsDir, name, "migration.sql"), "utf8"));
}

const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`In-memory PGlite listening on 127.0.0.1:${port} (${migrations.length} migrations)`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
