-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('upcoming', 'released', 'classic');

-- AlterTable
ALTER TABLE "games" ADD COLUMN "release_status" "ReleaseStatus" NOT NULL DEFAULT 'released';

-- Populate existing rows based on release_year
UPDATE "games" SET "release_status" =
  CASE
    WHEN "releaseYear" > EXTRACT(YEAR FROM NOW())::INT THEN 'upcoming'::"ReleaseStatus"
    WHEN "releaseYear" <= EXTRACT(YEAR FROM NOW())::INT - 10 THEN 'classic'::"ReleaseStatus"
    ELSE 'released'::"ReleaseStatus"
  END;
