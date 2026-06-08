import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockUser = vi.hoisted(() => ({ findUnique: vi.fn() }));
const mockToken = vi.hoisted(() => ({ deleteMany: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { user: mockUser, verificationToken: mockToken },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

const mockSendPasswordResetEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: mockSendPasswordResetEmail }));

import { POST } from "./route";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    const promise = POST(req({ email: "user@example.com" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(429);
  });

  it("returns generic message for invalid email (prevents enumeration)", async () => {
    const promise = POST(req({ email: "not-an-email" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("If an account");
  });

  it("returns generic message for a non-existent email", async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    const promise = POST(req({ email: "nobody@example.com" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
  });

  it("returns generic message for a deleted user", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ id: "u1", deletedAt: new Date(), passwordHash: "hash" });
    const promise = POST(req({ email: "deleted@example.com" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns generic message for a Google-only account (no password)", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ id: "u1", deletedAt: null, passwordHash: null });
    const promise = POST(req({ email: "google@example.com" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a reset token and sends an email for a valid user", async () => {
    mockUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      deletedAt: null,
      passwordHash: "hash",
    });
    mockToken.deleteMany.mockResolvedValueOnce({});
    mockToken.create.mockResolvedValueOnce({});
    const promise = POST(req({ email: "user@example.com" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(mockToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", type: "password_reset" }),
      })
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith("user@example.com", expect.any(String));
  });

  it("still returns 200 even if the email send throws", async () => {
    mockUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      deletedAt: null,
      passwordHash: "hash",
    });
    mockToken.deleteMany.mockResolvedValueOnce({});
    mockToken.create.mockResolvedValueOnce({});
    mockSendPasswordResetEmail.mockRejectedValueOnce(new Error("SMTP failure"));
    const promise = POST(req({ email: "user@example.com" }));
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
  });
});
