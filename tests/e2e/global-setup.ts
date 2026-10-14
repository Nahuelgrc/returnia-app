import { appServerEnv, assertLocalDatabase } from "./env";
import { createClient, resetAndSeed } from "./seed";

export default async function globalSetup() {
  assertLocalDatabase(appServerEnv().CONNECTION_STRING);

  const db = createClient();
  try {
    await resetAndSeed(db);
  } finally {
    await db.$disconnect();
  }
}
