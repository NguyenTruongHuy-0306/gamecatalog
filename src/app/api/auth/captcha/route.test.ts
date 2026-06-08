import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("GET /api/auth/captcha", () => {
  it("returns a 5-character code and a signed token", async () => {
    const res = await GET(new NextRequest("http://localhost/api/auth/captcha"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toMatch(/^[A-Z2-9]{5}$/);
    expect(body.token).toMatch(/^\d+\.[0-9a-f]{64}$/);
  });

  it("returns a different code on each call", async () => {
    const [a, b] = await Promise.all([
      GET(new NextRequest("http://localhost/api/auth/captcha")).then((r) => r.json()),
      GET(new NextRequest("http://localhost/api/auth/captcha")).then((r) => r.json()),
    ]);
    // Statistically vanishingly unlikely to be equal
    expect(a.token).not.toBe(b.token);
  });
});
