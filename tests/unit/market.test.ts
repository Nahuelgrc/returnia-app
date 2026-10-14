import { beforeEach, describe, expect, it, vi } from "vitest";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, statusText: status === 200 ? "OK" : "Err" });

const exchangeInfo = {
  symbols: [
    { symbol: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT", status: "TRADING" },
    { symbol: "ETHUSDT", baseAsset: "ETH", quoteAsset: "USDT", status: "TRADING" },
    { symbol: "OLDUSDT", baseAsset: "OLD", quoteAsset: "USDT", status: "BREAK" },
    { symbol: "BTCEUR", baseAsset: "BTC", quoteAsset: "EUR", status: "TRADING" },
  ],
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("binance", () => {
  const load = () => import("@/lib/market/binance");

  const route = (prices: unknown = [], priceStatus = 200) =>
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("exchangeInfo") ? json(exchangeInfo) : json(prices, priceStatus),
    );

  it("searches by prefix only USDT pairs in TRADING", async () => {
    route();
    const { searchBinanceSymbols } = await load();
    expect(await searchBinanceSymbols("b")).toEqual([
      {
        description: "BTC/USDT",
        displaySymbol: "BTC",
        symbol: "BINANCE:BTCUSDT",
        type: "crypto",
      },
    ]);
    expect(await searchBinanceSymbols("old")).toEqual([]);
  });

  it("search is case-insensitive", async () => {
    route();
    const { searchBinanceSymbols } = await load();
    expect((await searchBinanceSymbols("eth"))[0].displaySymbol).toBe("ETH");
  });

  it("limits to 10 results", async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      symbol: `A${i}USDT`,
      baseAsset: `A${i}`,
      quoteAsset: "USDT",
      status: "TRADING",
    }));
    fetchMock.mockResolvedValue(json({ symbols: many }));
    const { searchBinanceSymbols } = await load();
    expect(await searchBinanceSymbols("a")).toHaveLength(10);
  });

  it("caches exchangeInfo between searches", async () => {
    route();
    const { searchBinanceSymbols } = await load();
    await searchBinanceSymbols("b");
    await searchBinanceSymbols("e");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns [] if exchangeInfo responds with an HTTP error", async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const { searchBinanceSymbols } = await load();
    expect(await searchBinanceSymbols("b")).toEqual([]);
  });

  it("returns [] on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const { searchBinanceSymbols } = await load();
    expect(await searchBinanceSymbols("b")).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it("getBinanceQuotes with an empty list does not call the network", async () => {
    const { getBinanceQuotes } = await load();
    expect(await getBinanceQuotes([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses prices and keeps the order", async () => {
    route([
      { symbol: "BTCUSDT", price: "50000.5" },
      { symbol: "ETHUSDT", price: "3000" },
    ]);
    const { getBinanceQuotes } = await load();
    expect(await getBinanceQuotes(["BINANCE:ETHUSDT", "BINANCE:BTCUSDT"])).toEqual([
      { symbol: "BINANCE:ETHUSDT", price: 3000 },
      { symbol: "BINANCE:BTCUSDT", price: 50000.5 },
    ]);
  });

  it("filters unknown symbols before requesting prices", async () => {
    route([{ symbol: "BTCUSDT", price: "1" }]);
    const { getBinanceQuotes } = await load();
    const quotes = await getBinanceQuotes(["BINANCE:BTCUSDT", "BINANCE:FAKEUSDT"]);
    expect(quotes).toEqual([
      { symbol: "BINANCE:BTCUSDT", price: 1 },
      { symbol: "BINANCE:FAKEUSDT" },
    ]);
    const priceUrl = fetchMock.mock.calls.find((c) => c[0].includes("ticker/price"))![0];
    expect(decodeURIComponent(priceUrl.split("symbols=")[1])).toBe('["BTCUSDT"]');
  });

  it("if all symbols are unknown it does not request prices", async () => {
    route();
    const { getBinanceQuotes } = await load();
    expect(await getBinanceQuotes(["BINANCE:FAKEUSDT"])).toEqual([
      { symbol: "BINANCE:FAKEUSDT" },
    ]);
    expect(fetchMock.mock.calls.some((c) => c[0].includes("ticker/price"))).toBe(false);
  });

  it("HTTP error on prices returns quotes without price", async () => {
    route({}, 429);
    const { getBinanceQuotes } = await load();
    expect(await getBinanceQuotes(["BINANCE:BTCUSDT"])).toEqual([
      { symbol: "BINANCE:BTCUSDT" },
    ]);
    expect(console.error).toHaveBeenCalled();
  });

  it("if exchangeInfo fails it still tries to request prices", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("exchangeInfo")
        ? json({}, 500)
        : json([{ symbol: "BTCUSDT", price: "2" }]),
    );
    const { getBinanceQuotes } = await load();
    expect(await getBinanceQuotes(["BINANCE:BTCUSDT"])).toEqual([
      { symbol: "BINANCE:BTCUSDT", price: 2 },
    ]);
  });
});

