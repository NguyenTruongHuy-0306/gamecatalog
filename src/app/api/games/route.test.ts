import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/generated/prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(msg: string, opts: { code: string }) {
        super(msg);
        this.code = opts.code;
      }
    },
  },
}));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGame = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { game: mockGame } }));

import { GET, POST } from "./route";
import { Prisma } from "@/generated/prisma/client";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "a1", role: "admin", isBanned: false, emailVerified: new Date() } };
const userSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function getReq(query = "") {
  return new NextRequest(`http://localhost/api/games${query ? `?${query}` : ""}`);
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/games", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validGame = {
  title: "Test Game",
  slug: "test-game",
  description: "A great game",
  releaseYear: 2024,
};

describe("GET /api/games", () => {
  it("returns paginated games list for anonymous users (published only)", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockGame.findMany.mockResolvedValueOnce([{ id: "g1", title: "Test" }]);
    mockGame.count.mockResolvedValueOnce(1);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
  });

  it("includes unpublished games for admins", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockGame.findMany.mockResolvedValueOnce([]);
    mockGame.count.mockResolvedValueOnce(0);
    await GET(getReq());
    const whereArg = mockGame.findMany.mock.calls[0][0].where;
    expect(whereArg.isPublished).toBeUndefined();
  });

  it("applies search query filter", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockGame.findMany.mockResolvedValueOnce([]);
    mockGame.count.mockResolvedValueOnce(0);
    await GET(getReq("q=pokemon"));
    const whereArg = mockGame.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
  });

  it("returns 400 for invalid query parameters", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await GET(getReq("limit=999"))).status).toBe(400);
  });
});

describe("POST /api/games", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq(validGame))).status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    expect((await POST(postReq(validGame))).status).toBe(403);
  });

  it("returns 400 for invalid input", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    expect((await POST(postReq({ title: "" }))).status).toBe(400);
  });

  it("returns 400 for invalid slug format", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    expect((await POST(postReq({ ...validGame, slug: "UPPER CASE" }))).status).toBe(400);
  });

  it("creates a game and returns 201 on success", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const game = { id: "g1", ...validGame, gameGenres: [] };
    mockGame.create.mockResolvedValueOnce(game);
    const res = await POST(postReq(validGame));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(game);
  });

  it("returns 409 when slug already exists", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002" } as never);
    mockGame.create.mockRejectedValueOnce(err);
    const res = await POST(postReq(validGame));
    expect(res.status).toBe(409);
  });
});
