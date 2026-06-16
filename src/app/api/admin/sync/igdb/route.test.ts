import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockIgdbSyncState = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn().mockResolvedValue({}) }));
const mockGame = vi.hoisted(() => ({ count: vi.fn().mockResolvedValue(0) }));
vi.mock("@/lib/db", () => ({ prisma: { igdbSyncState: mockIgdbSyncState, game: mockGame } }));

const mockRunIgdbSync = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ added: 2, updated: 1, skipped: 0, errors: 0, hasMore: false })
);
vi.mock("@/lib/igdb-sync", () => ({ runIgdbSync: mockRunIgdbSync }));

const mockUpdateAllReleaseStatuses = vi.hoisted(() => vi.fn().mockResolvedValue(3));
vi.mock("@/lib/release-status", () => ({ updateAllReleaseStatuses: mockUpdateAllReleaseStatuses }));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin" } };

function postReq(params = "", headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/admin/sync/igdb${params}`, {
    method: "POST",
    headers,
  });
}

describe("GET /api/admin/sync/igdb", () => {
  it("returns sync state with lastSyncedAt and pending count", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce({ id: 1, lastSyncedAt: 1700000000 });
    mockGame.count.mockResolvedValueOnce(5);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lastSyncedAt).toBe(1700000000);
    expect(data.pending).toBe(5);
  });

  it("returns 0 for lastSyncedAt when no state row exists", async () => {
    mockIgdbSyncState.findUnique.mockResolvedValueOnce(null);
    mockGame.count.mockResolvedValueOnce(0);
    const res = await GET();
    const data = await res.json();
    expect(data.lastSyncedAt).toBe(0);
  });
});

describe("POST /api/admin/sync/igdb", () => {
  it("returns 401 when not authenticated and no cron secret", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq())).status).toBe(401);
  });

  it("returns 401 when authenticated but not admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { role: "user" } });
    expect((await POST(postReq())).status).toBe(401);
  });

  it("allows an admin user to trigger sync", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const res = await POST(postReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.added).toBe(2);
    expect(data.statusUpdates).toBe(3);
    expect(mockRunIgdbSync).toHaveBeenCalledOnce();
  });

  it("allows a cron request with valid Bearer secret to bypass admin check", async () => {
    process.env.CRON_SECRET = "secret123";
    try {
      const res = await POST(postReq("", { authorization: "Bearer secret123" }));
      expect(res.status).toBe(200);
      expect(mockAuth).not.toHaveBeenCalled();
    } finally {
      delete process.env.CRON_SECRET;
    }
  });

  it("rejects a cron request with an incorrect Bearer secret", async () => {
    process.env.CRON_SECRET = "correct-secret";
    mockAuth.mockResolvedValueOnce(null);
    try {
      const res = await POST(postReq("", { authorization: "Bearer wrong-secret" }));
      expect(res.status).toBe(401);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });

  it("resets the sync cursor when ?full=true is provided", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    await POST(postReq("?full=true"));
    expect(mockIgdbSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        update: { lastSyncedAt: 0, accessToken: null, tokenExpiresAt: null },
      })
    );
  });

  it("does not reset the cursor when ?full is absent", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    await POST(postReq());
    expect(mockIgdbSyncState.upsert).not.toHaveBeenCalled();
  });

  it("skips release status update when hasMore is true", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockRunIgdbSync.mockResolvedValueOnce({ added: 0, updated: 500, skipped: 0, errors: 0, hasMore: true });
    const res = await POST(postReq());
    const data = await res.json();
    expect(data.statusUpdates).toBe(0);
    expect(mockUpdateAllReleaseStatuses).not.toHaveBeenCalled();
  });

  it("returns 500 when runIgdbSync throws", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockRunIgdbSync.mockRejectedValueOnce(new Error("IGDB API down"));
    const res = await POST(postReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "IGDB API down" });
  });
});
