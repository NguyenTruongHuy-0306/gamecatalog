import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";

const listSchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  year: z.coerce.number().int().optional(),
  quality: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["rating", "year", "title"]).optional().default("rating"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user.role === "admin";

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { q, genre, year, quality, minRating, sort, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.GameWhereInput = {};

  if (!isAdmin) where.isPublished = true;

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (genre) {
    where.gameGenres = { some: { genre: { slug: genre } } };
  }

  if (year) {
    where.releaseYear = year;
  }

  if (quality) {
    where.qualityTier = quality;
  }

  if (minRating) {
    where.avgRating = { gte: minRating };
  }

  const orderBy: Prisma.GameOrderByWithRelationInput =
    sort === "rating"
      ? { avgRating: "desc" }
      : sort === "year"
        ? { releaseYear: "desc" }
        : { title: "asc" };

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        gameGenres: { include: { genre: true } },
      },
    }),
    prisma.game.count({ where }),
  ]);

  return NextResponse.json({
    games,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().min(1),
  releaseYear: z.number().int().min(1970).max(2100),
  developer: z.string().max(255).optional(),
  publisher: z.string().max(255).optional(),
  qualityTier: z.enum(["AAA", "indie", "free-to-play"]).optional(),
  youtubeVideoId: z.string().max(20).optional(),
  coverImageUrl: z
    .string()
    .url()
    .refine((url) => {
      try {
        const { hostname } = new URL(url);
        const allowed = ["images.igdb.com", "res.cloudinary.com", "img.youtube.com"];
        return allowed.some((h) => hostname === h || hostname.endsWith(`.${h}`));
      } catch {
        return false;
      }
    }, "Cover image must be from an allowed domain (IGDB, Cloudinary, YouTube)")
    .optional(),
  isPublished: z.boolean().optional().default(false),
  genreIds: z.array(z.string().uuid()).optional().default([]),
  purchaseLinks: z
    .array(z.object({ store: z.string().min(1).max(50), url: z.string().url() }))
    .optional()
    .default([]),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { genreIds, ...gameData } = parsed.data;

  try {
    const game = await prisma.game.create({
      data: {
        ...gameData,
        createdById: session!.user.id,
        gameGenres: {
          create: genreIds.map((id) => ({ genreId: id })),
        },
      },
      include: {
        gameGenres: { include: { genre: true } },
      },
    });
    return NextResponse.json(game, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}
