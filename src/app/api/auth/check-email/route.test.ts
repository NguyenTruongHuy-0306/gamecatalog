import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

import { GET, hasMxRecord } from "./route";

describe("hasMxRecord", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns true when DNS lookup finds MX records", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 0, Answer: [{ data: "10 mail.example.com." }] }), {
        status: 200,
      })
    );
    expect(await hasMxRecord("gmail.com")).toBe(true);
  });

  it("returns false when DNS lookup finds no MX records", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 0 }), { status: 200 })
    );
    expect(await hasMxRecord("notadomain.invalid")).toBe(false);
  });

  it("returns false on non-OK DNS response", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await hasMxRecord("example.com")).toBe(false);
  });

  it("returns false on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));
    expect(await hasMxRecord("example.com")).toBe(false);
  });
});

describe("GET /api/auth/check-email", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ Status: 0, Answer: [{}] }), { status: 200 })
    );
  });

  afterEach(() => vi.restoreAllMocks());

  function req(email: string) {
    return new NextRequest(`http://localhost/api/auth/check-email?email=${encodeURIComponent(email)}`);
  }

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    const res = await GET(req("test@example.com"));
    expect(res.status).toBe(429);
  });

  it("returns 400 for an invalid email address", async () => {
    const res = await GET(req("not-an-email"));
    expect(res.status).toBe(400);
  });

  it("returns { valid: true } when domain has MX records", async () => {
    const res = await GET(req("user@gmail.com"));
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it("returns { valid: false } when domain has no MX records", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 0 }), { status: 200 })
    );
    const res = await GET(req("user@fakefakedomain.xyz"));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });
});
