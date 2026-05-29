import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

const updateSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(300, "Bio must be at most 300 characters").optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, username: true, email: true, bio: true, avatarUrl: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
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

  const { username, bio } = parsed.data;

  if (username) {
    const conflict = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, NOT: { id: session!.user.id } },
    });
    if (conflict) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session!.user.id },
    data: {
      ...(username !== undefined ? { username } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
    select: { id: true, username: true, email: true, bio: true, avatarUrl: true },
  });

  return NextResponse.json(updated);
}
