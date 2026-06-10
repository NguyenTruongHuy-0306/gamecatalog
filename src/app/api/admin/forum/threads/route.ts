import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { Prisma } from "@/generated/prisma/client";

const LIMIT = 25;

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const filter = params.get("filter") ?? "all"; // "all" | "pinned" | "locked"

  const where: Prisma.ForumThreadWhereInput = { deletedAt: null };
  if (filter === "pinned") where.isPinned = true;
  if (filter === "locked") where.isLocked = true;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { username: { contains: q, mode: "insensitive" } } },
      { game: { title: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      include: {
        author: { select: { id: true, username: true } },
        game: { select: { id: true, title: true, slug: true } },
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
      orderBy: { lastPostAt: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.forumThread.count({ where }),
  ]);

  return NextResponse.json({ threads, total, page, totalPages: Math.ceil(total / LIMIT) });
}
