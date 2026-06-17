import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockIgdbSyncState = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { igdbSyncState: mockIgdbSyncState },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { fetchUpdatedGames, IGDB_PAGE_SIZE } from "./igdb";

const FAKE_TOKEN = "twitch-token-abc";
const FAKE_GAMES = [{ id: 1, name: "Game A", slug: "game-a", category: 0, updated_at: 1000 }];

function makeTokenResponse(token = FAKE_TOKEN, expires_in = 3600) {
  return new Response(JSON.stringify({ access_token: token, expires_in }), { status: 200 });
}

function makeGamesResponse(games = FAKE_GAMES) {
  return new Response(JSON.stringify(games), { status: 200 });
}

beforeEach(() => {
  process.env.IGDB_CLIENT_ID = "test-client-id";
  process.env.IGDB_CLIENT_SECRET = "test-client-secret";
  mockIgdbSyncState.upsert.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.IGDB_CLIENT_ID;
  delete process.env.IGDB_CLIENT_SECRET;
});

describe("fetchUpdatedGames", () => {
  it("uses cached token when it has more than 5 minutes remaining", async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    mockIgdbSyncState.findUnique.mockResolvedValueOnce({
      accessToken: FAKE_TOKEN,
      tokenExpiresAt: future,
    });
    mockFetch.mockResolvedValueOnce(makeGamesResponse());

    await fetchUpdatedGames(0);

    // fetch should only be called once — for the IGDB games endpoint, not for token
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("api.igdb.com");
  });

  it("fetches a new token when no cached state exists", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse()) // Twitch token
      .mockResolvedValueOnce(makeGamesResponse()); // IGDB games

    await fetchUpdatedGames(0);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [tokenUrl] = mockFetch.mock.calls[0];
    expect(tokenUrl).toContain("twitch.tv");
    expect(mockIgdbSyncState.upsert).toHaveBeenCalledOnce();
  });

  it("fetches a new token when cached token is expiring within 5 minutes", async () => {
    const nearExpiry = new Date(Date.now() + 4 * 60 * 1000); // 4 min from now
    mockIgdbSyncState.findUnique.mockResolvedValueOnce({
      accessToken: "old-token",
      tokenExpiresAt: nearExpiry,
    });
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse("new-token"))
      .mockResolvedValueOnce(makeGamesResponse());

    await fetchUpdatedGames(0);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const authHeader = mockFetch.mock.calls[1][1].headers.Authorization;
    expect(authHeader).toBe("Bearer new-token");
  });

  it("throws when the Twitch token request fails", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

    await expect(fetchUpdatedGames(0)).rejects.toThrow("Twitch token fetch failed: 401");
  });

  it("throws when the IGDB games request fails", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(new Response("", { status: 500 }));

    await expect(fetchUpdatedGames(0)).rejects.toThrow("IGDB games fetch failed: 500");
  });

  it("builds a full-sync query (no updated_at filter) when since is 0", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(makeGamesResponse());

    await fetchUpdatedGames(0);

    const body = mockFetch.mock.calls[1][1].body as string;
    expect(body).not.toContain("updated_at >");
    expect(body).toContain("version_parent = null");
    expect(body).toContain("rating_count >= 50");
  });

  it("builds an incremental query with updated_at filter when since > 0", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(makeGamesResponse());

    await fetchUpdatedGames(1700000000);

    const body = mockFetch.mock.calls[1][1].body as string;
    expect(body).toContain("updated_at > 1700000000");
  });

  it("sends the Client-ID header and Bearer token", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse(FAKE_TOKEN))
      .mockResolvedValueOnce(makeGamesResponse());

    await fetchUpdatedGames(0);

    const headers = mockFetch.mock.calls[1][1].headers;
    expect(headers["Client-ID"]).toBe("test-client-id");
    expect(headers.Authorization).toBe(`Bearer ${FAKE_TOKEN}`);
  });

  it("returns the parsed games array", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockFetch
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(makeGamesResponse(FAKE_GAMES));

    const result = await fetchUpdatedGames(0);

    expect(result).toEqual(FAKE_GAMES);
  });

  it("IGDB_PAGE_SIZE is a positive number", () => {
    expect(typeof IGDB_PAGE_SIZE).toBe("number");
    expect(IGDB_PAGE_SIZE).toBeGreaterThan(0);
  });
});
