import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import { GET, PUT } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns 404 when user is not found in DB", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(404);
  });

  it("returns the user profile", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const profile = { id: "u1", username: "testuser", email: "t@t.com", bio: null, avatarUrl: null, createdAt: new Date() };
    mockUser.findUnique.mockResolvedValueOnce(profile);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("testuser");
  });
});

describe("PUT /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ username: "newname" }))).status).toBe(401);
  });

  it("returns 400 for username too short", async () => {
    mockAuth.mockResolvedValueOnce(session);
    expect((await PUT(putReq({ username: "ab" }))).status).toBe(400);
  });

  it("returns 409 when username is already taken", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockUser.findFirst.mockResolvedValueOnce({ id: "other" });
    expect((await PUT(putReq({ username: "takenname" }))).status).toBe(409);
  });

  it("updates profile and returns updated user", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockUser.findFirst.mockResolvedValueOnce(null);
    const updated = { id: "u1", username: "newname", email: "t@t.com", bio: "hi", avatarUrl: null };
    mockUser.update.mockResolvedValueOnce(updated);
    const res = await PUT(putReq({ username: "newname", bio: "hi" }));
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("newname");
  });

  it("updates only bio without touching username", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const updated = { id: "u1", username: "testuser", email: "t@t.com", bio: "new bio", avatarUrl: null };
    mockUser.update.mockResolvedValueOnce(updated);
    const res = await PUT(putReq({ bio: "new bio" }));
    expect(res.status).toBe(200);
    expect(mockUser.findFirst).not.toHaveBeenCalled();
  });
});
