import { vi, describe, it, expect, afterEach } from "vitest";

const mockIgdbSyncState = vi.hoisted(() => ({
  upsert: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
const mockGenre = vi.hoisted(() => ({ upsert: vi.fn() }));
const mockGame = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
const mockGameGenre = vi.hoisted(() => ({
  deleteMany: vi.fn().mockResolvedValue({}),
  createMany: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    igdbSyncState: mockIgdbSyncState,
    genre: mockGenre,
    game: mockGame,
    gameGenre: mockGameGenre,
  },
}));

// Use a small page size so "hasMore" tests don't need hundreds of games.
// Must be hoisted so the vi.mock factory can reference it.
const MOCK_PAGE_SIZE = vi.hoisted(() => 2);
const mockFetchUpdatedGames = vi.hoisted(() => vi.fn());
vi.mock("@/lib/igdb", () => ({
  fetchUpdatedGames: mockFetchUpdatedGames,
  IGDB_PAGE_SIZE: MOCK_PAGE_SIZE,
}));

import { runIgdbSync } from "./igdb-sync";

afterEach(() => vi.clearAllMocks());

const baseState = { id: 1, lastSyncedAt: 0 };
const releaseDate2020 = Math.floor(new Date("2020-01-01T00:00:00Z").getTime() / 1000);

const baseIgdbGame = {
  id: 1234,
  name: "Test Game",
  slug: "test-game",
  summary: "A great game.",
  cover: { image_id: "cover123" },
  first_release_date: releaseDate2020,
  genres: [{ name: "Action" }],
  involved_companies: [
    { developer: true, publisher: false, company: { name: "Dev Studio" } },
    { developer: false, publisher: true, company: { name: "Pub Corp" } },
  ],
  updated_at: 1000,
};

function setupDefaults() {
  mockIgdbSyncState.upsert.mockResolvedValue(baseState);
  mockGenre.upsert.mockResolvedValue({ id: "genre-1" });
}

describe("runIgdbSync", () => {
  it("returns zero counts and sets hasMore=false when no games are returned", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([]);

    const result = await runIgdbSync();
    expect(result).toEqual({ added: 0, updated: 0, skipped: 0, errors: 0, hasMore: false });
    expect(mockGame.create).not.toHaveBeenCalled();
  });

  it("adds a new game when igdbId is not present in DB", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([baseIgdbGame]);
    mockGame.findUnique.mockResolvedValueOnce(null); // no igdbId match
    mockGame.findUnique.mockResolvedValueOnce(null); // no slug conflict
    mockGame.create.mockResolvedValueOnce({ id: "new-1" });

    const result = await runIgdbSync();
    expect(result.added).toBe(1);
    expect(result.updated).toBe(0);
    expect(mockGame.create).toHaveBeenCalledOnce();
    const data = mockGame.create.mock.calls[0][0].data;
    expect(data.igdbId).toBe(1234);
    expect(data.title).toBe("Test Game");
    expect(data.slug).toBe("test-game");
    expect(data.developer).toBe("Dev Studio");
    expect(data.publisher).toBe("Pub Corp");
    expect(data.isPublished).toBe(false);
  });

  it("updates an existing game when igdbId matches", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([baseIgdbGame]);
    mockGame.findUnique.mockResolvedValueOnce({ id: "existing-1", lockedFields: [] });

    const result = await runIgdbSync();
    expect(result.updated).toBe(1);
    expect(result.added).toBe(0);
    expect(mockGame.update).toHaveBeenCalledOnce();
    const updateData = mockGame.update.mock.calls[0][0].data;
    expect(updateData.title).toBe("Test Game");
    expect(updateData.slug).toBe("test-game");
  });

  it("does not overwrite locked fields when updating", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([baseIgdbGame]);
    // Lock title/slug/releaseYear but leave description and developer unlocked so
    // the update is still called (non-empty data object) and we can inspect it.
    mockGame.findUnique.mockResolvedValueOnce({
      id: "existing-1",
      lockedFields: ["title", "slug", "releaseYear"],
    });

    await runIgdbSync();
    const updateData = mockGame.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty("title");
    expect(updateData).not.toHaveProperty("slug");
    expect(updateData).not.toHaveProperty("releaseYear");
    expect(updateData).toHaveProperty("description"); // unlocked, so present
    expect(updateData).toHaveProperty("developer");   // unlocked, so present
  });

  it("skips games that have no first_release_date", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([{ ...baseIgdbGame, first_release_date: null }]);

    const result = await runIgdbSync();
    expect(result.skipped).toBe(1);
    expect(result.added).toBe(0);
    expect(mockGame.create).not.toHaveBeenCalled();
  });

  it("appends igdbId to slug when a slug conflict exists", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([baseIgdbGame]);
    mockGame.findUnique.mockResolvedValueOnce(null);          // no igdbId match
    mockGame.findUnique.mockResolvedValueOnce({ id: "other" }); // slug conflict
    mockGame.create.mockResolvedValueOnce({ id: "new-2" });

    await runIgdbSync();
    const slug = mockGame.create.mock.calls[0][0].data.slug;
    expect(slug).toBe(`test-game-${baseIgdbGame.id}`);
  });

  it("does not apply genres when 'genres' is a locked field", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([baseIgdbGame]);
    mockGame.findUnique.mockResolvedValueOnce({ id: "existing-1", lockedFields: ["genres"] });

    await runIgdbSync();
    expect(mockGameGenre.deleteMany).not.toHaveBeenCalled();
    expect(mockGameGenre.createMany).not.toHaveBeenCalled();
  });

  it("sets hasMore=true and advances cursor when a full page is returned", async () => {
    setupDefaults();
    const games = [
      { ...baseIgdbGame, id: 1, slug: "game-1", updated_at: 1500 },
      { ...baseIgdbGame, id: 2, slug: "game-2", updated_at: 2000 },
    ]; // length === MOCK_PAGE_SIZE (2)
    mockFetchUpdatedGames.mockResolvedValueOnce(games);
    for (const g of games) {
      mockGame.findUnique.mockResolvedValueOnce(null); // no igdbId match
      mockGame.findUnique.mockResolvedValueOnce(null); // no slug conflict
      mockGame.create.mockResolvedValueOnce({ id: `new-${g.id}` });
    }

    const result = await runIgdbSync();
    expect(result.hasMore).toBe(true);
    expect(result.added).toBe(2);
    const cursorUpdate = mockIgdbSyncState.update.mock.calls[0][0];
    expect(cursorUpdate.data.lastSyncedAt).toBe(2000); // max updated_at
  });

  it("nudges the cursor forward by 1 when all games share the same updated_at", async () => {
    setupDefaults();
    const games = [
      { ...baseIgdbGame, id: 1, slug: "g1", updated_at: 0 }, // same as since (0)
      { ...baseIgdbGame, id: 2, slug: "g2", updated_at: 0 },
    ];
    mockFetchUpdatedGames.mockResolvedValueOnce(games);
    for (const g of games) {
      mockGame.findUnique.mockResolvedValueOnce(null);
      mockGame.findUnique.mockResolvedValueOnce(null);
      mockGame.create.mockResolvedValueOnce({ id: `new-${g.id}` });
    }

    await runIgdbSync();
    const cursorUpdate = mockIgdbSyncState.update.mock.calls[0][0];
    expect(cursorUpdate.data.lastSyncedAt).toBe(1); // since(0) + 1
  });

  it("increments errors and continues when a single game fails processing", async () => {
    setupDefaults();
    mockFetchUpdatedGames.mockResolvedValueOnce([baseIgdbGame]);
    mockGame.findUnique.mockRejectedValueOnce(new Error("DB error"));

    const result = await runIgdbSync();
    expect(result.errors).toBe(1);
    expect(result.added).toBe(0);
  });

  it("caches genre lookups within a single sync to avoid redundant DB calls", async () => {
    setupDefaults();
    const games = [
      { ...baseIgdbGame, id: 1, slug: "g1", genres: [{ name: "Action" }] },
      { ...baseIgdbGame, id: 2, slug: "g2", genres: [{ name: "Action" }] }, // same genre
    ];
    mockFetchUpdatedGames.mockResolvedValueOnce(games);
    for (let i = 0; i < games.length; i++) {
      mockGame.findUnique.mockResolvedValueOnce(null);
      mockGame.findUnique.mockResolvedValueOnce(null);
      mockGame.create.mockResolvedValueOnce({ id: `new-${i}` });
    }

    await runIgdbSync();
    // Genre "Action" (slug "action") should only be upserted once
    expect(mockGenre.upsert).toHaveBeenCalledOnce();
  });
});
