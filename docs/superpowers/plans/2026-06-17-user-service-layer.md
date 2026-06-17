# User Service Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract domain logic from `src/app/api/user/` route handlers into a `src/lib/user/` service layer so that business rules can be tested without HTTP boilerplate.

**Architecture:** Four service files (`avatar.ts`, `password.ts`, `favorites.ts`, `profile.ts`) in `src/lib/user/`. Each service is written TDD-first. Route handlers become thin adapters: guard → parse → validate → call service → return response. Existing route tests are refactored to mock the service module.

**Tech Stack:** TypeScript, Prisma 7 (`@/generated/prisma/client`, import from `@/lib/db`), bcryptjs, Cloudinary, Vitest

## Global Constraints

- Prisma client is at `@/generated/prisma/client`; always import from `@/lib/db` (not `@prisma/client`)
- No behaviour changes — routes return identical HTTP responses before and after
- No new endpoints, no new fields
- Each task is independently committable and leaves the test suite passing
- Test files use `vi.hoisted` + `vi.mock` at module level (same pattern as existing tests)
- bcrypt cost factor stays at 12

---

### Task 1: Avatar service

**Files:**
- Create: `src/lib/user/avatar.ts`
- Create: `src/lib/user/avatar.test.ts`
- Modify: `src/app/api/user/avatar/route.ts`
- Modify: `src/app/api/user/avatar/route.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function hasValidImageSignature(buf: Buffer): boolean
  export async function uploadAvatar(userId: string, buffer: Buffer): Promise<string>
  export async function removeAvatar(userId: string): Promise<void>
  ```

- [ ] **Step 1: Write the failing service tests**

Create `src/lib/user/avatar.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";

const mockUploadStream = vi.hoisted(() => vi.fn());
const mockDestroy = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/cloudinary", () => ({
  cloudinary: { uploader: { upload_stream: mockUploadStream, destroy: mockDestroy } },
}));

const mockUser = vi.hoisted(() => ({ update: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import { hasValidImageSignature, uploadAvatar, removeAvatar } from "./avatar";

afterEach(() => vi.clearAllMocks());

function mockUploadSuccess(url = "https://res.cloudinary.com/test/u1.jpg") {
  mockUploadStream.mockImplementation(
    (_opts: unknown, cb: (err: Error | null, res: { secure_url: string } | null) => void) => ({
      end: () => cb(null, { secure_url: url }),
    })
  );
}

describe("hasValidImageSignature", () => {
  it("accepts PNG bytes", () => {
    expect(hasValidImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe(true);
  });
  it("accepts JPEG bytes", () => {
    expect(hasValidImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true);
  });
  it("accepts WebP bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46;
    buf[8] = 0x57; buf[9] = 0x45; buf[10] = 0x42; buf[11] = 0x50;
    expect(hasValidImageSignature(buf)).toBe(true);
  });
  it("accepts GIF bytes", () => {
    expect(hasValidImageSignature(Buffer.from([0x47, 0x49, 0x46, 0x38, 0, 0, 0, 0]))).toBe(true);
  });
  it("rejects non-image bytes", () => {
    expect(hasValidImageSignature(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });
});

describe("uploadAvatar", () => {
  it("uploads buffer and returns the Cloudinary URL", async () => {
    mockUploadSuccess("https://res.cloudinary.com/test/u1.jpg");
    const url = await uploadAvatar("u1", Buffer.from([0xff, 0xd8, 0xff]));
    expect(url).toBe("https://res.cloudinary.com/test/u1.jpg");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { avatarUrl: "https://res.cloudinary.com/test/u1.jpg" } })
    );
  });
});

describe("removeAvatar", () => {
  it("destroys the Cloudinary asset and nullifies avatarUrl", async () => {
    await removeAvatar("u1");
    expect(mockDestroy).toHaveBeenCalledWith("gamecatalog/avatars/u1", { invalidate: true });
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { avatarUrl: null } })
    );
  });
  it("still succeeds when Cloudinary destroy throws", async () => {
    mockDestroy.mockRejectedValueOnce(new Error("gone"));
    await expect(removeAvatar("u1")).resolves.toBeUndefined();
    expect(mockUser.update).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/user/avatar.test.ts
```

Expected: FAIL — `Cannot find module './avatar'`

