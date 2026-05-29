import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { GameGrid } from "@/components/games/GameGrid";
import { GameFilters } from "@/components/games/GameFilters";
import { PaginationControls } from "@/components/games/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Browse Games",
  description: "Explore the full game catalog. Filter by genre, year, quality, and rating.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

const PAGE_SIZE = 15;

async function getGames(params: Record<string, string>) {
  const { q, genre, year, quality, minRating, sort = "rating", page = "1" } = params;
  const pageNum = Math.max(1, parseInt(page, 10));

  const where: Prisma.GameWhereInput = { isPublished: true };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (genre) where.gameGenres = { some: { genre: { slug: genre } } };
  if (year) where.releaseYear = parseInt(year, 10);
  if (quality) where.qualityTier = quality;
  if (minRating) where.avgRating = { gte: parseFloat(minRating) };

  const orderBy: Prisma.GameOrderByWithRelationInput =
    sort === "year" ? { releaseYear: "desc" } : sort === "title" ? { title: "asc" } : { avgRating: "desc" };

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy,
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { gameGenres: { include: { genre: true } } },
    }),
    prisma.game.count({ where }),
  ]);

  return { games, total, page: pageNum, totalPages: Math.ceil(total / PAGE_SIZE) };
}

async function getGenres() {
  return prisma.genre.findMany({ orderBy: { name: "asc" } });
}

export default async function GamesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [{ games, total, page, totalPages }, genres] = await Promise.all([
    getGames(params),
    getGenres(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Browse Games</h1>
        <p className="text-muted-foreground text-sm">{total} game{total !== 1 ? "s" : ""} found</p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<Skeleton className="h-10 w-full" />}>
          <GameFilters genres={genres} />
        </Suspense>
      </div>

      <GameGrid games={games} />

      {totalPages > 1 && (
        <div className="mt-8">
          <Suspense>
            <PaginationControls page={page} totalPages={totalPages} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
