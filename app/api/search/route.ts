import { NextResponse } from "next/server";
import { searchSymbols as finnhubSearch } from "@/lib/finnhub";
import { searchBinanceSymbols } from "@/lib/binance";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type"); // "crypto" | "stock"

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    if (type === "crypto") {
      const cryptoResults = await searchBinanceSymbols(query);
      return NextResponse.json(cryptoResults);
    }

    // Default to Finnhub for stocks or unspecified
    const results = await finnhubSearch(query);
    
    // Filter out long/weird symbols and focus on US equities
    const filteredResults = results
      .filter((r: any) => 
        r.displaySymbol.length <= 8 &&
        !r.displaySymbol.includes('.') && 
        !r.displaySymbol.includes('-') &&
        (r.type === "Common Stock" || r.type === "ETP" || !r.type)
      )
      .slice(0, 10);

    return NextResponse.json(filteredResults);
  } catch (error) {
    console.error("Error in /api/search:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
