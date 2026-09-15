-- Shared fixed-window request counters. Keys are SHA-256 digests and do not
-- contain user identifiers or submitted code.
CREATE TABLE "JudgeRateBucket" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "userKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgeRateBucket_pkey" PRIMARY KEY ("id")
);

-- Short-lived concurrency leases. Expired leases are discarded during the
-- next acquisition, so a terminated function cannot block execution forever.
CREATE TABLE "JudgeExecutionLease" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "userKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgeExecutionLease_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JudgeRateBucket_expiresAt_idx"
    ON "JudgeRateBucket"("expiresAt");
CREATE INDEX "JudgeRateBucket_namespace_expiresAt_idx"
    ON "JudgeRateBucket"("namespace", "expiresAt");
CREATE INDEX "JudgeExecutionLease_namespace_userKey_expiresAt_idx"
    ON "JudgeExecutionLease"("namespace", "userKey", "expiresAt");
CREATE INDEX "JudgeExecutionLease_namespace_expiresAt_idx"
    ON "JudgeExecutionLease"("namespace", "expiresAt");
CREATE INDEX "JudgeExecutionLease_expiresAt_idx"
    ON "JudgeExecutionLease"("expiresAt");
