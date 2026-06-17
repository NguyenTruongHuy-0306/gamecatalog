# User Game Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `Favorite` model with a full game lists system — 4 fixed status lists (Playing/Completed/Backlog/Wishlist, mutually exclusive per game) plus unlimited user-created custom lists, each with a public/private toggle.

**Architecture:** Two new Prisma models (`GameList`, `GameListEntry`) replace `Favorite`. The API auto-creates the 4 status lists on first `GET /api/user/lists` call. Status list mutual exclusivity is enforced in a `$transaction` when adding entries. A shared `GameListPopover` client component drives both the game detail page button and the game card quick-add overlay.

**Tech Stack:** Next.js 16 App Router · React 19 · Prisma 7 · PostgreSQL · Tailwind 4 · shadcn/ui · Vitest

## Global Constraints

- Import Prisma types from `@/generated/prisma/client`, not `@prisma/client`
- Import the `prisma` instance from `@/lib/db`
- Auth guards: use helpers from `src/lib/api-helpers.ts` (`requireAuth`, `requireAdmin`)
- Tests: always mock `@/auth` and `@/lib/db` via `vi.hoisted()` at the module level
- Run a single test file: `npx vitest run src/path/to/file.test.ts`
- Apply migrations: `npm run db:migrate`
- Status list names are fixed: PLAYING→"Playing", COMPLETED→"Completed", BACKLOG→"Backlog", WISHLIST→"Wishlist"

---

### Task 1: Schema — add GameList models (keep Favorite)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum and two new models**

In `prisma/schema.prisma`, after the `ReleaseStatus` enum block, add:

```prisma
enum GameListType {
  PLAYING
  COMPLETED
  BACKLOG
  WISHLIST
  CUSTOM
}
```

After the `Favorite` model, add:

```prisma
model GameList {
  id        String       @id @default(uuid())
  userId    String
  type      GameListType
  name      String
  isPublic  Boolean      @default(true)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries GameListEntry[]

  @@unique([userId, type, name])
  @@index([userId])
  @@map("game_lists")
}

model GameListEntry {
  listId  String
  gameId  String
  addedAt DateTime @default(now())

  list GameList @relation(fields: [listId], references: [id], onDelete: Cascade)
  game Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@id([listId, gameId])
  @@index([gameId])
  @@map("game_list_entries")
}
```

- [ ] **Step 2: Add back-relations to User and Game**

In the `User` model, after `reviewVotes ReviewVote[]`, add:

```prisma
  gameLists GameList[]
```

In the `Game` model, after `favorites Favorite[]`, add:

```prisma
  gameLists GameList[]
```

- [ ] **Step 3: Run migration**

```bash
npm run db:migrate
```

