/*
  Warnings:

  - Added the required column `position` to the `QueueItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QueueItem" ADD COLUMN     "currentIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "position" INTEGER NOT NULL;
