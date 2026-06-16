import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsConfigured = vi.hoisted(() => vi.fn().mockReturnValue(true));
const mockUploadStream = vi.hoisted(() => vi.fn());
const mockDestroy = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/cloudinary", () => ({
  isConfigured: mockIsConfigured,
  cloudinary: { uploader: { upload_stream: mockUploadStream, destroy: mockDestroy } },
}));

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAdmin: mockRequireAdmin }));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import { POST, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };
const params = { params: Promise.resolve({ id: "target-user" }) };

function adminOk() {
  mockRequireAdmin.mockResolvedValueOnce({ session: adminSession, error: null });
}
function adminFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAdmin.mockResolvedValueOnce({ session: null, error: res });
}

const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function makeFormDataReq(file: File | null) {
  const form = new FormData();
  if (file) form.set("image", file);
  return new NextRequest("http://localhost/api/admin/users/target-user/avatar", { method: "POST", body: form });
}

function mockUploadSuccess(url = "https://res.cloudinary.com/test/avatar.jpg") {
  mockUploadStream.mockImplementation((_opts: unknown, cb: (err: Error | null, res: { secure_url: string } | null) => void) => ({
    end: () => cb(null, { secure_url: url }),
  }));
}

describe("POST /api/admin/users/[id]/avatar", () => {
  it("returns 503 when Cloudinary is not configured", async () => {
    mockIsConfigured.mockReturnValueOnce(false);
    expect((await POST(makeFormDataReq(null), params)).status).toBe(503);
  });

  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await POST(makeFormDataReq(null), params)).status).toBe(401);
  });

  it("returns 404 when target user does not exist", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await POST(makeFormDataReq(null), params)).status).toBe(404);
  });

  it("returns 400 when no image is provided", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce({ id: "target-user" });
    expect((await POST(makeFormDataReq(null), params)).status).toBe(400);
  });

  it("returns 400 when file is not an image type", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce({ id: "target-user" });
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect((await POST(makeFormDataReq(file), params)).status).toBe(400);
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce({ id: "target-user" });
    const bigFile = new File([new Uint8Array(5_000_001)], "big.jpg", { type: "image/jpeg" });
    expect((await POST(makeFormDataReq(bigFile), params)).status).toBe(400);
  });

  it("uploads the image and updates the target user's avatarUrl", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce({ id: "target-user" });
    mockUploadSuccess("https://res.cloudinary.com/test/target.jpg");
    const file = new File([jpegBuf], "photo.jpg", { type: "image/jpeg" });
    const res = await POST(makeFormDataReq(file), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://res.cloudinary.com/test/target.jpg" });
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "target-user" }, data: { avatarUrl: "https://res.cloudinary.com/test/target.jpg" } })
    );
  });
});

describe("DELETE /api/admin/users/[id]/avatar", () => {
  it("returns 503 when Cloudinary is not configured", async () => {
    mockIsConfigured.mockReturnValueOnce(false);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(503);
  });

  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(401);
  });

  it("returns 404 when target user does not exist", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await DELETE(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  it("removes the avatar and sets avatarUrl to null", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce({ id: "target-user" });
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
    expect(mockDestroy).toHaveBeenCalledWith("gamecatalog/avatars/target-user", { invalidate: true });
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "target-user" }, data: { avatarUrl: null } })
    );
  });

  it("still succeeds when Cloudinary destroy throws (image already gone)", async () => {
    adminOk();
    mockUser.findUnique.mockResolvedValueOnce({ id: "target-user" });
    mockDestroy.mockRejectedValueOnce(new Error("resource not found"));
    const res = await DELETE(new NextRequest("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(mockUser.update).toHaveBeenCalled();
  });
});