- [ ] **Step 3: Implement `src/lib/user/avatar.ts`**

```ts
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

const FOLDER = "gamecatalog/avatars";

export function hasValidImageSignature(buf: Buffer): boolean {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  return false;
}

export async function uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: `${FOLDER}/${userId}`,
          overwrite: true,
          invalidate: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (err, res) => {
          if (err || !res) reject(err ?? new Error("Upload failed"));
          else resolve(res as { secure_url: string });
        }
      )
      .end(buffer);
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: result.secure_url },
  });

  return result.secure_url;
}

export async function removeAvatar(userId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(`${FOLDER}/${userId}`, { invalidate: true });
  } catch {
    // best-effort
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });
}
```

- [ ] **Step 4: Run service tests to confirm they pass**

```bash
npx vitest run src/lib/user/avatar.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Replace `src/app/api/user/avatar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { isConfigured } from "@/lib/cloudinary";
import { requireAuth } from "@/lib/api-helpers";
import { hasValidImageSignature, uploadAvatar, removeAvatar } from "@/lib/user/avatar";

const MAX_BYTES = 5_000_000;

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Image storage not configured" }, { status: 503 });
  }

  const { session, error } = await requireAuth();
  if (error) return error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image (JPG, PNG, WebP…)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(buffer)) {
    return NextResponse.json({ error: "File must be a valid image (JPG, PNG, WebP, GIF)" }, { status: 400 });
  }

  const url = await uploadAvatar(session!.user.id, buffer);
  return NextResponse.json({ url });
}

export async function DELETE() {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Image storage not configured" }, { status: 503 });
  }

  const { session, error } = await requireAuth();
  if (error) return error;

  await removeAvatar(session!.user.id);
  return NextResponse.json({ message: "Avatar removed" });
}
```

- [ ] **Step 6: Replace `src/app/api/user/avatar/route.test.ts`**

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsConfigured = vi.hoisted(() => vi.fn().mockReturnValue(true));
vi.mock("@/lib/cloudinary", () => ({ isConfigured: mockIsConfigured }));

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockUploadAvatar = vi.hoisted(() =>
  vi.fn().mockResolvedValue("https://res.cloudinary.com/test/u1.jpg")
);
const mockRemoveAvatar = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockHasValidImageSignature = vi.hoisted(() => vi.fn().mockReturnValue(true));
vi.mock("@/lib/user/avatar", () => ({
  uploadAvatar: mockUploadAvatar,
  removeAvatar: mockRemoveAvatar,
  hasValidImageSignature: mockHasValidImageSignature,
}));

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

const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function makeFormDataReq(file: File | null) {
  const form = new FormData();
  if (file) form.set("image", file);
  return new NextRequest("http://localhost/api/user/avatar", { method: "POST", body: form });
}

describe("POST /api/user/avatar", () => {
  it("returns 503 when Cloudinary is not configured", async () => {
    mockIsConfigured.mockReturnValueOnce(false);
    expect((await POST(makeFormDataReq(null))).status).toBe(503);
  });

  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await POST(makeFormDataReq(null))).status).toBe(401);
  });

  it("returns 400 when no image field is provided", async () => {
    authOk();
    expect((await POST(makeFormDataReq(null))).status).toBe(400);
  });

  it("returns 400 when file is not an image type", async () => {
    authOk();
    const file = new File(["not an image"], "doc.pdf", { type: "application/pdf" });
    expect((await POST(makeFormDataReq(file))).status).toBe(400);
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    authOk();
    const bigFile = new File([new Uint8Array(5_000_001)], "big.jpg", { type: "image/jpeg" });
    expect((await POST(makeFormDataReq(bigFile))).status).toBe(400);
  });

  it("returns 400 when image signature is invalid", async () => {
    authOk();
    mockHasValidImageSignature.mockReturnValueOnce(false);
    const file = new File([jpegBuf], "fake.jpg", { type: "image/jpeg" });
    expect((await POST(makeFormDataReq(file))).status).toBe(400);
  });

  it("calls uploadAvatar and returns the URL", async () => {
    authOk();
    const file = new File([jpegBuf], "photo.jpg", { type: "image/jpeg" });
    const res = await POST(makeFormDataReq(file));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: "https://res.cloudinary.com/test/u1.jpg" });
    expect(mockUploadAvatar).toHaveBeenCalledWith("u1", expect.any(Buffer));
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

  it("calls removeAvatar and returns 200", async () => {
    authOk();
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockRemoveAvatar).toHaveBeenCalledWith("u1");
  });
});
```