Expected: Prisma creates and applies a migration that adds `game_lists` and `game_list_entries` tables. The `favorites` table remains untouched.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add GameList and GameListEntry models to schema"
```

---

### Task 2: Data migration + remove Favorite

**Files:**
- Create: `prisma/migrate-favorites.ts`
- Modify: `prisma/schema.prisma`
- Delete: `src/app/api/user/favorites/route.ts`, `src/app/api/user/favorites/route.test.ts`, `src/app/api/user/favorites/[gameId]/route.ts`, `src/components/games/FavoriteButton.tsx`

- [ ] **Step 1: Write the data migration script**

Create `prisma/migrate-favorites.ts`:

```ts
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const usersWithFavorites = await prisma.user.findMany({
    where: { favorites: { some: {} } },
    include: { favorites: { select: { gameId: true, createdAt: true } } },
  });

  let migrated = 0;
  for (const user of usersWithFavorites) {
    const wishlist = await prisma.gameList.create({
      data: {
        userId: user.id,
        type: "WISHLIST",
        name: "Wishlist",
        isPublic: true,
      },
    });
    await prisma.gameListEntry.createMany({
      data: user.favorites.map((f) => ({
        listId: wishlist.id,
        gameId: f.gameId,
        addedAt: f.createdAt,
      })),
      skipDuplicates: true,
    });
    migrated++;
  }

  console.log(`Migrated ${migrated} users' favorites → Wishlist`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the migration script**

```bash
npx tsx prisma/migrate-favorites.ts
```

Expected output: `Migrated N users' favorites → Wishlist`

- [ ] **Step 3: Remove Favorite from schema**

In `prisma/schema.prisma`:
- Remove the entire `Favorite` model block
- Remove `favorites Favorite[]` from the `User` model
- Remove `favorites Favorite[]` from the `Game` model

- [ ] **Step 4: Drop the favorites table**

```bash
npm run db:migrate
```

Expected: Prisma generates and applies a migration that drops the `favorites` table.

- [ ] **Step 5: Delete old files**

Delete:
- `src/app/api/user/favorites/route.ts`
- `src/app/api/user/favorites/route.test.ts`
- `src/app/api/user/favorites/[gameId]/route.ts`
- `src/components/games/FavoriteButton.tsx`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate favorites to GameList and remove Favorite model"
```

---

### Task 3: API — GET/POST /api/user/lists

**Files:**
- Create: `src/app/api/user/lists/route.ts`
- Create: `src/app/api/user/lists/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/user/lists/route.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGameList = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  create: vi.fn(),
}));
const mockGameListEntry = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { gameList: mockGameList, gameListEntry: mockGameListEntry },
}));

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/lists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/user/lists", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/api/user/lists"));
    expect(res.status).toBe(401);
  });

  it("returns user lists with entry counts", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.upsert.mockResolvedValue({});
    mockGameList.findMany.mockResolvedValueOnce([
      { id: "l1", type: "PLAYING", name: "Playing", isPublic: true, _count: { entries: 3 } },
    ]);
    const res = await GET(new NextRequest("http://localhost/api/user/lists"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].name).toBe("Playing");
    expect(data[0]._count.entries).toBe(3);
  });

  it("returns hasGame when gameId query param provided", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.upsert.mockResolvedValue({});
    mockGameList.findMany.mockResolvedValueOnce([
      { id: "l1", type: "PLAYING", name: "Playing", isPublic: true, _count: { entries: 1 } },
    ]);
    mockGameListEntry.findMany.mockResolvedValueOnce([{ listId: "l1" }]);
    const res = await GET(new NextRequest(`http://localhost/api/user/lists?gameId=${GAME_UUID}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].hasGame).toBe(true);
  });
});

describe("POST /api/user/lists", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq({ name: "My RPGs" }))).status).toBe(401);
  });

  it("returns 400 for missing name", async () => {
    mockAuth.mockResolvedValueOnce(session);
    expect((await POST(postReq({}))).status).toBe(400);
  });

  it("returns 400 for name exceeding 50 chars", async () => {
    mockAuth.mockResolvedValueOnce(session);
    expect((await POST(postReq({ name: "a".repeat(51) }))).status).toBe(400);
  });

  it("creates a custom list and returns 201", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.create.mockResolvedValueOnce({
      id: "l1", type: "CUSTOM", name: "My RPGs", isPublic: false,
    });
    const res = await POST(postReq({ name: "My RPGs" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ type: "CUSTOM", name: "My RPGs" });
  });

  it("returns 409 when list name already exists", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.create.mockRejectedValueOnce({ code: "P2002" });
    const res = await POST(postReq({ name: "My RPGs" }));
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/user/lists/route.test.ts
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Implement the route**

Create `src/app/api/user/lists/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import type { GameListType } from "@/generated/prisma/client";

const STATUS_LIST_CONFIGS: { type: GameListType; name: string }[] = [
  { type: "PLAYING", name: "Playing" },
  { type: "COMPLETED", name: "Completed" },
  { type: "BACKLOG", name: "Backlog" },
  { type: "WISHLIST", name: "Wishlist" },
];

async function ensureStatusLists(userId: string) {
  await Promise.all(
    STATUS_LIST_CONFIGS.map(({ type, name }) =>
      prisma.gameList.upsert({
        where: { userId_type_name: { userId, type, name } },
        create: { userId, type, name, isPublic: true },
        update: {},
      })
    )
  );
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user.id;
  await ensureStatusLists(userId);

  const gameId = request.nextUrl.searchParams.get("gameId") ?? undefined;

  const lists = await prisma.gameList.findMany({
    where: { userId },
    include: { _count: { select: { entries: true } } },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  if (!gameId) return NextResponse.json(lists);

  const entriesWithGame = await prisma.gameListEntry.findMany({
    where: { gameId, list: { userId } },
    select: { listId: true },
  });
  const listIdsWithGame = new Set(entriesWithGame.map((e) => e.listId));

  return NextResponse.json(lists.map((l) => ({ ...l, hasGame: listIdsWithGame.has(l.id) })));
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const list = await prisma.gameList.create({
      data: {
        userId: session!.user.id,
        type: "CUSTOM",
        name: parsed.data.name,
        isPublic: false,
      },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "A list with that name already exists" }, { status: 409 });
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/app/api/user/lists/route.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/lists/
git commit -m "feat: add GET/POST /api/user/lists"
```

---

### Task 4: API — PATCH/DELETE /api/user/lists/[id]

**Files:**
- Create: `src/app/api/user/lists/[id]/route.ts`
- Create: `src/app/api/user/lists/[id]/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/user/lists/[id]/route.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGameList = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { gameList: mockGameList } }));

import { PATCH, DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };

type Params = { params: Promise<{ id: string }> };
const params = (id: string): Params => ({ params: Promise.resolve({ id }) });

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/lists/l1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function deleteReq() {
  return new NextRequest("http://localhost/api/user/lists/l1", { method: "DELETE" });
}

describe("PATCH /api/user/lists/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await PATCH(patchReq({ name: "New Name" }), params("l1"))).status).toBe(401);
  });

  it("returns 404 when list not found or not owned", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce(null);
    expect((await PATCH(patchReq({ name: "New Name" }), params("l1"))).status).toBe(404);
  });

  it("returns 400 when trying to rename a status list", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "PLAYING", userId: "u1" });
    expect((await PATCH(patchReq({ name: "Renamed" }), params("l1"))).status).toBe(400);
  });

  it("renames a custom list and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "CUSTOM", userId: "u1" });
    mockGameList.update.mockResolvedValueOnce({ id: "l1", name: "New Name", type: "CUSTOM", isPublic: false });
    const res = await PATCH(patchReq({ name: "New Name" }), params("l1"));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("New Name");
  });

  it("toggles isPublic on any list type and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "PLAYING", userId: "u1" });
    mockGameList.update.mockResolvedValueOnce({ id: "l1", type: "PLAYING", name: "Playing", isPublic: false });
    const res = await PATCH(patchReq({ isPublic: false }), params("l1"));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/user/lists/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await DELETE(deleteReq(), params("l1"))).status).toBe(401);
  });

  it("returns 404 when list not found", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce(null);
    expect((await DELETE(deleteReq(), params("l1"))).status).toBe(404);
  });

  it("returns 400 when trying to delete a status list", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "WISHLIST", userId: "u1" });
    expect((await DELETE(deleteReq(), params("l1"))).status).toBe(400);
  });

  it("deletes a custom list and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "CUSTOM", userId: "u1" });
    mockGameList.delete.mockResolvedValueOnce({});
    const res = await DELETE(deleteReq(), params("l1"));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run "src/app/api/user/lists/[id]/route.test.ts"
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Implement the route**

Create `src/app/api/user/lists/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const list = await prisma.gameList.findFirst({ where: { id, userId: session!.user.id } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  if (parsed.data.name !== undefined && list.type !== "CUSTOM") {
    return NextResponse.json({ error: "Cannot rename status lists" }, { status: 400 });
  }

  const updated = await prisma.gameList.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  const list = await prisma.gameList.findFirst({ where: { id, userId: session!.user.id } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  if (list.type !== "CUSTOM") {
    return NextResponse.json({ error: "Cannot delete status lists" }, { status: 400 });
  }

  await prisma.gameList.delete({ where: { id } });
  return NextResponse.json({ message: "List deleted" });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run "src/app/api/user/lists/[id]/route.test.ts"
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/user/lists/[id]/"
git commit -m "feat: add PATCH/DELETE /api/user/lists/[id]"
```

---

### Task 5: API — entries endpoints + public lists

**Files:**
- Create: `src/app/api/user/lists/[id]/entries/route.ts`
- Create: `src/app/api/user/lists/[id]/entries/route.test.ts`
- Create: `src/app/api/user/lists/[id]/entries/[gameId]/route.ts`
- Create: `src/app/api/user/lists/[id]/entries/[gameId]/route.test.ts`
- Create: `src/app/api/users/[id]/lists/route.ts`
- Create: `src/app/api/users/[id]/lists/route.test.ts`

- [ ] **Step 1: Write failing tests for POST entries**

Create `src/app/api/user/lists/[id]/entries/route.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockTx = vi.hoisted(() => ({
  gameList: { findMany: vi.fn() },
  gameListEntry: { deleteMany: vi.fn(), upsert: vi.fn() },
}));

const mockGameList = vi.hoisted(() => ({ findFirst: vi.fn() }));
const mockGame = vi.hoisted(() => ({ findUnique: vi.fn() }));
const mockGameListEntry = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    gameList: mockGameList,
    game: mockGame,
    gameListEntry: mockGameListEntry,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
  },
}));

import { POST } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";

type Params = { params: Promise<{ id: string }> };
const params = (id: string): Params => ({ params: Promise.resolve({ id }) });

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/lists/l1/entries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/lists/[id]/entries", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await POST(postReq({ gameId: GAME_UUID }), params("l1"))).status).toBe(401);
  });

  it("returns 404 when list not found", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce(null);
    expect((await POST(postReq({ gameId: GAME_UUID }), params("l1"))).status).toBe(404);
  });

  it("returns 404 when game not found", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "CUSTOM", userId: "u1" });
    mockGame.findUnique.mockResolvedValueOnce(null);
    expect((await POST(postReq({ gameId: GAME_UUID }), params("l1"))).status).toBe(404);
  });

  it("adds game to a custom list without using $transaction", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "CUSTOM", userId: "u1" });
    mockGame.findUnique.mockResolvedValueOnce({ id: GAME_UUID });
    mockGameListEntry.upsert.mockResolvedValueOnce({ listId: "l1", gameId: GAME_UUID });
    const res = await POST(postReq({ gameId: GAME_UUID }), params("l1"));
    expect(res.status).toBe(201);
  });

  it("removes game from other status lists when adding to a status list", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", type: "PLAYING", userId: "u1" });
    mockGame.findUnique.mockResolvedValueOnce({ id: GAME_UUID });
    mockTx.gameList.findMany.mockResolvedValueOnce([{ id: "l2" }]);
    mockTx.gameListEntry.deleteMany.mockResolvedValueOnce({});
    mockTx.gameListEntry.upsert.mockResolvedValueOnce({ listId: "l1", gameId: GAME_UUID });
    const res = await POST(postReq({ gameId: GAME_UUID }), params("l1"));
    expect(res.status).toBe(201);
    expect(mockTx.gameListEntry.deleteMany).toHaveBeenCalledWith({
      where: { listId: { in: ["l2"] }, gameId: GAME_UUID },
    });
  });
});
```

- [ ] **Step 2: Write failing tests for DELETE entries**

Create `src/app/api/user/lists/[id]/entries/[gameId]/route.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockGameList = vi.hoisted(() => ({ findFirst: vi.fn() }));
const mockGameListEntry = vi.hoisted(() => ({ deleteMany: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { gameList: mockGameList, gameListEntry: mockGameListEntry },
}));

import { DELETE } from "./route";

afterEach(() => vi.clearAllMocks());

const session = { user: { id: "u1", role: "user", isBanned: false, emailVerified: new Date() } };
const GAME_UUID = "550e8400-e29b-41d4-a716-446655440000";

type Params = { params: Promise<{ id: string; gameId: string }> };
const params = (id: string, gameId: string): Params => ({
  params: Promise.resolve({ id, gameId }),
});
function deleteReq() {
  return new NextRequest(`http://localhost/api/user/lists/l1/entries/${GAME_UUID}`, { method: "DELETE" });
}

