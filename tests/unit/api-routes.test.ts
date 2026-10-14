import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getQuotes: vi.fn(),
  searchSymbols: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/market", () => ({
  getQuotes: mocks.getQuotes,
  searchSymbols: mocks.searchSymbols,
}));

import { POST } from "@/app/api/prices/route";
import { GET } from "@/app/api/search/route";

let userCounter = 0;

const pricesRequest = (body: unknown, raw = false) =>
  new Request("http://localhost/api/prices", {
    method: "POST",
    body: raw ? (body as string) : JSON.stringify(body),
  });

const searchRequest = (qs: string) => new Request(`http://localhost/api/search${qs}`);

beforeEach(() => {
  userCounter += 1;
  mocks.auth.mockResolvedValue({ user: { id: `api-user-${userCounter}` } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/prices", () => {
  it("401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(pricesRequest({ symbols: ["AAPL"] }));
    expect(res.status).toBe(401);
    expect(mocks.getQuotes).not.toHaveBeenCalled();
  });

  it("400 with invalid JSON", async () => {
    const res = await POST(pricesRequest("{no-json", true));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it.each([
    [{}],
    [{ symbols: [] }],
    [{ symbols: "AAPL" }],
    [{ symbols: ["bad symbol"] }],
    [{ symbols: ["a&b"] }],
    [{ symbols: Array.from({ length: 101 }, () => "A") }],
  ])("400 with invalid body %j", async (body) => {
    const res = await POST(pricesRequest(body));
    expect(res.status).toBe(400);
    expect(mocks.getQuotes).not.toHaveBeenCalled();
  });

  it("200 with quotes", async () => {
    const quotes = [{ symbol: "AAPL", price: 190 }];
    mocks.getQuotes.mockResolvedValue(quotes);
    const res = await POST(pricesRequest({ symbols: ["AAPL"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(quotes);
    expect(mocks.getQuotes).toHaveBeenCalledWith(["AAPL"]);
  });

  it("429 with Retry-After after 60 requests from the same user", async () => {
    mocks.getQuotes.mockResolvedValue([]);
    mocks.auth.mockResolvedValue({ user: { id: "heavy-user" } });
    for (let i = 0; i < 60; i++) {
      expect((await POST(pricesRequest({ symbols: ["AAPL"] }))).status).toBe(200);
    }
    const res = await POST(pricesRequest({ symbols: ["AAPL"] }));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("generic 500 if the provider fails", async () => {
    mocks.getQuotes.mockRejectedValue(new Error("api key abc123"));
    const res = await POST(pricesRequest({ symbols: ["AAPL"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /api/search", () => {
  it("401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET(searchRequest("?q=btc"));
    expect(res.status).toBe(401);
    expect(mocks.searchSymbols).not.toHaveBeenCalled();
  });

  it.each(["", "?q=", "?q=%20%20", `?q=${"a".repeat(51)}`, "?q=btc&type=bond"])(
    "400 with invalid query %s",
    async (qs) => {
      const res = await GET(searchRequest(qs));
      expect(res.status).toBe(400);
      expect(mocks.searchSymbols).not.toHaveBeenCalled();
    },
  );

  it("200 with results and type", async () => {
    const results = [{ symbol: "BINANCE:BTCUSDT", displaySymbol: "BTC" }];
    mocks.searchSymbols.mockResolvedValue(results);
    const res = await GET(searchRequest("?q=btc&type=crypto"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(results);
    expect(mocks.searchSymbols).toHaveBeenCalledWith("btc", "crypto");
  });

  it("passes undefined without type", async () => {
    mocks.searchSymbols.mockResolvedValue([]);
    await GET(searchRequest("?q=aapl"));
    expect(mocks.searchSymbols).toHaveBeenCalledWith("aapl", undefined);
  });

  it("429 after 60 requests from the same user", async () => {
    mocks.searchSymbols.mockResolvedValue([]);
    mocks.auth.mockResolvedValue({ user: { id: "heavy-searcher" } });
    for (let i = 0; i < 60; i++) await GET(searchRequest("?q=a"));
    const res = await GET(searchRequest("?q=a"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("generic 500 if the provider fails", async () => {
    mocks.searchSymbols.mockRejectedValue(new Error("secret"));
    const res = await GET(searchRequest("?q=a"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
  });
});
