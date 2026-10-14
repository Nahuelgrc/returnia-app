import { useState, useEffect } from "react";
import type { AssetType } from "@/lib/schemas/transaction";
import type { Quote } from "@/lib/types";
import { toProviderSymbol } from "@/lib/symbols";

export function useAssetPrice(ticker: string, assetType: AssetType) {
  const [price, setPrice] = useState("");
  const [settledKey, setSettledKey] = useState("");

  const active = ticker.trim() !== "";
  const key = `${assetType}:${ticker.trim()}`;

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: [toProviderSymbol(assetType, ticker)] }),
          signal: controller.signal,
        });

        if (response.ok) {
          const data: Quote[] = await response.json();
          setPrice(data[0]?.price ? data[0].price.toString() : "");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch price:", error);
      }
      setSettledKey(key);
    }, 800);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [active, key, ticker, assetType]);

  const isFetchingPrice = active && settledKey !== key;

  return { price, setPrice, isFetchingPrice };
}
