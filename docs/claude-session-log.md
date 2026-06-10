# Claude Session Log — GameCatalog

Complete history of features, fixes, and improvements built with Claude across all sessions.

---

## 2026-05-29 — Project Bootstrap

**Initial commit — GameCatalog**
- Next.js 16 app router project with TypeScript, Tailwind CSS v4, Prisma ORM, PostgreSQL (Neon)
- Authentication via NextAuth v5 (credentials + Google OAuth)
- Core models: User, Game, Genre, GameGenre, GameVersion, Review, Favorite
- Admin panel: game CRUD, user management, review moderation
- Public pages: homepage, browse games (filters), game detail, user profile, settings
- Deployed to Vercel with Neon serverless Postgres

**fix: make reCAPTCHA fail open so login works on production**
- reCAPTCHA was blocking all logins when `RECAPTCHA_SECRET_KEY` was not set in production

---

## 2026-05-30 — UI Polish, Admin Tools, Auth Fixes

**Add cover image upload (file + URL) to game form**
- File picker and URL input in the admin game form
- Images uploaded to Cloudinary via server-side API route

**Remove forced crop on cover upload; preserve original aspect ratio**
- Cloudinary upload no longer applies a fixed crop transformation

**Auto-normalize external cover URLs through Cloudinary on save**
- External image URLs (e.g. from copy-paste) are re-hosted through Cloudinary on save
- Ensures all cover images are served from a trusted CDN

**Add sortable columns to all admin lists (games, users, reviews, genres)**
- Clicking any column header toggles asc/desc sort via URL search params
- `SortableHead` component shared across all admin tables

**Redesign homepage: grid hero, marquee, hero game card, numbered features, updated footer & GameCard**
- New grid-based hero section with game marquee
- Featured game card with neon hover effect
- Numbered feature highlights section
- Refreshed footer and game card design

**Responsive fixes: mobile filters, heading sizes, hero stats, search input, profile layout**
- Filter panel collapses on mobile with a toggle button
- Heading sizes and hero stats scale down on small screens
- Search input transitions width smoothly on focus

**Fix auth: normalize email, recaptcha fail-open, ssl mode**
- Email addresses lowercased before DB lookup to prevent case-mismatch login failures
- reCAPTCHA errors no longer block login
- Neon connection string ssl mode set correctly

**Fix React error #31: safely coerce all API error values to strings**
- `apiError()` utility ensures error objects are always rendered as strings in toasts

---

## 2026-05-31 — Security Hardening, Login Redesign, Performance

**Change login to use username instead of email**
- Login form now accepts username; email is no longer exposed in the login flow

**Add text captcha verification for registration and password change**
- Math-based text CAPTCHA added to signup and password-change forms as a spam barrier

**Fix captcha resetting after correct code entry** *(landed 2026-06-01)*
- Captcha input was clearing itself after a correct answer; fixed state management

**Fix login TransactionWriteConflict: drop rate limit to ReadCommitted**
- Prisma rate-limit writes were causing serialisation conflicts under load; isolation level dropped to ReadCommitted

**Security hardening: SSRF protection, rate limits, email enumeration fix, recaptcha fail-closed**
- SSRF: cover image upload URL is validated against an allowlist before fetching
- Rate limits: signup, login, password-change endpoints throttled per IP
- Email enumeration: signup and forgot-password responses are timing-constant
- reCAPTCHA: now fails closed (blocks request) when secret key is configured

**Security hardening: rate limits, timing fix, URL whitelist, magic bytes**
- Additional rate limits on review submission and flag endpoints
- Timing-safe comparison for captcha tokens
- URL allowlist for purchase links
- Magic-byte validation on uploaded cover images to reject non-images

**Use direct DB URL for Prisma migrations to fix Neon pooler advisory lock timeout**
- Neon's connection pooler does not support advisory locks; migrations now use `DIRECT_DATABASE_URL`

**Allow unsafe-eval in CSP for dev mode only (React Turbopack requirement)**
- Content Security Policy relaxed only in `NODE_ENV=development` to allow Turbopack HMR

**Add Vercel Speed Insights for real-user performance monitoring**
- `@vercel/speed-insights` package added; `<SpeedInsights />` component mounted in root layout

