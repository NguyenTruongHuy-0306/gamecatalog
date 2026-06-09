import { prisma } from "@/lib/db";
import { ForumDirectory } from "@/components/forum/ForumDirectory";
import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Forums",
  description: "Browse discussions across all game forums.",
};

async function getGamesWithForums() {
  const games = await prisma.game.findMany({
    where: {
      isPublished: true,
      forumThreads: { some: { deletedAt: null } },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImageUrl: true,
      qualityTier: true,
      releaseYear: true,
      gameGenres: { select: { genre: { select: { id: true, name: true } } } },
      _count: { select: { forumThreads: { where: { deletedAt: null } } } },
      forumThreads: {
        where: { deletedAt: null },
        orderBy: { lastPostAt: "desc" },
        take: 1,
        select: { lastPostAt: true },
      },
    },
    orderBy: { title: "asc" },
  });

  return games.map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    coverImageUrl: g.coverImageUrl,
    qualityTier: g.qualityTier,
    releaseYear: g.releaseYear,
    gameGenres: g.gameGenres,
    threadCount: g._count.forumThreads,
    latestActivity: g.forumThreads[0]?.lastPostAt.toISOString() ?? null,
  }));
}

export default async function ForumPage() {
  const games = await getGamesWithForums();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" />
          Game Forums
        </h1>
        <p className="text-muted-foreground mt-1">
          Find discussions for a specific game — browse or search below.
        </p>
      </div>

      <ForumDirectory games={games} />
    </div>
  );
}
