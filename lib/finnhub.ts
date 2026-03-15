const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function getQuote(symbol: string) {
  if (!FINNHUB_API_KEY) {
    console.error("FINNHUB_API_KEY is missing");
    return null;
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } } // Cache for 1 minute
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Finnhub returns { c: current price, d: change, dp: percent change, ... }
    return {
      price: data.c,
      change: data.d,
      percentChange: data.dp,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function getMultipleQuotes(symbols: string[]) {
  const promises = symbols.map(async (symbol) => {
    const quote = await getQuote(symbol);
    return { symbol, ...quote };
  });

  return Promise.all(promises);
}

export async function searchSymbols(query: string) {
  if (!FINNHUB_API_KEY) {
    console.error("FINNHUB_API_KEY is missing");
    return [];
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 3600 } } // Cache search results for 1 hour to save API calls
    );

    if (!response.ok) {
      throw new Error(`Finnhub Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error(`Error searching symbol ${query}:`, error);
    return [];
  }
}
