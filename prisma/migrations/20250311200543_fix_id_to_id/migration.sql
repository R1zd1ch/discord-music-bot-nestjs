/*
  Warnings:

  - You are about to drop the column `discordID` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[discordId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `discordId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_discordID_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "discordID",
ADD COLUMN     "discordId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
