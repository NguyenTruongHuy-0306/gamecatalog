import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ gameId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { gameId } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  await prisma.favorite.deleteMany({
    where: { userId: session!.user.id, gameId },
  });

  return NextResponse.json({ message: "Removed from favorites" });
}
