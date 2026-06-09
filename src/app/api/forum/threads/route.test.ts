import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireVerifiedAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({
  requireVerifiedAuth: mockRequireVerifiedAuth,
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const mockForumThread = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));
const mockGame = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { forumThread: mockForumThread, game: mockGame },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const verifiedSession = {
  user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() },
};

function authOk() {
  mockRequireVerifiedAuth.mockResolvedValueOnce({ session: verifiedSession, error: null });
}
function authFail(status: number) {
  const res = new Response(JSON.stringify({ error: "unauthorized" }), { status });
  mockRequireVerifiedAuth.mockResolvedValueOnce({ session: null, error: res });
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/forum/threads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validThread = {
  title: "Best tips for beginners",
  body: "Here are my top tips for getting started in the game.",
  category: "tips",
};

describe("GET /api/forum/threads", () => {
  it("returns paginated threads", async () => {
    mockForumThread.findMany.mockResolvedValueOnce([{ id: "t1" }]);
    mockForumThread.count.mockResolvedValueOnce(1);
    const res = await GET(new NextRequest("http://localhost/api/forum/threads"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.threads).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it("filters by category when ?category= is provided", async () => {
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(new NextRequest("http://localhost/api/forum/threads?category=tips"));
    expect(mockForumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: "tips" }) })
    );
  });

  it("filters by gameId when ?gameId= is provided", async () => {
    const gameId = "550e8400-e29b-41d4-a716-446655440001";
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(new NextRequest(`http://localhost/api/forum/threads?gameId=${gameId}`));
    expect(mockForumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ gameId }) })
    );
  });

  it("does not include gameId in where when param is absent", async () => {
    mockForumThread.findMany.mockResolvedValueOnce([]);
    mockForumThread.count.mockResolvedValueOnce(0);
    await GET(new NextRequest("http://localhost/api/forum/threads"));
    const whereArg = mockForumThread.findMany.mock.calls[0][0].where;
    expect(whereArg).not.toHaveProperty("gameId");
  });
});

describe("POST /api/forum/threads", () => {
  it("returns 401 when not authenticated", async () => {
    authFail(401);
    expect((await POST(postReq(validThread))).status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    authOk();
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(postReq(validThread))).status).toBe(429);
  });

  it("returns 400 for missing title", async () => {
    authOk();
    const res = await POST(postReq({ body: validThread.body, category: validThread.category }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for title shorter than 3 characters", async () => {
    authOk();
    const res = await POST(postReq({ ...validThread, title: "Hi" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for body shorter than 10 characters", async () => {
    authOk();
    const res = await POST(postReq({ ...validThread, body: "Short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid category", async () => {
    authOk();
    const res = await POST(postReq({ ...validThread, category: "not-a-category" }));
    expect(res.status).toBe(400);
  });

  it("creates a thread without gameId and returns 201", async () => {
    authOk();
    mockForumThread.create.mockResolvedValueOnce({ id: "t1", ...validThread, author: { id: "u1", username: "alice" } });
    const res = await POST(postReq(validThread));
    expect(res.status).toBe(201);
    expect(mockForumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ gameId: expect.anything() }) })
    );
  });

  it("returns 404 when gameId references a non-existent game", async () => {
    authOk();
    mockGame.findUnique.mockResolvedValueOnce(null);
    const gameId = "550e8400-e29b-41d4-a716-446655440002";
    const res = await POST(postReq({ ...validThread, gameId }));
    expect(res.status).toBe(404);
  });

  it("creates a game-linked thread and returns 201", async () => {
    const gameId = "550e8400-e29b-41d4-a716-446655440003";
    authOk();
    mockGame.findUnique.mockResolvedValueOnce({ id: gameId });
    mockForumThread.create.mockResolvedValueOnce({ id: "t2", ...validThread, gameId, author: { id: "u1", username: "alice" } });
    const res = await POST(postReq({ ...validThread, gameId }));
    expect(res.status).toBe(201);
    expect(mockForumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gameId }) })
    );
  });
});
