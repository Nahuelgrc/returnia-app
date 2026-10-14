import { describe, expect, it } from "vitest";
import { BINANCE_PREFIX, isBinanceSymbol, toProviderSymbol } from "@/lib/symbols";

describe("symbols", () => {
  it("crypto is converted to a Binance USDT pair", () => {
    expect(toProviderSymbol("crypto", "btc")).toBe("BINANCE:BTCUSDT");
  });

  it("stocks stay uppercase without prefix", () => {
    expect(toProviderSymbol("stock", " aapl ")).toBe("AAPL");
  });

  it("detects Binance symbols", () => {
    expect(isBinanceSymbol(`${BINANCE_PREFIX}ETHUSDT`)).toBe(true);
    expect(isBinanceSymbol("AAPL")).toBe(false);
  });
});
