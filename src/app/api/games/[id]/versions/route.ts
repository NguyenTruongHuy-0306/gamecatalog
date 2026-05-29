import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

const createSchema = z.object({
  versionLabel: z.string().min(1).max(50),
  releaseDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  notes: z.string().max(5000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAdmin();
  if (error) return error;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const version = await prisma.gameVersion.create({
    data: {
      gameId: id,
      versionLabel: parsed.data.versionLabel,
      releaseDate: new Date(parsed.data.releaseDate),
      notes: parsed.data.notes,
      createdById: session!.user.id,
    },
  });

  return NextResponse.json(version, { status: 201 });
}
