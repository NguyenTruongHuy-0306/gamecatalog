import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVerifiedAuth } from "@/lib/api-helpers";

const voteSchema = z.object({ value: z.union([z.literal(1), z.literal(-1)]) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const { session, error } = await requireVerifiedAuth();
  if (error) return error;

  const { rid } = await params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });

  const review = await prisma.review.findUnique({
    where: { id: rid, deletedAt: null },
    select: { id: true, userId: true, helpfulCount: true, notHelpfulCount: true },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.userId === session!.user.id)
    return NextResponse.json({ error: "You cannot vote on your own review" }, { status: 403 });

  const { value } = parsed.data;
  const existing = await prisma.reviewVote.findUnique({
    where: { userId_reviewId: { userId: session!.user.id, reviewId: rid } },
  });

  let helpfulDelta = 0;
  let notHelpfulDelta = 0;
  let userVote: number | null = value;

  if (existing) {
    if (existing.value === value) {
      // Same vote → toggle off
      await prisma.reviewVote.delete({ where: { userId_reviewId: { userId: session!.user.id, reviewId: rid } } });
      if (value === 1) helpfulDelta = -1; else notHelpfulDelta = -1;
      userVote = null;
    } else {
      // Changed vote
      await prisma.reviewVote.update({
        where: { userId_reviewId: { userId: session!.user.id, reviewId: rid } },
        data: { value },
      });
      if (value === 1) { helpfulDelta = 1; notHelpfulDelta = -1; }
      else { helpfulDelta = -1; notHelpfulDelta = 1; }
    }
  } else {
    await prisma.reviewVote.create({ data: { userId: session!.user.id, reviewId: rid, value } });
    if (value === 1) helpfulDelta = 1; else notHelpfulDelta = 1;
  }

  const updated = await prisma.review.update({
    where: { id: rid },
    data: {
      helpfulCount: { increment: helpfulDelta },
      notHelpfulCount: { increment: notHelpfulDelta },
    },
    select: { helpfulCount: true, notHelpfulCount: true },
  });

  return NextResponse.json({ ...updated, userVote });
}
