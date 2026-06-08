import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === "admin";

  const game = await prisma.game.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      ...(isAdmin ? {} : { isPublished: true }),
    },
    include: {
      gameGenres: { include: { genre: true } },
      versions: { orderBy: { releaseDate: "desc" } },
      reviews: {
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, username: true, emailVerified: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(game);
}

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().min(1).optional(),
  releaseYear: z.number().int().min(1970).max(2100).optional(),
  developer: z.string().max(255).nullable().optional(),
  publisher: z.string().max(255).nullable().optional(),
  qualityTier: z.enum(["AAA", "indie", "free-to-play"]).nullable().optional(),
  youtubeVideoId: z.string().max(20).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
  genreIds: z.array(z.string().uuid()).optional(),
  purchaseLinks: z
    .array(z.object({ store: z.string().min(1).max(50), url: z.string().url() }))
    .optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

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

  const { genreIds, ...gameData } = parsed.data;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.game.update({
    where: { id },
    data: {
      ...gameData,
      ...(genreIds !== undefined
        ? {
            gameGenres: {
              deleteMany: {},
              create: genreIds.map((gid) => ({ genreId: gid })),
            },
          }
        : {}),
    },
    include: {
      gameGenres: { include: { genre: true } },
      versions: { orderBy: { releaseDate: "desc" } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.game.delete({ where: { id } });
  return NextResponse.json({ message: "Game deleted" });
}
