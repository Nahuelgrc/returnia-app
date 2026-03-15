# Returnia

**Returnia** is a full-stack portfolio tracker for **Crypto** and **Stocks**, designed to help investors monitor their performance, track P&L (Profit & Loss), and visualize asset distribution in real time.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169e1?logo=postgresql)

## Features

### 📊 Dashboard
- **Balance Total** — Real-time portfolio valuation in USD
- **Ganancia/Pérdida Histórica** — Interactive area chart showing cumulative invested value over time, with filterable time periods (1D, 1S, 1M, 1A, TODO)
- **Distribución de Activos** — Donut chart visualizing portfolio allocation percentages across all holdings

### 💼 Asset Management
- **Asset Table** — View all holdings with columns: Activo, Precio, Cantidad, Valor, Retorno (%), and Acciones
- **Live Prices** — Prices automatically refresh every 20 seconds via Finnhub (stocks) and Binance (crypto) APIs
- **Retorno (%)** — Real profit/loss percentage calculated against your average purchase price (cost basis), not just 24h market change
- **Quick Actions** — Edit (✏️) and Delete (🗑️) buttons on each asset row

### 📝 Transactions
- **Add Transaction Modal** — Buy or sell with autocomplete asset search powered by Finnhub and Binance
- **Auto Price Fetch** — Unit price is automatically fetched when selecting an asset
- **Sell Validation** — Backend prevents selling more than your current balance, with a styled error banner in the form
- **Quantity Precision** — Supports up to 8 decimal places for crypto assets

### 🔐 Authentication
- **Google OAuth** — Sign in with your Google account
- **Email/Password** — Traditional email and password login
- Powered by NextAuth.js v5

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15+ (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Auth** | NextAuth.js v5 (Google + Credentials) |
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
├── ui/               # Reusable UI (Modal, ConfirmDialog, GlassCard)
hooks/                # Custom hooks (useAssetSearch, useAssetPrice)
lib/                  # Utilities (db, binance, finnhub)
prisma/               # Database schema
```

## Design

- **Dark Mode Only** — Modern, minimalist interface with neon accents
- **Glassmorphism** — Frosted glass effects on cards and modals
- **Material Symbols** — Google Material icon set for consistent iconography
- **Responsive** — Fully responsive layout from mobile to desktop
