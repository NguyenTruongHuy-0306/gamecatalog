import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({
  user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() },
}));
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGame = vi.hoisted(() => ({ findUnique: vi.fn() }));
const mockVersion = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { game: mockGame, gameVersion: mockVersion } }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const params = { params: Promise.resolve({ id: "game-1" }) };

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/games/game-1/versions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[id]/versions", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq({}), params)).status).toBe(401);
  });

  it("returns 404 when game does not exist", async () => {
    mockGame.findUnique.mockResolvedValueOnce(null);
    expect((await POST(postReq({}), params)).status).toBe(404);
  });

  it("returns 400 for invalid input", async () => {
    mockGame.findUnique.mockResolvedValueOnce({ id: "game-1" });
    const res = await POST(postReq({ versionLabel: "", releaseDate: "not-a-date" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid date", async () => {
    mockGame.findUnique.mockResolvedValueOnce({ id: "game-1" });
    expect(
      (await POST(postReq({ versionLabel: "v1.0", releaseDate: "bad-date" }), params)).status
    ).toBe(400);
  });

  it("creates a version and returns 201 on success", async () => {
    const version = { id: "v1", gameId: "game-1", versionLabel: "v1.0", releaseDate: new Date("2024-01-01") };
    mockGame.findUnique.mockResolvedValueOnce({ id: "game-1" });
    mockVersion.create.mockResolvedValueOnce(version);
    const res = await POST(
      postReq({ versionLabel: "v1.0", releaseDate: "2024-01-01", notes: "Initial release" }),
      params
    );
    expect(res.status).toBe(201);
    expect(mockVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gameId: "game-1", versionLabel: "v1.0" }),
      })
    );
  });
});