describe("DELETE /api/user/lists/[id]/entries/[gameId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await DELETE(deleteReq(), params("l1", GAME_UUID))).status).toBe(401);
  });

  it("returns 404 when list not found or not owned", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce(null);
    expect((await DELETE(deleteReq(), params("l1", GAME_UUID))).status).toBe(404);
  });

  it("removes entry and returns 200", async () => {
    mockAuth.mockResolvedValueOnce(session);
    mockGameList.findFirst.mockResolvedValueOnce({ id: "l1", userId: "u1" });
    mockGameListEntry.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await DELETE(deleteReq(), params("l1", GAME_UUID));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Write failing tests for public lists**

Create `src/app/api/users/[id]/lists/route.test.ts`:

```ts
import { vi, describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGameList = vi.hoisted(() => ({ findMany: vi.fn() }));
const mockUser = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { gameList: mockGameList, user: mockUser } }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

type Params = { params: Promise<{ id: string }> };
const params = (id: string): Params => ({ params: Promise.resolve({ id }) });
function getReq() {
  return new NextRequest("http://localhost/api/users/u1/lists");
}

describe("GET /api/users/[id]/lists", () => {
  it("returns 404 when user not found", async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    expect((await GET(getReq(), params("u1"))).status).toBe(404);
  });

  it("returns only public lists with entry thumbnails", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ id: "u1" });
    mockGameList.findMany.mockResolvedValueOnce([
      {
        id: "l1", name: "Playing", type: "PLAYING", isPublic: true,
        _count: { entries: 2 },
        entries: [{ game: { id: "g1", title: "Game 1", coverImageUrl: null, slug: "game-1" } }],
      },
    ]);
    const res = await GET(getReq(), params("u1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Playing");
  });
});
```

- [ ] **Step 4: Run tests to confirm they all fail**

```bash
npx vitest run "src/app/api/user/lists/[id]/entries/route.test.ts"
npx vitest run "src/app/api/user/lists/[id]/entries/[gameId]/route.test.ts"
npx vitest run src/app/api/users/[id]/lists/route.test.ts
```

Expected: All FAIL.

- [ ] **Step 5: Implement POST entries route**

Create `src/app/api/user/lists/[id]/entries/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import type { GameListType } from "@/generated/prisma/client";

const STATUS_TYPES: GameListType[] = ["PLAYING", "COMPLETED", "BACKLOG", "WISHLIST"];

type Params = { params: Promise<{ id: string }> };

const addSchema = z.object({ gameId: z.string().uuid() });

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { gameId } = parsed.data;

  const list = await prisma.gameList.findFirst({ where: { id, userId: session!.user.id } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const isStatusList = STATUS_TYPES.includes(list.type);

  if (isStatusList) {
    await prisma.$transaction(async (tx) => {
      const otherStatusLists = await tx.gameList.findMany({
        where: {
          userId: session!.user.id,
          type: { in: STATUS_TYPES.filter((t) => t !== list.type) },
          entries: { some: { gameId } },
        },
        select: { id: true },
      });
      if (otherStatusLists.length > 0) {
        await tx.gameListEntry.deleteMany({
          where: { listId: { in: otherStatusLists.map((l) => l.id) }, gameId },
        });
      }
      await tx.gameListEntry.upsert({
        where: { listId_gameId: { listId: id, gameId } },
        create: { listId: id, gameId },
        update: {},
      });
    });
  } else {
    await prisma.gameListEntry.upsert({
      where: { listId_gameId: { listId: id, gameId } },
      create: { listId: id, gameId },
      update: {},
    });
  }

  return NextResponse.json({ message: "Game added to list" }, { status: 201 });
}
```

- [ ] **Step 6: Implement DELETE entries route**

Create `src/app/api/user/lists/[id]/entries/[gameId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string; gameId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, gameId } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;

  const list = await prisma.gameList.findFirst({ where: { id, userId: session!.user.id } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  await prisma.gameListEntry.deleteMany({ where: { listId: id, gameId } });
  return NextResponse.json({ message: "Game removed from list" });
}
```

- [ ] **Step 7: Implement public lists route**

Create `src/app/api/users/[id]/lists/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const lists = await prisma.gameList.findMany({
    where: { userId: id, isPublic: true },
    include: {
      _count: { select: { entries: true } },
      entries: {
        take: 6,
        include: { game: { select: { id: true, title: true, coverImageUrl: true, slug: true } } },
        orderBy: { addedAt: "desc" },
      },
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(lists);
}
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run "src/app/api/user/lists/[id]/entries/route.test.ts"
npx vitest run "src/app/api/user/lists/[id]/entries/[gameId]/route.test.ts"
npx vitest run src/app/api/users/[id]/lists/route.test.ts
```

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add "src/app/api/user/lists/[id]/entries/" src/app/api/users/[id]/lists/
git commit -m "feat: add entries endpoints and public lists API"
```

---

### Task 6: GameListPopover + AddToListButton (game detail page)

**Files:**
- Create: `src/components/games/GameListPopover.tsx`
- Create: `src/components/games/AddToListButton.tsx`
- Modify: `src/app/(public)/games/[slug]/page.tsx`

- [ ] **Step 1: Install the Popover shadcn component (if not present)**

```bash
npx shadcn@latest add popover
```

Expected: creates `src/components/ui/popover.tsx`. If it already exists, this is a no-op.

- [ ] **Step 2: Implement GameListPopover**

Create `src/components/games/GameListPopover.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Check, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const STATUS_TYPES = ["PLAYING", "COMPLETED", "BACKLOG", "WISHLIST"] as const;
type StatusType = (typeof STATUS_TYPES)[number];

const STATUS_LABELS: Record<StatusType, string> = {
  PLAYING: "Playing",
  COMPLETED: "Completed",
  BACKLOG: "Backlog",
  WISHLIST: "Wishlist",
};

interface GameList {
  id: string;
  type: string;
  name: string;
  isPublic: boolean;
  hasGame: boolean;
  _count: { entries: number };
}

interface GameListPopoverProps {
  gameId: string;
}

export function GameListPopover({ gameId }: GameListPopoverProps) {
  const { data: session } = useSession();
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/user/lists?gameId=${gameId}`)
      .then((r) => r.json())
      .then(setLists)
      .finally(() => setLoading(false));
  }, [gameId, session?.user]);

  if (!session?.user) return null;

  const statusLists = lists.filter((l) => STATUS_TYPES.includes(l.type as StatusType));
  const customLists = lists.filter((l) => l.type === "CUSTOM");

  async function toggleStatus(list: GameList) {
    setPending(list.id);
    try {
      if (list.hasGame) {
        await fetch(`/api/user/lists/${list.id}/entries/${gameId}`, { method: "DELETE" });
        setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, hasGame: false } : l)));
        toast.success(`Removed from ${list.name}`);
      } else {
        await fetch(`/api/user/lists/${list.id}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        });
        // Clear all other status hasGame flags (mutually exclusive)
        setLists((prev) =>
          prev.map((l) =>
            STATUS_TYPES.includes(l.type as StatusType)
              ? { ...l, hasGame: l.id === list.id }
              : l
          )
        );
        toast.success(`Added to ${list.name}`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPending(null);
    }
  }

  async function toggleCustom(list: GameList) {
    setPending(list.id);
    try {
      if (list.hasGame) {
        await fetch(`/api/user/lists/${list.id}/entries/${gameId}`, { method: "DELETE" });
        setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, hasGame: false } : l)));
        toast.success(`Removed from "${list.name}"`);
      } else {
        await fetch(`/api/user/lists/${list.id}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        });
        setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, hasGame: true } : l)));
        toast.success(`Added to "${list.name}"`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPending(null);
    }
  }

  async function createList() {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await fetch("/api/user/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (res.ok) {
        const list = await res.json();
        setLists((prev) => [...prev, { ...list, hasGame: false, _count: { entries: 0 } }]);
        setNewListName("");
        setShowNewInput(false);
        toast.success(`List "${list.name}" created`);
      } else {
        const { error } = await res.json();
        toast.error(error ?? "Could not create list");
      }
    } finally {
      setCreatingList(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-56 p-1 space-y-0.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pt-2 pb-1">
        Status
      </p>
      {STATUS_TYPES.map((type) => {
        const list = statusLists.find((l) => l.type === type);
        const isActive = list?.hasGame ?? false;
        return (
          <button
            key={type}
            onClick={() => list && toggleStatus(list)}
            disabled={pending !== null || !list}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-foreground"
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isActive ? "border-primary bg-primary" : "border-muted-foreground/40"
              }`}
            >
              {isActive && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
            {STATUS_LABELS[type]}
            {pending === list?.id && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
          </button>
        );
      })}

      {customLists.length > 0 && (
        <>
          <Separator className="my-1" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pt-1 pb-1">
            My Lists
          </p>
          {customLists.map((list) => (
            <button
              key={list.id}
              onClick={() => toggleCustom(list)}
              disabled={pending !== null}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left hover:bg-muted"
            >
              <div
                className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  list.hasGame ? "border-primary bg-primary" : "border-muted-foreground/40"
                }`}
              >
                {list.hasGame && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              <span className="truncate flex-1">{list.name}</span>
              {pending === list.id && <Loader2 className="h-3 w-3 animate-spin" />}
            </button>
          ))}
        </>
      )}

      <Separator className="my-1" />
      {showNewInput ? (
        <div className="flex gap-1 px-2 py-1">
          <input
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createList();
              if (e.key === "Escape") setShowNewInput(false);
            }}
            placeholder="List name"
            maxLength={50}
            className="flex-1 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary min-w-0"
          />
          <button
            onClick={createList}
            disabled={creatingList || !newListName.trim()}
            className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
          >
            {creatingList ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewInput(true)}
          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-muted-foreground transition-colors"
        >
          <Plus className="h-4 w-4" /> New list…
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement AddToListButton**

Create `src/components/games/AddToListButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { GameListPopover } from "./GameListPopover";
import Link from "next/link";

interface AddToListButtonProps {
  gameId: string;
}

export function AddToListButton({ gameId }: AddToListButtonProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" className="gap-2" render={<Link href="/login" />}>
        <Bookmark className="h-4 w-4" />
        Add to List
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bookmark className="h-4 w-4" />
          Add to List
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto" align="start">
        {open && <GameListPopover gameId={gameId} />}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Update the game detail page**

In `src/app/(public)/games/[slug]/page.tsx`:

Remove this import:
```ts
import { FavoriteButton } from "@/components/games/FavoriteButton";
```

Add this import in its place:
```ts
import { AddToListButton } from "@/components/games/AddToListButton";
```

Remove the `isFavorited` block (lines that query `prisma.favorite.findUnique`):
```ts
  const isFavorited = session?.user
    ? !!(await prisma.favorite.findUnique({
        where: { userId_gameId: { userId: session.user.id, gameId: game.id } },
      }))
    : false;
```

Replace `<FavoriteButton gameId={game.id} initialFavorited={isFavorited} />` with:
```tsx
<AddToListButton gameId={game.id} />
```

- [ ] **Step 5: Verify lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/games/GameListPopover.tsx src/components/games/AddToListButton.tsx "src/app/(public)/games/[slug]/page.tsx" src/components/ui/popover.tsx
git commit -m "feat: add GameListPopover and AddToListButton on game detail page"
```

---

### Task 7: GameCardListButton

**Files:**
- Create: `src/components/games/GameCardListButton.tsx`
- Modify: `src/components/games/GameCard.tsx`

- [ ] **Step 1: Implement GameCardListButton**

Create `src/components/games/GameCardListButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { GameListPopover } from "./GameListPopover";

interface GameCardListButtonProps {
  gameId: string;
}

export function GameCardListButton({ gameId }: GameCardListButtonProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute top-2.5 left-2.5 z-20 h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Add to list"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-auto"
        align="start"
        side="right"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {open && <GameListPopover gameId={gameId} />}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Update GameCard to include the button and use the id prop**

In `src/components/games/GameCard.tsx`:

Add import at the top (after existing imports):
```tsx
import { GameCardListButton } from "./GameCardListButton";
```

In the destructured function params, add `id` (it's already in `GameCardProps` but not destructured):

Find:
```tsx
export function GameCard({
  title,
  slug,
```

Replace with:
```tsx
export function GameCard({
  id,
  title,
  slug,
```

Find the rank badge block:
```tsx
            {/* Rank */}
            {rank !== undefined && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="font-mono text-xs font-bold bg-black/70 backdrop-blur-sm text-white/80 rounded-full px-2 py-0.5">
                  #{rank}
                </span>
              </div>
            )}
```

Replace with:
```tsx
            {/* Rank or list button */}
            {rank !== undefined ? (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="font-mono text-xs font-bold bg-black/70 backdrop-blur-sm text-white/80 rounded-full px-2 py-0.5">
                  #{rank}
                </span>
              </div>
            ) : (
              <GameCardListButton gameId={id} />
            )}
```

- [ ] **Step 3: Verify lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/games/GameCardListButton.tsx src/components/games/GameCard.tsx
git commit -m "feat: add list quick-add button to game cards"
```

---

### Task 8: Profile Lists tab + list detail page

**Files:**
- Modify: `src/app/(user)/profile/page.tsx`
- Modify: `src/app/(public)/profile/[username]/page.tsx`
- Create: `src/app/(public)/profile/[username]/lists/[id]/page.tsx`
- Create: `src/components/games/DeleteListButton.tsx`

- [ ] **Step 1: Update the owner profile page**

In `src/app/(user)/profile/page.tsx`:

Replace the `prisma.favorite.findMany(...)` call in `Promise.all` with:
```ts
    prisma.gameList.findMany({
      where: { userId },
      include: {
        _count: { select: { entries: true } },
        entries: {
          take: 6,
          include: { game: { select: { id: true, title: true, coverImageUrl: true, slug: true } } },
          orderBy: { addedAt: "desc" },
        },
      },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
```

Rename the destructured variable from `favorites` to `gameLists` in the `Promise.all` result.

In the stats row, replace the `Heart`/`Favorites` stat entry:
```tsx
{ icon: Heart, label: "Favorites", value: favorites.length, color: "text-red-500" },
```
with:
```tsx
{ icon: Bookmark, label: "Lists", value: gameLists.length, color: "text-primary" },
```

Replace the entire "Favorite Games" section (from `{/* Favorite Games */}` to its closing `</section>`) with:

```tsx
      {/* Game Lists */}
      <section className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Bookmark className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-none">My Lists</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {gameLists.length} list{gameLists.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {gameLists.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Gamepad2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-sm mb-1">No lists yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Browse games and add them to your lists.
            </p>
            <Button size="sm" render={<Link href="/games" />} className="gap-2">
              <Gamepad2 className="h-4 w-4" /> Browse Games
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gameLists.map((list) => (
              <Link
                key={list.id}
                href={`/profile/${userRecord?.username ?? ""}/lists/${list.id}`}
                className="group flex flex-col gap-2 p-3 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                    {list.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {list._count.entries} game{list._count.entries !== 1 ? "s" : ""}
                    </span>
                    {!list.isPublic && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Private
                      </span>
                    )}
                  </div>
                </div>
                {list.entries.length > 0 && (
                  <div className="flex gap-1">
                    {list.entries.map(({ game }) => (
                      <div
                        key={game.id}
                        className="h-10 w-7 rounded bg-muted overflow-hidden shrink-0"
                      >
                        {game.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={game.coverImageUrl}
                            alt={game.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px]">
                            🎮
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
```

Update the lucide-react import: add `Bookmark`, remove `Heart` (if unused elsewhere in the file).

- [ ] **Step 2: Update the public profile page**

In `src/app/(public)/profile/[username]/page.tsx`:

Add `gameLists` to the user `select` in `prisma.user.findFirst`:
```ts
      gameLists: {
        where: { isPublic: true },
        include: {
          _count: { select: { entries: true } },
          entries: {
            take: 6,
            include: { game: { select: { id: true, title: true, coverImageUrl: true, slug: true } } },
            orderBy: { addedAt: "desc" },
          },
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
```

Add a "Lists" section before the "Forum Activity" section, using the same list card grid as the owner profile (reference the markup from Step 1, using `user.gameLists` instead of `gameLists`). Links go to `/profile/${user.username}/lists/${list.id}`.

Update the stats row to include list count: replace the second stat with:
```tsx
{ icon: Bookmark, label: "Lists", value: user.gameLists.length, color: "text-primary" },
```

Add `Bookmark` to lucide-react imports.

- [ ] **Step 3: Create the DeleteListButton client component**

Create `src/components/games/DeleteListButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DeleteListButtonProps {
  listId: string;
  username: string;
}

export function DeleteListButton({ listId, username }: DeleteListButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this list? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/lists/${listId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("List deleted");
        router.push(`/profile/${username}`);
      } else {
        const { error } = await res.json();
        toast.error(error ?? "Could not delete list");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="gap-2 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Delete List
    </Button>
  );
}
```

- [ ] **Step 4: Create the list detail page**

Create `src/app/(public)/profile/[username]/lists/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { GameCard } from "@/components/games/GameCard";
import { DeleteListButton } from "@/components/games/DeleteListButton";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ username: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, id } = await params;
  const list = await prisma.gameList.findFirst({
    where: {
      id,
      user: { username: { equals: decodeURIComponent(username), mode: "insensitive" } },
    },
    select: { name: true },
  });
  if (!list) return { title: "List Not Found" };
  return { title: `${list.name} — ${decodeURIComponent(username)}'s List` };
}

export default async function ListDetailPage({ params }: PageProps) {
  const { username, id } = await params;
  const session = await auth();

  const list = await prisma.gameList.findFirst({
    where: {
      id,
      user: { username: { equals: decodeURIComponent(username), mode: "insensitive" } },
    },
    include: {
      user: { select: { id: true, username: true } },
      entries: {
        include: {
          game: {
            include: { gameGenres: { include: { genre: true } } },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) notFound();

  const isOwner = session?.user?.id === list.user.id;
  if (!list.isPublic && !isOwner) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shrink-0">
            <Bookmark className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{list.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <Link
                href={`/profile/${list.user.username}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {list.user.username}
              </Link>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                {list.isPublic ? (
                  <><Globe className="h-3 w-3" /> Public</>
                ) : (
                  <><Lock className="h-3 w-3" /> Private</>
                )}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {list.entries.length} game{list.entries.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {isOwner && list.type === "CUSTOM" && (
          <DeleteListButton listId={list.id} username={list.user.username} />
        )}
      </div>

      {/* Games grid */}
      {list.entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-medium mb-1">No games in this list</p>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwner ? "Browse games and add them to this list." : "This list is empty."}
          </p>
          {isOwner && (
            <Button size="sm" render={<Link href="/games" />} className="gap-2">
              Browse Games
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {list.entries.map(({ game }) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              slug={game.slug}
              coverImageUrl={game.coverImageUrl}
              avgRating={game.avgRating}
              reviewCount={game.reviewCount}
              releaseYear={game.releaseYear}
              releaseStatus={game.releaseStatus}
              qualityTier={game.qualityTier}
              gameGenres={game.gameGenres}
              purchaseLinks={game.purchaseLinks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(user)/profile/" "src/app/(public)/profile/" src/components/games/DeleteListButton.tsx
git commit -m "feat: add Lists tab to profile pages and list detail page"
```

---

## Self-Review

**Spec coverage:**
- ✅ Data model (Task 1)
- ✅ Favorites migration (Task 2)
- ✅ GET/POST /api/user/lists (Task 3)
- ✅ PATCH/DELETE /api/user/lists/[id] (Task 4)
- ✅ POST/DELETE entries, GET public lists (Task 5)
- ✅ Status list mutual exclusivity via `$transaction` (Task 5)
- ✅ Game detail AddToListButton (Task 6)
- ✅ Game card quick-add overlay (Task 7)
- ✅ Profile Lists tab — owner (Task 8)
- ✅ Profile Lists tab — public (Task 8)
- ✅ List detail page with delete (Task 8)
- ✅ Favorites API routes deleted (Task 2)
- ✅ FavoriteButton deleted (Task 2)

**No placeholders or TBDs present.**

**Type consistency:**
- `GameListType` from `@/generated/prisma/client` — used in Tasks 1, 3, 5
- `STATUS_TYPES` constant defined independently in `route.ts` (Task 5) and `GameListPopover.tsx` (Task 6) — acceptable; different modules with different purposes
- `listId_gameId` compound key — matches `@@id([listId, gameId])` definition from Task 1
- `userId_type_name` compound unique — matches `@@unique([userId, type, name])` from Task 1
- `hasGame: boolean` field — returned by GET lists when `?gameId=` param present; consumed by `GameListPopover`
