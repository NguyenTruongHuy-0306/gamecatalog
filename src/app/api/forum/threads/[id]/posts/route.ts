import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVerifiedAuth, getClientIp } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

const PAGE_SIZE = 20;
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);

  const thread = await prisma.forumThread.findUnique({ where: { id, deletedAt: null } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where: { threadId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    }),
    prisma.forumPost.count({ where: { threadId: id, deletedAt: null } }),
  ]);

  return NextResponse.json({ posts, total, page, totalPages: Math.ceil(total / PAGE_SIZE) });
}

const replySchema = z.object({
  body: z.string().min(2, "Reply must be at least 2 characters").max(5000),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireVerifiedAuth();
  if (error) return error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`user:${session!.user.id}:${ip}`, "forum-post", 10, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "You are replying too quickly. Please slow down." }, { status: 429 });
  }

  const thread = await prisma.forumThread.findUnique({ where: { id, deletedAt: null } });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  if (thread.isLocked) return NextResponse.json({ error: "This thread is locked." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const [post] = await prisma.$transaction([
    prisma.forumPost.create({
      data: { body: parsed.data.body, threadId: id, authorId: session!.user.id },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    }),
    prisma.forumThread.update({ where: { id }, data: { lastPostAt: new Date() } }),
  ]);

  return NextResponse.json(post, { status: 201 });
}
