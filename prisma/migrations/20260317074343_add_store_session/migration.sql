-- CreateTable
CREATE TABLE "StoredBehavioralSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "audioData" BYTEA NOT NULL,
    "videoData" BYTEA NOT NULL,

    CONSTRAINT "StoredBehavioralSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoredBehavioralSession" ADD CONSTRAINT "StoredBehavioralSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
