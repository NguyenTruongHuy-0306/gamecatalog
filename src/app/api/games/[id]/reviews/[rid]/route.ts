import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, getClientIp } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  body: z.string().max(2000).optional(),
});

type Params = { params: Promise<{ id: string; rid: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { rid } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  const review = await prisma.review.findUnique({ where: { id: rid } });
  if (!review || review.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = review.userId === session!.user.id;
  const isAdmin = session!.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.review.update({
    where: { id: rid },
    data: parsed.data,
    include: { user: { select: { id: true, username: true } } },
  });

  if (parsed.data.rating !== undefined) {
    await recalculateRating(review.gameId);
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { rid } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  const ip = getClientIp(request);
  const [ipLimit, userLimit] = await Promise.all([
    checkRateLimit(`ip:${ip}`, "delete-review", 20, 60),
    checkRateLimit(`user:${session!.user.id}`, "delete-review-user", 10, 3600),
  ]);
  if (!ipLimit.allowed || !userLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
  }

  const review = await prisma.review.findUnique({ where: { id: rid } });
  if (!review || review.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = review.userId === session!.user.id;
  const isAdmin = session!.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.review.update({
    where: { id: rid },
    data: { deletedAt: new Date() },
  });

  await recalculateRating(review.gameId);

  return NextResponse.json({ message: "Review deleted" });
}

async function recalculateRating(gameId: string) {
  const stats = await prisma.review.aggregate({
    where: { gameId, deletedAt: null },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.game.update({
    where: { id: gameId },
    data: {
      avgRating: stats._avg.rating ?? 0,
      reviewCount: stats._count.id,
    },
  });
}
