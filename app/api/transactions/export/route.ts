import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { transactionsToCsv } from "@/lib/transactions-csv";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const limit = rateLimit(`api:export:${userId}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: [{ executedAt: "asc" }, { id: "asc" }],
      select: {
        executedAt: true,
        side: true,
        assetType: true,
        tickerName: true,
        quantity: true,
        price: true,
        comments: true,
      },
    });

    return new Response(transactionsToCsv(transactions), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error in /api/transactions/export:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
