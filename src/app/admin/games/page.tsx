import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AdminGamesTable } from "@/components/admin/AdminGamesTable";
import { Plus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Games — Admin" };

export default async function AdminGamesPage() {
  const games = await prisma.game.findMany({
    select: {
      id: true, title: true, slug: true, releaseYear: true,
      qualityTier: true, avgRating: true, reviewCount: true, isPublished: true,
    },
    orderBy: { createdAt: "desc" },
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
