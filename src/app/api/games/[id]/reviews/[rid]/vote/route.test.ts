import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireVerifiedAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireVerifiedAuth: mockRequireVerifiedAuth }));

const mockReview = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));
const mockReviewVote = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { review: mockReview, reviewVote: mockReviewVote } }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const verifiedSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "game-1", rid: "review-1" }) };

function authOk() {
  mockRequireVerifiedAuth.mockResolvedValueOnce({ session: verifiedSession, error: null });
}
function authFail(status = 401) {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status });
  mockRequireVerifiedAuth.mockResolvedValueOnce({ session: null, error: res });
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/games/game-1/reviews/review-1/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const existingReview = {
  id: "review-1",
  userId: "other-user",
  helpfulCount: 0,
  notHelpfulCount: 0,
};

const updatedCounts = { helpfulCount: 1, notHelpfulCount: 0 };

describe("POST /api/games/[id]/reviews/[rid]/vote", () => {
  it("returns 401 when not authenticated", async () => {
    authFail(401);
    expect((await POST(postReq({ value: 1 }), params)).status).toBe(401);
  });

  it("returns 403 when email not verified", async () => {
    authFail(403);
    expect((await POST(postReq({ value: 1 }), params)).status).toBe(403);
  });

  it("returns 400 for invalid vote value (0)", async () => {
    authOk();
    expect((await POST(postReq({ value: 0 }), params)).status).toBe(400);
  });

  it("returns 400 for invalid vote value (string)", async () => {
    authOk();
    expect((await POST(postReq({ value: "up" }), params)).status).toBe(400);
  });

  it("returns 400 for invalid request body", async () => {
    authOk();
    const req = new NextRequest("http://localhost", { method: "POST", body: "not-json" });
    expect((await POST(req, params)).status).toBe(400);
  });

  it("returns 404 when review does not exist", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(null);
    expect((await POST(postReq({ value: 1 }), params)).status).toBe(404);
  });

  it("returns 403 when user tries to vote on their own review", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce({ ...existingReview, userId: "u1" });
    expect((await POST(postReq({ value: 1 }), params)).status).toBe(403);
  });

  it("creates a helpful vote when none exists", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReviewVote.findUnique.mockResolvedValueOnce(null); // no existing vote
    mockReview.update.mockResolvedValueOnce(updatedCounts);

    const res = await POST(postReq({ value: 1 }), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userVote).toBe(1);
    expect(mockReviewVote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: 1, userId: "u1", reviewId: "review-1" }) })
    );
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { helpfulCount: { increment: 1 }, notHelpfulCount: { increment: 0 } } })
    );
  });

  it("creates a not-helpful vote when none exists", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReviewVote.findUnique.mockResolvedValueOnce(null);
    mockReview.update.mockResolvedValueOnce({ helpfulCount: 0, notHelpfulCount: 1 });

    const res = await POST(postReq({ value: -1 }), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userVote).toBe(-1);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { helpfulCount: { increment: 0 }, notHelpfulCount: { increment: 1 } } })
    );
  });

  it("toggles off the vote when the same value is cast again (helpful)", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReviewVote.findUnique.mockResolvedValueOnce({ value: 1 }); // same vote
    mockReview.update.mockResolvedValueOnce({ helpfulCount: 0, notHelpfulCount: 0 });

    const res = await POST(postReq({ value: 1 }), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userVote).toBeNull();
    expect(mockReviewVote.delete).toHaveBeenCalled();
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { helpfulCount: { increment: -1 }, notHelpfulCount: { increment: 0 } } })
    );
  });

  it("toggles off a not-helpful vote when cast again", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReviewVote.findUnique.mockResolvedValueOnce({ value: -1 }); // same vote
    mockReview.update.mockResolvedValueOnce({ helpfulCount: 0, notHelpfulCount: 0 });

    const res = await POST(postReq({ value: -1 }), params);
    const data = await res.json();
    expect(data.userVote).toBeNull();
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { helpfulCount: { increment: 0 }, notHelpfulCount: { increment: -1 } } })
    );
  });

  it("changes vote direction from helpful to not-helpful", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReviewVote.findUnique.mockResolvedValueOnce({ value: 1 }); // previously helpful
    mockReview.update.mockResolvedValueOnce({ helpfulCount: 0, notHelpfulCount: 1 });

    const res = await POST(postReq({ value: -1 }), params);
    const data = await res.json();
    expect(data.userVote).toBe(-1);
    expect(mockReviewVote.update).toHaveBeenCalled();
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { helpfulCount: { increment: -1 }, notHelpfulCount: { increment: 1 } } })
    );
  });

  it("changes vote direction from not-helpful to helpful", async () => {
    authOk();
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReviewVote.findUnique.mockResolvedValueOnce({ value: -1 }); // previously not helpful
    mockReview.update.mockResolvedValueOnce({ helpfulCount: 1, notHelpfulCount: 0 });

    const res = await POST(postReq({ value: 1 }), params);
    const data = await res.json();
    expect(data.userVote).toBe(1);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { helpfulCount: { increment: 1 }, notHelpfulCount: { increment: -1 } } })
    );
  });
});
