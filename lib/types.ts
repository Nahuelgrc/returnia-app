import type { AssetType, Side } from "@/lib/schemas/transaction";

export interface Holding {
  ticker: string;
  type: AssetType;
  balance: string;
  averageCost: number;
  realizedPnl: number;
}

export interface Asset extends Holding {
  name: string;
  price: number;
  value: number;
  change: number;
}

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface TransactionRecord {
  id: string;
  ticker: string;
  assetType: AssetType;
  side: Side;
  quantity: number;
  price: number;
  comments: string | null;
  executedAt: string;
}

export interface Quote {
  symbol: string;
  price?: number;
  change?: number;
  percentChange?: number;
}

export interface SymbolSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: AssetType;
}
