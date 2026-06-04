import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVerifiedAuth } from "@/lib/api-helpers";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
  captchaToken: z.string().optional().default(""),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = 10;

  const game = await prisma.game.findFirst({
    where: { OR: [{ id }, { slug: id }], isPublished: true },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { gameId: game.id, deletedAt: null },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { gameId: game.id, deletedAt: null } }),
  ]);

  return NextResponse.json({ reviews, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Gate 1 & 2: verified user, not banned
  const { session, error } = await requireVerifiedAuth();
  if (error) return error;

  // Gate 3: Rate limit (3 reviews per hour per user)
  const rateLimit = await checkRateLimit(
    `user:${session!.user.id}`,
    "review_submit",
    3,
    3600
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "You are submitting reviews too quickly. Please wait." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Gate 4: Validate input
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Gate 5: reCAPTCHA verification
  const captchaValid = await verifyRecaptcha(parsed.data.captchaToken);
  if (!captchaValid) {
    return NextResponse.json(
      { error: "CAPTCHA verification failed. Please try again." },
      { status: 403 }
    );
  }

  const game = await prisma.game.findFirst({
    where: { OR: [{ id }, { slug: id }], isPublished: true },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  // Gate 6: One review per user per game (enforced at DB level too)
  const existingReview = await prisma.review.findUnique({
    where: { gameId_userId: { gameId: game.id, userId: session!.user.id } },
  });
  if (existingReview && !existingReview.deletedAt) {
    return NextResponse.json(
      { error: "You have already reviewed this game" },
      { status: 409 }
    );
  }

  // If a soft-deleted review exists, restore it instead of creating a new row
  // (unique constraint on [gameId, userId] would reject a second create)
  const review = existingReview
    ? await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: parsed.data.rating,
          body: parsed.data.body,
          deletedAt: null,
          isFlagged: false,
          flaggedById: null,
          flagReason: null,
          flaggedAt: null,
        },
        include: { user: { select: { id: true, username: true } } },
      })
    : await prisma.review.create({
        data: {
          gameId: game.id,
          userId: session!.user.id,
          rating: parsed.data.rating,
          body: parsed.data.body,
        },
        include: { user: { select: { id: true, username: true } } },
      });

  // Recalculate denormalized avg_rating and review_count
  await recalculateRating(game.id);

  return NextResponse.json(review, { status: 201 });
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
