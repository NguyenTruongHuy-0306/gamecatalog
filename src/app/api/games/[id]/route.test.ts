import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGame = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { game: mockGame } }));

import { GET, PUT, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "a1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "game-1" }) };

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/games/game-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/games/[id]", () => {
  it("returns 404 when game does not exist", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockGame.findFirst.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("returns the game data for a published game", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const game = { id: "game-1", title: "Test", isPublished: true, gameGenres: [], versions: [], reviews: [] };
    mockGame.findFirst.mockResolvedValueOnce(game);
    const res = await GET(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("game-1");
  });

  it("allows admins to see unpublished games", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockGame.findFirst.mockResolvedValueOnce({ id: "game-1", isPublished: false, gameGenres: [], versions: [], reviews: [] });
    const res = await GET(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    const whereArg = mockGame.findFirst.mock.calls[0][0].where;
    expect(whereArg.isPublished).toBeUndefined();
  });
});

describe("PUT /api/games/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ title: "New" }), params)).status).toBe(401);
  });

  it("returns 404 when game does not exist", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockGame.findUnique.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ title: "New" }), params)).status).toBe(404);
  });

  it("updates the game and returns it", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const updated = { id: "game-1", title: "New Title", gameGenres: [], versions: [] };
    mockGame.findUnique.mockResolvedValueOnce({ id: "game-1" });
    mockGame.update.mockResolvedValueOnce(updated);
    const res = await PUT(putReq({ title: "New Title" }), params);
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("New Title");
  });
});

describe("DELETE /api/games/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 404 when game does not exist", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockGame.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("deletes the game and returns a success message", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockGame.findUnique.mockResolvedValueOnce({ id: "game-1" });
    mockGame.delete.mockResolvedValueOnce({});
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
  });
});
