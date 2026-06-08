import { describe, it, expect, vi, afterEach } from "vitest";
import { generateRawToken, hashToken, getTokenExpiryDate, generateOtp } from "./token";

describe("generateRawToken", () => {
  it("returns a 64-character lowercase hex string", () => {
    expect(generateRawToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens each call", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

describe("hashToken", () => {
  it("returns a 64-character hex SHA-256 hash", () => {
    expect(hashToken("test-token")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("def"));
  });
});

describe("getTokenExpiryDate", () => {
  afterEach(() => vi.useRealTimers());

  it("defaults to 24 hours from now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(getTokenExpiryDate()).toEqual(new Date("2026-01-02T00:00:00Z"));
  });

  it("respects a custom hours value", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(getTokenExpiryDate(1)).toEqual(new Date("2026-01-01T01:00:00Z"));
  });

  it("handles fractional hours (e.g., 0.25 = 15 minutes)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(getTokenExpiryDate(0.25)).toEqual(new Date("2026-01-01T00:15:00Z"));
  });
});

describe("generateOtp", () => {
  it("returns a 6-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("generates values in the [0, 999999] range", () => {
    for (let i = 0; i < 20; i++) {
      const n = parseInt(generateOtp(), 10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });
});
