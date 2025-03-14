-- CreateEnum
CREATE TYPE "LoopMode" AS ENUM ('NONE', 'TRACK', 'PLAYLIST', 'QUEUE');

-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "isShuffled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loopMode" "LoopMode" NOT NULL DEFAULT 'NONE';
