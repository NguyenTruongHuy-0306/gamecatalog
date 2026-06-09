-- AlterTable: add IGDB fields to games
ALTER TABLE "games" ADD COLUMN "igdb_id" INTEGER;
ALTER TABLE "games" ADD COLUMN "locked_fields" TEXT[] NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "games_igdb_id_key" ON "games"("igdb_id");

-- CreateTable: IGDB sync state singleton
CREATE TABLE "igdb_sync_state" (
    "id" INTEGER NOT NULL,
    "last_synced_at" INTEGER NOT NULL DEFAULT 0,
    "access_token" TEXT,
    "token_expires_at" TIMESTAMP(3),

    CONSTRAINT "igdb_sync_state_pkey" PRIMARY KEY ("id")
);
