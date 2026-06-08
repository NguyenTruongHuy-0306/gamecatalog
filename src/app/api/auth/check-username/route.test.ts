import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockUser = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

function req(username: string) {
  return new NextRequest(
    `http://localhost/api/auth/check-username?username=${encodeURIComponent(username)}`
  );
}

describe("GET /api/auth/check-username", () => {
  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    const res = await GET(req("someone"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when username is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/auth/check-username"));
    expect(res.status).toBe(400);
  });

  it("returns { exists: true } when the username is taken", async () => {
    mockUser.findFirst.mockResolvedValueOnce({ id: "existing-user" });
    const res = await GET(req("takenuser"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true });
  });

  it("returns { exists: false } when the username is available", async () => {
    mockUser.findFirst.mockResolvedValueOnce(null);
    const res = await GET(req("newuser"));
    expect(await res.json()).toEqual({ exists: false });
  });
});
