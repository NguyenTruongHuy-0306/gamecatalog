import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("flag"), flagReason: z.string().max(500).optional() }),
  z.object({ action: z.literal("unflag") }),
  z.object({ action: z.literal("delete") }),
  z.object({
    action: z.literal("edit"),
    rating: z.number().int().min(1).max(5).optional(),
    body: z.string().max(2000).optional(),
  }),
]);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "delete") {
    await prisma.review.update({ where: { id }, data: { deletedAt: new Date() } });
    await recalculateRating(review.gameId);
    return NextResponse.json({ message: "Review deleted" });
  }

  if (parsed.data.action === "edit") {
    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(parsed.data.rating !== undefined ? { rating: parsed.data.rating } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
      },
    });
    if (parsed.data.rating !== undefined) await recalculateRating(review.gameId);
    return NextResponse.json(updated);
  }

  if (parsed.data.action === "flag") {
    await prisma.review.update({
      where: { id },
      data: {
        isFlagged: true,
        flaggedById: session!.user.id,
        flagReason: parsed.data.flagReason ?? null,
        flaggedAt: new Date(),
      },
    });
    return NextResponse.json({ message: "Review flagged" });
  }

  // unflag
  await prisma.review.update({
    where: { id },
    data: { isFlagged: false, flaggedById: null, flagReason: null, flaggedAt: null },
  });
  return NextResponse.json({ message: "Review unflagged" });
}

async function recalculateRating(gameId: string) {
  const stats = await prisma.review.aggregate({
    where: { gameId, deletedAt: null },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.game.update({
    where: { id: gameId },
    data: { avgRating: stats._avg.rating ?? 0, reviewCount: stats._count.id },
  });
}
