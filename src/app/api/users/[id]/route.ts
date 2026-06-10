import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      avatarUrl: true,
      role: true,
      isBanned: true,
      banReason: true,
      bannedAt: true,
      emailVerified: true,
      createdAt: true,
      googleId: true,
      _count: { select: { reviews: true } },
      reviews: {
        where: { deletedAt: null },
        include: { game: { select: { id: true, title: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

const profileEditSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  email: z.string().email("Invalid email").optional(),
  bio: z.string().max(300, "Bio max 300 characters").optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = profileEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.username) {
    const conflict = await prisma.user.findFirst({
      where: { username: { equals: parsed.data.username, mode: "insensitive" }, NOT: { id } },
    });
    if (conflict) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  if (parsed.data.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" }, NOT: { id } },
    });
    if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.username !== undefined) updateData.username = parsed.data.username;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email.toLowerCase();
  if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, username: true, bio: true, emailVerified: true, role: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAdmin();
  if (error) return error;

  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { reviews: { where: { deletedAt: null }, select: { gameId: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const affectedGameIds = [...new Set(user.reviews.map((r) => r.gameId))];

  // Hard-delete: DB cascades to verification_tokens, reviews, favorites; nullifies createdById/flaggedById
  await prisma.user.delete({ where: { id } });

  // Recalculate ratings for games whose reviews were cascade-deleted
  if (affectedGameIds.length > 0) {
    await Promise.all(
      affectedGameIds.map(async (gameId) => {
        const stats = await prisma.review.aggregate({
          where: { gameId, deletedAt: null },
          _avg: { rating: true },
          _count: { id: true },
        });
        await prisma.game.update({
          where: { id: gameId },
          data: { avgRating: stats._avg.rating ?? 0, reviewCount: stats._count.id },
        });
      })
    );
  }

  return NextResponse.json({ message: "User deleted" });
}

const patchSchema = z.object({
  isBanned: z.boolean().optional(),
  banReason: z.string().max(500).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent admins from banning other admins
  if (parsed.data.isBanned !== undefined && user.role === "admin") {
    return NextResponse.json({ error: "Cannot ban another admin" }, { status: 403 });
  }

  // Prevent self-demotion
  if (parsed.data.role !== undefined && id === session!.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.isBanned !== undefined) {
    updateData.isBanned = parsed.data.isBanned;
    updateData.banReason = parsed.data.isBanned ? (parsed.data.banReason ?? null) : null;
    updateData.bannedAt = parsed.data.isBanned ? new Date() : null;
    updateData.bannedById = parsed.data.isBanned ? session!.user.id : null;
  }

  if (parsed.data.role !== undefined) {
    updateData.role = parsed.data.role;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isBanned: true,
      banReason: true,
      bannedAt: true,
    },
  });

  return NextResponse.json(updated);
}
