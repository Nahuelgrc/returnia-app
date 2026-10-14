import { BINANCE_PREFIX } from "@/lib/symbols";
import type { Quote, SymbolSearchResult } from "@/lib/types";

const BASE_URL = "https://data-api.binance.vision/api/v3";
const EXCHANGE_INFO_TTL_MS = 3600 * 1000;
const PRICE_REVALIDATE_SECONDS = 10;

interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

interface ExchangeInfoCache {
  results: SymbolSearchResult[];
  known: Set<string>;
  fetchedAt: number;
}

let exchangeInfoCache: ExchangeInfoCache | null = null;

async function loadExchangeInfo() {
  if (
    exchangeInfoCache &&
    Date.now() - exchangeInfoCache.fetchedAt < EXCHANGE_INFO_TTL_MS
  ) {
    return exchangeInfoCache;
  }

  try {
    const response = await fetch(`${BASE_URL}/exchangeInfo`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return exchangeInfoCache;

    const data: { symbols: BinanceSymbol[] } = await response.json();
    const results: SymbolSearchResult[] = data.symbols
      .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
      .map((s) => ({
        description: `${s.baseAsset}/${s.quoteAsset}`,
        displaySymbol: s.baseAsset,
        symbol: `${BINANCE_PREFIX}${s.symbol}`,
        type: "crypto",
      }));

    exchangeInfoCache = {
      results,
      known: new Set(results.map((r) => r.symbol)),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error("Failed to fetch Binance exchange info:", error);
  }
  return exchangeInfoCache;
}

export async function searchBinanceSymbols(
  query: string,
): Promise<SymbolSearchResult[]> {
  const info = await loadExchangeInfo();
  if (!info) return [];

  const upperQuery = query.toUpperCase();
  return info.results
    .filter((r) => r.displaySymbol.startsWith(upperQuery))
    .slice(0, 10);
}

export async function getBinanceQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const info = await loadExchangeInfo();
  const tradable = info ? symbols.filter((s) => info.known.has(s)) : symbols;
  const prices = new Map<string, number>();

  if (tradable.length > 0) {
    try {
      const raw = JSON.stringify(tradable.map((s) => s.slice(BINANCE_PREFIX.length)));
      const response = await fetch(
        `${BASE_URL}/ticker/price?symbols=${encodeURIComponent(raw)}`,
        {
          next: { revalidate: PRICE_REVALIDATE_SECONDS },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data: BinanceTickerPrice[] = await response.json();
      for (const item of data) {
        prices.set(`${BINANCE_PREFIX}${item.symbol}`, Number(item.price));
      }
    } catch (error) {
      console.error("Error fetching Binance prices:", error);
    }
  }

  return symbols.map((symbol) => {
    const price = prices.get(symbol);
    return price ? { symbol, price } : { symbol };
  });
}
