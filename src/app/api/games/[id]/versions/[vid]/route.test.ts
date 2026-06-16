import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAdmin: mockRequireAdmin }));

const mockGameVersion = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { gameVersion: mockGameVersion } }));

import { PUT, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "game-1", vid: "ver-1" }) };

function adminOk() {
  mockRequireAdmin.mockResolvedValueOnce({ session: adminSession, error: null });
}
function adminFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAdmin.mockResolvedValueOnce({ session: null, error: res });
}

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/games/game-1/versions/ver-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const existingVersion = { id: "ver-1", gameId: "game-1", versionLabel: "1.0.0", releaseDate: new Date("2023-01-01"), notes: null };

describe("PUT /api/games/[id]/versions/[vid]", () => {
  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await PUT(putReq({ versionLabel: "1.0.1" }), params)).status).toBe(401);
  });

  it("returns 400 for invalid body (bad date format)", async () => {
    adminOk();
    const res = await PUT(putReq({ releaseDate: "not-a-date" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when version does not exist", async () => {
    adminOk();
    mockGameVersion.findUnique.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ versionLabel: "2.0.0" }), params)).status).toBe(404);
  });

  it("updates the version label", async () => {
    adminOk();
    const updated = { ...existingVersion, versionLabel: "1.0.1" };
    mockGameVersion.findUnique.mockResolvedValueOnce(existingVersion);
    mockGameVersion.update.mockResolvedValueOnce(updated);
    const res = await PUT(putReq({ versionLabel: "1.0.1" }), params);
    expect(res.status).toBe(200);
    expect((await res.json()).versionLabel).toBe("1.0.1");
    expect(mockGameVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ver-1" }, data: expect.objectContaining({ versionLabel: "1.0.1" }) })
    );
  });

  it("updates the release date", async () => {
    adminOk();
    mockGameVersion.findUnique.mockResolvedValueOnce(existingVersion);
    mockGameVersion.update.mockResolvedValueOnce({ ...existingVersion, releaseDate: new Date("2024-06-01") });
    const res = await PUT(putReq({ releaseDate: "2024-06-01" }), params);
    expect(res.status).toBe(200);
    expect(mockGameVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ releaseDate: new Date("2024-06-01") }) })
    );
  });

  it("updates notes to null when explicitly set", async () => {
    adminOk();
    mockGameVersion.findUnique.mockResolvedValueOnce(existingVersion);
    mockGameVersion.update.mockResolvedValueOnce({ ...existingVersion, notes: null });
    const res = await PUT(putReq({ notes: null }), params);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/games/[id]/versions/[vid]", () => {
  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 404 when version does not exist", async () => {
    adminOk();
    mockGameVersion.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("deletes the version and returns a success message", async () => {
    adminOk();
    mockGameVersion.findUnique.mockResolvedValueOnce(existingVersion);
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
    expect(mockGameVersion.delete).toHaveBeenCalledWith({ where: { id: "ver-1" } });
  });
});
