import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockUser = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "a1", role: "admin", isBanned: false, emailVerified: new Date() } };
const userSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function req(query = "") {
  return new NextRequest(`http://localhost/api/users${query ? `?${query}` : ""}`);
}

describe("GET /api/users", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    expect((await GET(req())).status).toBe(403);
  });

  it("returns paginated list of users", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const users = [{ id: "u1", username: "alice", email: "a@a.com" }];
    mockUser.findMany.mockResolvedValueOnce(users);
    mockUser.count.mockResolvedValueOnce(1);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual(users);
    expect(body.total).toBe(1);
  });

  it("filters by search query", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findMany.mockResolvedValueOnce([]);
    mockUser.count.mockResolvedValueOnce(0);
    await GET(req("q=alice"));
    const whereArg = mockUser.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
  });

  it("filters by ban status", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockUser.findMany.mockResolvedValueOnce([]);
    mockUser.count.mockResolvedValueOnce(0);
    await GET(req("is_banned=true"));
    const whereArg = mockUser.findMany.mock.calls[0][0].where;
    expect(whereArg.isBanned).toBe(true);
  });
});
