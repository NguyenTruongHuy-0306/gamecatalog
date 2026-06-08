import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const thread = await prisma.forumThread.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(thread);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  const thread = await prisma.forumThread.findUnique({ where: { id, deletedAt: null } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = thread.authorId === session!.user.id;
  const isAdmin = session!.user.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.forumThread.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ message: "Thread deleted" });
}
