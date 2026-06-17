-- CreateEnum
CREATE TYPE "GameListType" AS ENUM ('PLAYING', 'COMPLETED', 'BACKLOG', 'WISHLIST', 'CUSTOM');

-- CreateTable
CREATE TABLE "game_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GameListType" NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_list_entries" (
    "listId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_list_entries_pkey" PRIMARY KEY ("listId","gameId")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_lists_userId_type_name_key" ON "game_lists"("userId", "type", "name");

-- CreateIndex
CREATE INDEX "game_lists_userId_idx" ON "game_lists"("userId");

-- CreateIndex
CREATE INDEX "game_list_entries_gameId_idx" ON "game_list_entries"("gameId");

-- AddForeignKey
ALTER TABLE "game_lists" ADD CONSTRAINT "game_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_list_entries" ADD CONSTRAINT "game_list_entries_listId_fkey" FOREIGN KEY ("listId") REFERENCES "game_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_list_entries" ADD CONSTRAINT "game_list_entries_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
