import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockForumPost = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { forumPost: mockForumPost } }));

import { DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const userSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "post-1" }) };

function authOk(session = userSession) {
  mockRequireAuth.mockResolvedValueOnce({ session, error: null });
}
function authFail(status = 401) {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

const existingPost = { id: "post-1", authorId: "u1", deletedAt: null };

describe("DELETE /api/forum/posts/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    authFail(401);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when post does not exist", async () => {
    authOk();
    mockForumPost.findUnique.mockResolvedValueOnce(null);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("returns 404 when post is soft-deleted", async () => {
    // The route queries findUnique({ where: { id, deletedAt: null } }) so a
    // soft-deleted record is invisible — the real DB returns null for it.
    authOk();
    mockForumPost.findUnique.mockResolvedValueOnce(null);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is neither the author nor an admin", async () => {
    authOk({ user: { id: "other-user", role: "user", isBanned: false, emailVerified: new Date() } });
    mockForumPost.findUnique.mockResolvedValueOnce(existingPost);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(403);
  });

  it("allows the post author to soft-delete their own post", async () => {
    authOk(userSession);
    mockForumPost.findUnique.mockResolvedValueOnce(existingPost);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
    expect(mockForumPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "post-1" }, data: { deletedAt: expect.any(Date) } })
    );
  });

  it("allows an admin to soft-delete any post", async () => {
    authOk(adminSession);
    mockForumPost.findUnique.mockResolvedValueOnce({ ...existingPost, authorId: "someone-else" });
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
  });
});
