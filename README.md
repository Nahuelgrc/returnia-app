# Returnia

**Returnia** is a full-stack portfolio tracker for **Crypto** and **Stocks**, designed to help investors monitor their performance, track P&L (Profit & Loss), and visualize asset distribution in real time.

[![CI](https://github.com/Nahuelgrc/returnia-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Nahuelgrc/returnia-app/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169e1?logo=postgresql)

## Features

### 📊 Dashboard
- **Total Balance** — Real-time portfolio valuation in USD
- **Invested Capital** — Interactive area chart showing cumulative invested value over time, with filterable time periods (1D, 1W, 1M, 1Y, ALL)
- **Asset Allocation** — Donut chart visualizing portfolio allocation percentages across all holdings

### 💼 Asset Management
- **Asset Table** — View all holdings with columns: Asset, Price, Quantity, Value, Return (%), and Actions
- **Live Prices** — Prices automatically refresh every 20 seconds via Finnhub (stocks) and Binance (crypto) APIs
- **Return (%)** — Real profit/loss percentage calculated against your average purchase price (cost basis), not just 24h market change
- **Quick Actions** — Edit (✏️) and Delete (🗑️) buttons on each asset row

### 📝 Transactions
- **Add Transaction Modal** — Buy or sell with autocomplete asset search powered by Finnhub and Binance
- **Auto Price Fetch** — Unit price is automatically fetched when selecting an asset
- **Sell Validation** — Backend prevents selling more than your current balance, with a styled error banner in the form
- **Quantity Precision** — Supports up to 8 decimal places for crypto assets

### 🔐 Authentication
- **Email/Password** — Traditional email and password login
- Powered by NextAuth.js v5

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15+ (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Auth** | NextAuth.js v5 (Credentials) |
| **Database** | PostgreSQL (Neon) via Prisma ORM |
| **Charts** | Recharts |
| **Market Data** | Finnhub API (Stocks) + Binance API (Crypto) |
| **Deployment** | Vercel (Frontend/API) + Neon (Database) |

## Architecture

```
app/
├── actions/          # Server Actions (transaction, portfolio)
├── api/              # API Routes (prices, search)
├── dashboard/        # Dashboard page (SSR)
├── login/            # Login page
components/
├── dashboard/        # DashboardView, Header, Charts, Modals
├── ui/               # Reusable UI (Modal, ConfirmDialog)
hooks/                # Custom hooks (useAssetSearch, useAssetPrice)
lib/                  # Utilities (db, binance, finnhub)
prisma/               # Database schema
```

## Design

- **Dark Mode Only** — Modern, minimalist interface with neon accents
- **Glassmorphism** — Frosted glass effects on cards and modals
- **Material Symbols** — Google Material icon set for consistent iconography
- **Responsive** — Fully responsive layout from mobile to desktop

## Tests

```bash
npm test               # unit and component tests (Vitest, no database)
npm run test:watch
npm run test:coverage  # 70% threshold on app/actions, API routes, auth and lib
npm run test:e2e       # Playwright (chromium)
```

- Unit tests mock Prisma, `auth`, `next/cache` and `fetch`; they never read `.env` or open connections to any database.
- E2E tests never use a real database: `playwright.config.ts` starts an in-memory PostgreSQL (PGlite, `tests/e2e/db-server.mjs`) on `127.0.0.1:54329`, applies the migrations from `prisma/migrations` there, and starts the app (`npm run build && npm run start` on port 3100) with `CONNECTION_STRING` pointing to that database. The `CONNECTION_STRING` from `.env` is always overridden.
- If the effective e2e connection string does not point to `127.0.0.1` or `localhost`, the configuration aborts before starting anything (`assertLocalDatabase` in `tests/e2e/env.ts`).
- The global setup truncates the tables and loads test users (`alice@e2e.test`, `bob@e2e.test`, password in `tests/e2e/seed.ts`). `/api/prices` and `/api/search` are mocked with `page.route`.
- Ports can be changed with `E2E_DB_PORT` and `E2E_APP_PORT`. The first time, install the browser: `npx playwright install chromium`.
- `npm run test:e2e` runs `next build`, which rewrites `.next`; do not run it while `next dev` is open.

## CI/CD

- `.github/workflows/ci.yml` (PRs and pushes to `main`): `npm ci`, `prisma generate`, lint, typecheck, tests with coverage, build with dummy variables and e2e (Playwright + PGlite, no real database). Uploads `playwright-report` on failure.
- `.github/workflows/db-migrate.yml`: manual, `production` environment with approval, `prisma migrate status` and `migrate deploy`.
- `.github/workflows/audit.yml`: `npm audit --omit=dev --audit-level=high` weekly and manual, does not block PRs.
- Weekly Dependabot for npm and GitHub Actions.
- Vercel deployment and environment variables: see [docs/DEPLOY.md](docs/DEPLOY.md).