- [ ] **Step 7: Run all avatar tests**

```bash
npx vitest run src/lib/user/avatar.test.ts src/app/api/user/avatar/route.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/user/avatar.ts src/lib/user/avatar.test.ts src/app/api/user/avatar/
git commit -m "feat: extract avatar service into src/lib/user/avatar"
```

---

### Task 2: Password service

**Files:**
- Create: `src/lib/user/password.ts`
- Create: `src/lib/user/password.test.ts`
- Modify: `src/app/api/user/change-password/route.ts`
- Modify: `src/app/api/user/change-password/route.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type ChangePasswordResult =
    | { success: true }
    | { success: false; error: "no_password" | "wrong_password" }
  export async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResult>
  ```

- [ ] **Step 1: Write the failing service tests**

Create `src/lib/user/password.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("new-hash"),
  },
}));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import bcrypt from "bcryptjs";
import { changePassword } from "./password";

afterEach(() => vi.clearAllMocks());

describe("changePassword", () => {
  it("returns no_password for a Google-only account", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ passwordHash: null });
    const result = await changePassword("u1", "old", "newpass123");
    expect(result).toEqual({ success: false, error: "no_password" });
    expect(mockUser.update).not.toHaveBeenCalled();
  });

  it("returns wrong_password when bcrypt compare fails", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ passwordHash: "hash" });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const result = await changePassword("u1", "wrong", "newpass123");
    expect(result).toEqual({ success: false, error: "wrong_password" });
    expect(mockUser.update).not.toHaveBeenCalled();
  });

  it("hashes new password and updates DB on success", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ passwordHash: "hash" });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const result = await changePassword("u1", "correct", "newpass123");
    expect(result).toEqual({ success: true });
    expect(bcrypt.hash).toHaveBeenCalledWith("newpass123", 12);
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { passwordHash: "new-hash" } })
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/user/password.test.ts
```

Expected: FAIL — `Cannot find module './password'`

- [ ] **Step 3: Implement `src/lib/user/password.ts`**

```ts
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

type ChangePasswordResult =
  | { success: true }
  | { success: false; error: "no_password" | "wrong_password" };

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { success: false, error: "no_password" };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "wrong_password" };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { success: true };
}
```

- [ ] **Step 4: Run service tests to confirm they pass**

```bash
npx vitest run src/lib/user/password.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Replace `src/app/api/user/change-password/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getClientIp } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";
import { changePassword } from "@/lib/user/password";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
  captchaInput: z.string().min(1),
  captchaToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ip:${ip}:${session!.user.id}`, "change-password", 5, 3600);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait an hour." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!verifyCaptchaToken(parsed.data.captchaInput, parsed.data.captchaToken)) {
    return NextResponse.json({ error: "Invalid security code. Please try again." }, { status: 400 });
  }

  const result = await changePassword(
    session!.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );

  if (!result.success) {
    if (result.error === "no_password") {
      return NextResponse.json(
        { error: "This account uses Google sign-in and doesn't have a password." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  return NextResponse.json({ message: "Password updated successfully" });
}
```

- [ ] **Step 6: Replace `src/app/api/user/change-password/route.test.ts`**

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({
  requireAuth: mockRequireAuth,
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ allowed: true }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockRateLimit }));

const mockChangePassword = vi.hoisted(() => vi.fn());
vi.mock("@/lib/user/password", () => ({ changePassword: mockChangePassword }));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

function authOk() {
  mockRequireAuth.mockResolvedValueOnce({ session, error: null });
}
function authFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

