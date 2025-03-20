/*
  Warnings:

  - Added the required column `originalPosition` to the `PlaylistTrack` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlaylistTrack" ADD COLUMN     "originalPosition" INTEGER NOT NULL;
