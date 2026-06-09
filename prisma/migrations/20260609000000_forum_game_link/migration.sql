ALTER TABLE "forum_threads" ADD COLUMN "gameId" TEXT;

ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "forum_threads_gameId_idx" ON "forum_threads"("gameId");
