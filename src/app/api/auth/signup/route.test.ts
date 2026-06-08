import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") } }));

const mockUser = vi.hoisted(() => ({ findFirst: vi.fn() }));
const mockToken = vi.hoisted(() => ({ findFirst: vi.fn(), delete: vi.fn() }));
const mockTransaction = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { ...mockUser, update: vi.fn() },
    verificationToken: mockToken,
    $transaction: mockTransaction,
  },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

const mockRecaptcha = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/lib/recaptcha", () => ({ verifyRecaptcha: mockRecaptcha }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: "user@example.com",
  otp: "123456",
  username: "testuser",
  password: "Password@1",
  recaptchaToken: "token",
};

describe("POST /api/auth/signup", () => {
  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(req(validBody))).status).toBe(429);
  });

  it("returns 400 for missing required fields", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("returns 400 when OTP has wrong length", async () => {
    expect((await POST(req({ ...validBody, otp: "12345" }))).status).toBe(400);
  });

  it("returns 400 when username is too short", async () => {
    expect((await POST(req({ ...validBody, username: "ab" }))).status).toBe(400);
  });

  it("returns 400 when recaptcha fails", async () => {
    mockRecaptcha.mockResolvedValueOnce(false);
    expect((await POST(req(validBody))).status).toBe(400);
  });

  it("returns 400 when no pending user exists for this email", async () => {
    mockUser.findFirst.mockResolvedValueOnce(null);
    expect((await POST(req(validBody))).status).toBe(400);
  });

  it("returns 400 when OTP is invalid or expired", async () => {
    mockUser.findFirst.mockResolvedValueOnce({ id: "pending-1" });
    mockToken.findFirst.mockResolvedValueOnce(null);
    expect((await POST(req(validBody))).status).toBe(400);
  });

  it("returns 409 when username is already taken", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "pending-1" }) // pending user
      .mockResolvedValueOnce(null) // OTP token lookup (next findFirst call)
    mockToken.findFirst.mockResolvedValueOnce({ id: "tok-1" });
    mockUser.findFirst.mockResolvedValueOnce({ id: "other" }); // username conflict
    // Re-order: pending, then OTP token, then username check
    mockUser.findFirst.mockReset();
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "pending-1" })
      .mockResolvedValueOnce({ id: "other" }); // username taken
    mockToken.findFirst.mockResolvedValueOnce({ id: "tok-1" });
    expect((await POST(req(validBody))).status).toBe(409);
  });

  it("creates the account and returns 201 on success", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "pending-1" }) // pending user
      .mockResolvedValueOnce(null); // username not taken
    mockToken.findFirst.mockResolvedValueOnce({ id: "tok-1" });
    const res = await POST(req(validBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
    expect(mockTransaction).toHaveBeenCalled();
  });
});
