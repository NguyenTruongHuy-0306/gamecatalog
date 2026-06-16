import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAdmin: mockRequireAdmin }));

const mockForumPost = vi.hoisted(() => ({
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { forumPost: mockForumPost } }));

import { PATCH } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "post-1" }) };

function adminOk() {
  mockRequireAdmin.mockResolvedValueOnce({ session: adminSession, error: null });
}
function adminFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAdmin.mockResolvedValueOnce({ session: null, error: res });
}

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/forum/posts/post-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/forum/posts/[id]", () => {
  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await PATCH(patchReq({ action: "delete" }), params)).status).toBe(401);
  });

  it("soft-deletes the post when action is 'delete'", async () => {
    adminOk();
    const res = await PATCH(patchReq({ action: "delete" }), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(mockForumPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "post-1" }, data: { deletedAt: expect.any(Date) } })
    );
  });

  it("returns 400 for an unknown action", async () => {
    adminOk();
    const res = await PATCH(patchReq({ action: "fly" }), params);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Unknown") });
    expect(mockForumPost.update).not.toHaveBeenCalled();
  });
});
