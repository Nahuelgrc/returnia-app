import { useState, useEffect } from "react";
import type { AssetType } from "@/lib/schemas/transaction";
import type { SymbolSearchResult } from "@/lib/types";

export function useAssetSearch(query: string, assetType: AssetType, showDropdown: boolean) {
  const [state, setState] = useState<{ key: string; results: SymbolSearchResult[] }>({
    key: "",
    results: [],
  });

  const active = showDropdown && query.trim() !== "";
  const key = `${assetType}:${query}`;

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    const searchTimeout = setTimeout(async () => {
      let results: SymbolSearchResult[] = [];
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${assetType}`,
          { signal: controller.signal },
        );
        if (response.ok) results = await response.json();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to search symbols:", error);
      }
      setState({ key, results });
    }, 400);

    return () => {
      clearTimeout(searchTimeout);
      controller.abort();
    };
  }, [active, key, query, assetType]);

  const isSearching = active && state.key !== key;
  const searchResults = active && state.key === key ? state.results : [];

  return { searchResults, isSearching };
}
