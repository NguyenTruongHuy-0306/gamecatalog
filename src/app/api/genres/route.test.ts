import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({
  user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() },
}));
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGenre = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { genre: mockGenre } }));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/genres", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/genres", () => {
  it("returns a list of genres", async () => {
    const genres = [{ id: "g1", name: "Action", slug: "action" }];
    mockGenre.findMany.mockResolvedValueOnce(genres);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(genres);
  });
});

describe("POST /api/genres", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq({ name: "Action", slug: "action" }))).status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "u1", role: "user", isBanned: false },
    });
    expect((await POST(postReq({ name: "Action", slug: "action" }))).status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    expect((await POST(postReq({ name: "" }))).status).toBe(400);
    expect((await POST(postReq({ name: "Action", slug: "INVALID SLUG" }))).status).toBe(400);
  });

  it("creates a new genre and returns 201", async () => {
    const genre = { id: "g1", name: "Action", slug: "action" };
    mockGenre.create.mockResolvedValueOnce(genre);
    const res = await POST(postReq({ name: "Action", slug: "action" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(genre);
  });

  it("returns 409 when the genre already exists", async () => {
    mockGenre.create.mockRejectedValueOnce(new Error("Unique constraint failed"));
    const res = await POST(postReq({ name: "Action", slug: "action" }));
    expect(res.status).toBe(409);
  });
});
