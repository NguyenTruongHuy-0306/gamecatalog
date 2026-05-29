import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVerifiedAuth } from "@/lib/api-helpers";

const schema = z.object({
  reason: z.string().max(500).optional(),
});

type Params = { params: Promise<{ id: string; rid: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { rid } = await params;
  const { session, error } = await requireVerifiedAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = schema.safeParse(body);

  const review = await prisma.review.findUnique({ where: { id: rid } });
  if (!review || review.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (review.userId === session!.user.id) {
    return NextResponse.json({ error: "Cannot flag your own review" }, { status: 400 });
  }

  await prisma.review.update({
    where: { id: rid },
    data: {
      isFlagged: true,
      flaggedById: session!.user.id,
      flagReason: parsed.success ? (parsed.data.reason ?? null) : null,
      flaggedAt: new Date(),
    },
  });

  return NextResponse.json({ message: "Review flagged for moderation" });
}
