import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAdmin: mockRequireAdmin }));

const mockForumThread = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { forumThread: mockForumThread } }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };

function adminOk() {
  mockRequireAdmin.mockResolvedValueOnce({ session: adminSession, error: null });
}
function adminFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAdmin.mockResolvedValueOnce({ session: null, error: res });
}

function getReq(params = "") {
  return new NextRequest(`http://localhost/api/admin/forum/threads${params}`);
}

const thread = { id: "t1", title: "Hello", category: "general", isPinned: false, isLocked: false };

describe("GET /api/admin/forum/threads", () => {
  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await GET(getReq())).status).toBe(401);
  });

  it("returns paginated threads with metadata", async () => {
    adminOk();
    mockForumThread.findMany.mockResolvedValueOnce([thread]);
    mockForumThread.count.mockResolvedValueOnce(1);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.threads).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it("filters pinned threads when filter=pinned", async () => {
    adminOk();
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(getReq("?filter=pinned"));
    expect(mockForumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isPinned: true }) })
    );
  });

  it("filters locked threads when filter=locked", async () => {
    adminOk();
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(getReq("?filter=locked"));
    expect(mockForumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isLocked: true }) })
    );
  });

  it("filters by category when category param is provided", async () => {
    adminOk();
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(getReq("?category=tips"));
    expect(mockForumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: "tips" }) })
    );
  });

  it("adds an OR search clause when q param is provided", async () => {
    adminOk();
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(getReq("?q=minecraft"));
    const whereArg = mockForumThread.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
    expect(whereArg.OR.length).toBeGreaterThan(0);
  });

  it("uses page param for pagination", async () => {
    adminOk();
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(10);
    const res = await GET(getReq("?page=2"));
    const data = await res.json();
    expect(data.page).toBe(2);
  });
});
