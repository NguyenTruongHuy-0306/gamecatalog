import Link from "next/link";
import { prisma } from "@/lib/db";
import { FORUM_CATEGORIES } from "@/lib/forum-categories";
import { ThreadCard } from "@/components/forum/ThreadCard";
import { Button } from "@/components/ui/button";
import { MessageSquare, PenSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Forum",
  description: "Discuss games, share tips, and connect with fellow players.",
};

async function getCategoryCounts() {
  const rows = await prisma.forumThread.groupBy({
    by: ["category"],
    where: { deletedAt: null },
    _count: { id: true },
  });
  return Object.fromEntries(rows.map((r) => [r.category, r._count.id]));
}

async function getRecentThreads() {
  return prisma.forumThread.findMany({
    where: { deletedAt: null },
    orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }],
    take: 15,
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  });
}

export default async function ForumPage() {
  const [counts, recentThreads] = await Promise.all([getCategoryCounts(), getRecentThreads()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Community Forum
          </h1>
          <p className="text-muted-foreground mt-1">
            Share knowledge, ask questions, and connect with fellow players.
          </p>
        </div>
        <Button render={<Link href="/forum/new" />} className="shrink-0">
          <PenSquare className="h-4 w-4 mr-2" /> New Thread
        </Button>
      </div>

      {/* Table of Contents — category cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Table of Contents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FORUM_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/forum/${cat.slug}`}
              className="group rounded-xl border bg-card p-4 hover:bg-accent/40 hover:border-primary/30 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{cat.emoji}</span>
                  <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {cat.label}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {counts[cat.slug] ?? 0} thread{(counts[cat.slug] ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {recentThreads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-xl">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No threads yet. Be the first to start a discussion!</p>
            <Button render={<Link href="/forum/new" />} variant="outline" className="mt-4">
              Create a Thread
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={{ ...thread, createdAt: thread.createdAt.toISOString(), lastPostAt: thread.lastPostAt.toISOString() }}
                showCategory
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
