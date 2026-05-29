import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

const updateSchema = z.object({
  versionLabel: z.string().min(1).max(50).optional(),
  releaseDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date")
    .optional(),
  notes: z.string().max(5000).nullable().optional(),
});

type Params = { params: Promise<{ id: string; vid: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { vid } = await params;
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

  const version = await prisma.gameVersion.findUnique({ where: { id: vid } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.gameVersion.update({
    where: { id: vid },
    data: {
      ...(parsed.data.versionLabel !== undefined ? { versionLabel: parsed.data.versionLabel } : {}),
      ...(parsed.data.releaseDate !== undefined ? { releaseDate: new Date(parsed.data.releaseDate) } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { vid } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const version = await prisma.gameVersion.findUnique({ where: { id: vid } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.gameVersion.delete({ where: { id: vid } });
  return NextResponse.json({ message: "Version deleted" });
}
