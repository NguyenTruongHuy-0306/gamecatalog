import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockFavorite = vi.hoisted(() => ({ deleteMany: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/db", () => ({ prisma: { favorite: mockFavorite } }));

import { DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ gameId: "game-1" }) };

describe("DELETE /api/user/favorites/[gameId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("removes the favorite and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(mockFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", gameId: "game-1" },
    });
  });

  it("returns 200 even when the favorite did not exist (idempotent delete)", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockFavorite.deleteMany.mockResolvedValueOnce({ count: 0 });
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
  });
});
