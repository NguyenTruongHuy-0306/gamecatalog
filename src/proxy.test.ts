import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (req: NextRequest & { auth: unknown }) => unknown) =>
      (req: NextRequest & { auth: unknown }) => handler(req),
  }),
}));
vi.mock("@/auth.config", () => ({ authConfig: {} }));

import proxyHandler from "./proxy";

afterEach(() => vi.clearAllMocks());

type Session = { user: { role?: string; needsSetup?: boolean } } | null;

function req(path: string, session: Session = null) {
  const r = new NextRequest(`http://localhost${path}`) as NextRequest & { auth: Session };
  r.auth = session;
  return r;
}

function adminSession(role = "admin") {
  return { user: { role, needsSetup: false } };
}

function userSession(overrides: Partial<{ role: string; needsSetup: boolean }> = {}) {
  return { user: { role: "user", needsSetup: false, ...overrides } };
}

function redirectTarget(res: Response) {
  return new URL(res.headers.get("location")!).pathname;
}

describe("admin routes", () => {
  it("redirects unauthenticated users to /login", async () => {
    const res = await proxyHandler(req("/admin/games"), {} as any) as Response;
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/login");
  });

  it("redirects users with role 'user' to /", async () => {
    const res = await proxyHandler(req("/admin/games", adminSession("user")), {} as any) as Response;
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/");
  });

  it("allows users with role 'admin' through", async () => {
    const res = await proxyHandler(req("/admin/games", adminSession()), {} as any) as Response;
    expect(res.status).not.toBe(307);
  });

  it("redirects unauthenticated users from /admin/dashboard to /login", async () => {
    const res = await proxyHandler(req("/admin/dashboard"), {} as any) as Response;
    expect(redirectTarget(res)).toBe("/login");
  });
});

describe("auth-only routes", () => {
  it("redirects logged-in users away from /login to /", async () => {
    const res = await proxyHandler(req("/login", adminSession()), {} as any) as Response;
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/");
  });

  it("redirects logged-in users away from /signup to /", async () => {
    const res = await proxyHandler(req("/signup", userSession()), {} as any) as Response;
    expect(redirectTarget(res)).toBe("/");
  });

  it("allows unauthenticated users to access /login", async () => {
    const res = await proxyHandler(req("/login"), {} as any) as Response;
    expect(res.status).not.toBe(307);
  });
});

describe("user routes", () => {
  it("redirects unauthenticated users from /settings to /login", async () => {
    const res = await proxyHandler(req("/settings"), {} as any) as Response;
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/login");
  });

  it("allows authenticated users to access /settings", async () => {
    const res = await proxyHandler(req("/settings", userSession()), {} as any) as Response;
    expect(res.status).not.toBe(307);
  });
});

describe("/complete-profile", () => {
  it("redirects unauthenticated users to /login", async () => {
    const res = await proxyHandler(req("/complete-profile"), {} as any) as Response;
    expect(redirectTarget(res)).toBe("/login");
  });

  it("redirects users who don't need setup to /", async () => {
    const res = await proxyHandler(req("/complete-profile", userSession({ needsSetup: false })), {} as any) as Response;
    expect(redirectTarget(res)).toBe("/");
  });

  it("allows users who need setup through", async () => {
    const res = await proxyHandler(req("/complete-profile", userSession({ needsSetup: true })), {} as any) as Response;
    expect(res.status).not.toBe(307);
  });
});

describe("needsSetup redirect", () => {
  it("redirects to /complete-profile when needsSetup is true on any route", async () => {
    const res = await proxyHandler(req("/", userSession({ needsSetup: true })), {} as any) as Response;
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/complete-profile");
  });

  it("does not redirect when needsSetup is false", async () => {
    const res = await proxyHandler(req("/", userSession({ needsSetup: false })), {} as any) as Response;
    expect(res.status).not.toBe(307);
  });
});
