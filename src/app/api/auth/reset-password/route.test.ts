import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("new-hash") } }));

const mockToken = vi.hoisted(() => ({
  findUnique: vi.fn(),
  delete: vi.fn().mockResolvedValue({}),
}));
const mockUserUpdate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/db", () => ({
  prisma: { verificationToken: mockToken, user: { update: mockUserUpdate } },
}));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validRecord = {
  id: "tok-1",
  userId: "user-1",
  type: "password_reset",
  expiresAt: new Date(Date.now() + 3600_000),
};

describe("POST /api/auth/reset-password", () => {
  it("returns 400 for malformed JSON", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(req({ token: "t", password: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password has no special character", async () => {
    const res = await POST(req({ token: "t", password: "Password12" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when token does not exist", async () => {
    mockToken.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "bad-token", password: "Valid@Pass1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when token has wrong type", async () => {
    mockToken.findUnique.mockResolvedValueOnce({ ...validRecord, type: "email_verification" });
    const res = await POST(req({ token: "t", password: "Valid@Pass1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 and deletes token when expired", async () => {
    mockToken.findUnique.mockResolvedValueOnce({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(req({ token: "expired", password: "Valid@Pass1" }));
    expect(res.status).toBe(400);
    expect(mockToken.delete).toHaveBeenCalledWith({ where: { id: "tok-1" } });
  });

  it("resets the password and deletes token on success", async () => {
    mockToken.findUnique.mockResolvedValueOnce(validRecord);
    const res = await POST(req({ token: "valid-token", password: "Valid@Pass1" }));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { passwordHash: "new-hash" },
      })
    );
    expect(mockToken.delete).toHaveBeenCalledWith({ where: { id: "tok-1" } });
  });
});
