import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerificationToken = vi.hoisted(() => ({
  findUnique: vi.fn(),
  delete: vi.fn(),
}));
const mockUserUpdate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({
  prisma: {
    verificationToken: mockVerificationToken,
    user: { update: mockUserUpdate },
  },
}));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

function req(body: unknown) {
  return new NextRequest("http://localhost/api/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validRecord = {
  id: "tok-1",
  userId: "user-1",
  type: "email_verification",
  expiresAt: new Date(Date.now() + 3600_000),
  user: { id: "user-1" },
};

describe("POST /api/auth/verify-email", () => {
  it("returns 400 for malformed JSON body", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/auth/verify-email", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when token field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the token does not exist in DB", async () => {
    mockVerificationToken.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ token: "no-such-token" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Invalid") });
  });

  it("returns 400 when the token has wrong type", async () => {
    mockVerificationToken.findUnique.mockResolvedValueOnce({
      ...validRecord,
      type: "password_reset",
    });
    const res = await POST(req({ token: "some-token" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 and deletes the record when the token is expired", async () => {
    mockVerificationToken.findUnique.mockResolvedValueOnce({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });
    mockVerificationToken.delete.mockResolvedValueOnce({});
    const res = await POST(req({ token: "expired-token" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("expired") });
    expect(mockVerificationToken.delete).toHaveBeenCalledWith({ where: { id: "tok-1" } });
  });

  it("marks email as verified and deletes token on success", async () => {
    mockVerificationToken.findUnique.mockResolvedValueOnce(validRecord);
    mockUserUpdate.mockResolvedValueOnce({});
    mockVerificationToken.delete.mockResolvedValueOnce({});
    const res = await POST(req({ token: "valid-token" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: expect.any(String) });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: { emailVerified: expect.any(Date) } })
    );
    expect(mockVerificationToken.delete).toHaveBeenCalledWith({ where: { id: "tok-1" } });
  });
});