---

## 2026-06-04 — Features, Analytics, CI/CD

**Redesign: full-viewport hero, bento features, neon game cards, animated counters**
- Homepage rebuilt: full-viewport hero with animated background, bento-grid feature cards
- Game cards with neon glow on hover
- Animated counters for stats (games, reviews, users)

**Add password strength meter with special character requirement**
- Visual strength bar in the signup form (Weak / Fair / Strong / Very Strong)
- Passwords now require at least one special character

**Redirect to signup when login username does not exist**
- Instead of a generic "invalid credentials" error, unknown usernames prompt the user to sign up

**Redirect authenticated users away from login/signup pages**
- Logged-in users are redirected to `/` if they navigate to `/login` or `/signup`

**Show personalized CTA for logged-in users**
- Homepage call-to-action changes to "Browse Games" / "Write a Review" when authenticated

**Auto-ban accounts that post malicious links in reviews**
- Review body is scanned for malicious URLs; offending accounts are immediately banned

**Fix review deletion not reflecting on game page**
- Deleting a review now correctly re-fetches the review list without a full page reload

**Fix review submission failing when reCAPTCHA site key is not configured**
- Review form no longer breaks when `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is absent

**Fix login blocked when reCAPTCHA site key is not configured**
- Login flow gracefully skips reCAPTCHA when the key is not set

**Add reCAPTCHA response logging for diagnostics**
- reCAPTCHA verification responses are logged server-side to help diagnose score failures

**Fix lint errors: no-unused-expressions and set-state-in-effect**
- Resolved ESLint warnings that were failing CI

**Add Vercel Analytics**
- `@vercel/analytics` added; `<Analytics />` mounted in root layout

**Add Vercel preview deployment workflow**
- `.github/workflows/deploy.yml` added: deploys to Vercel on every push and pull request
- Production deployments (`main` branch) use `--prod` flag

---

## 2026-06-08 — Full Test Suite, Purchase Links, Forum

**Add full test suite: 261 tests across 34 files**
- Vitest test suite covering API routes, lib utilities, and component logic
- 261 tests, 34 files, ~95% pass rate on first run

**Add purchase links to games**
- New `purchaseLinks Json` field on Game model
- Admin game form: add/remove store links (Steam, Epic, GOG, PlayStation Store, etc.)
- Game detail page: "Where to Buy" section with store badges

**Add purchase links for all seeded games**
- Seed script updated to add realistic purchase links to all demo games

**Fix Select onValueChange null type error in GameForm**
- `onValueChange` handler now guards against `null` values from Base UI Select

**Add community forum with table of contents**
- New `ForumThread` and `ForumPost` models with soft deletes
- Forum categories: General, Tips & Tricks, Help, Guides, News, Off-Topic
- Pages: `/forum` (hub with category cards + recent activity), `/forum/[category]`, `/forum/new`, `/forum/thread/[id]`
- Thread creation with category, title, and body
- Post/reply system with pagination
- Admin: pin, lock, delete threads; delete posts
- Rate limiting on thread and post creation

---

## 2026-06-09 — Forum Refactor, Voting, IGDB Sync

**Link forum threads to games with per-game forum pages**
- `gameId` FK added to `ForumThread`; migration `20260609000000_forum_game_link`
- `GET /api/forum/threads` accepts `?gameId=` filter
- New pages: `/games/[slug]/forum` and `/games/[slug]/forum/new`
- Game detail sidebar shows a "Community Forum" card with thread count
- Thread breadcrumb links back to the game's forum when a game is linked
- 13 new API route tests

**Replace native confirm() with modal dialog for thread deletion**
- `window.confirm()` replaced with a `Dialog` component in `ThreadDetailClient`
- Destructive action is clearly labelled; button shows "Deleting…" while in flight

**Add helpfulness voting to reviews**
- `helpfulCount`, `notHelpfulCount`, and `ReviewVote` model added; migration `20260609010000_review_votes`
- `POST /api/games/[id]/reviews/[rid]/vote`: toggle-style voting; 403 on own review
- `ReviewCard`: thumbs-up / thumbs-down with optimistic UI update and rollback on failure
- Voting disabled for unauthenticated users and review owners

**Only run prisma migrate deploy on production builds**
- `vercel-build` script gates migrations behind `VERCEL_ENV === "production"`
- Prevents advisory lock contention from simultaneous preview deployments

**Remove redundant PR comment step from deploy workflow**
- Removed the "Comment preview URL on PR" step that was failing with a permissions error
- Vercel's native GitHub integration already posts preview URLs automatically

**Scope forums to games only and add game forum directory**
- Standalone `/forum`, `/forum/[category]`, `/forum/new` routes redirect to `/games`
- `gameId` made required in `POST /api/forum/threads`
- New `/forum` page: lists all published games that have at least one active thread
- `ForumDirectory` client component: instant search + sort (Most Recent / Most Threads / A–Z)
- "Forum" link restored in navbar

**Add IGDB incremental sync with manual-edit protection**
- `igdbId Int? @unique` and `lockedFields String[]` added to `Game`
- New `IgdbSyncState` singleton model stores last sync timestamp and cached Twitch token
- Migration: `20260609020000_igdb_sync`
- `src/lib/igdb.ts`: Twitch OAuth client-credentials flow; paginated Apicalypse queries with 4 req/sec throttling
- `src/lib/igdb-sync.ts`: field mapping, locked-field protection, genre upsert, new games arrive as unpublished drafts
- `POST /api/admin/sync/igdb`: admin session or `CRON_SECRET` bearer token; 5-minute timeout
- `vercel.json`: cron fires every 6 hours
- Admin dashboard: `IgdbSyncPanel` with last sync time, pending-review count, Sync Now button
- Game edit form: IGDB ID field + per-field lock toggles
- Admin games table: blue "IGDB" badge on linked games
- Required env vars: `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `CRON_SECRET`

