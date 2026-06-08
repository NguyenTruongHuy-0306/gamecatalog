import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGame = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
const mockReview = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  aggregate: vi.fn(),
}));
const mockUser = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { game: mockGame, review: mockReview, user: mockUser },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

const mockRecaptcha = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/lib/recaptcha", () => ({ verifyRecaptcha: mockRecaptcha }));

const mockSpam = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock("@/lib/spam-scanner", () => ({ containsMaliciousLinks: mockSpam }));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const verifiedSession = {
  user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() },
};
const params = { params: Promise.resolve({ id: "game-1" }) };

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/games/game-1/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/games/[id]/reviews", () => {
  it("returns 404 when game does not exist", async () => {
    mockGame.findFirst.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("returns paginated reviews", async () => {
    mockGame.findFirst.mockResolvedValueOnce({ id: "game-1" });
    mockReview.findMany.mockResolvedValueOnce([{ id: "r1" }]);
    mockReview.count.mockResolvedValueOnce(1);
    const res = await GET(new NextRequest("http://localhost/api/games/game-1/reviews"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.total).toBe(1);
  });
});

describe("POST /api/games/[id]/reviews", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq({ rating: 4 }), params)).status).toBe(401);
  });

  it("returns 403 when email is not verified", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { ...verifiedSession.user, emailVerified: null },
    });
    expect((await POST(postReq({ rating: 4 }), params)).status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(postReq({ rating: 4 }), params)).status).toBe(429);
  });

  it("returns 400 for invalid rating", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    expect((await POST(postReq({ rating: 6 }), params)).status).toBe(400);
  });

  it("returns 403 when recaptcha fails", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockRecaptcha.mockResolvedValueOnce(false);
    expect((await POST(postReq({ rating: 4, captchaToken: "bad" }), params)).status).toBe(403);
  });

  it("bans user and returns 403 when review body contains malicious links", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockSpam.mockResolvedValueOnce(true);
    const res = await POST(postReq({ rating: 4, body: "visit https://malware.com" }), params);
    expect(res.status).toBe(403);
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isBanned: true } })
    );
  });

  it("returns 404 when game does not exist", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockGame.findFirst.mockResolvedValueOnce(null);
    expect((await POST(postReq({ rating: 4 }), params)).status).toBe(404);
  });

  it("returns 409 when user has already reviewed this game", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockGame.findFirst.mockResolvedValueOnce({ id: "game-1" });
    mockReview.findUnique.mockResolvedValueOnce({ id: "r1", deletedAt: null });
    expect((await POST(postReq({ rating: 4 }), params)).status).toBe(409);
  });

  it("creates a review and recalculates rating on success", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockGame.findFirst.mockResolvedValueOnce({ id: "game-1" });
    mockReview.findUnique.mockResolvedValueOnce(null);
    mockReview.create.mockResolvedValueOnce({ id: "r1", rating: 4, user: { id: "u1", username: "test" } });
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 4 }, _count: { id: 1 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await POST(postReq({ rating: 4 }), params);
    expect(res.status).toBe(201);
    expect(mockReview.aggregate).toHaveBeenCalled();
    expect(mockGame.update).toHaveBeenCalled();
  });
});
