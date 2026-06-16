import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAdmin: mockRequireAdmin }));

const mockForumThread = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { forumThread: mockForumThread } }));

import { GET, PATCH } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "thread-1" }) };

function adminOk() {
  mockRequireAdmin.mockResolvedValueOnce({ session: adminSession, error: null });
}
function adminFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAdmin.mockResolvedValueOnce({ session: null, error: res });
}

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/forum/threads/thread-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const thread = {
  id: "thread-1",
  title: "A thread",
  isPinned: false,
  isLocked: false,
  author: { id: "u1", username: "alice" },
  game: null,
  posts: [],
};

describe("GET /api/admin/forum/threads/[id]", () => {
  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await GET(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 404 when thread does not exist", async () => {
    adminOk();
    mockForumThread.findUnique.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("returns the thread with its posts", async () => {
    adminOk();
    mockForumThread.findUnique.mockResolvedValueOnce(thread);
    const res = await GET(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.thread.id).toBe("thread-1");
  });
});

describe("PATCH /api/admin/forum/threads/[id]", () => {
  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await PATCH(patchReq({ action: "pin" }), params)).status).toBe(401);
  });

  it("pins the thread", async () => {
    adminOk();
    const res = await PATCH(patchReq({ action: "pin" }), params);
    expect(res.status).toBe(200);
    expect(mockForumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "thread-1" }, data: { isPinned: true } })
    );
  });

  it("unpins the thread", async () => {
    adminOk();
    await PATCH(patchReq({ action: "unpin" }), params);
    expect(mockForumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPinned: false } })
    );
  });

  it("locks the thread", async () => {
    adminOk();
    await PATCH(patchReq({ action: "lock" }), params);
    expect(mockForumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isLocked: true } })
    );
  });

  it("unlocks the thread", async () => {
    adminOk();
    await PATCH(patchReq({ action: "unlock" }), params);
    expect(mockForumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isLocked: false } })
    );
  });

  it("soft-deletes the thread", async () => {
    adminOk();
    const res = await PATCH(patchReq({ action: "delete" }), params);
    expect(res.status).toBe(200);
    expect(mockForumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } })
    );
  });

  it("returns 400 for an unknown action", async () => {
    adminOk();
    const res = await PATCH(patchReq({ action: "fly" }), params);
    expect(res.status).toBe(400);
    expect(mockForumThread.update).not.toHaveBeenCalled();
  });
});
