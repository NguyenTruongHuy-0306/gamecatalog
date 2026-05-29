import { prisma } from "@/lib/db";
import { GameForm } from "@/components/admin/GameForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Game — Admin" };

export default async function AdminNewGamePage() {
  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">New Game</h1>
      <GameForm genres={genres} />
    </div>
  );
}
