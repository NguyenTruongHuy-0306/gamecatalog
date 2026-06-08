import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockHasMxRecord = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/app/api/auth/check-email/route", () => ({ hasMxRecord: mockHasMxRecord }));

const mockUser = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn().mockResolvedValue({}),
}));
const mockToken = vi.hoisted(() => ({
  deleteMany: vi.fn().mockResolvedValue({}),
  create: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({
  prisma: { user: mockUser, verificationToken: mockToken },
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

const mockSendOtp = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/email", () => ({ sendSignupOtpEmail: mockSendOtp }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/send-signup-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/send-signup-otp", () => {
  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(req({ email: "a@b.com" }))).status).toBe(429);
  });

  it("returns 400 for an invalid email format", async () => {
    expect((await POST(req({ email: "not-an-email" }))).status).toBe(400);
  });

  it("returns 400 when the email domain has no MX record", async () => {
    mockHasMxRecord.mockResolvedValueOnce(false);
    expect((await POST(req({ email: "user@fakefake.xyz" }))).status).toBe(400);
  });

  it("returns 200 silently for an already-registered email (prevents enumeration)", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce({ id: "existing" }) // already-registered check
    const res = await POST(req({ email: "existing@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("reuses an existing pending user and sends OTP", async () => {
    mockUser.findFirst
      .mockResolvedValueOnce(null) // no fully registered user
      .mockResolvedValueOnce({ id: "pending-1" }); // existing pending user
    const res = await POST(req({ email: "new@example.com" }));
    expect(res.status).toBe(200);
    expect(mockToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "pending-1" }) })
    );
    expect(mockSendOtp).toHaveBeenCalledWith("new@example.com", expect.any(String));
  });

  it("creates a new pending user when none exists and sends OTP", async () => {
    mockUser.findFirst.mockResolvedValue(null); // no registered, no pending
    mockUser.create.mockResolvedValueOnce({ id: "new-pending" });
    const res = await POST(req({ email: "brand@new.com" }));
    expect(res.status).toBe(200);
    expect(mockUser.create).toHaveBeenCalled();
    expect(mockSendOtp).toHaveBeenCalled();
  });

  it("returns 500 when email sending fails", async () => {
    mockUser.findFirst.mockResolvedValue(null);
    mockUser.create.mockResolvedValueOnce({ id: "new-pending" });
    mockSendOtp.mockRejectedValueOnce(new Error("SMTP error"));
    const res = await POST(req({ email: "fail@example.com" }));
    expect(res.status).toBe(500);
  });
});