function req(body: unknown) {
  return new NextRequest("http://localhost/api/user/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/change-password", () => {
  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await POST(req({}))).status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    authOk();
    mockRateLimit.mockResolvedValueOnce({ allowed: false });
    expect((await POST(req({}))).status).toBe(429);
  });

  it("returns 400 for missing required fields", async () => {
    authOk();
    expect((await POST(req({}))).status).toBe(400);
  });

  it("returns 400 for invalid captcha", async () => {
    authOk();
    const res = await POST(
      req({ currentPassword: "old", newPassword: "Valid@New1", captchaInput: "AAAAA", captchaToken: "bad.token" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a Google-only account", async () => {
    authOk();
    const { code, token } = generateCaptcha();
    mockChangePassword.mockResolvedValueOnce({ success: false, error: "no_password" });
    const res = await POST(
      req({ currentPassword: "old", newPassword: "Valid@New1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when current password is incorrect", async () => {
    authOk();
    const { code, token } = generateCaptcha();
    mockChangePassword.mockResolvedValueOnce({ success: false, error: "wrong_password" });
    const res = await POST(
      req({ currentPassword: "wrong", newPassword: "Valid@New1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    authOk();
    const { code, token } = generateCaptcha();
    mockChangePassword.mockResolvedValueOnce({ success: true });
    const res = await POST(
      req({ currentPassword: "OldPass@1", newPassword: "Valid@New1", captchaInput: code, captchaToken: token })
    );
    expect(res.status).toBe(200);
    expect(mockChangePassword).toHaveBeenCalledWith("u1", "OldPass@1", "Valid@New1");
  });
});
```

- [ ] **Step 7: Run all password tests**

```bash
npx vitest run src/lib/user/password.test.ts src/app/api/user/change-password/route.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/user/password.ts src/lib/user/password.test.ts src/app/api/user/change-password/
git commit -m "feat: extract password service into src/lib/user/password"
```

---

### Task 3: Favorites service

**Files:**
- Create: `src/lib/user/favorites.ts`
- Create: `src/lib/user/favorites.test.ts`
- Modify: `src/app/api/user/favorites/route.ts`
- Modify: `src/app/api/user/favorites/route.test.ts`
- Modify: `src/app/api/user/favorites/[gameId]/route.ts`
- Modify: `src/app/api/user/favorites/[gameId]/route.test.ts` (if it exists, otherwise skip)

**Interfaces:**
- Consumes: Prisma `Game` type from `@/generated/prisma/client`
- Produces:
  ```ts
  import type { Game } from "@/generated/prisma/client";
  export async function getFavorites(userId: string): Promise<Game[]>
  export async function addFavorite(userId: string, gameId: string): Promise<{ found: boolean }>
  export async function removeFavorite(userId: string, gameId: string): Promise<void>
  ```

- [ ] **Step 1: Write the failing service tests**

Create `src/lib/user/favorites.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";

const mockFavorite = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn().mockResolvedValue({}),
  deleteMany: vi.fn().mockResolvedValue({}),
}));
const mockGame = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { favorite: mockFavorite, game: mockGame } }));

import { getFavorites, addFavorite, removeFavorite } from "./favorites";

afterEach(() => vi.clearAllMocks());

const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";
const fakeGame = { id: GAME_UUID, title: "Pokemon", gameGenres: [] };

describe("getFavorites", () => {
  it("returns games ordered by createdAt desc", async () => {
    mockFavorite.findMany.mockResolvedValueOnce([{ game: fakeGame }]);
    const result = await getFavorites("u1");
    expect(result).toEqual([fakeGame]);
    expect(mockFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
      })
    );
  });
});

describe("addFavorite", () => {
  it("returns { found: false } when game does not exist", async () => {
    mockGame.findUnique.mockResolvedValueOnce(null);
    const result = await addFavorite("u1", GAME_UUID);
    expect(result).toEqual({ found: false });
    expect(mockFavorite.create).not.toHaveBeenCalled();
  });

  it("creates the favorite and returns { found: true }", async () => {
    mockGame.findUnique.mockResolvedValueOnce({ id: GAME_UUID });
    const result = await addFavorite("u1", GAME_UUID);
    expect(result).toEqual({ found: true });
    expect(mockFavorite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "u1", gameId: GAME_UUID } })
    );
  });

  it("is idempotent — returns { found: true } even when already favorited", async () => {
    mockGame.findUnique.mockResolvedValueOnce({ id: GAME_UUID });
    mockFavorite.create.mockRejectedValueOnce(new Error("Unique constraint"));
    const result = await addFavorite("u1", GAME_UUID);
    expect(result).toEqual({ found: true });
  });
});

