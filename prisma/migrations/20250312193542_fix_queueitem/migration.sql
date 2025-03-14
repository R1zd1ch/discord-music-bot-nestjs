-- DropForeignKey
ALTER TABLE "QueueItem" DROP CONSTRAINT "QueueItem_trackId_fkey";

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("trackId") ON DELETE SET NULL ON UPDATE CASCADE;
