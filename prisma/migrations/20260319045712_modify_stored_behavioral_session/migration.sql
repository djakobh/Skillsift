/*
  Warnings:

  - You are about to drop the column `audioData` on the `StoredBehavioralSession` table. All the data in the column will be lost.
  - You are about to drop the column `videoData` on the `StoredBehavioralSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StoredBehavioralSession" DROP COLUMN "audioData",
DROP COLUMN "videoData",
ADD COLUMN     "feedback" JSONB,
ADD COLUMN     "transcript" TEXT;