describe("removeFavorite", () => {
  it("deletes the favorite record", async () => {
    await removeFavorite("u1", GAME_UUID);
    expect(mockFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", gameId: GAME_UUID },
    });
  });

  it("is idempotent — does not throw when record does not exist", async () => {
    mockFavorite.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(removeFavorite("u1", GAME_UUID)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/user/favorites.test.ts
```

Expected: FAIL — `Cannot find module './favorites'`

- [ ] **Step 3: Implement `src/lib/user/favorites.ts`**

```ts
import type { Game } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function getFavorites(userId: string): Promise<Game[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      game: {
        include: { gameGenres: { include: { genre: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((f) => f.game);
}

export async function addFavorite(
  userId: string,
  gameId: string
): Promise<{ found: boolean }> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
  if (!game) return { found: false };

  try {
    await prisma.favorite.create({ data: { userId, gameId } });
  } catch {
    // Already favorited — idempotent
  }

  return { found: true };
}

export async function removeFavorite(userId: string, gameId: string): Promise<void> {
  await prisma.favorite.deleteMany({ where: { userId, gameId } });
}
```

- [ ] **Step 4: Run service tests to confirm they pass**

```bash
npx vitest run src/lib/user/favorites.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Replace `src/app/api/user/favorites/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { getFavorites, addFavorite } from "@/lib/user/favorites";

const addSchema = z.object({ gameId: z.string().uuid() });

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const games = await getFavorites(session!.user.id);
  return NextResponse.json(games);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await addFavorite(session!.user.id, parsed.data.gameId);
  if (!result.found) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Added to favorites" }, { status: 201 });
}
```

- [ ] **Step 6: Replace `src/app/api/user/favorites/route.test.ts`**

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockGetFavorites = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAddFavorite = vi.hoisted(() => vi.fn());
vi.mock("@/lib/user/favorites", () => ({
  getFavorites: mockGetFavorites,
  addFavorite: mockAddFavorite,
}));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";

function authOk() {
  mockRequireAuth.mockResolvedValueOnce({ session, error: null });
}
function authFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/favorites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/user/favorites", () => {
  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await GET()).status).toBe(401);
  });

  it("returns the user's favorited games", async () => {
    authOk();
    const game = { id: GAME_UUID, title: "Pokemon" };
    mockGetFavorites.mockResolvedValueOnce([game]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([game]);
    expect(mockGetFavorites).toHaveBeenCalledWith("u1");
  });
});

describe("POST /api/user/favorites", () => {
  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await POST(postReq({ gameId: GAME_UUID }))).status).toBe(401);
  });

  it("returns 400 for invalid game ID format", async () => {
    authOk();
    expect((await POST(postReq({ gameId: "not-a-uuid" }))).status).toBe(400);
  });

  it("returns 404 when game does not exist", async () => {
    authOk();
    mockAddFavorite.mockResolvedValueOnce({ found: false });
    expect((await POST(postReq({ gameId: GAME_UUID }))).status).toBe(404);
  });

  it("adds the game to favorites and returns 201", async () => {
    authOk();
    mockAddFavorite.mockResolvedValueOnce({ found: true });
    expect((await POST(postReq({ gameId: GAME_UUID }))).status).toBe(201);
    expect(mockAddFavorite).toHaveBeenCalledWith("u1", GAME_UUID);
  });
});
```

- [ ] **Step 7: Replace `src/app/api/user/favorites/[gameId]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { removeFavorite } from "@/lib/user/favorites";

type Params = { params: Promise<{ gameId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { gameId } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  await removeFavorite(session!.user.id, gameId);
  return NextResponse.json({ message: "Removed from favorites" });
}
```

- [ ] **Step 8: Check if `[gameId]/route.test.ts` exists and update it**

```bash
ls src/app/api/user/favorites/\[gameId\]/
```

If `route.test.ts` exists, replace it with:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockRemoveFavorite = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/user/favorites", () => ({ removeFavorite: mockRemoveFavorite }));

import { DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";

function authOk() {
  mockRequireAuth.mockResolvedValueOnce({ session, error: null });
}
function authFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

function delReq() {
  return new NextRequest(`http://localhost/api/user/favorites/${GAME_UUID}`, { method: "DELETE" });
}

