import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  return prisma.$transaction(async (tx) => {
    const count = await tx.rateLimitLog.count({
      where: { identifier, action, createdAt: { gte: windowStart } },
    });

    if (count >= limit) {
      return { allowed: false, retryAfterSeconds: windowSeconds };
    }

    await tx.rateLimitLog.create({ data: { identifier, action } });
    return { allowed: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cleanupRateLimitLogs(olderThanHours = 24) {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  await prisma.rateLimitLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}
