import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const filter = request.nextUrl.searchParams.get("filter") ?? "flagged"; // "all" | "flagged"
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limit = 20;

  const where: Prisma.ReviewWhereInput = { deletedAt: null };
  if (filter === "flagged") where.isFlagged = true;
  if (q) {
    where.OR = [
      { user: { username: { contains: q, mode: "insensitive" } } },
      { game: { title: { contains: q, mode: "insensitive" } } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true } },
        game: { select: { id: true, title: true, slug: true } },
        flaggedBy: { select: { id: true, username: true } },
      },
      orderBy: filter === "flagged" ? { flaggedAt: "desc" } : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({ reviews, total, page, totalPages: Math.ceil(total / limit) });
}
