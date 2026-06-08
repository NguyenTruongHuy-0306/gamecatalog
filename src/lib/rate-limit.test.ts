import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/generated/prisma/client", () => ({
  Prisma: {
    TransactionIsolationLevel: { ReadCommitted: "ReadCommitted" },
  },
}));

const mockTx = {
  rateLimitLog: {
    count: vi.fn(),
    create: vi.fn(),
  },
};
const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  rateLimitLog: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { checkRateLimit, cleanupRateLimitLogs } from "./rate-limit";

afterEach(() => vi.clearAllMocks());

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => unknown) => cb(mockTx)
    );
  });

  it("allows the request when the count is below the limit", async () => {
    mockTx.rateLimitLog.count.mockResolvedValue(2);
    mockTx.rateLimitLog.create.mockResolvedValue({});
    const result = await checkRateLimit("ip:1.2.3.4", "signup", 10, 3600);
    expect(result.allowed).toBe(true);
    expect(mockTx.rateLimitLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { identifier: "ip:1.2.3.4", action: "signup" } })
    );
  });

  it("blocks the request when the count equals the limit", async () => {
    mockTx.rateLimitLog.count.mockResolvedValue(10);
    const result = await checkRateLimit("ip:1.2.3.4", "signup", 10, 3600);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(3600);
    expect(mockTx.rateLimitLog.create).not.toHaveBeenCalled();
  });

  it("blocks the request when the count exceeds the limit", async () => {
    mockTx.rateLimitLog.count.mockResolvedValue(15);
    const result = await checkRateLimit("ip:1.2.3.4", "login", 10, 300);
    expect(result.allowed).toBe(false);
  });

  it("counts only logs within the time window for the given identifier and action", async () => {
    mockTx.rateLimitLog.count.mockResolvedValue(0);
    mockTx.rateLimitLog.create.mockResolvedValue({});
    await checkRateLimit("user:abc", "review_submit", 3, 3600);
    expect(mockTx.rateLimitLog.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ identifier: "user:abc", action: "review_submit" }),
      })
    );
  });
});

describe("cleanupRateLimitLogs", () => {
  it("deletes records older than the specified hours", async () => {
    mockPrisma.rateLimitLog.deleteMany.mockResolvedValue({ count: 5 });
    await cleanupRateLimitLogs(24);
    expect(mockPrisma.rateLimitLog.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdAt: expect.any(Object) }) })
    );
  });

  it("defaults to 24 hours when no argument is given", async () => {
    mockPrisma.rateLimitLog.deleteMany.mockResolvedValue({ count: 0 });
    await cleanupRateLimitLogs();
    expect(mockPrisma.rateLimitLog.deleteMany).toHaveBeenCalledOnce();
  });
});
