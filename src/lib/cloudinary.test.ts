import { vi, describe, it, expect, afterEach } from "vitest";

vi.mock("cloudinary", () => ({
  v2: { config: vi.fn() },
}));

afterEach(() => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
});

describe("isConfigured", () => {
  it("returns true when all three env vars are set", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "my-cloud";
    process.env.CLOUDINARY_API_KEY = "key123";
    process.env.CLOUDINARY_API_SECRET = "secret123";
    const { isConfigured } = await import("./cloudinary");
    expect(isConfigured()).toBe(true);
  });

  it("returns false when CLOUDINARY_CLOUD_NAME is missing", async () => {
    process.env.CLOUDINARY_API_KEY = "key123";
    process.env.CLOUDINARY_API_SECRET = "secret123";
    const { isConfigured } = await import("./cloudinary");
    expect(isConfigured()).toBe(false);
  });

  it("returns false when CLOUDINARY_API_KEY is missing", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "my-cloud";
    process.env.CLOUDINARY_API_SECRET = "secret123";
    const { isConfigured } = await import("./cloudinary");
    expect(isConfigured()).toBe(false);
  });

  it("returns false when CLOUDINARY_API_SECRET is missing", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "my-cloud";
    process.env.CLOUDINARY_API_KEY = "key123";
    const { isConfigured } = await import("./cloudinary");
    expect(isConfigured()).toBe(false);
  });

  it("returns false when no env vars are set", async () => {
    const { isConfigured } = await import("./cloudinary");
    expect(isConfigured()).toBe(false);
  });
});
