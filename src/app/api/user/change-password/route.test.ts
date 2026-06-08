import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("new-hash"),
  },
}));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

import bcrypt from "bcryptjs";
import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function makeCaptcha() {
  return generateCaptcha();
}

function req(body: unknown) {
  return new NextRequest("http://localhost/api/user/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/change-password", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(req({}))).status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(req({}))).status).toBe(429);
  });

  it("returns 400 for missing required fields", async () => {
    mockAuth.mockResolvedValueOnce(session);
    expect((await POST(req({}))).status).toBe(400);
  });

  it("returns 400 for invalid captcha", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const res = await POST(
      req({ currentPassword: "old", newPassword: "Valid@New1", captchaInput: "AAAAA", captchaToken: "bad.token" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a Google-only account with no password hash", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const { code, token } = makeCaptcha();
    mockUser.findUnique.mockResolvedValueOnce({ passwordHash: null });
    const res = await POST(
      req({ currentPassword: "old", newPassword: "Valid@New1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when current password is incorrect", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const { code, token } = makeCaptcha();
    mockUser.findUnique.mockResolvedValueOnce({ passwordHash: "old-hash" });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const res = await POST(
      req({ currentPassword: "wrong", newPassword: "Valid@New1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(400);
  });

  it("updates password and returns 200 on success", async () => {
    mockAuth.mockResolvedValueOnce(session);
    const { code, token } = makeCaptcha();
    mockUser.findUnique.mockResolvedValueOnce({ passwordHash: "old-hash" });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await POST(
      req({ currentPassword: "OldPass@1", newPassword: "Valid@New1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(200);
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "new-hash" } })
    );
  });
});
