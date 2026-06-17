# src/lib Subdirectory Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group `src/lib/` flat files into three subdirectories (`auth/`, `igdb/`, `games/`) without changing any module behaviour.

**Architecture:** Move files with their test files into subdirectories; update all import paths that reference the moved modules; no barrel files are introduced. Each task covers one group and is independently testable.

**Tech Stack:** Next.js 16 App Router, TypeScript path aliases (`@/lib/...`), Vitest

## Global Constraints

- No barrel/index files
- No behaviour changes to any function
- Test files always move alongside their source files
- All `@/lib/…` aliases resolve through `tsconfig.json` — no tsconfig changes needed
- After each task: `npm run test` must pass

---

### Task 1: Move `auth/` group (captcha, recaptcha, token)

**Files:**
- Create dir: `src/lib/auth/`
- Move: `src/lib/captcha.ts` → `src/lib/auth/captcha.ts`
- Move: `src/lib/captcha.test.ts` → `src/lib/auth/captcha.test.ts`
- Move: `src/lib/recaptcha.ts` → `src/lib/auth/recaptcha.ts`
- Move: `src/lib/recaptcha.test.ts` → `src/lib/auth/recaptcha.test.ts`
- Move: `src/lib/token.ts` → `src/lib/auth/token.ts`
- Move: `src/lib/token.test.ts` → `src/lib/auth/token.test.ts`
- Modify: `src/auth.ts` (2 imports)
- Modify: `src/app/api/auth/captcha/route.ts` (1 import)
- Modify: `src/app/api/auth/complete-profile/route.ts` (1 import)
- Modify: `src/app/api/auth/forgot-password/route.ts` (1 import)
- Modify: `src/app/api/auth/reset-password/route.ts` (1 import)
- Modify: `src/app/api/auth/send-signup-otp/route.ts` (1 import)

**Interfaces:**
- Produces: `@/lib/auth/captcha`, `@/lib/auth/recaptcha`, `@/lib/auth/token` — same exports as before

- [ ] **Step 1: Move the six files**

```bash
mkdir src/lib/auth
mv src/lib/captcha.ts src/lib/auth/captcha.ts
mv src/lib/captcha.test.ts src/lib/auth/captcha.test.ts
mv src/lib/recaptcha.ts src/lib/auth/recaptcha.ts
mv src/lib/recaptcha.test.ts src/lib/auth/recaptcha.test.ts
mv src/lib/token.ts src/lib/auth/token.ts
mv src/lib/token.test.ts src/lib/auth/token.test.ts
```

- [ ] **Step 2: Update `src/auth.ts`**

Change:
```ts
import { verifyRecaptcha } from "@/lib/recaptcha";
import { generateRawToken } from "@/lib/token";
```
To:
```ts
import { verifyRecaptcha } from "@/lib/auth/recaptcha";
import { generateRawToken } from "@/lib/auth/token";
```

- [ ] **Step 3: Update `src/app/api/auth/captcha/route.ts`**

Change:
```ts
import { ... } from "@/lib/captcha";
```
To:
```ts
import { ... } from "@/lib/auth/captcha";
```

- [ ] **Step 4: Update `src/app/api/auth/complete-profile/route.ts`**

Change the `@/lib/captcha` import to `@/lib/auth/captcha`.

- [ ] **Step 5: Update `src/app/api/auth/forgot-password/route.ts`**

Change the `@/lib/token` import to `@/lib/auth/token`.

- [ ] **Step 6: Update `src/app/api/auth/reset-password/route.ts`**

Change the `@/lib/token` import to `@/lib/auth/token`.

- [ ] **Step 7: Update `src/app/api/auth/send-signup-otp/route.ts`**

Change the `@/lib/token` import to `@/lib/auth/token`.

