/*
  Warnings:

  - Added the required column `position` to the `PlaylistTrack` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlaylistTrack" ADD COLUMN     "position" INTEGER NOT NULL;
