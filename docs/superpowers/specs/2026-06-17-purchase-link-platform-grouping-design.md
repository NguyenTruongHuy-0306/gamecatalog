# Design: Purchase Link Platform Grouping

**Date:** 2026-06-17
**Status:** Approved

## Problem

The "Where to Buy" card on game detail pages shows all store links as a flat list with no indication of which platform each store belongs to. A user looking for a PC purchase has to scan through console links to find what they need.

## Goal

Group the existing purchase links by platform under labelled headings so users can immediately find links relevant to their platform.

## Scope

Display-only change. No data model, admin form, API validation, or IGDB sync code is touched. The `purchaseLinks` JSON shape stays as `{ store: string; url: string }[]`.

## Platform Mapping

Hardcoded in the component. Store names map to platform labels as follows:

| Platform label | Stores |
|---|---|
| PC | Steam, Epic Games, GOG, EA App, Battle.net, Humble Bundle |
| Console | PlayStation Store, Xbox |
| Nintendo | Nintendo eShop |
| Other | any store not in the above lists |

## Display Behaviour

- Platform sections appear in fixed order: PC → Console → Nintendo → Other.
- A section is rendered only when at least one link in that game's `purchaseLinks` belongs to it.
- Within each section, links are rendered in the same order they appear in `purchaseLinks`.
- The "Other" section label is "Other" — not the store name.

## File Changed

- `src/app/(public)/games/[slug]/page.tsx` — replace the flat `.map()` inside the "Where to Buy" card with a platform-grouped render.

## Out of Scope

- Adding a platform field to the data model
- Changing the admin form or API
- Changing the IGDB sync
- Showing platform grouping on game cards or any other page
