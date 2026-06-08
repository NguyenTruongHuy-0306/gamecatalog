import { vi, describe, it, expect, afterEach } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

import { jsonError, requireAuth, requireAdmin, requireVerifiedAuth, getClientIp } from "./api-helpers";

afterEach(() => vi.clearAllMocks());

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-1",
      role: "user",
      isBanned: false,
      emailVerified: new Date(),
      username: "testuser",
      ...overrides,
    },
  };
}

describe("jsonError", () => {
  it("returns correct status code", async () => {
    expect(jsonError("Not found", 404).status).toBe(404);
  });

  it("returns error message in JSON body", async () => {
    const body = await jsonError("Bad request", 400).json();
    expect(body.error).toBe("Bad request");
  });
});

describe("requireAuth", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { session, error } = await requireAuth();
    expect(session).toBeNull();
    expect(error?.status).toBe(401);
  });

  it("returns 403 when the user is banned", async () => {
    mockAuth.mockResolvedValueOnce(makeSession({ isBanned: true }));
    const { error } = await requireAuth();
    expect(error?.status).toBe(403);
  });

  it("returns the session when authenticated and not banned", async () => {
    const session = makeSession();
    mockAuth.mockResolvedValueOnce(session);
    const result = await requireAuth();
    expect(result.error).toBeNull();
    expect(result.session).toBe(session);
  });
});

describe("requireAdmin", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await requireAdmin()).error?.status).toBe(401);
  });

  it("returns 403 when user role is not admin", async () => {
    mockAuth.mockResolvedValueOnce(makeSession({ role: "user" }));
    expect((await requireAdmin()).error?.status).toBe(403);
  });

  it("returns session for admin users", async () => {
    const session = makeSession({ role: "admin" });
    mockAuth.mockResolvedValueOnce(session);
    const { error, session: s } = await requireAdmin();
    expect(error).toBeNull();
    expect(s).toBe(session);
  });
});

describe("requireVerifiedAuth", () => {
  it("returns 403 when email is not verified", async () => {
    mockAuth.mockResolvedValueOnce(makeSession({ emailVerified: null }));
    expect((await requireVerifiedAuth()).error?.status).toBe(403);
  });

  it("returns session when authenticated with verified email", async () => {
    const session = makeSession({ emailVerified: new Date() });
    mockAuth.mockResolvedValueOnce(session);
    const { error } = await requireVerifiedAuth();
    expect(error).toBeNull();
  });
});

describe("getClientIp", () => {
  it("returns the first IP from the x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns 'unknown' when the header is absent", () => {
    expect(getClientIp(new Request("http://localhost"))).toBe("unknown");
  });
});
