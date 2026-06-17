import { prisma } from "@/lib/db";

const IGDB_BASE = "https://api.igdb.com/v4";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

export interface IgdbGame {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id: string };
  genres?: { name: string }[];
  involved_companies?: Array<{
    developer: boolean;
    publisher: boolean;
    company: { name: string };
  }>;
  videos?: Array<{ video_id: string; name: string }>;
  category: number;
  updated_at: number;
}

async function getAccessToken(): Promise<string> {
  const state = await prisma.igdbSyncState.findUnique({ where: { id: 1 } });

  // Use cached token if it has more than 5 minutes remaining
  if (
    state?.accessToken &&
    state.tokenExpiresAt &&
    state.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)
  ) {
    return state.accessToken;
  }

  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", process.env.IGDB_CLIENT_ID!);
  url.searchParams.set("client_secret", process.env.IGDB_CLIENT_SECRET!);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Twitch token fetch failed: ${res.status} ${body}`);
  }

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.igdbSyncState.upsert({
    where: { id: 1 },
    create: { id: 1, accessToken: access_token, tokenExpiresAt },
    update: { accessToken: access_token, tokenExpiresAt },
  });

  return access_token;
}

export const IGDB_PAGE_SIZE = 500;

// Fetches ONE page of games (up to IGDB_PAGE_SIZE). Caller is responsible for
// looping via the cursor — runIgdbSync does this between Vercel invocations.
export async function fetchUpdatedGames(since: number): Promise<IgdbGame[]> {
  const token = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID!;

  // IGDB now omits the category field for main games (they appear as category=null).
  // Match null (main game), 8 (remake), 9 (remaster).
  const catFilter = `(category = null | category = (8,9))`;
  const popularFilter = `rating_count >= 50`;
  const whereClause =
    since > 0
      ? `updated_at > ${since} & ${catFilter} & version_parent = null & ${popularFilter}`
      : `${catFilter} & version_parent = null & ${popularFilter}`;

  const query =
    `fields id,name,slug,summary,first_release_date,cover.image_id,` +
    `genres.name,involved_companies.developer,involved_companies.publisher,` +
    `involved_companies.company.name,videos.video_id,videos.name,category,updated_at;` +
    `where ${whereClause};` +
    `sort updated_at asc;` +
    `limit ${IGDB_PAGE_SIZE};` +
    `offset 0;`;

  const res = await fetch(`${IGDB_BASE}/games`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": clientId,
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!res.ok) throw new Error(`IGDB games fetch failed: ${res.status}`);
  return (await res.json()) as IgdbGame[];
}
