import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/generated/prisma/client", () => ({
  Prisma: {},
}));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockReview = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { review: mockReview } }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "a1", role: "admin", isBanned: false, emailVerified: new Date() } };
const userSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function req(query = "") {
  return new NextRequest(`http://localhost/api/admin/reviews${query ? `?${query}` : ""}`);
}

const flaggedReview = {
  id: "r1",
  body: "bad review",
  isFlagged: true,
  user: { id: "u1", username: "spammer", email: "s@s.com" },
  game: { id: "g1", title: "Test Game", slug: "test-game" },
  flaggedBy: null,
};

describe("GET /api/admin/reviews", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    expect((await GET(req())).status).toBe(403);
  });

  it("returns flagged reviews by default", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findMany.mockResolvedValueOnce([flaggedReview]);
    mockReview.count.mockResolvedValueOnce(1);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    const whereArg = mockReview.findMany.mock.calls[0][0].where;
    expect(whereArg.isFlagged).toBe(true);
  });

  it("returns all reviews when filter=all", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findMany.mockResolvedValueOnce([]);
    mockReview.count.mockResolvedValueOnce(0);
    await GET(req("filter=all"));
    const whereArg = mockReview.findMany.mock.calls[0][0].where;
    expect(whereArg.isFlagged).toBeUndefined();
  });

  it("filters by search query", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findMany.mockResolvedValueOnce([]);
    mockReview.count.mockResolvedValueOnce(0);
    await GET(req("q=spam"));
    const whereArg = mockReview.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
  });

  it("paginates correctly", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockReview.findMany.mockResolvedValueOnce([]);
    mockReview.count.mockResolvedValueOnce(25);
    const res = await GET(req("page=2"));
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.totalPages).toBe(2);
  });
});
