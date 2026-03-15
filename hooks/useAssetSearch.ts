import { useState, useEffect } from "react";

export function useAssetSearch(query: string, assetType: "crypto" | "stock", showDropdown: boolean) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query || query.trim() === "" || !showDropdown) {
      setSearchResults([]);
      return;
    }

    // Set searching immediately for snappy UI
    setIsSearching(true);

    const searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${assetType}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Failed to search symbols:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(searchTimeout);
  }, [query, assetType, showDropdown]);

  return { searchResults, isSearching, setSearchResults };
}
