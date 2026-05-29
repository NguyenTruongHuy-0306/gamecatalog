import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { GameGrid } from "@/components/games/GameGrid";
import { Input } from "@/components/ui/input";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Games",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

async function searchGames(q: string) {
  if (!q || q.trim().length < 2) return [];
  return prisma.game.findMany({
    where: {
      isPublished: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { developer: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { gameGenres: { include: { genre: true } } },
    orderBy: { avgRating: "desc" },
    take: 20,
  });
}

function SearchBar({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="get" action="/search" className="flex gap-2">
      <label htmlFor="search-q" className="sr-only">Search games</label>
      <Input
        id="search-q"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by title, developer…"
        className="max-w-md"
        autoFocus
      />
    </form>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const games = await searchGames(q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>

      <Suspense>
        <SearchBar defaultValue={q} />
      </Suspense>

      <div className="mt-8" aria-live="polite" aria-atomic="true">
        {q.length < 2 ? (
          <p className="text-muted-foreground">Enter at least 2 characters to search.</p>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground">
            No games found for &ldquo;<strong>{q}</strong>&rdquo;.{" "}
            <Link href="/games" className="text-primary underline">Browse all games</Link>
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {games.length} result{games.length !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
            </p>
            <GameGrid games={games} />
          </>
        )}
      </div>
    </div>
  );
}
