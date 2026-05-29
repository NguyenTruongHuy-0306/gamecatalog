import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await prisma.genre.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Name or slug already in use" }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.genre.delete({ where: { id } });
  return NextResponse.json({ message: "Genre deleted" });
}