---

## 2026-06-10 — Performance, Admin Forum, Bug Fixes

**Disable IGDB auto-sync cron**
- Removed the every-6-hours cron job from `vercel.json` while Twitch credentials are failing
- Manual sync from the admin dashboard still works

**Core Web Vitals improvements — first pass (Speed Insights score: 76)**
- Replaced raw `<img>` tags on game detail page with `next/image` (cover: `priority` + dimensions; backdrop: `fill`)
- Added `priority` and `sizes` to above-fold mosaic images on homepage
- Removed `GoogleReCaptchaProvider` from global `Providers` — scoped to auth layout + game detail page only
- Removed `framer-motion` from dependencies (~42 KB, was never imported)

**Core Web Vitals — targeted fixes for three flagged Speed Insights paths**
- `/` — replaced `force-dynamic` with `revalidate=3600` (ISR); page now caches at CDN edge; removed `ScrollReveal` from the `#1 RANKED` hero card (LCP element was hidden at `opacity: 0` until JS hydrated); extracted session-dependent CTA to `HomeCta` client component so the page stays static
- `/login` — scoped `RecaptchaProvider` to login page only; removed from auth layout so forgot-password/verify-email/reset-password no longer load the reCAPTCHA script
- `/forum/new` — promoted server-side `redirect()` to a permanent CDN-level redirect in `next.config.ts`

**Add forum management to admin panel**
- New **Forum** entry in admin sidebar
- `/admin/forum`: thread list with All / Pinned / Locked tabs, category dropdown, search, sort, per-row pin/unpin/lock/unlock/delete, bulk delete
- `/admin/forum/[id]`: full thread body + replies; pin, lock, delete thread; delete individual replies
- API routes: `GET/PATCH /api/admin/forum/threads`, `GET/PATCH /api/admin/forum/threads/[id]`, `PATCH /api/admin/forum/posts/[id]`

**Fix bento grid layout in "Why GameCatalog" section**
- `grid-rows-auto` is not a valid Tailwind class — removed
- `auto-rows-fr` collapses rows to zero without explicit grid height — removed
- `md:row-span-2` on the inner card div was a no-op (only works on direct grid children; already correctly on the `ScrollReveal` wrapper) — removed
- Grid simplified to `md:grid-cols-3` with natural row sizing

