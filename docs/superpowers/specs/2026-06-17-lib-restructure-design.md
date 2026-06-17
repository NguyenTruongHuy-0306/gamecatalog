# Design: src/lib Subdirectory Restructure

**Date:** 2026-06-17
**Status:** Approved

## Problem

`src/lib/` is a flat directory of 16 modules (plus 15 co-located test files). Related modules are not visually grouped, making it harder to navigate as the codebase grows.

## Goal

Group related modules into subdirectories without changing any public behaviour, adding abstractions, or introducing barrel files. All test files move alongside their source files.

## Directory Structure

Three subdirectories are introduced; all other files remain at the root of `src/lib/`.

```
src/lib/
  auth/
    captcha.ts              captcha.test.ts
    recaptcha.ts            recaptcha.test.ts
    token.ts                token.test.ts
  igdb/
    igdb.ts                 igdb.test.ts
    igdb-sync.ts            igdb-sync.test.ts
  games/
    release-status.ts       release-status.test.ts
    release-status-config.ts  release-status-config.test.ts
  api-helpers.ts            api-helpers.test.ts
  client-error.ts           client-error.test.ts
  cloudinary.ts             cloudinary.test.ts
  db.ts
  email.ts                  email.test.ts
  forum-categories.ts       forum-categories.test.ts
  rate-limit.ts             rate-limit.test.ts
  spam-scanner.ts           spam-scanner.test.ts
  utils.ts                  utils.test.ts
```

### Grouping rationale

| Group | Modules | Why together |
|---|---|---|
| `auth/` | captcha, recaptcha, token | All security/auth primitives used together in the auth flow |
| `igdb/` | igdb, igdb-sync | igdb-sync directly imports igdb; both serve IGDB integration |
| `games/` | release-status, release-status-config | release-status re-exports and imports release-status-config |

Single-file domains (email, forum, cloudinary) stay at root — a one-file subdirectory adds path depth with no navigation benefit.

## Import Updates

No barrel files. Import paths update directly to reflect where files live.

| Old import | New import |
|---|---|
| `@/lib/captcha` | `@/lib/auth/captcha` |
| `@/lib/recaptcha` | `@/lib/auth/recaptcha` |
| `@/lib/token` | `@/lib/auth/token` |
| `@/lib/igdb` | `@/lib/igdb/igdb` |
| `@/lib/igdb-sync` | `@/lib/igdb/igdb-sync` |
| `@/lib/release-status` | `@/lib/games/release-status` |
| `@/lib/release-status-config` | `@/lib/games/release-status-config` |

15 import statements are affected across `src/`. All other `@/lib/…` imports are unchanged.

**Files with imports to update:**

- `src/auth.ts` — recaptcha, token
- `src/app/api/auth/captcha/route.ts` — captcha
- `src/app/api/auth/complete-profile/route.ts` — captcha
- `src/app/api/auth/forgot-password/route.ts` — token
- `src/app/api/auth/reset-password/route.ts` — token
- `src/app/api/auth/send-signup-otp/route.ts` — token
- `src/app/api/admin/sync/igdb/route.ts` — igdb-sync, release-status
- `src/app/(public)/games/[slug]/page.tsx` — release-status-config
- `src/components/admin/AdminGamesTable.tsx` — release-status-config
- `src/components/games/GameCard.tsx` — release-status-config
- `src/lib/igdb-sync.ts` → `src/lib/igdb/igdb-sync.ts` — internal imports of igdb + release-status-config
- `src/lib/release-status.ts` → `src/lib/games/release-status.ts` — internal import of release-status-config

## Tests

All exported functions already have test coverage — no new tests need to be written. Test files move alongside their source files into the new subdirectories. After the move, `npm run test` is run to confirm the full suite passes.

## Out of Scope

- Splitting any module into smaller files
- Adding barrel/index files
- Touching any file not in `src/lib/`
- Changing any module's exports or behaviour
