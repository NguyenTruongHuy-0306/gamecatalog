# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server
npm run build        # prisma migrate deploy + next build (production)
npm run lint         # eslint
npm run test         # vitest (all tests)
npx vitest run src/path/to/file.test.ts  # single test file

npm run db:migrate   # prisma migrate dev (create + apply migration)
npm run db:seed      # run prisma/seed.ts
npm run db:studio    # open Prisma Studio
```

The Prisma client is generated to `src/generated/prisma` (non-default). Always import from `@/generated/prisma/client`, not from `@prisma/client`.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · PostgreSQL · Prisma 7 (with `@prisma/adapter-pg` driver adapter) · NextAuth v5 beta · Tailwind 4 · shadcn/ui + @base-ui/react · Resend (email) · Cloudinary (avatars) · Vitest

### Route groups

| Group | Path | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/complete-profile` | Unauthenticated auth flows |
| `(public)` | `/games`, `/search`, `/forum`, `/profile/[username]` | Public-facing pages |
| `(user)` | `/profile`, `/settings` | Authenticated user pages |
| `admin` | `/admin/*` | Admin panel — layout enforces `role === "admin"` |

### Auth split

There are **two auth configs** to avoid importing Prisma into the Edge Runtime:

- `src/auth.config.ts` — lightweight, edge-safe, no DB imports; used in middleware/proxy
- `src/auth.ts` — full auth with Prisma adapter; used in Server Components and API routes

Session uses JWT strategy. The JWT carries `id`, `role`, `emailVerified`, `isBanned`, `username`, `needsSetup` (typed in `src/types/next-auth.d.ts`).

### API route guards

All API routes use helpers from `src/lib/api-helpers.ts`:

```ts
requireAuth()          // session + not banned
requireVerifiedAuth()  // session + not banned + email verified
requireAdmin()         // session + not banned + role === "admin"
```

Routes callable by cron jobs bypass session auth by checking `Authorization: Bearer ${CRON_SECRET}`.

### Database

Schema in `prisma/schema.prisma`. Key models:
- `Game` — has `igdbId`, `lockedFields: String[]`, `releaseStatus` enum (`upcoming/released/classic`), `qualityTier` (`AAA/indie/free-to-play`), `purchaseLinks: Json`
- `Review` — one per user per game (`@@unique([gameId, userId])`), soft-deleted via `deletedAt`, has `ReviewVote` for helpful/not-helpful
- `ForumThread` — optional `gameId` link; categories are hardcoded in `src/lib/forum-categories.ts`
- `IgdbSyncState` — singleton row (`id: 1`) stores cursor (`lastSyncedAt`) and cached Twitch access token
- `RateLimitLog` — DB-backed rate limiting (no Redis); cleaned up periodically

### IGDB sync

`src/lib/igdb.ts` fetches from IGDB API. `src/lib/igdb-sync.ts` upserts into `Game`. Sync is cursor-based (one page per call); `POST /api/admin/sync/igdb?full=true` resets the cursor and clears the cached token. Fields in `game.lockedFields` are never overwritten by the sync.

### Email

Transactional email via Resend (`src/lib/email.ts`). Signup uses a 6-digit OTP (15 min expiry); email verification uses a hashed token link (24 h expiry); password reset uses a hashed token link (1 h expiry). Raw tokens are stored hashed in `VerificationToken.token`.

### Rate limiting

`src/lib/rate-limit.ts` — DB-backed, uses `ReadCommitted` transactions. Call `checkRateLimit(identifier, action, limit, windowSeconds)` in API routes. No in-memory or Redis state.

### Image uploads

Cloudinary for user avatars (`src/lib/cloudinary.ts`). Game cover images come from IGDB (`images.igdb.com`) or Cloudinary; the `coverImageUrl` field validates against an allowlist of those domains.

### Tests

Vitest with `environment: "node"`. Test files are co-located next to their route: `src/app/api/auth/signup/route.test.ts`. No test database is configured — tests mock Prisma and other dependencies at the module level.
