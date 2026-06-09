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
  if (!res.ok) throw new Error(`Twitch token fetch failed: ${res.status}`);

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

export async function fetchUpdatedGames(since: number): Promise<IgdbGame[]> {
  const token = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID!;

  const all: IgdbGame[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const query =
      `fields id,name,slug,summary,first_release_date,cover.image_id,` +
      `genres.name,involved_companies.developer,involved_companies.publisher,` +
      `involved_companies.company.name,category,updated_at;` +
      `where updated_at > ${since} & category = (0,8,9) & version_parent = null;` +
      `sort updated_at asc;` +
      `limit ${limit};` +
      `offset ${offset};`;

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

    const batch = (await res.json()) as IgdbGame[];
    all.push(...batch);

    if (batch.length < limit) break;

    offset += limit;
    await new Promise((r) => setTimeout(r, 250)); // stay under 4 req/sec
  }

  return all;
}
