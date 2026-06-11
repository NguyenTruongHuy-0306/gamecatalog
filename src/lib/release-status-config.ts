import type { ReleaseStatus } from "@/generated/prisma/client";

export function computeReleaseStatus(releaseYear: number): ReleaseStatus {
  const currentYear = new Date().getFullYear();
  if (releaseYear > currentYear) return "upcoming";
  if (releaseYear <= currentYear - 10) return "classic";
  return "released";
}

export const STATUS_LABELS: Record<ReleaseStatus, string> = {
  upcoming: "Upcoming",
  released: "Released",
  classic: "Classic",
};

export const STATUS_COLORS: Record<ReleaseStatus, string> = {
  upcoming: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
  released: "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400",
  classic: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
};
