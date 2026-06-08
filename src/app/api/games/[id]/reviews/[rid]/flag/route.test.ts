import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockReview = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { review: mockReview } }));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const verifiedSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "game-1", rid: "review-1" }) };

const existingReview = { id: "review-1", userId: "other-user", deletedAt: null };

function postReq(body: unknown = {}) {
  return new NextRequest("http://localhost/api/games/game-1/reviews/review-1/flag", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[id]/reviews/[rid]/flag", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq(), params)).status).toBe(401);
  });

  it("returns 403 when email is not verified", async () => {
    mockAuth.mockResolvedValueOnce({ user: { ...verifiedSession.user, emailVerified: null } });
    expect((await POST(postReq(), params)).status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(postReq(), params)).status).toBe(429);
  });

  it("returns 404 when review does not exist", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockReview.findUnique.mockResolvedValueOnce(null);
    expect((await POST(postReq(), params)).status).toBe(404);
  });

  it("returns 404 when review is soft-deleted", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockReview.findUnique.mockResolvedValueOnce({ ...existingReview, deletedAt: new Date() });
    expect((await POST(postReq(), params)).status).toBe(404);
  });

  it("returns 400 when user tries to flag their own review", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockReview.findUnique.mockResolvedValueOnce({ ...existingReview, userId: "u1" });
    expect((await POST(postReq(), params)).status).toBe(400);
  });

  it("flags the review and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    const res = await POST(postReq({ reason: "spam" }), params);
    expect(res.status).toBe(200);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isFlagged: true, flaggedById: "u1", flagReason: "spam" }),
      })
    );
  });

  it("flags the review without a reason", async () => {
    mockAuth.mockResolvedValueOnce(verifiedSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    const res = await POST(postReq(), params);
    expect(res.status).toBe(200);
  });
});
