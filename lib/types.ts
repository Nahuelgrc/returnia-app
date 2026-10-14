import type { AssetType } from "@/lib/schemas/transaction";

export interface Holding {
  ticker: string;
  type: AssetType;
  balance: string;
  averageCost: number;
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
