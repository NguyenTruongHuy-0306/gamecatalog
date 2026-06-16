import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsConfigured = vi.hoisted(() => vi.fn().mockReturnValue(true));
const mockUploadStream = vi.hoisted(() => vi.fn());
const mockDestroy = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/cloudinary", () => ({
  isConfigured: mockIsConfigured,
  cloudinary: { uploader: { upload_stream: mockUploadStream, destroy: mockDestroy } },
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockUser = vi.hoisted(() => ({ update: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import { POST, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const userSession = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function authOk() {
  mockRequireAuth.mockResolvedValueOnce({ session: userSession, error: null });
}
function authFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

// Minimal valid image buffers
const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]);
const invalidBuf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function makeFormDataReq(file: File | null) {
  const form = new FormData();
  if (file) form.set("image", file);
  return new NextRequest("http://localhost/api/user/avatar", { method: "POST", body: form });
}

function mockUploadSuccess(url = "https://res.cloudinary.com/test/avatar.jpg") {
  mockUploadStream.mockImplementation((_opts: unknown, cb: (err: Error | null, res: { secure_url: string } | null) => void) => ({
    end: () => cb(null, { secure_url: url }),
  }));
}
function mockUploadFail() {
  mockUploadStream.mockImplementation((_opts: unknown, cb: (err: Error | null, res: null) => void) => ({
    end: () => cb(new Error("Upload failed"), null),
  }));
}

describe("POST /api/user/avatar", () => {
  it("returns 503 when Cloudinary is not configured", async () => {
    mockIsConfigured.mockReturnValueOnce(false);
    const res = await POST(makeFormDataReq(null));
    expect(res.status).toBe(503);
  });

  it("returns 401 when not authenticated", async () => {
    authFail();
    const res = await POST(makeFormDataReq(null));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no image field is provided", async () => {
    authOk();
    const res = await POST(makeFormDataReq(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 when file is not an image type", async () => {
    authOk();
    const file = new File(["not an image"], "doc.pdf", { type: "application/pdf" });
    const res = await POST(makeFormDataReq(file));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("image") });
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    authOk();
    const bigContent = new Uint8Array(5_000_001);
    const bigFile = new File([bigContent], "big.jpg", { type: "image/jpeg" });
    const res = await POST(makeFormDataReq(bigFile));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("5 MB") });
  });

  it("returns 400 when file bytes do not match a valid image signature", async () => {
    authOk();
    const file = new File([invalidBuf], "fake.jpg", { type: "image/jpeg" });
    const res = await POST(makeFormDataReq(file));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("valid image") });
  });

  it("uploads a JPEG and updates the user's avatarUrl", async () => {
    authOk();
    mockUploadSuccess("https://res.cloudinary.com/test/u1.jpg");
    const file = new File([jpegBuf], "photo.jpg", { type: "image/jpeg" });
    const res = await POST(makeFormDataReq(file));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://res.cloudinary.com/test/u1.jpg" });
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { avatarUrl: "https://res.cloudinary.com/test/u1.jpg" } })
    );
  });

  it("uploads a PNG successfully", async () => {
    authOk();
    mockUploadSuccess();
    const file = new File([pngBuf], "photo.png", { type: "image/png" });
    const res = await POST(makeFormDataReq(file));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/user/avatar", () => {
  it("returns 503 when Cloudinary is not configured", async () => {
    mockIsConfigured.mockReturnValueOnce(false);
    expect((await DELETE()).status).toBe(503);
  });

  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await DELETE()).status).toBe(401);
  });

  it("removes the avatar from Cloudinary and nullifies avatarUrl in DB", async () => {
    authOk();
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
    expect(mockDestroy).toHaveBeenCalledWith("gamecatalog/avatars/u1", { invalidate: true });
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { avatarUrl: null } })
    );
  });

  it("still succeeds even if the Cloudinary destroy call throws", async () => {
    authOk();
    mockDestroy.mockRejectedValueOnce(new Error("Not found on CDN"));
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockUser.update).toHaveBeenCalled();
  });
});
