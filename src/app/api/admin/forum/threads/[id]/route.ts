import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const thread = await prisma.forumThread.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true } },
      game: { select: { id: true, title: true, slug: true } },
      posts: {
        where: { deletedAt: null },
        include: { author: { select: { id: true, username: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { action } = body as { action: "pin" | "unpin" | "lock" | "unlock" | "delete" };

  if (action === "delete") {
    await prisma.forumThread.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (action === "pin" || action === "unpin") {
    await prisma.forumThread.update({ where: { id }, data: { isPinned: action === "pin" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "lock" || action === "unlock") {
    await prisma.forumThread.update({ where: { id }, data: { isLocked: action === "lock" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
