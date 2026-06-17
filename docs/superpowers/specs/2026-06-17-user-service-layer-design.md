# Design: User API Service Layer

**Date:** 2026-06-17
**Status:** Approved

## Problem

The five `src/app/api/user/` route handlers mix HTTP concerns (parsing, validation, auth, responses) with domain logic (DB queries, bcrypt, Cloudinary calls, business rules). This makes the domain logic hard to test in isolation and couples it to the HTTP layer unnecessarily.

## Goal

Extract domain logic from route handlers into a `src/lib/user/` service layer. Route handlers become thin HTTP adapters; services own business rules, DB access, and external API calls. Each service function gets direct unit tests. Existing route tests are refactored to mock the service layer.

## New Files

Four service files in `src/lib/user/`, making it a fourth subdirectory alongside `auth/`, `igdb/`, and `games/` in the `src/lib/` restructure:

```
src/lib/user/
  avatar.ts       avatar.test.ts
  password.ts     password.test.ts
  favorites.ts    favorites.test.ts
  profile.ts      profile.test.ts
```

## Service Function Signatures

### `avatar.ts`

```ts
function hasValidImageSignature(buf: Buffer): boolean
// Pure magic-byte check for PNG, JPEG, WebP, GIF.

async function uploadAvatar(userId: string, buffer: Buffer): Promise<string>
// Uploads buffer to Cloudinary and updates user.avatarUrl in DB.
// Returns the Cloudinary secure_url.

async function removeAvatar(userId: string): Promise<void>
// Destroys the Cloudinary asset (best-effort, swallows errors) and nullifies user.avatarUrl in DB.
```

### `password.ts`

```ts
type ChangePasswordResult =
  | { success: true }
  | { success: false; error: "no_password" | "wrong_password" }

async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult>
// Looks up passwordHash, returns no_password for Google-only accounts,
// compares with bcrypt, hashes and saves the new password on success.
```

### `favorites.ts`

```ts
async function getFavorites(userId: string): Promise<Game[]>
// Returns all favorited games ordered by createdAt desc, with genres included.

async function addFavorite(
  userId: string,
  gameId: string
): Promise<{ found: boolean }>
// Checks the game exists. Returns { found: false } when not. Creates the
// favorite record (swallows unique-constraint errors for idempotency).
// Returns { found: true } on success or when already favorited.

async function removeFavorite(userId: string, gameId: string): Promise<void>
// Deletes the favorite record (idempotent — no error if it doesn't exist).
```

### `profile.ts`

```ts
type ProfileData = {
  id: string; username: string | null; email: string;
  bio: string | null; avatarUrl: string | null; createdAt: Date;
}

async function getProfile(userId: string): Promise<ProfileData | null>
// Returns the user's profile fields, or null if not found.

type UpdateProfileResult =
  | { conflict: true }
  | { conflict: false; user: Omit<ProfileData, "createdAt"> }

async function updateProfile(
  userId: string,
  data: { username?: string; bio?: string },
  currentUsername: string | null | undefined
): Promise<UpdateProfileResult>
// Checks for username conflicts (case-insensitive, excluding current user).
// Returns { conflict: true } when taken. Applies the update and returns the user.
```

## Responsibility Split

### Stays in route handlers
- `requireAuth()` and `isConfigured()` guards
- `checkRateLimit()` and `verifyCaptchaToken()` — both need the HTTP request for IP/input
- Request parsing (`request.json()`, `request.formData()`)
- Zod schema validation
- `NextResponse.json(...)` responses and HTTP status codes
- Mapping service results to HTTP status codes (e.g. `{ found: false }` → 404, `{ conflict: true }` → 409)

### Moves to services
- All Prisma queries
- bcrypt compare and hash (`changePassword`)
- Cloudinary upload stream and destroy (`uploadAvatar`, `removeAvatar`)
- Domain rules: idempotency on `addFavorite`, username conflict check in `updateProfile`, Google-account guard in `changePassword`

After extraction each route handler is ~10–15 lines: guard → parse → validate → call service → return response.

## Tests

### New service tests (`src/lib/user/*.test.ts`)
Each service file gets a co-located test file. Prisma and Cloudinary are mocked at the module level (same pattern as existing lib tests). Tests exercise domain rules directly — no `new Request(...)` boilerplate.

Coverage targets per service:
- `avatar`: signature detection for all four formats, upload path, delete best-effort swallow
- `password`: no-password account, wrong password, successful update
- `favorites`: get list, add (found/not-found/already-exists), remove (idempotent)
- `profile`: get found/not-found, update conflict, update success (username-only, bio-only, both)

### Refactored route tests (`src/app/api/user/*/route.test.ts`)
Each route test is updated to mock the service module instead of mocking DB/Cloudinary individually. Route tests focus purely on HTTP behaviour: auth failures, validation rejections, rate limiting, Cloudinary-not-configured guard, correct service call, correct response shape.

## Out of Scope
- Changing any function's behaviour
- Adding new endpoints or fields
- Touching any route outside `src/app/api/user/`
- Extracting auth, rate-limit, or captcha concerns into services
