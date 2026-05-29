import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const favorites = await prisma.favorite.findMany({
    where: { userId: session!.user.id },
    include: {
      game: {
        include: { gameGenres: { include: { genre: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favorites.map((f) => f.game));
}

const addSchema = z.object({ gameId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id: parsed.data.gameId },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  try {
    await prisma.favorite.create({
      data: { userId: session!.user.id, gameId: parsed.data.gameId },
    });
  } catch {
    // Already favorited — idempotent
  }

  return NextResponse.json({ message: "Added to favorites" }, { status: 201 });
}