- [ ] **Step 8: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass. If a test fails with "Cannot find module", check that the import path in the moved file or the consumer file uses the new path.

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/ src/auth.ts src/app/api/auth/
git commit -m "refactor: move auth lib modules into src/lib/auth/ subdirectory"
```

---

### Task 2: Move `igdb/` group (igdb, igdb-sync)

**Files:**
- Create dir: `src/lib/igdb/`
- Move: `src/lib/igdb.ts` → `src/lib/igdb/igdb.ts`
- Move: `src/lib/igdb.test.ts` → `src/lib/igdb/igdb.test.ts`
- Move: `src/lib/igdb-sync.ts` → `src/lib/igdb/igdb-sync.ts`
- Move: `src/lib/igdb-sync.test.ts` → `src/lib/igdb/igdb-sync.test.ts`
- Modify: `src/lib/igdb/igdb-sync.ts` — internal import of igdb changes to relative `./igdb`
- Modify: `src/lib/igdb/igdb-sync.test.ts` — mock path `@/lib/igdb` → `@/lib/igdb/igdb`
- Modify: `src/app/api/admin/sync/igdb/route.ts` — `@/lib/igdb-sync` → `@/lib/igdb/igdb-sync`

**Interfaces:**
- Consumes: `@/lib/igdb/igdb` (was `@/lib/igdb`), `@/lib/igdb/igdb-sync` (was `@/lib/igdb-sync`)
- Produces: same exports as before at new paths

- [ ] **Step 1: Move the four files**

```bash
mkdir src/lib/igdb
mv src/lib/igdb.ts src/lib/igdb/igdb.ts
mv src/lib/igdb.test.ts src/lib/igdb/igdb.test.ts
mv src/lib/igdb-sync.ts src/lib/igdb/igdb-sync.ts
mv src/lib/igdb-sync.test.ts src/lib/igdb/igdb-sync.test.ts
```

- [ ] **Step 2: Update `igdb-sync.ts` internal import of igdb**

In `src/lib/igdb/igdb-sync.ts`, change:
```ts
import { fetchUpdatedGames, IGDB_PAGE_SIZE, type IgdbGame } from "@/lib/igdb";
```
To:
```ts
import { fetchUpdatedGames, IGDB_PAGE_SIZE, type IgdbGame } from "./igdb";
```

(The import of `@/lib/release-status-config` in this file stays unchanged — that file hasn't moved yet. It will be updated in Task 3.)

- [ ] **Step 3: Update `igdb-sync.test.ts` mock path**

In `src/lib/igdb/igdb-sync.test.ts`, change:
```ts
vi.mock("@/lib/igdb", () => ({
```
To:
```ts
vi.mock("@/lib/igdb/igdb", () => ({
```

- [ ] **Step 4: Update `src/app/api/admin/sync/igdb/route.ts`**

Change the `@/lib/igdb-sync` import to `@/lib/igdb/igdb-sync`. The `@/lib/release-status` import stays unchanged for now.

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/igdb/ src/app/api/admin/sync/igdb/route.ts
git commit -m "refactor: move igdb lib modules into src/lib/igdb/ subdirectory"
```

---

### Task 3: Move `games/` group (release-status, release-status-config)

**Files:**
- Create dir: `src/lib/games/`
- Move: `src/lib/release-status.ts` → `src/lib/games/release-status.ts`
- Move: `src/lib/release-status.test.ts` → `src/lib/games/release-status.test.ts`
- Move: `src/lib/release-status-config.ts` → `src/lib/games/release-status-config.ts`
- Move: `src/lib/release-status-config.test.ts` → `src/lib/games/release-status-config.test.ts`
- Modify: `src/lib/games/release-status.ts` — internal import `@/lib/release-status-config` → `./release-status-config`
- Modify: `src/lib/igdb/igdb-sync.ts` — `@/lib/release-status-config` → `@/lib/games/release-status-config`
- Modify: `src/app/api/admin/sync/igdb/route.ts` — `@/lib/release-status` → `@/lib/games/release-status`
- Modify: `src/app/(public)/games/[slug]/page.tsx` — `@/lib/release-status-config` → `@/lib/games/release-status-config`
- Modify: `src/components/admin/AdminGamesTable.tsx` — `@/lib/release-status-config` → `@/lib/games/release-status-config`
- Modify: `src/components/games/GameCard.tsx` — `@/lib/release-status-config` → `@/lib/games/release-status-config`

**Interfaces:**
- Produces: `@/lib/games/release-status`, `@/lib/games/release-status-config` — same exports as before

- [ ] **Step 1: Move the four files**

```bash
mkdir src/lib/games
mv src/lib/release-status.ts src/lib/games/release-status.ts
mv src/lib/release-status.test.ts src/lib/games/release-status.test.ts
mv src/lib/release-status-config.ts src/lib/games/release-status-config.ts
mv src/lib/release-status-config.test.ts src/lib/games/release-status-config.test.ts
```

- [ ] **Step 2: Update `release-status.ts` internal imports**

In `src/lib/games/release-status.ts`, change both occurrences of `@/lib/release-status-config` to `./release-status-config`:

```ts
export { computeReleaseStatus, STATUS_LABELS, STATUS_COLORS } from "./release-status-config";
import { computeReleaseStatus } from "./release-status-config";
```

- [ ] **Step 3: Update `igdb-sync.ts` release-status-config import**

In `src/lib/igdb/igdb-sync.ts`, change:
```ts
import { computeReleaseStatus } from "@/lib/release-status-config";
```
To:
```ts
import { computeReleaseStatus } from "@/lib/games/release-status-config";
```

- [ ] **Step 4: Update `src/app/api/admin/sync/igdb/route.ts`**

Change the `@/lib/release-status` import to `@/lib/games/release-status`.

- [ ] **Step 5: Update `src/app/(public)/games/[slug]/page.tsx`**

Change the `@/lib/release-status-config` import to `@/lib/games/release-status-config`.

- [ ] **Step 6: Update `src/components/admin/AdminGamesTable.tsx`**

Change the `@/lib/release-status-config` import to `@/lib/games/release-status-config`.

- [ ] **Step 7: Update `src/components/games/GameCard.tsx`**

Change the `@/lib/release-status-config` import to `@/lib/games/release-status-config`.

- [ ] **Step 8: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/games/ src/lib/igdb/igdb-sync.ts src/app/api/admin/ src/app/\(public\)/games/ src/components/
git commit -m "refactor: move games lib modules into src/lib/games/ subdirectory"
```
