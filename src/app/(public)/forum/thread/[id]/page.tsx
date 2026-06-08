import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { getCategoryBySlug } from "@/lib/forum-categories";
import { PostList } from "@/components/forum/PostList";
import { ThreadDetailClient } from "@/components/forum/ThreadDetailClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lock, Pin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Metadata } from "next";

const PAGE_SIZE = 20;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const thread = await prisma.forumThread.findUnique({ where: { id, deletedAt: null }, select: { title: true } });
  return { title: thread?.title ?? "Thread Not Found" };
}

export default async function ThreadDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [thread, session] = await Promise.all([
    prisma.forumThread.findUnique({
      where: { id, deletedAt: null },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    }),
    auth(),
  ]);

  if (!thread) notFound();

  const cat = getCategoryBySlug(thread.category);
  const [posts, totalPosts] = await Promise.all([
    prisma.forumPost.findMany({
      where: { threadId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    }),
    prisma.forumPost.count({ where: { threadId: id, deletedAt: null } }),
  ]);

  const isAdmin = session?.user.role === "admin";
  const currentUserId = session?.user.id;
  const initials = thread.author.username.slice(0, 2).toUpperCase();

  const serializedPosts = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link href="/forum" className="hover:text-foreground transition-colors">Forum</Link>
        <span>/</span>
        {cat && (
          <>
            <Link href={`/forum/${cat.slug}`} className="hover:text-foreground transition-colors">
              {cat.emoji} {cat.label}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground font-medium line-clamp-1">{thread.title}</span>
      </div>

      {/* Original post */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            {thread.isPinned && <Pin className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
            {thread.isLocked && <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
            <h1 className="text-xl sm:text-2xl font-bold leading-snug flex-1">{thread.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {cat && (
              <Badge variant="outline" className="text-xs">
                {cat.emoji} {cat.label}
              </Badge>
            )}
            {thread.isLocked && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Avatar className="h-9 w-9 shrink-0 border">
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Link href={`/profile/${thread.author.username}`} className="font-semibold hover:text-primary transition-colors">
                  {thread.author.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {new Date(thread.createdAt).toLocaleString()}
                </span>
              </div>
              {(currentUserId === thread.authorId || isAdmin) && (
                <ThreadDetailClient threadId={thread.id} />
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{thread.body}</p>
          </div>
        </div>
      </div>

      {/* Interactive replies + reply form */}
      <PostList
        threadId={thread.id}
        initialPosts={serializedPosts}
        initialTotal={totalPosts}
        isLocked={thread.isLocked}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
