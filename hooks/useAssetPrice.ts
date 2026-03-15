import { useState, useEffect } from "react";

export function useAssetPrice(
  ticker: string,
  assetType: "crypto" | "stock",
  shouldFetch: boolean,
) {
  const [price, setPrice] = useState("");
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  useEffect(() => {
    if (!ticker || ticker.trim() === "" || !shouldFetch) return;

    const timeoutId = setTimeout(async () => {
      setIsFetchingPrice(true);
      try {
        const symbol =
          assetType === "crypto"
            ? `BINANCE:${ticker.toUpperCase()}USDT`
            : ticker.toUpperCase();

        const response = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: [symbol] }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].price) {
            setPrice(data[0].price.toString());
          }
        }
      } catch (error) {
        console.error("Failed to fetch price:", error);
      } finally {
        setIsFetchingPrice(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [ticker, assetType, shouldFetch]);

  return { price, setPrice, isFetchingPrice };
}
