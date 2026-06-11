import { prisma } from "@/lib/db";
export { computeReleaseStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/release-status-config";
import { computeReleaseStatus } from "@/lib/release-status-config";

export async function updateAllReleaseStatuses(): Promise<number> {
  const games = await prisma.game.findMany({
    select: { id: true, releaseYear: true, releaseStatus: true },
  });

  const stale = games.filter(
    (g) => computeReleaseStatus(g.releaseYear) !== g.releaseStatus
  );

  if (stale.length === 0) return 0;

  await Promise.all(
    stale.map((g) =>
      prisma.game.update({
        where: { id: g.id },
        data: { releaseStatus: computeReleaseStatus(g.releaseYear) },
      })
    )
  );

  return stale.length;
}
