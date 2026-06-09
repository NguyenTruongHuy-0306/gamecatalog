import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVerifiedAuth } from "@/lib/api-helpers";
import { checkRateLimit, } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";
import { CATEGORY_SLUGS } from "@/lib/forum-categories";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? undefined;
  const gameId = searchParams.get("gameId") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const where = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(gameId ? { gameId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { body: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
    }),
    prisma.forumThread.count({ where }),
  ]);

  return NextResponse.json({ threads, total, page, totalPages: Math.ceil(total / PAGE_SIZE) });
}

const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  body: z.string().min(10, "Post body must be at least 10 characters").max(10000),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  gameId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireVerifiedAuth();
  if (error) return error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`user:${session!.user.id}:${ip}`, "forum-thread", 5, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "You are posting too quickly. Please wait before creating another thread." }, { status: 429 });
  }

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

  const game = await prisma.game.findUnique({ where: { id: parsed.data.gameId, isPublished: true }, select: { id: true } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const thread = await prisma.forumThread.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      authorId: session!.user.id,
      gameId: parsed.data.gameId,
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(thread, { status: 201 });
}
