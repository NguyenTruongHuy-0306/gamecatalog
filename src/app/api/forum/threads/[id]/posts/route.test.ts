import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireVerifiedAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({
  requireVerifiedAuth: mockRequireVerifiedAuth,
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const mockForumPost = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));
const mockForumThread = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
const mockTransaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({
  prisma: {
    forumPost: mockForumPost,
    forumThread: mockForumThread,
    $transaction: mockTransaction,
  },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const verifiedSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "thread-1" }) };

function authOk() {
  mockRequireVerifiedAuth.mockResolvedValueOnce({ session: verifiedSession, error: null });
}
function authFail(status = 401) {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status });
  mockRequireVerifiedAuth.mockResolvedValueOnce({ session: null, error: res });
}

const openThread = { id: "thread-1", isLocked: false, deletedAt: null };
const lockedThread = { id: "thread-1", isLocked: true, deletedAt: null };

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/forum/threads/thread-1/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/forum/threads/[id]/posts", () => {
  it("returns 404 when the thread does not exist", async () => {
    mockForumThread.findUnique.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/api/forum/threads/thread-1/posts"), params);
    expect(res.status).toBe(404);
  });

  it("returns paginated posts with metadata", async () => {
    const post = { id: "p1", body: "A post", author: { id: "u1", username: "alice", avatarUrl: null } };
    mockForumThread.findUnique.mockResolvedValueOnce(openThread);
    mockForumPost.findMany.mockResolvedValueOnce([post]);
    mockForumPost.count.mockResolvedValueOnce(1);

    const res = await GET(new NextRequest("http://localhost/api/forum/threads/thread-1/posts"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.posts).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it("respects the page query param", async () => {
    mockForumThread.findUnique.mockResolvedValueOnce(openThread);
    mockForumPost.findMany.mockResolvedValueOnce([]);
    mockForumPost.count.mockResolvedValueOnce(30);
    const res = await GET(new NextRequest("http://localhost/api/forum/threads/thread-1/posts?page=2"), params);
    const data = await res.json();
    expect(data.page).toBe(2);
  });
});

describe("POST /api/forum/threads/[id]/posts", () => {
  it("returns 401 when not authenticated", async () => {
    authFail(401);
    expect((await POST(postReq({ body: "Hello world, this is a great reply!" }), params)).status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    authOk();
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(postReq({ body: "Reply content here!" }), params)).status).toBe(429);
  });

  it("returns 404 when thread does not exist", async () => {
    authOk();
    mockForumThread.findUnique.mockResolvedValueOnce(null);
    expect((await POST(postReq({ body: "Nice game guide post!" }), params)).status).toBe(404);
  });

  it("returns 403 when thread is locked", async () => {
    authOk();
    mockForumThread.findUnique.mockResolvedValueOnce(lockedThread);
    expect((await POST(postReq({ body: "Hello everyone, great tips!" }), params)).status).toBe(403);
  });

  it("returns 400 for a body that is too short (< 2 chars)", async () => {
    authOk();
    mockForumThread.findUnique.mockResolvedValueOnce(openThread);
    expect((await POST(postReq({ body: "x" }), params)).status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    authOk();
    const req = new NextRequest("http://localhost", { method: "POST", body: "not-json" });
    mockForumThread.findUnique.mockResolvedValueOnce(openThread);
    expect((await POST(req, params)).status).toBe(400);
  });

  it("creates the post and updates thread's lastPostAt", async () => {
    authOk();
    const createdPost = { id: "p2", body: "Hello world!", author: { id: "u1", username: "alice", avatarUrl: null } };
    mockForumThread.findUnique.mockResolvedValueOnce(openThread);
    mockForumPost.create.mockResolvedValueOnce(createdPost);
    mockForumThread.update.mockResolvedValueOnce({});
    mockTransaction.mockImplementationOnce((ops: Promise<unknown>[]) => Promise.all(ops));

    const res = await POST(postReq({ body: "Hello world!" }), params);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("p2");
    expect(mockForumPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ body: "Hello world!", threadId: "thread-1", authorId: "u1" }) })
    );
  });
});
