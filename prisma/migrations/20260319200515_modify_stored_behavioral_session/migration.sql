/*
  Warnings:

  - You are about to drop the column `feedback` on the `StoredBehavioralSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StoredBehavioralSession" DROP COLUMN "feedback",
ADD COLUMN     "videoURL" TEXT;
