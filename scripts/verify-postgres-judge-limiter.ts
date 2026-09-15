import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PostgresJudgeLimiter } from "../src/lib/postgresJudgeLimiter";
import { db } from "../src/server/db";

if (process.env.JUDGE_POSTGRES_LIVE_TEST !== "true") {
  throw new Error(
    "Refusing to modify the database. Set JUDGE_POSTGRES_LIVE_TEST=true for this explicit limiter acceptance test.",
  );
}

const namespace = `skillsift:judge:verify:${randomUUID()}`;
const limits = {
  rateLimitMax: 3,
  rateLimitWindowMs: 60_000,
  maxConcurrentPerUser: 1,
  maxConcurrentGlobal: 2,
  requestTimeoutMs: 15_000,
};
const limiter = new PostgresJudgeLimiter(limits, namespace);

try {
  const first = await limiter.acquire("acceptance-user-a");
  assert.equal(first.allowed, true);

  const sameUser = await limiter.acquire("acceptance-user-a");
  assert.deepEqual(sameUser, {
    allowed: false,
    reason: "user_busy",
    retryAfterSeconds: 1,
  });

  const second = await limiter.acquire("acceptance-user-b");
  assert.equal(second.allowed, true);

  const globalBusy = await limiter.acquire("acceptance-user-c");
  assert.deepEqual(globalBusy, {
    allowed: false,
    reason: "server_busy",
    retryAfterSeconds: 1,
  });

  if (first.allowed) await first.lease.release();
  if (second.allowed) await second.lease.release();

  const thirdForUser = await limiter.acquire("acceptance-user-a");
  assert.equal(thirdForUser.allowed, true);
  if (thirdForUser.allowed) await thirdForUser.lease.release();

  const rateLimited = await limiter.acquire("acceptance-user-a");
  assert.equal(rateLimited.allowed, false);
  if (!rateLimited.allowed) assert.equal(rateLimited.reason, "rate_limited");

  console.log("Neon/PostgreSQL judge limiter acceptance checks passed.");
} finally {
  await db.judgeExecutionLease.deleteMany({ where: { namespace } });
  await db.judgeRateBucket.deleteMany({ where: { namespace } });
  await db.$disconnect();
}
