import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { searchParamsSchema } from "@/lib/schemas/market";
import { searchSymbols } from "@/lib/market";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`api:search:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchParamsSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const { q: query, type } = parsed.data;

    const results = await searchSymbols(query, type);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in /api/search:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
