import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const isBanned = request.nextUrl.searchParams.get("is_banned");
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = 20;

  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(isBanned !== null ? { isBanned: isBanned === "true" } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}
