import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({
  user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() },
}));
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGenre = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { genre: mockGenre } }));

import { PUT, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const params = { params: Promise.resolve({ id: "genre-1" }) };

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/genres/genre-1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/genres/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await PUT(putReq({ name: "Action" }), params)).status).toBe(401);
  });

  it("returns 400 for invalid slug format", async () => {
    // Validation fails before any DB call — no findUnique mock needed
    const res = await PUT(putReq({ slug: "INVALID SLUG" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when genre does not exist", async () => {
    mockGenre.findUnique.mockResolvedValueOnce(null);
    const res = await PUT(putReq({ name: "RPG" }), params);
    expect(res.status).toBe(404);
  });

  it("updates and returns the genre on success", async () => {
    const updated = { id: "genre-1", name: "RPG", slug: "rpg" };
    mockGenre.findUnique.mockResolvedValueOnce({ id: "genre-1" });
    mockGenre.update.mockResolvedValueOnce(updated);
    const res = await PUT(putReq({ name: "RPG", slug: "rpg" }), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it("returns 409 on name/slug conflict", async () => {
    mockGenre.findUnique.mockResolvedValueOnce({ id: "genre-1" });
    mockGenre.update.mockRejectedValueOnce(new Error("Unique constraint"));
    const res = await PUT(putReq({ name: "Action", slug: "action" }), params);
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/genres/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 404 when genre does not exist", async () => {
    mockGenre.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("deletes the genre and returns a success message", async () => {
    mockGenre.findUnique.mockResolvedValueOnce({ id: "genre-1" });
    mockGenre.delete.mockResolvedValueOnce({});
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
  });
});
