-- DropForeignKey
ALTER TABLE "QueueItem" DROP CONSTRAINT "QueueItem_trackId_fkey";

-- AlterTable
ALTER TABLE "QueueItem" ALTER COLUMN "trackId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
