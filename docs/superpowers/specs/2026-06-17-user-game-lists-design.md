# User Game Lists — Design Spec

**Date:** 2026-06-17  
**Status:** Approved

## Summary

Replace the existing `Favorite` model with a full game lists system. Users get four fixed status lists (Playing, Completed, Backlog, Wishlist) plus the ability to create unlimited custom named lists. Status lists are mutually exclusive per game; custom lists are additive. Each list has a public/private toggle.

---

## Data Model

Two new Prisma models replace `Favorite`:

```prisma
enum GameListType {
  PLAYING
  COMPLETED
  BACKLOG
  WISHLIST
  CUSTOM
}

model GameList {
  id        String       @id @default(uuid())
  userId    String
  type      GameListType
  name      String       // preset: "Playing" etc; custom: user-defined
  isPublic  Boolean      @default(true)  // CUSTOM defaults to false
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

- Status lists are lazy-created on first use (no seeding required per user).
- Mutual exclusivity of status lists is enforced at the API layer: adding a game to a status list atomically removes it from all other status lists for that user.
- Custom lists default `isPublic: false`; status lists default `isPublic: true`.
- The `@@unique([userId, type, name])` constraint prevents duplicate custom list names per user.

---

## API Routes

All routes live under `src/app/api/`. Auth guards follow existing helpers in `src/lib/api-helpers.ts`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/user/lists` | `requireAuth()` | Get all lists for current user with entry counts |
| `POST` | `/api/user/lists` | `requireAuth()` | Create a custom list |
| `PATCH` | `/api/user/lists/[id]` | `requireAuth()` + ownership check | Rename or toggle `isPublic` |
| `DELETE` | `/api/user/lists/[id]` | `requireAuth()` + ownership check | Delete a custom list (status lists blocked) |
| `POST` | `/api/user/lists/[id]/entries` | `requireAuth()` | Add a game; if status list, remove from other status lists atomically |
| `DELETE` | `/api/user/lists/[id]/entries/[gameId]` | `requireAuth()` | Remove a game from a list |
| `GET` | `/api/users/[id]/lists` | public | Get public lists for any user (filters `isPublic: true`) |

`/api/user/favorites` and `/api/user/favorites/[gameId]` are removed in the same PR.

---

## UI Components

### Game card quick-add button
A small icon button (bookmark/list icon) on each game card. Opens a popover with:
- 4 status options as radio-style buttons (mutually exclusive; clicking active one deselects)
- Separator, then all custom lists as checkboxes
- "New list…" inline input at the bottom to create a custom list on the fly

### Game detail page
The existing favorite heart button is replaced by a more prominent "Add to list" button that opens the same popover in a larger format, showing entry counts per list.

### Profile page — Lists tab
A new "Lists" tab on `/profile` (owner) and `/profile/[username]` (public lists only for visitors). Each list card shows:
- Name, game count, public/private badge
- Grid of first 4–6 cover thumbnails
- Clicking navigates to the full list detail page

### List detail page — `/profile/[username]/lists/[id]`
Full game grid using the same card style as `/games`. For the list owner:
- Edit list name
- Toggle public/private
- Remove individual games
- Delete the entire list (custom lists only)

---

## Migration

A migration script runs as part of the normal `prisma migrate deploy` on next production deploy:

1. For each user with at least one `Favorite`, create a `GameList` row `{ type: WISHLIST, name: "Wishlist", isPublic: true }`.
2. Insert a `GameListEntry` for each existing `Favorite` row into that list.
3. Drop the `Favorite` table via a Prisma migration file.

No manual production step required. No backwards-compatibility shim — all internal consumers are updated in the same PR.

---

## Out of Scope

- Sharing or embedding lists externally
- Following other users or social feeds (separate future feature)
- Sorting / reordering entries within a list
- List descriptions or cover images
