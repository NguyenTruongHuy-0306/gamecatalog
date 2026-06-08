import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockReview = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  aggregate: vi.fn(),
}));
const mockGame = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
const mockUser = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { review: mockReview, game: mockGame, user: mockUser },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

const mockSpam = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock("@/lib/spam-scanner", () => ({ containsMaliciousLinks: mockSpam }));

import { PUT, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const ownerSession = { user: { id: "owner-1", role: "user", isBanned: false, emailVerified: new Date() } };
const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const otherSession = { user: { id: "other-1", role: "user", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "game-1", rid: "review-1" }) };

const existingReview = {
  id: "review-1",
  userId: "owner-1",
  gameId: "game-1",
  rating: 4,
  deletedAt: null,
};

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/games/game-1/reviews/review-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/games/[id]/reviews/[rid]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ rating: 5 }), params)).status).toBe(401);
  });

  it("returns 404 when review does not exist", async () => {
    mockAuth.mockResolvedValueOnce(ownerSession);
    mockReview.findUnique.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ rating: 5 }), params)).status).toBe(404);
  });

  it("returns 403 when user is neither owner nor admin", async () => {
    mockAuth.mockResolvedValueOnce(otherSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    expect((await PUT(putReq({ rating: 5 }), params)).status).toBe(403);
  });

  it("allows admin to edit any review", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReview.update.mockResolvedValueOnce({ ...existingReview, rating: 5, user: {} });
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 5 }, _count: { id: 1 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await PUT(putReq({ rating: 5 }), params);
    expect(res.status).toBe(200);
  });

  it("bans user and returns 403 when edited body contains malicious links", async () => {
    mockAuth.mockResolvedValueOnce(ownerSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockSpam.mockResolvedValueOnce(true);
    const res = await PUT(putReq({ body: "visit https://malware.com" }), params);
    expect(res.status).toBe(403);
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isBanned: true } })
    );
  });

  it("owner can update their review", async () => {
    mockAuth.mockResolvedValueOnce(ownerSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReview.update.mockResolvedValueOnce({ ...existingReview, rating: 5, user: {} });
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 5 }, _count: { id: 1 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await PUT(putReq({ rating: 5 }), params);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/games/[id]/reviews/[rid]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockAuth.mockResolvedValueOnce(ownerSession);
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(429);
  });

  it("returns 404 when review does not exist", async () => {
    mockAuth.mockResolvedValueOnce(ownerSession);
    mockReview.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("returns 403 when user is neither owner nor admin", async () => {
    mockAuth.mockResolvedValueOnce(otherSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(403);
  });

  it("soft-deletes the review and recalculates rating", async () => {
    mockAuth.mockResolvedValueOnce(ownerSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockGame.findUnique.mockResolvedValueOnce({ slug: "test-game" });
    mockReview.update.mockResolvedValueOnce({});
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 0 }, _count: { id: 0 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } })
    );
  });
});
