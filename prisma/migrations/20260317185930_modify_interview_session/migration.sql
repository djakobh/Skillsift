-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "question1Id" TEXT,
ADD COLUMN     "question2Id" TEXT,
ADD COLUMN     "resumedAt" TIMESTAMP(3);
