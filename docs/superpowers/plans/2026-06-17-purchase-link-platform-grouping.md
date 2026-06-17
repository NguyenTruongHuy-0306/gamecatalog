# Purchase Link Platform Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the "Where to Buy" store links by platform (PC / Console / Nintendo / Other) on the game detail page.

**Architecture:** Add a `STORE_PLATFORM` lookup table and `groupPurchaseLinks` helper directly in the game detail page file. Replace the flat `.map()` in the "Where to Buy" card with a two-level render: one section per platform, each containing its store links. No data model, API, or sync changes.

**Tech Stack:** Next.js 16 App Router, React 19 (Server Component), TypeScript, Tailwind 4

## Global Constraints

- One file changes: `src/app/(public)/games/[slug]/page.tsx`
- No new dependencies
- Platform order is always: PC → Console → Nintendo → Other
- Sections with zero links for a game are not rendered

---

### Task 1: Group purchase links by platform in the "Where to Buy" card

**Files:**
- Modify: `src/app/(public)/games/[slug]/page.tsx:215-235`

**Interfaces:**
- Produces: `groupPurchaseLinks(links: { store: string; url: string }[]) => { platform: string; links: { store: string; url: string }[] }[]`

- [ ] **Step 1: Add the platform mapping and helper above the page component**

Open `src/app/(public)/games/[slug]/page.tsx`. Find the line that reads `interface PageProps` (near the top of the file, after the imports). Insert the following block immediately before it:

```ts
const STORE_PLATFORM: Record<string, string> = {
  "Steam": "PC",
  "Epic Games": "PC",
  "GOG": "PC",
  "EA App": "PC",
  "Battle.net": "PC",
  "Humble Bundle": "PC",
  "PlayStation Store": "Console",
  "Xbox": "Console",
  "Nintendo eShop": "Nintendo",
};

const PLATFORM_ORDER = ["PC", "Console", "Nintendo", "Other"];

function groupPurchaseLinks(links: { store: string; url: string }[]) {
  const groups = new Map<string, { store: string; url: string }[]>();
  for (const link of links) {
    const platform = STORE_PLATFORM[link.store] ?? "Other";
    if (!groups.has(platform)) groups.set(platform, []);
    groups.get(platform)!.push(link);
  }
  return PLATFORM_ORDER
    .filter((p) => groups.has(p))
    .map((platform) => ({ platform, links: groups.get(platform)! }));
}
```

- [ ] **Step 2: Replace the "Where to Buy" card JSX**

Find and replace the entire `{/* Where to buy card */}` block (lines 214–235, from the opening comment through the closing `)}`) with:

```tsx
{/* Where to buy card */}
{Array.isArray(game.purchaseLinks) && game.purchaseLinks.length > 0 && (
  <div className="rounded-2xl border bg-card p-4 space-y-3">
    <h3 className="font-semibold text-sm flex items-center gap-2">
      <ShoppingCart className="h-4 w-4 text-primary" /> Where to Buy
    </h3>
    <div className="space-y-4">
      {groupPurchaseLinks(game.purchaseLinks as { store: string; url: string }[]).map(
        ({ platform, links }) => (
          <div key={platform}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {platform}
            </p>
            <div className="space-y-2">
              {links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full rounded-lg border bg-muted/30 hover:bg-muted/60 px-3 py-2 text-sm font-medium transition-colors group"
                >
                  <span>{link.store}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Run the dev server and verify**

```bash
npm run dev
```

Open a game page that has purchase links (add some manually via `/admin` if none exist yet). Confirm:
- Links with different platforms appear under separate labelled headings (e.g. "PC", "Console")
- Platform labels are uppercase, muted, small
- A game with only PC links shows only a "PC" section — no empty "Console" or "Nintendo" headings
- A game with no purchase links shows no "Where to Buy" card at all (unchanged)
- Clicking a link opens the store URL in a new tab

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/games/[slug]/page.tsx"
git commit -m "feat: group purchase links by platform in Where to Buy card"
```