describe("DELETE /api/user/favorites/[gameId]", () => {
  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await DELETE(delReq(), { params: Promise.resolve({ gameId: GAME_UUID }) })).status).toBe(401);
  });

  it("removes the favorite and returns 200", async () => {
    authOk();
    const res = await DELETE(delReq(), { params: Promise.resolve({ gameId: GAME_UUID }) });
    expect(res.status).toBe(200);
    expect(mockRemoveFavorite).toHaveBeenCalledWith("u1", GAME_UUID);
  });
});
```

- [ ] **Step 9: Run all favorites tests**

```bash
npx vitest run src/lib/user/favorites.test.ts src/app/api/user/favorites/
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/user/favorites.ts src/lib/user/favorites.test.ts src/app/api/user/favorites/
git commit -m "feat: extract favorites service into src/lib/user/favorites"
```

---

### Task 4: Profile service

**Files:**
- Create: `src/lib/user/profile.ts`
- Create: `src/lib/user/profile.test.ts`
- Modify: `src/app/api/user/profile/route.ts`
- Modify: `src/app/api/user/profile/route.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type ProfileData = {
    id: string; username: string | null; email: string;
    bio: string | null; avatarUrl: string | null; createdAt: Date;
  }
  type UpdateProfileResult =
    | { conflict: true }
    | { conflict: false; user: Omit<ProfileData, "createdAt"> }

  export async function getProfile(userId: string): Promise<ProfileData | null>
  export async function updateProfile(
    userId: string,
    data: { username?: string; bio?: string },
    currentUsername: string | null | undefined
  ): Promise<UpdateProfileResult>
  ```

- [ ] **Step 1: Write the failing service tests**

Create `src/lib/user/profile.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { user: mockUser } }));

import { getProfile, updateProfile } from "./profile";

afterEach(() => vi.clearAllMocks());

const profile = {
  id: "u1", username: "testuser", email: "t@t.com",
  bio: null, avatarUrl: null, createdAt: new Date(),
};

describe("getProfile", () => {
  it("returns the user profile when found", async () => {
    mockUser.findUnique.mockResolvedValueOnce(profile);
    const result = await getProfile("u1");
    expect(result).toEqual(profile);
  });

  it("returns null when user is not found", async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect(await getProfile("u1")).toBeNull();
  });
});

describe("updateProfile", () => {
  it("returns { conflict: true } when username is taken by another user", async () => {
    mockUser.findFirst.mockResolvedValueOnce({ id: "other" });
    const result = await updateProfile("u1", { username: "taken" }, "testuser");
    expect(result).toEqual({ conflict: true });
    expect(mockUser.update).not.toHaveBeenCalled();
  });

  it("skips conflict check when username is unchanged (same case)", async () => {
    const updated = { id: "u1", username: "testuser", email: "t@t.com", bio: null, avatarUrl: null };
    mockUser.update.mockResolvedValueOnce(updated);
    const result = await updateProfile("u1", { username: "testuser" }, "testuser");
    expect(mockUser.findFirst).not.toHaveBeenCalled();
    expect(result).toEqual({ conflict: false, user: updated });
  });

  it("applies update and returns user on success", async () => {
    mockUser.findFirst.mockResolvedValueOnce(null);
    const updated = { id: "u1", username: "newname", email: "t@t.com", bio: "hi", avatarUrl: null };
    mockUser.update.mockResolvedValueOnce(updated);
    const result = await updateProfile("u1", { username: "newname", bio: "hi" }, "testuser");
    expect(result).toEqual({ conflict: false, user: updated });
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { username: "newname", bio: "hi" } })
    );
  });

  it("updates only bio without checking username conflict", async () => {
    const updated = { id: "u1", username: "testuser", email: "t@t.com", bio: "new bio", avatarUrl: null };
    mockUser.update.mockResolvedValueOnce(updated);
    const result = await updateProfile("u1", { bio: "new bio" }, "testuser");
    expect(mockUser.findFirst).not.toHaveBeenCalled();
    expect(result).toEqual({ conflict: false, user: updated });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/user/profile.test.ts
```

Expected: FAIL — `Cannot find module './profile'`

- [ ] **Step 3: Implement `src/lib/user/profile.ts`**

```ts
import { prisma } from "@/lib/db";

type ProfileData = {
  id: string;
  username: string | null;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
};

type UpdateProfileResult =
  | { conflict: true }
  | { conflict: false; user: Omit<ProfileData, "createdAt"> };

export async function getProfile(userId: string): Promise<ProfileData | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, bio: true, avatarUrl: true, createdAt: true },
  });
}

