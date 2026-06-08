import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockFavorite = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}));
const mockGame = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { favorite: mockFavorite, game: mockGame } }));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/favorites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("GET /api/user/favorites", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns the user's favorited games", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const game = { id: GAME_UUID, title: "Pokemon", gameGenres: [] };
    mockFavorite.findMany.mockResolvedValueOnce([{ game }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([game]);
  });
});

describe("POST /api/user/favorites", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq({ gameId: GAME_UUID }))).status).toBe(401);
  });

  it("returns 400 for invalid game ID format", async () => {
    mockAuth.mockResolvedValueOnce(session);
    expect((await POST(postReq({ gameId: "not-a-uuid" }))).status).toBe(400);
  });

  it("returns 404 when game does not exist", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGame.findUnique.mockResolvedValueOnce(null);
    expect((await POST(postReq({ gameId: GAME_UUID }))).status).toBe(404);
  });

  it("adds the game to favorites and returns 201", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGame.findUnique.mockResolvedValueOnce({ id: GAME_UUID });
    mockFavorite.create.mockResolvedValueOnce({});
    const res = await POST(postReq({ gameId: GAME_UUID }));
    expect(res.status).toBe(201);
  });

  it("is idempotent — returns 201 even if already favorited", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGame.findUnique.mockResolvedValueOnce({ id: GAME_UUID });
    mockFavorite.create.mockRejectedValueOnce(new Error("Unique constraint"));
    const res = await POST(postReq({ gameId: GAME_UUID }));
    expect(res.status).toBe(201);
  });
});
