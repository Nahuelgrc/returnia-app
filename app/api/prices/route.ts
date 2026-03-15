import { NextResponse } from 'next/server';
import { getMultipleQuotes } from '@/lib/finnhub';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'Symbols must be an array' }, { status: 400 });
    }

    const quotes = await getMultipleQuotes(symbols);
    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error in /api/prices:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
