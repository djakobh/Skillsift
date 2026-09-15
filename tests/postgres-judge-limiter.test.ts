import assert from "node:assert/strict";
import { before, test } from "node:test";

import type { JudgeLimits } from "../src/lib/judgeSecurity";
import type {
  PostgresLimiterAcquireInput,
  PostgresLimiterAcquireResult,
  PostgresLimiterStore,
} from "../src/lib/postgresJudgeLimiter";

process.env.SKIP_ENV_VALIDATION = "1";

let PostgresJudgeLimiter: typeof import("../src/lib/postgresJudgeLimiter").PostgresJudgeLimiter;

before(async () => {
  ({ PostgresJudgeLimiter } = await import(
    "../src/lib/postgresJudgeLimiter"
  ));
});

const limits: Pick<
  JudgeLimits,
  | "rateLimitMax"
  | "rateLimitWindowMs"
  | "maxConcurrentPerUser"
  | "maxConcurrentGlobal"
  | "requestTimeoutMs"
> = {
  rateLimitMax: 5,
  rateLimitWindowMs: 60_000,
  maxConcurrentPerUser: 1,
  maxConcurrentGlobal: 4,
  requestTimeoutMs: 15_000,
};

class FakeStore implements PostgresLimiterStore {
  inputs: PostgresLimiterAcquireInput[] = [];
  released: string[] = [];
  result: PostgresLimiterAcquireResult = {
    allowed: true,
    leaseId: "database-lease",
  };
  error: Error | undefined;

  async acquire(
    input: PostgresLimiterAcquireInput,
  ): Promise<PostgresLimiterAcquireResult> {
    this.inputs.push(input);
    if (this.error) throw this.error;
    return this.result;
  }

  async release(leaseId: string): Promise<void> {
    this.released.push(leaseId);
  }
}

test("the Postgres limiter hashes users and creates short-lived shared leases", async () => {
  const store = new FakeStore();
  const now = Date.UTC(2026, 8, 15, 22, 45, 30);
  const limiter = new PostgresJudgeLimiter(
    limits,
    "skillsift:judge",
    store,
    () => now,
  );

  const decision = await limiter.acquire("person@example.com");
  assert.equal(decision.allowed, true);
  assert.equal(store.inputs.length, 1);
  assert.doesNotMatch(JSON.stringify(store.inputs[0]), /person@example\.com/);
  assert.match(store.inputs[0]!.userKey, /^[a-f0-9]{32}$/);
  assert.match(store.inputs[0]!.bucketId, /^[a-f0-9]{64}$/);
  assert.equal(
    store.inputs[0]!.leaseExpiresAt.getTime(),
    now + limits.requestTimeoutMs + 10_000,
  );
  assert.equal(
    store.inputs[0]!.bucketExpiresAt.getTime(),
    Math.floor(now / limits.rateLimitWindowMs) * limits.rateLimitWindowMs +
      limits.rateLimitWindowMs,
  );

  if (decision.allowed) {
    await decision.lease.release();
    await decision.lease.release();
  }
  assert.deepEqual(store.released, ["database-lease"]);
});

test("database rate and concurrency rejections pass through without a lease", async () => {
  for (const reason of [
    "rate_limited",
    "user_busy",
    "server_busy",
  ] as const) {
    const store = new FakeStore();
    store.result = { allowed: false, reason, retryAfterSeconds: 7 };
    const decision = await new PostgresJudgeLimiter(
      limits,
      "skillsift:judge",
      store,
    ).acquire("user-id");
    assert.deepEqual(decision, {
      allowed: false,
      reason,
      retryAfterSeconds: 7,
    });
    assert.deepEqual(store.released, []);
  }
});

test("database failures fail closed", async () => {
  const store = new FakeStore();
  store.error = new Error("database unavailable with sensitive details");
  const decision = await new PostgresJudgeLimiter(
    limits,
    "skillsift:judge",
    store,
  ).acquire("user-id");
  assert.deepEqual(decision, {
    allowed: false,
    reason: "unavailable",
    retryAfterSeconds: 1,
  });
});
