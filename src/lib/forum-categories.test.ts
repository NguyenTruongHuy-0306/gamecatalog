import { describe, it, expect } from "vitest";
import { FORUM_CATEGORIES, getCategoryBySlug, CATEGORY_SLUGS } from "./forum-categories";

describe("FORUM_CATEGORIES", () => {
  it("is a non-empty array", () => {
    expect(FORUM_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("each entry has slug, label, description, and emoji", () => {
    for (const cat of FORUM_CATEGORIES) {
      expect(typeof cat.slug).toBe("string");
      expect(cat.slug.length).toBeGreaterThan(0);
      expect(typeof cat.label).toBe("string");
      expect(cat.label.length).toBeGreaterThan(0);
      expect(typeof cat.description).toBe("string");
      expect(cat.description.length).toBeGreaterThan(0);
      expect(typeof cat.emoji).toBe("string");
      expect(cat.emoji.length).toBeGreaterThan(0);
    }
  });

  it("contains expected slugs", () => {
    const slugs = FORUM_CATEGORIES.map((c) => c.slug);
    expect(slugs).toContain("general");
    expect(slugs).toContain("tips");
    expect(slugs).toContain("help");
  });

  it("has unique slugs", () => {
    const slugs = FORUM_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("getCategoryBySlug", () => {
  it("returns the matching category", () => {
    const cat = getCategoryBySlug("general");
    expect(cat).toBeDefined();
    expect(cat?.slug).toBe("general");
    expect(cat?.label).toBeTruthy();
  });

  it("returns the first and last categories correctly", () => {
    const first = FORUM_CATEGORIES[0];
    const last = FORUM_CATEGORIES[FORUM_CATEGORIES.length - 1];
    expect(getCategoryBySlug(first.slug)?.slug).toBe(first.slug);
    expect(getCategoryBySlug(last.slug)?.slug).toBe(last.slug);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCategoryBySlug("not-a-real-category")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getCategoryBySlug("")).toBeUndefined();
  });
});

describe("CATEGORY_SLUGS", () => {
  it("matches the slugs in FORUM_CATEGORIES in order", () => {
    expect(CATEGORY_SLUGS).toEqual(FORUM_CATEGORIES.map((c) => c.slug));
  });

  it("has no duplicates", () => {
    expect(new Set(CATEGORY_SLUGS).size).toBe(CATEGORY_SLUGS.length);
  });
});
