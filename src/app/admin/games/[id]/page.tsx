import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { GameForm } from "@/components/admin/GameForm";
import { VersionFormSection } from "@/components/admin/VersionFormSection";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Game — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditGamePage({ params }: PageProps) {
  const { id } = await params;

  const [game, genres] = await Promise.all([
    prisma.game.findUnique({
      where: { id },
      include: {
        gameGenres: { include: { genre: true } },
        versions: { orderBy: { releaseDate: "desc" } },
      },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!game) notFound();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-8">Edit: {game.title}</h1>
        <GameForm
          genres={genres}
          initial={{
            id: game.id,
            title: game.title,
            slug: game.slug,
            description: game.description,
            releaseYear: game.releaseYear,
            developer: game.developer ?? undefined,
            publisher: game.publisher ?? undefined,
            qualityTier: game.qualityTier ?? undefined,
            youtubeVideoId: game.youtubeVideoId ?? undefined,
            coverImageUrl: game.coverImageUrl ?? undefined,
            isPublished: game.isPublished,
            selectedGenreIds: game.gameGenres.map((gg) => gg.genreId),
            purchaseLinks: (game.purchaseLinks as { store: string; url: string }[]) ?? [],
            igdbId: game.igdbId,
            lockedFields: game.lockedFields,
          }}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Version History</h2>
        <VersionFormSection gameId={game.id} versions={game.versions} />
      </div>
    </div>
  );
}
