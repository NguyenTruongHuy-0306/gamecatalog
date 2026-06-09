import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AdminGamesTable } from "@/components/admin/AdminGamesTable";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Games — Admin" };

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

function getOrderBy(sort: string, dir: string): Prisma.GameOrderByWithRelationInput {
  const d = dir === "asc" ? "asc" : "desc";
  switch (sort) {
    case "title":       return { title: d };
    case "releaseYear": return { releaseYear: d };
    case "avgRating":   return { avgRating: d };
    case "reviewCount": return { reviewCount: d };
    case "isPublished": return { isPublished: d };
    default:            return { createdAt: "desc" };
  }
}

export default async function AdminGamesPage({ searchParams }: PageProps) {
  const { sort = "createdAt", dir = "desc" } = await searchParams;

  const games = await prisma.game.findMany({
    select: {
      id: true, title: true, slug: true, releaseYear: true,
      qualityTier: true, avgRating: true, reviewCount: true, isPublished: true,
      igdbId: true,
    },
    orderBy: getOrderBy(sort, dir),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Games</h1>
        <Button render={<Link href="/admin/games/new" />}>
          <Plus className="h-4 w-4 mr-1" />New Game
        </Button>
      </div>
      <AdminGamesTable games={games} />
    </div>
  );
}
