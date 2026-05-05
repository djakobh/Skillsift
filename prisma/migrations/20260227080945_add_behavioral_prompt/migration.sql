/*
  Warnings:

  - You are about to drop the column `answer` on the `TechnicalQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `TechnicalQuestion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `TechnicalQuestion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `functionName` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputType` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `params` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `starterCode` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `TechnicalQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TechnicalQuestion" DROP COLUMN "answer",
DROP COLUMN "question",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "functionName" TEXT NOT NULL,
ADD COLUMN     "outputType" TEXT NOT NULL,
ADD COLUMN     "params" JSONB NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "starterCode" JSONB NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralPrompt" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,

    CONSTRAINT "BehavioralPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalQuestion_slug_key" ON "TechnicalQuestion"("slug");

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "TechnicalQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
