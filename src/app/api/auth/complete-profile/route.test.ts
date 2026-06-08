import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") } }));

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockVerificationToken = vi.hoisted(() => ({ findFirst: vi.fn(), delete: vi.fn() }));
const mockUser = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
const mockTransaction = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    verificationToken: mockVerificationToken,
    user: mockUser,
    $transaction: mockTransaction,
  },
}));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/complete-profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function makeCaptcha() {
  return generateCaptcha();
}

describe("POST /api/auth/complete-profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(req({}))).status).toBe(401);
  });

  it("returns 400 when no needs_setup token exists", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockVerificationToken.findFirst.mockResolvedValueOnce(null);
    expect((await POST(req({}))).status).toBe(400);
  });

  it("returns 400 for invalid input", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockVerificationToken.findFirst.mockResolvedValueOnce({ id: "setup-tok" });
    const res = await POST(req({ username: "ab", password: "short", captchaInput: "X", captchaToken: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for wrong captcha", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockVerificationToken.findFirst.mockResolvedValueOnce({ id: "setup-tok" });
    const res = await POST(
      req({ username: "validuser", password: "Valid@Pass1", captchaInput: "AAAAA", captchaToken: "wrong.token" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when username is already taken", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockVerificationToken.findFirst.mockResolvedValueOnce({ id: "setup-tok" });
    const { code, token } = makeCaptcha();
    mockUser.findFirst.mockResolvedValueOnce({ id: "other" });
    const res = await POST(
      req({ username: "takenuser", password: "Valid@Pass1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(409);
  });

  it("completes profile and returns 200 on success", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockVerificationToken.findFirst.mockResolvedValueOnce({ id: "setup-tok" });
    const { code, token } = makeCaptcha();
    mockUser.findFirst.mockResolvedValueOnce(null); // no conflict
    const res = await POST(
      req({ username: "newuser", password: "Valid@Pass1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });
});
