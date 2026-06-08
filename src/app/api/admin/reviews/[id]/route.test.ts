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
vi.mock("@/lib/db", () => ({ prisma: { review: mockReview, game: mockGame } }));

import { PATCH } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "review-1" }) };

const existingReview = { id: "review-1", gameId: "game-1", userId: "u1", deletedAt: null, rating: 3 };

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/reviews/review-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/reviews/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await PATCH(patchReq({ action: "unflag" }), params)).status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    expect((await PATCH(patchReq({ action: "invalid" }), params)).status).toBe(400);
  });

  it("returns 404 when review does not exist", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findUnique.mockResolvedValueOnce(null);
    expect((await PATCH(patchReq({ action: "unflag" }), params)).status).toBe(404);
  });

  it("unflag: clears flag fields", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReview.update.mockResolvedValueOnce({});
    const res = await PATCH(patchReq({ action: "unflag" }), params);
    expect(res.status).toBe(200);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isFlagged: false, flaggedById: null }),
      })
    );
  });

  it("flag: sets isFlagged and records who flagged it", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReview.update.mockResolvedValueOnce({});
    const res = await PATCH(patchReq({ action: "flag", flagReason: "hate speech" }), params);
    expect(res.status).toBe(200);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isFlagged: true, flaggedById: "admin-1" }),
      })
    );
  });

  it("delete: soft-deletes and recalculates rating", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockGame.findUnique.mockResolvedValueOnce({ slug: "test-game" });
    mockReview.update.mockResolvedValueOnce({});
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 0 }, _count: { id: 0 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await PATCH(patchReq({ action: "delete" }), params);
    expect(res.status).toBe(200);
    expect(mockReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } })
    );
    expect(mockReview.aggregate).toHaveBeenCalled();
  });

  it("edit: updates rating and body and recalculates rating", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findUnique.mockResolvedValueOnce(existingReview);
    mockReview.update.mockResolvedValueOnce({ ...existingReview, rating: 5 });
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 5 }, _count: { id: 1 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await PATCH(patchReq({ action: "edit", rating: 5, body: "Updated body" }), params);
    expect(res.status).toBe(200);
    expect(mockReview.aggregate).toHaveBeenCalled();
  });
});
