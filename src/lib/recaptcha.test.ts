import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyRecaptcha } from "./recaptcha";

describe("verifyRecaptcha", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RECAPTCHA_SECRET_KEY;
  });

  it("skips verification and returns true when secret key is not set", async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;
    expect(await verifyRecaptcha("any-token")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips verification and returns true when token is empty", async () => {
    expect(await verifyRecaptcha("")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns true when score meets the 0.5 threshold", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, score: 0.9 }), { status: 200 })
    );
    expect(await verifyRecaptcha("token")).toBe(true);
  });

  it("returns true when score equals the threshold exactly (0.5)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, score: 0.5 }), { status: 200 })
    );
    expect(await verifyRecaptcha("token")).toBe(true);
  });

  it("returns false when score is below threshold", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, score: 0.3 }), { status: 200 })
    );
    expect(await verifyRecaptcha("token")).toBe(false);
  });

  it("returns false when success is false", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, score: 0.9 }), { status: 200 })
    );
    expect(await verifyRecaptcha("token")).toBe(false);
  });

  it("returns false when API returns a non-OK status", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await verifyRecaptcha("token")).toBe(false);
  });

  it("returns false on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network failure"));
    expect(await verifyRecaptcha("token")).toBe(false);
  });

  it("sends correct form body to the Google API", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, score: 0.9 }), { status: 200 })
    );
    await verifyRecaptcha("my-token");
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("google.com/recaptcha/api/siteverify");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("my-token");
    expect(String(init.body)).toContain("test-secret");
  });
});
