import type { AssetType } from "@/lib/schemas/transaction";

export const BINANCE_PREFIX = "BINANCE:";

export const isBinanceSymbol = (symbol: string) =>
  symbol.startsWith(BINANCE_PREFIX);

export const toProviderSymbol = (assetType: AssetType, ticker: string) => {
  const normalized = ticker.trim().toUpperCase();
  return assetType === "crypto" ? `${BINANCE_PREFIX}${normalized}USDT` : normalized;
};
