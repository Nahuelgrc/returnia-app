import type { AssetType } from "@/lib/schemas/transaction";
import { isBinanceSymbol } from "@/lib/symbols";
import type { Quote, SymbolSearchResult } from "@/lib/types";
import { getBinanceQuotes, searchBinanceSymbols } from "./binance";
import { getFinnhubQuotes, searchFinnhubSymbols } from "./finnhub";

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = Array.from(new Set(symbols));

  const [crypto, stocks] = await Promise.all([
    getBinanceQuotes(unique.filter(isBinanceSymbol)),
    getFinnhubQuotes(unique.filter((s) => !isBinanceSymbol(s))),
  ]);

  const bySymbol = new Map([...crypto, ...stocks].map((q) => [q.symbol, q]));
  return unique.map((symbol) => bySymbol.get(symbol) ?? { symbol });
}

export function searchSymbols(
  query: string,
  type: AssetType = "stock",
): Promise<SymbolSearchResult[]> {
  return type === "crypto"
    ? searchBinanceSymbols(query)
    : searchFinnhubSymbols(query);
}