export async function updateProfile(
  userId: string,
  data: { username?: string; bio?: string },
  currentUsername: string | null | undefined
): Promise<UpdateProfileResult> {
  const { username, bio } = data;

  if (username && username.toLowerCase() !== currentUsername?.toLowerCase()) {
    const conflict = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, NOT: { id: userId } },
    });
    if (conflict) return { conflict: true };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username !== undefined ? { username } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
    select: { id: true, username: true, email: true, bio: true, avatarUrl: true },
  });

  return { conflict: false, user: updated };
}
```

- [ ] **Step 4: Run service tests to confirm they pass**

```bash
npx vitest run src/lib/user/profile.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Replace `src/app/api/user/profile/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-helpers";
import { getProfile, updateProfile } from "@/lib/user/profile";

const updateSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(300, "Bio must be at most 300 characters").optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = await getProfile(session!.user.id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await updateProfile(
    session!.user.id,
    parsed.data,
    session!.user.username
  );

  if (result.conflict) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  return NextResponse.json(result.user);
}
```

- [ ] **Step 6: Replace `src/app/api/user/profile/route.test.ts`**

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-helpers", () => ({ requireAuth: mockRequireAuth }));

const mockGetProfile = vi.hoisted(() => vi.fn());
const mockUpdateProfile = vi.hoisted(() => vi.fn());
vi.mock("@/lib/user/profile", () => ({
  getProfile: mockGetProfile,
  updateProfile: mockUpdateProfile,
}));

import { GET, PUT } from "./route";

afterEach(() => vi.clearAllMocks());

const session = {
  user: { id: "u1", username: "testuser", role: "user", isBanned: false, emailVerified: new Date() },
};
const profile = { id: "u1", username: "testuser", email: "t@t.com", bio: null, avatarUrl: null, createdAt: new Date() };

function authOk() {
  mockRequireAuth.mockResolvedValueOnce({ session, error: null });
}
function authFail() {
  const res = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  mockRequireAuth.mockResolvedValueOnce({ session: null, error: res });
}

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await GET()).status).toBe(401);
  });

  it("returns 404 when user is not found in DB", async () => {
    authOk();
    mockGetProfile.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(404);
  });

  it("returns the user profile", async () => {
    authOk();
    mockGetProfile.mockResolvedValueOnce(profile);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("testuser");
    expect(mockGetProfile).toHaveBeenCalledWith("u1");
  });
});

describe("PUT /api/user/profile", () => {
  it("returns 401 when not authenticated", async () => {
    authFail();
    expect((await PUT(putReq({ username: "newname" }))).status).toBe(401);
  });

  it("returns 400 for username too short", async () => {
    authOk();
    expect((await PUT(putReq({ username: "ab" }))).status).toBe(400);
  });

  it("returns 409 when username is already taken", async () => {
    authOk();
    mockUpdateProfile.mockResolvedValueOnce({ conflict: true });
    expect((await PUT(putReq({ username: "takenname" }))).status).toBe(409);
  });

  it("returns 200 with updated user on success", async () => {
    authOk();
    const updated = { id: "u1", username: "newname", email: "t@t.com", bio: "hi", avatarUrl: null };
    mockUpdateProfile.mockResolvedValueOnce({ conflict: false, user: updated });
    const res = await PUT(putReq({ username: "newname", bio: "hi" }));
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("newname");
    expect(mockUpdateProfile).toHaveBeenCalledWith("u1", { username: "newname", bio: "hi" }, "testuser");
  });

  it("updates only bio without checking username", async () => {
    authOk();
    const updated = { id: "u1", username: "testuser", email: "t@t.com", bio: "new bio", avatarUrl: null };
    mockUpdateProfile.mockResolvedValueOnce({ conflict: false, user: updated });
    const res = await PUT(putReq({ bio: "new bio" }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 7: Run all profile tests**

```bash
npx vitest run src/lib/user/profile.test.ts src/app/api/user/profile/route.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Run the full test suite as a final check**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/user/profile.ts src/lib/user/profile.test.ts src/app/api/user/profile/
git commit -m "feat: extract profile service into src/lib/user/profile"
```
