import type { Quote, SymbolSearchResult } from "@/lib/types";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

interface FinnhubSearchItem {
  description: string;
  displaySymbol: string;
  symbol: string;
  type?: string;
}

async function getQuote(symbol: string): Promise<Quote> {
  if (!FINNHUB_API_KEY) {
    console.error("FINNHUB_API_KEY is missing");
    return { symbol };
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) },
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.statusText}`);
    }

    const data: { c?: number; d?: number; dp?: number } = await response.json();
    return {
      symbol,
      price: data.c,
      change: data.d,
      percentChange: data.dp,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return { symbol };
  }
}

export async function getFinnhubQuotes(symbols: string[]): Promise<Quote[]> {
  const results: Quote[] = new Array(symbols.length);
  let next = 0;

  const worker = async () => {
    while (next < symbols.length) {
      const index = next++;
      results[index] = await getQuote(symbols[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(5, symbols.length) }, worker),
  );
  return results;
}

export async function searchFinnhubSymbols(
  query: string,
): Promise<SymbolSearchResult[]> {
  if (!FINNHUB_API_KEY) {
    console.error("FINNHUB_API_KEY is missing");
    return [];
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
    );

    if (!response.ok) {
      throw new Error(`Finnhub Search API error: ${response.statusText}`);
    }

    const data: { result?: FinnhubSearchItem[] } = await response.json();
    return (data.result ?? [])
      .filter(
        (r) =>
          r.displaySymbol.length <= 8 &&
          !r.displaySymbol.includes(".") &&
          !r.displaySymbol.includes("-") &&
          (r.type === "Common Stock" || r.type === "ETP" || !r.type),
      )
      .slice(0, 10)
      .map((r) => ({
        description: r.description,
        displaySymbol: r.displaySymbol,
        symbol: r.symbol,
        type: "stock",
      }));
  } catch (error) {
    console.error(`Error searching symbol ${query}:`, error);
    return [];
  }
}
