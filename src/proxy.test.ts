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

// Cast away the unused second arg (event) from the real next-auth middleware signature
const handle = proxyHandler as (req: NextRequest & { auth: Session }) => Promise<Response>;

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
    const res = await handle(req("/admin/games"));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/login");
  });

  it("redirects users with role 'user' to /", async () => {
    const res = await handle(req("/admin/games", adminSession("user")));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/");
  });

  it("allows users with role 'admin' through", async () => {
    const res = await handle(req("/admin/games", adminSession()));
    expect(res.status).not.toBe(307);
  });

  it("redirects unauthenticated users from /admin/dashboard to /login", async () => {
    const res = await handle(req("/admin/dashboard"));
    expect(redirectTarget(res)).toBe("/login");
  });
});

describe("auth-only routes", () => {
  it("redirects logged-in users away from /login to /", async () => {
    const res = await handle(req("/login", adminSession()));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/");
  });

  it("redirects logged-in users away from /signup to /", async () => {
    const res = await handle(req("/signup", userSession()));
    expect(redirectTarget(res)).toBe("/");
  });

  it("allows unauthenticated users to access /login", async () => {
    const res = await handle(req("/login"));
    expect(res.status).not.toBe(307);
  });
});

describe("user routes", () => {
  it("redirects unauthenticated users from /settings to /login", async () => {
    const res = await handle(req("/settings"));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/login");
  });

  it("allows authenticated users to access /settings", async () => {
    const res = await handle(req("/settings", userSession()));
    expect(res.status).not.toBe(307);
  });
});

describe("/complete-profile", () => {
  it("redirects unauthenticated users to /login", async () => {
    const res = await handle(req("/complete-profile"));
    expect(redirectTarget(res)).toBe("/login");
  });

  it("redirects users who don't need setup to /", async () => {
    const res = await handle(req("/complete-profile", userSession({ needsSetup: false })));
    expect(redirectTarget(res)).toBe("/");
  });

  it("allows users who need setup through", async () => {
    const res = await handle(req("/complete-profile", userSession({ needsSetup: true })));
    expect(res.status).not.toBe(307);
  });
});

describe("main page access after login", () => {
  it("allows a logged-in regular user to reach /", async () => {
    const res = await handle(req("/", userSession()));
    expect(res.status).not.toBe(307);
  });

  it("allows a logged-in admin to reach /", async () => {
    const res = await handle(req("/", adminSession()));
    expect(res.status).not.toBe(307);
  });

  it("allows an unauthenticated visitor to reach /", async () => {
    const res = await handle(req("/"));
    expect(res.status).not.toBe(307);
  });

  it("does not redirect a logged-in user to /login when visiting /", async () => {
    const res = await handle(req("/", userSession()));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("needsSetup redirect", () => {
  it("redirects to /complete-profile when needsSetup is true on any route", async () => {
    const res = await handle(req("/", userSession({ needsSetup: true })));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/complete-profile");
  });

  it("does not redirect when needsSetup is false", async () => {
    const res = await handle(req("/", userSession({ needsSetup: false })));
    expect(res.status).not.toBe(307);
  });
});