describe("finnhub", () => {
  const load = () => import("@/lib/market/finnhub");

  it("parses the quote", async () => {
    fetchMock.mockResolvedValue(json({ c: 190.5, d: 1.5, dp: 0.8 }));
    const { getFinnhubQuotes } = await load();
    expect(await getFinnhubQuotes(["AAPL"])).toEqual([
      { symbol: "AAPL", price: 190.5, change: 1.5, percentChange: 0.8 },
    ]);
  });

  it("encodes the symbol in the URL and sends the token", async () => {
    fetchMock.mockResolvedValue(json({ c: 1 }));
    const { getFinnhubQuotes } = await load();
    await getFinnhubQuotes(["A&B=C"]);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("symbol=A%26B%3DC");
    expect(url).toContain("token=test-key");
  });

  it("HTTP error returns quote without price", async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const { getFinnhubQuotes } = await load();
    expect(await getFinnhubQuotes(["AAPL"])).toEqual([{ symbol: "AAPL" }]);
  });

  it("network error returns quote without price", async () => {
    fetchMock.mockRejectedValue(new Error("net"));
    const { getFinnhubQuotes } = await load();
    expect(await getFinnhubQuotes(["AAPL"])).toEqual([{ symbol: "AAPL" }]);
  });

  it("without an API key it does not call the network", async () => {
    vi.stubEnv("FINNHUB_API_KEY", "");
    const { getFinnhubQuotes, searchFinnhubSymbols } = await load();
    expect(await getFinnhubQuotes(["AAPL"])).toEqual([{ symbol: "AAPL" }]);
    expect(await searchFinnhubSymbols("a")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("empty list returns empty", async () => {
    const { getFinnhubQuotes } = await load();
    expect(await getFinnhubQuotes([])).toEqual([]);
  });

  it("limits concurrency to 5 and keeps the order", async () => {
    let inFlight = 0;
    let max = 0;
    fetchMock.mockImplementation(async (url: string) => {
      inFlight += 1;
      max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 0));
      inFlight -= 1;
      const symbol = new URL(url).searchParams.get("symbol")!;
      return json({ c: Number(symbol.slice(1)) });
    });
    const { getFinnhubQuotes } = await load();
    const symbols = Array.from({ length: 12 }, (_, i) => `S${i}`);
    const quotes = await getFinnhubQuotes(symbols);
    expect(max).toBeLessThanOrEqual(5);
    expect(quotes.map((q) => q.symbol)).toEqual(symbols);
    expect(quotes.map((q) => q.price)).toEqual(symbols.map((_, i) => i));
  });

  it("searches symbols filtering type, length and characters", async () => {
    fetchMock.mockResolvedValue(
      json({
        result: [
          { description: "APPLE", displaySymbol: "AAPL", symbol: "AAPL", type: "Common Stock" },
          { description: "ETF", displaySymbol: "SPY", symbol: "SPY", type: "ETP" },
          { description: "No type", displaySymbol: "XYZ", symbol: "XYZ" },
          { description: "Punto", displaySymbol: "BRK.B", symbol: "BRK.B", type: "Common Stock" },
          { description: "Guion", displaySymbol: "A-B", symbol: "A-B", type: "Common Stock" },
          { description: "Largo", displaySymbol: "ABCDEFGHI", symbol: "X", type: "Common Stock" },
          { description: "Warrant", displaySymbol: "WRT", symbol: "WRT", type: "Warrant" },
        ],
      }),
    );
    const { searchFinnhubSymbols } = await load();
    const results = await searchFinnhubSymbols("a");
    expect(results.map((r) => r.displaySymbol)).toEqual(["AAPL", "SPY", "XYZ"]);
    expect(results.every((r) => r.type === "stock")).toBe(true);
  });

  it("limits the search to 10 results", async () => {
    const result = Array.from({ length: 20 }, (_, i) => ({
      description: "d",
      displaySymbol: `S${i}`,
      symbol: `S${i}`,
      type: "Common Stock",
    }));
    fetchMock.mockResolvedValue(json({ result }));
    const { searchFinnhubSymbols } = await load();
    expect(await searchFinnhubSymbols("s")).toHaveLength(10);
  });

  it("search without result returns []", async () => {
    fetchMock.mockResolvedValue(json({}));
    const { searchFinnhubSymbols } = await load();
    expect(await searchFinnhubSymbols("s")).toEqual([]);
  });

  it("search with HTTP or network error returns []", async () => {
    const { searchFinnhubSymbols } = await load();
    fetchMock.mockResolvedValueOnce(json({}, 500));
    expect(await searchFinnhubSymbols("s")).toEqual([]);
    fetchMock.mockRejectedValueOnce(new Error("net"));
    expect(await searchFinnhubSymbols("s")).toEqual([]);
  });

  it("encodes the search query", async () => {
    fetchMock.mockResolvedValue(json({ result: [] }));
    const { searchFinnhubSymbols } = await load();
    await searchFinnhubSymbols("a b&c");
    expect(fetchMock.mock.calls[0][0]).toContain("q=a%20b%26c");
  });
});

describe("market index", () => {
  it("routes symbols, deduplicates and keeps the order", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("exchangeInfo")) return json(exchangeInfo);
      if (url.includes("binance")) return json([{ symbol: "BTCUSDT", price: "10" }]);
      return json({ c: 5 });
    });
    const { getQuotes } = await import("@/lib/market");
    const quotes = await getQuotes(["AAPL", "BINANCE:BTCUSDT", "AAPL", "MSFT"]);
    expect(quotes).toEqual([
      { symbol: "AAPL", price: 5, change: undefined, percentChange: undefined },
      { symbol: "BINANCE:BTCUSDT", price: 10 },
      { symbol: "MSFT", price: 5, change: undefined, percentChange: undefined },
    ]);
  });

  it("searchSymbols uses stocks by default and crypto when requested", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("exchangeInfo") ? json(exchangeInfo) : json({ result: [] }),
    );
    const { searchSymbols } = await import("@/lib/market");
    expect(await searchSymbols("b")).toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toContain("finnhub.io");
    const crypto = await searchSymbols("b", "crypto");
    expect(crypto[0].displaySymbol).toBe("BTC");
  });
});
