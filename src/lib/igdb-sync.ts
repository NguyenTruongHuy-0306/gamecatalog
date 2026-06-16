import { prisma } from "@/lib/db";
import { fetchUpdatedGames, IGDB_PAGE_SIZE, type IgdbGame } from "@/lib/igdb";
import { computeReleaseStatus } from "@/lib/release-status-config";

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  errors: number;
  hasMore: boolean;
}

function igdbCoverUrl(imageId: string) {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mapGame(g: IgdbGame) {
  return {
    title: g.name,
    slug: g.slug,
    description: g.summary ?? "",
    coverImageUrl: g.cover ? igdbCoverUrl(g.cover.image_id) : null,
    releaseYear: g.first_release_date
      ? new Date(g.first_release_date * 1000).getFullYear()
      : null,
    developer: g.involved_companies?.find((c) => c.developer)?.company.name ?? null,
    publisher: g.involved_companies?.find((c) => c.publisher)?.company.name ?? null,
    genreNames: g.genres?.map((x) => x.name) ?? [],
  };
}

// Cache genre slug→id within a single sync run to avoid redundant DB round-trips.
async function resolveGenreIds(names: string[], cache: Map<string, string>): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const slug = toSlug(name);
    if (!cache.has(slug)) {
      const genre = await prisma.genre.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
        select: { id: true },
      });
      cache.set(slug, genre.id);
    }
    ids.push(cache.get(slug)!);
  }
  return ids;
}

async function applyGenres(gameId: string, genreIds: string[]) {
  await prisma.gameGenre.deleteMany({ where: { gameId } });
  if (genreIds.length > 0) {
    await prisma.gameGenre.createMany({
      data: genreIds.map((genreId) => ({ gameId, genreId })),
      skipDuplicates: true,
    });
  }
}

export async function runIgdbSync(): Promise<SyncResult> {
  const state = await prisma.igdbSyncState.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  const since = state.lastSyncedAt;
  const syncedAt = Math.floor(Date.now() / 1000);
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: 0, hasMore: false };

  const games = await fetchUpdatedGames(since);
  const genreCache = new Map<string, string>();

  for (const igdbGame of games) {
    try {
      const mapped = mapGame(igdbGame);

      if (!mapped.releaseYear) {
        result.skipped++;
        continue;
      }

      const genreIds = await resolveGenreIds(mapped.genreNames, genreCache);

      const existing = await prisma.game.findUnique({
        where: { igdbId: igdbGame.id },
        select: { id: true, lockedFields: true },
      });

      if (existing) {
        const locked = new Set(existing.lockedFields);
        const data: Record<string, unknown> = {};

        if (!locked.has("title")) data.title = mapped.title;
        if (!locked.has("slug")) data.slug = mapped.slug;
        if (!locked.has("description") && mapped.description)
          data.description = mapped.description;
        if (!locked.has("coverImageUrl") && mapped.coverImageUrl)
          data.coverImageUrl = mapped.coverImageUrl;
        if (!locked.has("releaseYear")) {
          data.releaseYear = mapped.releaseYear;
          data.releaseStatus = computeReleaseStatus(mapped.releaseYear);
        }
        if (!locked.has("developer")) data.developer = mapped.developer;
        if (!locked.has("publisher")) data.publisher = mapped.publisher;

        if (Object.keys(data).length > 0) {
          await prisma.game.update({ where: { id: existing.id }, data });
        }

        if (!locked.has("genres")) {
          await applyGenres(existing.id, genreIds);
        }

        result.updated++;
      } else {
        // Deduplicate slug if it conflicts with an existing, unlinked game
        let slug = mapped.slug;
        const conflict = await prisma.game.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (conflict) slug = `${slug}-${igdbGame.id}`;

        const newGame = await prisma.game.create({
          data: {
            igdbId: igdbGame.id,
            title: mapped.title,
            slug,
            description: mapped.description || "No description available.",
            coverImageUrl: mapped.coverImageUrl,
            releaseYear: mapped.releaseYear,
            releaseStatus: computeReleaseStatus(mapped.releaseYear),
            developer: mapped.developer,
            publisher: mapped.publisher,
            isPublished: true,
          },
          select: { id: true },
        });

        await applyGenres(newGame.id, genreIds);
        result.added++;
      }
    } catch (err) {
      console.error(`IGDB sync error — game ${igdbGame.id} (${igdbGame.name}):`, err);
      result.errors++;
    }
  }

  // Cursor logic: if we got a full page, more games exist on IGDB.
  // Advance lastSyncedAt to the max updated_at in this batch so the next call
  // picks up where we left off. If we got fewer than a full page, we're caught
  // up and set lastSyncedAt to now (standard incremental behaviour).
  if (games.length >= IGDB_PAGE_SIZE) {
    const maxUpdatedAt = Math.max(...games.map((g) => g.updated_at ?? 0));
    // If cursor didn't advance (all games share the same updated_at), nudge
    // forward by 1 second to avoid an infinite loop at the cost of a tiny gap.
    const nextCursor = maxUpdatedAt > since ? maxUpdatedAt : since + 1;
    await prisma.igdbSyncState.update({
      where: { id: 1 },
      data: { lastSyncedAt: nextCursor },
    });
    result.hasMore = true;
  } else {
    await prisma.igdbSyncState.update({
      where: { id: 1 },
      data: { lastSyncedAt: syncedAt },
    });
    result.hasMore = false;
  }

  return result;
}