**Fix Navbar crash: `session?.user.role` → `session?.user?.role`**
- Runtime `TypeError: Cannot read properties of undefined (reading 'role')` when `session.user` was undefined

**Fix local dev environment**
- `AUTH_URL` set to `http://localhost:3000` (was blank — caused `UntrustedHost` error)
- `AUTH_SECRET` generated (was blank — caused `MissingSecret` error)
- `DATABASE_URL` sslmode changed to `verify-full` (silences pg driver deprecation warning)

---

---

## 2026-06-10 (Session 2) — Security Hardening, Forum Activity, Public Profiles, Smooth Transitions

**Security audit and fixes (High + Medium severity)**
- reCAPTCHA: missing token now returns `false` instead of bypassing verification (missing secret still skips in dev)
- Email verification endpoint: rate-limited (10/hr per IP) — previously brute-forceable
- Signup OTP: added `MIN_RESPONSE_MS` timing pad on failed attempts to prevent timing oracle
- Cleanup promise in send-signup-otp: errors now logged instead of silently swallowed
- Admin users PUT: removed `emailVerified` toggle — prevents bypassing the email verification flow

**Security audit fixes (Low severity)**
- Forgot-password page: checks `response.ok` and surfaces errors to the user
- Admin users PUT: email conflict check uses `mode: "insensitive"` (consistent with username)
- User profile PUT: skips uniqueness query when username is unchanged

**Forum activity on user profile**
- New Forum Activity section on private profile page (`/profile`)
- Single query fetches threads the user started or replied to; shows Started/Replied badge, game, reply count, last activity
- Same section added to admin user detail view (`/admin/users/[id]`); `GET /api/users/[id]` extended to include forum threads

**Public user profile page**
- New page at `/profile/[username]` — resolves all existing author links from forum components
- Shows avatar, bio, role, join date, stats (reviews/threads/avg rating), Forum Activity, and Reviews
- Case-insensitive username lookup; 404 for deleted/unknown users; dynamic `<title>`

**Smooth transitions**
- `PageTransition` client component wraps children in all three layouts (public, user, admin); uses `key={pathname}` to retrigger `animate-in fade-in slide-in-from-bottom-2` on every route change
- Profile pages: staggered section entrance animations (100ms apart)
- Theme toggle: adds `.theme-transitioning` class during user-triggered switches for 300ms color/bg/border cross-fade; initial-load flash suppression preserved via `isFirstApply` ref

---

---

## 2026-06-10 (Session 3) — Forgot Password: Email Delivery Fix + Resend UX

**Fix forgot-password email delivery and transient 500 errors**
- `email.ts`: `??` → `||` so empty `RESEND_FROM_EMAIL` / `NEXT_PUBLIC_APP_URL` env vars fall back to defaults instead of being passed through as empty strings
- `forgot-password/route.ts`: wrapped all DB operations in a top-level try/catch — transient Neon connection resets no longer surface as bare 500s; generic success response returned in all cases (enumeration protection preserved)
- Configured `RESEND_API_KEY` in local environment (was never set — emails were silently never sent)

**Add resend link with 30s cooldown and 3-attempt limit**
- After the initial send, a 30-second countdown appears on the success screen
- Once it expires, a "Resend reset link" button appears and re-triggers the API call
- After 3 resend attempts, the button is replaced with a warning to check spam or wait

---

---

## 2026-06-10 (Session 4) — Production Email Fix (Vercel env vars)

**No code commits — infrastructure fix only.**

- Diagnosed why password reset emails were not being delivered on `gamecatalog.ca` despite working locally
- Root cause: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL` were empty strings in Vercel's environment variables (placeholder entries from 10 days ago, never filled in)
- Used Vercel CLI to remove the empty entries and re-add with correct values; redeployed production
- Verified production API returns HTTP 200 and Resend confirms `delivered` status for the reset email

---

## Totals

| Metric | Count |
|--------|-------|
| Sessions | 11+ |
| Total commits | ~63 |
| New DB migrations | 5 |
| Test files | 34 |
| Tests | 261+ |
| New pages | 13+ |
| New API routes | 12+ |
| Major features | 26+ |
