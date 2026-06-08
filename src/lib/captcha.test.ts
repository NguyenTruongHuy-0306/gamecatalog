import { describe, it, expect, vi, afterEach } from "vitest";
import { generateCaptcha, verifyCaptchaToken } from "./captcha";

const ALLOWED_CHARS = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;

describe("generateCaptcha", () => {
  it("produces a 5-character code from the allowed character set", () => {
    const { code } = generateCaptcha();
    expect(code).toMatch(ALLOWED_CHARS);
  });

  it("never includes visually ambiguous characters (0, 1, I, O, l)", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateCaptcha().code).not.toMatch(/[01IOl]/);
    }
  });

  it("returns a token formatted as <expires>.<hex-signature>", () => {
    const { token } = generateCaptcha();
    const [expiresStr, sig] = token.split(".");
    expect(Number(expiresStr)).toBeGreaterThan(Date.now());
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("verifyCaptchaToken", () => {
  afterEach(() => vi.useRealTimers());

  it("returns true for a freshly generated code and token", () => {
    const { code, token } = generateCaptcha();
    expect(verifyCaptchaToken(code, token)).toBe(true);
  });

  it("is case-insensitive (lowercase input works)", () => {
    const { code, token } = generateCaptcha();
    expect(verifyCaptchaToken(code.toLowerCase(), token)).toBe(true);
  });

  it("returns false for wrong code", () => {
    const { token } = generateCaptcha();
    expect(verifyCaptchaToken("ZZZZZ", token)).toBe(false);
  });

  it("returns false for malformed token with no dot separator", () => {
    expect(verifyCaptchaToken("AAAAA", "no-dot-here")).toBe(false);
  });

  it("returns false for an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { code, token } = generateCaptcha();
    vi.setSystemTime(new Date("2026-01-01T00:11:00Z")); // past 10-minute expiry
    expect(verifyCaptchaToken(code, token)).toBe(false);
  });

  it("returns false for an empty token string", () => {
    expect(verifyCaptchaToken("AAAAA", "")).toBe(false);
  });

  it("returns false when signature is tampered with", () => {
    const { code, token } = generateCaptcha();
    const [expires] = token.split(".");
    const tampered = `${expires}.${"a".repeat(64)}`;
    expect(verifyCaptchaToken(code, tampered)).toBe(false);
  });
});
