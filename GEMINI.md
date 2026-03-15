# PROJECT CONTEXT: Returnia

## 1. Project Overview

Returnia is a full-stack portfolio tracker for Crypto and Stocks.

- **Theme:** Dark Mode ONLY. Modern, minimalist, neon accents.
- **Core Goal:** Track investment performance (P&L), history, and distribution.
- **Deployment:** Vercel (Frontend/API) + Neon Postgres (Database).
- **Language:** Spanish (UI labels, form messages, and error messages are in Spanish).

## 2. Tech Stack

- **Framework:** Next.js 15+ (App Router).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS.
- **Auth:** NextAuth.js (v5/beta). Providers: Credentials (Email/Pass) + Google.
- **Database:** PostgreSQL (Neon) via Prisma ORM.
- **Charts:** Recharts.
- **Validation:** Zod.
- **Market Data:** Finnhub API (Stocks) + Binance API (Crypto).
- **Icons:** Google Material Symbols Outlined.

## 3. Database Schema (Prisma Reference)

The agent must use this schema structure logic:

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String?   @unique
  name          String?
  passwordHash  String?   // Nullable for OAuth users
  image         String?
  createdAt     DateTime  @default(now())
  transactions  Transaction[]
}

model Transaction {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  assetType       String   // "crypto" | "stock"
  tickerName      String   // Display ticker (e.g., "BTC", "AAPL")
  tickerProvider  String   // API ticker (e.g., "BINANCE:BTCUSDT", "AAPL")
  side            String   // "buy" | "sell"
  quantity        Decimal  // Max 8 decimal places for crypto
  price           Decimal  // Unit price at execution
  comments        String?  // Optional user notes
  executedAt      DateTime
}

```

## 4. Key Architecture Decisions

- **Server Actions** are used for all backend operations (`app/actions/`).
- **Prisma Decimal** types must be converted to `Number()` before returning to Client Components.
- **Session user ID** is the Postgres UUID (overridden in JWT callback from Google ID).
- **Price polling** runs every 20 seconds via `useRef` + `setInterval` to avoid stale closures.
- **Sell validation** checks current balance server-side before allowing a sell transaction.
- **Portfolio chart** shows cumulative invested value (cost basis) over time, computed from transactions.

## 5. Environment Variables

All sensitive values must be in `.env` (gitignored):

```
CONNECTION_STRING=       # Neon PostgreSQL connection string
AUTH_SECRET=             # NextAuth.js secret
GOOGLE_CLIENT_ID=        # Google OAuth client ID
GOOGLE_CLIENT_SECRET=    # Google OAuth client secret
FINNHUB_API_KEY=         # Finnhub API key for stock data
```
