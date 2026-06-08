import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/forum-categories";
import { ThreadCard } from "@/components/forum/ThreadCard";
import { Button } from "@/components/ui/button";
import { PenSquare, ChevronLeft } from "lucide-react";
import { PaginationControls } from "@/components/games/PaginationControls";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) return { title: "Not Found" };
  return { title: `${cat.label} — Forum`, description: cat.description };
}

const PAGE_SIZE = 20;

export default async function ForumCategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = { category, deletedAt: null };

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Back + header */}
      <div className="space-y-1">
        <Link href="/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ChevronLeft className="h-4 w-4" /> Forum
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-2xl">{cat.emoji}</span> {cat.label}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
          </div>
          <Button render={<Link href={`/forum/new?category=${cat.slug}`} />} className="shrink-0">
            <PenSquare className="h-4 w-4 mr-2" /> New Thread
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{total} thread{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <p className="mb-3">No threads in this category yet.</p>
          <Button render={<Link href={`/forum/new?category=${cat.slug}`} />} variant="outline">
            Start the first thread
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={{ ...thread, createdAt: thread.createdAt.toISOString(), lastPostAt: thread.lastPostAt.toISOString() }}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} />
      )}
    </div>
  );
}
