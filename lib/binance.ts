const BINANCE_API_URL = "https://api.binance.com/api/v3";

export async function getCryptoPrice(symbol: string) {
  // Binance symbols usually look like BTCUSDT
  const response = await fetch(
    `${BINANCE_API_URL}/ticker/price?symbol=${symbol}`,
    {
      next: { revalidate: 30 }, // Cache for 30 seconds
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch price for ${symbol}`);
  }

  return response.json();
}

// Websocket connection placeholder
export function connectBinanceStream(
  symbol: string,
  onMessage: (data: any) => void,
) {
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`,
  );

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  return ws;
}

// Memory cache for exchange info to avoid repeating large downloads
let binanceExchangeInfoCache: any[] = [];
let lastBinanceFetchTime = 0;

export async function searchBinanceSymbols(query: string) {
  const now = Date.now();
  // Cache Binance exchange info for 1 hour
  if (
    binanceExchangeInfoCache.length === 0 ||
    now - lastBinanceFetchTime > 3600 * 1000
  ) {
    try {
      const response = await fetch(
        "https://api.binance.com/api/v3/exchangeInfo",
      );
      if (response.ok) {
        const data = await response.json();
        // Extract trading pairs that quote in USDT
        binanceExchangeInfoCache = data.symbols
          .filter((s: any) => s.status === "TRADING" && s.quoteAsset === "USDT")
          .map((s: any) => ({
            description: s.baseAsset + " (Bitcoin/Crypto)",
            displaySymbol: s.baseAsset,
            symbol: s.symbol,
            type: "Crypto",
          }));
        lastBinanceFetchTime = now;
      }
    } catch (error) {
      console.error("Failed to fetch Binance exchange info:", error);
      return [];
    }
  }

  const upperQuery = query.toUpperCase();
  // Return the first 10 items starting with the query
  return binanceExchangeInfoCache
    .filter((s) => s.displaySymbol.startsWith(upperQuery))
    .slice(0, 10);
}
