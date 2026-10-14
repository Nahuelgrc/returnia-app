-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('crypto', 'stock');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('buy', 'sell');

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "tickerProvider",
ALTER COLUMN "assetType" SET DATA TYPE "AssetType" USING (lower("assetType")::"AssetType"),
ALTER COLUMN "side" SET DATA TYPE "Side" USING (lower("side")::"Side"),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(28,10),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(28,10);

-- Normalize empty comments
UPDATE "Transaction" SET "comments" = NULL WHERE "comments" = '';

-- CreateIndex
CREATE INDEX "Transaction_userId_tickerName_idx" ON "Transaction"("userId", "tickerName");

-- CreateIndex
CREATE INDEX "Transaction_userId_executedAt_idx" ON "Transaction"("userId", "executedAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
