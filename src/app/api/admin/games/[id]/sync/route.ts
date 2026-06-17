import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { syncIgdbGameById } from "@/lib/igdb-sync";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    select: { slug: true, igdbId: true },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!game.igdbId)
    return NextResponse.json({ error: "Game has no IGDB ID" }, { status: 400 });

  const outcome = await syncIgdbGameById(game.igdbId);

  if (outcome === "not_found")
    return NextResponse.json({ error: "Game not found on IGDB" }, { status: 404 });

  revalidatePath(`/games/${game.slug}`);
  return NextResponse.json({ message: `Game ${outcome}.` });
}
