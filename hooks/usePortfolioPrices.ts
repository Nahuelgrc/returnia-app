import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getProviderSymbols } from "@/lib/portfolio-view";
import type { Holding, Quote } from "@/lib/types";

const REFRESH_INTERVAL_MS = 20_000;
const NO_QUOTES: Quote[] = [];

export function usePortfolioPrices(holdings: Holding[]) {
  const symbols = useMemo(() => getProviderSymbols(holdings), [holdings]);

  const { data } = useQuery({
    queryKey: ["prices", symbols],
    enabled: symbols.length > 0,
    refetchInterval: REFRESH_INTERVAL_MS,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<Quote[]> => {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
        signal,
      });
      if (!response.ok) {
        throw new Error(`Prices request failed: ${response.status}`);
      }
      return response.json();
    },
  });

  return data ?? NO_QUOTES;
}
