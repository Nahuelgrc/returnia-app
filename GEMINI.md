# PROJECT CONTEXT: Returnia

## 1. Project Overview

Returnia is a full-stack portfolio tracker for Crypto and Stocks.

- **Theme:** Dark Mode ONLY. Modern, minimalist, neon accents.
- **Core Goal:** Track investment performance (P&L), history, and distribution.
- **Deployment:** Vercel (Frontend/API) + Neon Postgres (Database).

## 2. Tech Stack

- **Framework:** Next.js 15+ (App Router).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS.
- **Auth:** NextAuth.js (v5/beta). Providers: Credentials (Email/Pass) + Google.
- **Database:** PostgreSQL (Neon) via Prisma ORM or google cloud free tier.
- **Charts:** Recharts.
- **Validation:** Zod.
- **State/Fetching:** TanStack Query (React Query) or SWR for client-side polling.

## 3. Database Schema (Prisma Reference)

The agent must use this schema structure logic:

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String?   @unique // Added for user/pass login
  name          String?
  passwordHash  String?   // Nullable for OAuth users
  image         String?
  createdAt     DateTime  @default(now())
  transactions  Transaction[]
  snapshots     PortfolioSnapshot[]
}

model Transaction {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  assetType       String   // "crypto" | "stock"
  tickerUi        String   // Display ticker (e.g., "BTC", "AAPL")
  tickerProvider  String   // API ticker (e.g., "BTCUSDT", "AAPL")
  side            String   // "buy" | "sell"
  quantity        Decimal
  price           Decimal  // Unit price at execution
  fees            Decimal  @default(0)
  executedAt      DateTime
}

model PortfolioSnapshot {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  capturedAt        DateTime @default(now())
  portfolioValueUsd Decimal
  pnlUsd            Decimal
}
```
