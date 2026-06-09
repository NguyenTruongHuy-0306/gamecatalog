ALTER TABLE "reviews" ADD COLUMN "helpfulCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reviews" ADD COLUMN "notHelpfulCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "review_votes" (
  "userId"    TEXT NOT NULL,
  "reviewId"  TEXT NOT NULL,
  "value"     INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "review_votes_pkey" PRIMARY KEY ("userId", "reviewId")
);

ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");
