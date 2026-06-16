import { vi, describe, it, expect, afterEach } from "vitest";

const mockGame = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/db", () => ({ prisma: { game: mockGame } }));

import { updateAllReleaseStatuses } from "./release-status";

afterEach(() => vi.clearAllMocks());

describe("updateAllReleaseStatuses", () => {
  const currentYear = new Date().getFullYear();

  it("returns 0 and skips DB updates when no games exist", async () => {
    mockGame.findMany.mockResolvedValueOnce([]);
    expect(await updateAllReleaseStatuses()).toBe(0);
    expect(mockGame.update).not.toHaveBeenCalled();
  });

  it("returns 0 when all games already have the correct status", async () => {
    mockGame.findMany.mockResolvedValueOnce([
      { id: "g1", releaseYear: currentYear + 2, releaseStatus: "upcoming" },
      { id: "g2", releaseYear: currentYear, releaseStatus: "released" },
      { id: "g3", releaseYear: currentYear - 15, releaseStatus: "classic" },
    ]);
    expect(await updateAllReleaseStatuses()).toBe(0);
    expect(mockGame.update).not.toHaveBeenCalled();
  });

  it("updates a stale game whose status has drifted", async () => {
    mockGame.findMany.mockResolvedValueOnce([
      { id: "g1", releaseYear: currentYear - 15, releaseStatus: "released" }, // stale → classic
    ]);
    const count = await updateAllReleaseStatuses();
    expect(count).toBe(1);
    expect(mockGame.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "g1" }, data: { releaseStatus: "classic" } })
    );
  });

  it("updates all stale games and returns correct count", async () => {
    mockGame.findMany.mockResolvedValueOnce([
      { id: "g1", releaseYear: currentYear - 15, releaseStatus: "released" }, // → classic
      { id: "g2", releaseYear: currentYear + 3, releaseStatus: "released" },  // → upcoming
      { id: "g3", releaseYear: currentYear, releaseStatus: "classic" },       // → released
    ]);
    const count = await updateAllReleaseStatuses();
    expect(count).toBe(3);
    expect(mockGame.update).toHaveBeenCalledTimes(3);
  });

  it("only updates games whose status actually changed, not correct ones", async () => {
    mockGame.findMany.mockResolvedValueOnce([
      { id: "g1", releaseYear: currentYear, releaseStatus: "released" },       // correct
      { id: "g2", releaseYear: currentYear - 15, releaseStatus: "released" }, // stale
    ]);
    const count = await updateAllReleaseStatuses();
    expect(count).toBe(1);
    expect(mockGame.update).toHaveBeenCalledOnce();
    expect(mockGame.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "g2" } })
    );
  });
});
