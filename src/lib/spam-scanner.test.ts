import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractUrls, containsMaliciousLinks } from "./spam-scanner";

describe("extractUrls", () => {
  it("returns empty array when no URLs present", () => {
    expect(extractUrls("great game, loved it")).toEqual([]);
  });

  it("extracts a single URL", () => {
    expect(extractUrls("check out https://example.com for more")).toEqual([
      "https://example.com",
    ]);
  });

  it("extracts multiple URLs", () => {
    const urls = extractUrls("https://foo.com and https://bar.com");
    expect(urls).toContain("https://foo.com");
    expect(urls).toContain("https://bar.com");
  });

  it("deduplicates repeated URLs", () => {
    const urls = extractUrls("https://foo.com https://foo.com");
    expect(urls).toEqual(["https://foo.com"]);
  });

  it("does not extract plain text that looks like a domain", () => {
    expect(extractUrls("visit example.com sometime")).toEqual([]);
  });
});

describe("containsMaliciousLinks", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeEach(() => {
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = "test-key";
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  });

  it("returns false when text has no URLs", async () => {
    expect(await containsMaliciousLinks("nice review")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns false when API key is not configured", async () => {
    delete process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    expect(await containsMaliciousLinks("https://example.com")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns true when Safe Browsing returns matches", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ matches: [{ threatType: "MALWARE" }] }), {
        status: 200,
      })
    );
    expect(await containsMaliciousLinks("visit https://malware.example.com")).toBe(true);
  });

  it("returns false when Safe Browsing returns no matches", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    expect(await containsMaliciousLinks("visit https://safe.example.com")).toBe(false);
  });

  it("sends extracted URLs in the request body", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    await containsMaliciousLinks("see https://example.com here");
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.threatInfo.threatEntries).toContainEqual({ url: "https://example.com" });
  });

  it("fails open when the API returns a non-OK status", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await containsMaliciousLinks("https://example.com")).toBe(false);
  });

  it("fails open when fetch throws (network error)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network failure"));
    expect(await containsMaliciousLinks("https://example.com")).toBe(false);
  });
});
