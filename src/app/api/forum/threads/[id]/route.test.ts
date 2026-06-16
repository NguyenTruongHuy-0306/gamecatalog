import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockForumThread = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { forumThread: mockForumThread } }));

import { GET, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const userSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "thread-1" }) };

function authOk(session = userSession) {
  mockRequireAuth.mockResolvedValueOnce({ session, error: null });
}
function authFail(status = 401) {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

const existingThread = {
  id: "thread-1",
  title: "Best tips",
  authorId: "u1",
  deletedAt: null,
  author: { id: "u1", username: "alice", avatarUrl: null },
  _count: { posts: 2 },
};

describe("GET /api/forum/threads/[id]", () => {
  it("returns 404 when thread does not exist", async () => {
    mockForumThread.findUnique.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a soft-deleted thread", async () => {
    mockForumThread.findUnique.mockResolvedValueOnce(null); // query uses deletedAt: null filter
    const res = await GET(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("returns the thread data when found", async () => {
    mockForumThread.findUnique.mockResolvedValueOnce(existingThread);
    const res = await GET(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("thread-1");
    expect(data.author).toBeDefined();
  });
});

describe("DELETE /api/forum/threads/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    authFail(401);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 404 when thread does not exist", async () => {
    authOk();
    mockForumThread.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("returns 403 when user is neither author nor admin", async () => {
    authOk({ user: { id: "other-user", role: "user", isBanned: false, emailVerified: new Date() } });
    mockForumThread.findUnique.mockResolvedValueOnce({ ...existingThread, authorId: "u1" });
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(403);
  });

  it("allows the thread author to delete their thread", async () => {
    authOk(userSession); // u1 is the author
    mockForumThread.findUnique.mockResolvedValueOnce({ ...existingThread, authorId: "u1" });
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(mockForumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "thread-1" }, data: { deletedAt: expect.any(Date) } })
    );
  });

  it("allows an admin to delete any thread", async () => {
    authOk(adminSession);
    mockForumThread.findUnique.mockResolvedValueOnce({ ...existingThread, authorId: "someone-else" });
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
  });
});
