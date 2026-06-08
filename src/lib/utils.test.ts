import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("last tailwind utility wins on conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "excluded", "included")).toBe("base included");
  });

  it("ignores undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("merges object-style conditionals", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });
});
