-- DropForeignKey
ALTER TABLE "PlaylistTrack" DROP CONSTRAINT "PlaylistTrack_trackId_fkey";

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("trackId") ON DELETE RESTRICT ON UPDATE CASCADE;
