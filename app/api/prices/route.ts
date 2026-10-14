import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getQuotes } from '@/lib/market';
import { rateLimit } from '@/lib/rate-limit';
import { pricesBodySchema } from '@/lib/schemas/market';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = rateLimit(`api:prices:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = pricesBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }

    const quotes = await getQuotes(parsed.data.symbols);
    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error in /api/prices:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
