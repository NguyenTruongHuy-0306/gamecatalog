import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runIgdbSync } from "@/lib/igdb-sync";
import { prisma } from "@/lib/db";

export const maxDuration = 300;

export async function GET() {
  const state = await prisma.igdbSyncState.findUnique({ where: { id: 1 } });
  const pending = await prisma.game.count({
    where: { igdbId: { not: null }, isPublished: false },
  });
  return NextResponse.json({
    lastSyncedAt: state?.lastSyncedAt ?? 0,
    pending,
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isCron =
    !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const session = await auth();
    if (session?.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runIgdbSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("IGDB sync error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
