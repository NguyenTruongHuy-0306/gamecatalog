import { describe, it, expect } from "vitest";
import { computeReleaseStatus, STATUS_LABELS, STATUS_COLORS } from "./release-status-config";

describe("computeReleaseStatus", () => {
  const currentYear = new Date().getFullYear();

  it("returns 'upcoming' for a future year", () => {
    expect(computeReleaseStatus(currentYear + 1)).toBe("upcoming");
    expect(computeReleaseStatus(currentYear + 5)).toBe("upcoming");
  });

  it("returns 'classic' for a year exactly 10 years in the past", () => {
    expect(computeReleaseStatus(currentYear - 10)).toBe("classic");
  });

  it("returns 'classic' for a year more than 10 years ago", () => {
    expect(computeReleaseStatus(currentYear - 20)).toBe("classic");
    expect(computeReleaseStatus(2000)).toBe("classic");
  });

  it("returns 'released' for the current year", () => {
    expect(computeReleaseStatus(currentYear)).toBe("released");
  });

  it("returns 'released' for 1–9 years in the past", () => {
    expect(computeReleaseStatus(currentYear - 1)).toBe("released");
    expect(computeReleaseStatus(currentYear - 9)).toBe("released");
  });
});

describe("STATUS_LABELS", () => {
  it("has a label for every status", () => {
    expect(STATUS_LABELS.upcoming).toBe("Upcoming");
    expect(STATUS_LABELS.released).toBe("Released");
    expect(STATUS_LABELS.classic).toBe("Classic");
  });
});

describe("STATUS_COLORS", () => {
  it("has a non-empty color string for every status", () => {
    expect(STATUS_COLORS.upcoming.length).toBeGreaterThan(0);
    expect(STATUS_COLORS.released.length).toBeGreaterThan(0);
    expect(STATUS_COLORS.classic.length).toBeGreaterThan(0);
  });
});
