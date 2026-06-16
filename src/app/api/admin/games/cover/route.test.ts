import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsConfigured = vi.hoisted(() => vi.fn().mockReturnValue(true));
const mockUpload = vi.hoisted(() => vi.fn());
const mockUploadStream = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cloudinary", () => ({
  isConfigured: mockIsConfigured,
  cloudinary: { uploader: { upload: mockUpload, upload_stream: mockUploadStream } },
}));

const mockRequireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAdmin: mockRequireAdmin }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const adminSession = { user: { id: "admin-1", role: "admin", isBanned: false, emailVerified: new Date() } };

function adminOk() {
  mockRequireAdmin.mockResolvedValueOnce({ session: adminSession, error: null });
}
function adminFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAdmin.mockResolvedValueOnce({ session: null, error: res });
}

function jsonReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/games/cover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeFormDataReq(file: File | null) {
  const form = new FormData();
  if (file) form.set("image", file);
  return new NextRequest("http://localhost/api/admin/games/cover", { method: "POST", body: form });
}

function mockUploadStreamSuccess(url = "https://res.cloudinary.com/test/cover.jpg") {
  mockUploadStream.mockImplementation((_opts: unknown, cb: (err: Error | null, res: { secure_url: string } | null) => void) => ({
    end: () => cb(null, { secure_url: url }),
  }));
}

describe("POST /api/admin/games/cover — URL mode", () => {
  it("returns 503 when Cloudinary is not configured", async () => {
    mockIsConfigured.mockReturnValueOnce(false);
    expect((await POST(jsonReq({ url: "https://example.com/image.jpg" }))).status).toBe(503);
  });

  it("returns 401 when not admin", async () => {
    adminFail();
    expect((await POST(jsonReq({ url: "https://example.com/image.jpg" }))).status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    adminOk();
    const req = new NextRequest("http://localhost/api/admin/games/cover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("returns 400 when url field is missing", async () => {
    adminOk();
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("url") });
  });

  it("returns 400 for an http (non-https) URL", async () => {
    adminOk();
    expect((await POST(jsonReq({ url: "http://example.com/image.jpg" }))).status).toBe(400);
  });

  it("returns 400 for a localhost URL", async () => {
    adminOk();
    expect((await POST(jsonReq({ url: "https://localhost/image.jpg" }))).status).toBe(400);
  });

  it("returns 400 for a private IP URL (10.x.x.x)", async () => {
    adminOk();
    expect((await POST(jsonReq({ url: "https://10.0.0.1/image.jpg" }))).status).toBe(400);
  });

  it("returns 400 for a private IP URL (192.168.x.x)", async () => {
    adminOk();
    expect((await POST(jsonReq({ url: "https://192.168.1.1/image.jpg" }))).status).toBe(400);
  });

  it("returns 400 for a private IP URL (172.16.x.x)", async () => {
    adminOk();
    expect((await POST(jsonReq({ url: "https://172.16.0.1/image.jpg" }))).status).toBe(400);
  });

  it("uploads from a public HTTPS URL and returns the Cloudinary URL", async () => {
    adminOk();
    mockUpload.mockResolvedValueOnce({ secure_url: "https://res.cloudinary.com/test/cover.jpg" });
    const res = await POST(jsonReq({ url: "https://images.igdb.com/t/thumb/example.jpg" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://res.cloudinary.com/test/cover.jpg" });
  });

  it("returns 422 when Cloudinary fails to fetch from URL", async () => {
    adminOk();
    mockUpload.mockRejectedValueOnce(new Error("fetch failed"));
    const res = await POST(jsonReq({ url: "https://images.igdb.com/t/thumb/example.jpg" }));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/admin/games/cover — file mode", () => {
  it("returns 400 when no image is provided", async () => {
    adminOk();
    expect((await POST(makeFormDataReq(null))).status).toBe(400);
  });

  it("returns 400 when file is not an image type", async () => {
    adminOk();
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect((await POST(makeFormDataReq(file))).status).toBe(400);
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    adminOk();
    const bigFile = new File([new Uint8Array(5_000_001)], "big.jpg", { type: "image/jpeg" });
    expect((await POST(makeFormDataReq(bigFile))).status).toBe(400);
  });

  it("uploads the file and returns the Cloudinary URL", async () => {
    adminOk();
    mockUploadStreamSuccess("https://res.cloudinary.com/test/cover2.jpg");
    const file = new File([Buffer.from([0xff, 0xd8, 0xff])], "cover.jpg", { type: "image/jpeg" });
    const res = await POST(makeFormDataReq(file));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://res.cloudinary.com/test/cover2.jpg" });
  });
});
