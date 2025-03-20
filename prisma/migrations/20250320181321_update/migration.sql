/*
  Warnings:

  - Added the required column `originalPosition` to the `QueueItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QueueItem" ADD COLUMN     "originalPosition" INTEGER NOT NULL;
