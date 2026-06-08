import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  const post = await prisma.forumPost.findUnique({ where: { id, deletedAt: null } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = post.authorId === session!.user.id;
  const isAdmin = session!.user.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.forumPost.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ message: "Reply deleted" });
}
