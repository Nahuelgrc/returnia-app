import { toProviderSymbol } from "@/lib/symbols";
import type { Asset, Holding, Quote } from "@/lib/types";

export const getProviderSymbols = (holdings: Holding[]) =>
  Array.from(
    new Set(holdings.map((h) => toProviderSymbol(h.type, h.ticker))),
  ).sort();

export const buildAssets = (holdings: Holding[], quotes: Quote[]): Asset[] => {
  const priceBySymbol = new Map(quotes.map((q) => [q.symbol, q.price]));

  return holdings.map((holding) => {
    const price =
      priceBySymbol.get(toProviderSymbol(holding.type, holding.ticker)) ?? 0;

    return {
      ...holding,
      name: holding.ticker,
      price,
      value: parseFloat(holding.balance) * price,
      change:
        holding.averageCost > 0 && price > 0
          ? ((price - holding.averageCost) / holding.averageCost) * 100
          : 0,
    };
  });
};

export const totalValue = (assets: Asset[]) =>
  assets.reduce((sum, asset) => sum + asset.value, 0);
