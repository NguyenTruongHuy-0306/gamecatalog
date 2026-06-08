import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
const mockReview = vi.hoisted(() => ({ aggregate: vi.fn() }));
const mockGame = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { user: mockUser, review: mockReview, game: mockGame },
}));

import { GET, PUT, DELETE, PATCH } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "user-1" }) };

function req(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/users/user-1", {
    method,
    ...(body
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

const baseUser = {
  id: "user-1",
  email: "u@u.com",
  username: "user1",
  role: "user",
  isBanned: false,
  deletedAt: null,
  reviews: [],
};

describe("GET /api/users/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await GET(req("GET"), params)).status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await GET(req("GET"), params)).status).toBe(404);
  });

  it("returns the user data", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(baseUser);
    const res = await GET(req("GET"), params);
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/users/[id]", () => {
  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await PUT(req("PUT", { username: "new" }), params)).status).toBe(404);
  });

  it("returns 409 when username is already taken", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(baseUser);
    mockUser.findFirst.mockResolvedValueOnce({ id: "other" }); // conflict
    const res = await PUT(req("PUT", { username: "takenname" }), params);
    expect(res.status).toBe(409);
  });

  it("returns 409 when email is already in use", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(baseUser);
    // Only email is being updated — username check is skipped, one findFirst for email
    mockUser.findFirst.mockResolvedValueOnce({ id: "other" });
    const res = await PUT(req("PUT", { email: "taken@example.com" }), params);
    expect(res.status).toBe(409);
  });

  it("updates the user and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(baseUser);
    mockUser.findFirst.mockResolvedValue(null);
    mockUser.update.mockResolvedValueOnce({ ...baseUser, bio: "hello" });
    const res = await PUT(req("PUT", { bio: "hello" }), params);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/users/[id]", () => {
  it("returns 403 when admin tries to delete themselves", async () => {
    const selfParams = { params: Promise.resolve({ id: "admin-1" }) };
    mockAuth.mockResolvedValueOnce(adminSession);
    expect((await DELETE(req("DELETE"), selfParams)).status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(req("DELETE"), params)).status).toBe(404);
  });

  it("deletes the user and recalculates affected game ratings", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce({
      ...baseUser,
      reviews: [{ gameId: "game-1" }],
    });
    mockUser.delete.mockResolvedValueOnce({});
    mockReview.aggregate.mockResolvedValueOnce({ _avg: { rating: 0 }, _count: { id: 0 } });
    mockGame.update.mockResolvedValueOnce({});
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(200);
    expect(mockReview.aggregate).toHaveBeenCalled();
    expect(mockGame.update).toHaveBeenCalled();
  });
});

describe("PATCH /api/users/[id]", () => {
  it("returns 403 when trying to ban another admin", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce({ ...baseUser, role: "admin" });
    const res = await PATCH(req("PATCH", { isBanned: true }), params);
    expect(res.status).toBe(403);
  });

  it("returns 403 when admin tries to change their own role", async () => {
    const selfParams = { params: Promise.resolve({ id: "admin-1" }) };
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce({ ...baseUser, id: "admin-1", role: "admin" });
    const res = await PATCH(req("PATCH", { role: "user" }), selfParams);
    expect(res.status).toBe(403);
  });

  it("bans a regular user", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce({ ...baseUser, role: "user" });
    mockUser.update.mockResolvedValueOnce({ ...baseUser, isBanned: true });
    const res = await PATCH(req("PATCH", { isBanned: true, banReason: "spam" }), params);
    expect(res.status).toBe(200);
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isBanned: true, banReason: "spam" }),
      })
    );
  });

  it("promotes a user to admin", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findUnique.mockResolvedValueOnce({ ...baseUser, role: "user" });
    mockUser.update.mockResolvedValueOnce({ ...baseUser, role: "admin" });
    const res = await PATCH(req("PATCH", { role: "admin" }), params);
    expect(res.status).toBe(200);
  });
});
