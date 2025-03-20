/*
  Warnings:

  - A unique constraint covering the columns `[playlistId,trackId]` on the table `PlaylistTrack` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_trackId_key" ON "PlaylistTrack"("playlistId", "trackId");
