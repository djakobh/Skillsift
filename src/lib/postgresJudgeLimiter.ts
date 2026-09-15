import { createHash, randomUUID } from "node:crypto";

import type {
  JudgeLimiter,
  JudgeLimits,
  LimiterDecision,
  LimiterRejection,
} from "~/lib/judgeSecurity";
import { db } from "~/server/db";

type PostgresLimiterLimits = Pick<
  JudgeLimits,
  | "rateLimitMax"
  | "rateLimitWindowMs"
  | "maxConcurrentPerUser"
  | "maxConcurrentGlobal"
  | "requestTimeoutMs"
>;

export interface PostgresLimiterAcquireInput {
  namespace: string;
  userKey: string;
  now: Date;
  bucketId: string;
  bucketExpiresAt: Date;
  leaseId: string;
  leaseExpiresAt: Date;
  limits: PostgresLimiterLimits;
}

export type PostgresLimiterAcquireResult =
  | { allowed: true; leaseId: string }
  | {
      allowed: false;
      reason: Exclude<LimiterRejection, "unavailable">;
      retryAfterSeconds: number;
    };

export interface PostgresLimiterStore {
  acquire(
    input: PostgresLimiterAcquireInput,
  ): Promise<PostgresLimiterAcquireResult>;
  release(leaseId: string): Promise<void>;
}

export class PrismaPostgresLimiterStore implements PostgresLimiterStore {
  async acquire(
    input: PostgresLimiterAcquireInput,
  ): Promise<PostgresLimiterAcquireResult> {
    return db.$transaction(
      async (transaction) => {
        // Serializes only judge-limit acquisitions for this namespace. The
        // transaction ends before sandbox execution, so no DB connection or
        // lock is held while untrusted code runs.
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${input.namespace}, 0))
        `;

        await Promise.all([
          transaction.judgeExecutionLease.deleteMany({
            where: { expiresAt: { lte: input.now } },
          }),
          transaction.judgeRateBucket.deleteMany({
            where: { expiresAt: { lte: input.now } },
          }),
        ]);

        const rateBucket = await transaction.judgeRateBucket.upsert({
          where: { id: input.bucketId },
          create: {
            id: input.bucketId,
            namespace: input.namespace,
            userKey: input.userKey,
            count: 1,
            expiresAt: input.bucketExpiresAt,
          },
          update: { count: { increment: 1 } },
        });

        if (rateBucket.count > input.limits.rateLimitMax) {
          return {
            allowed: false,
            reason: "rate_limited",
            retryAfterSeconds: Math.max(
              1,
              Math.ceil(
                (input.bucketExpiresAt.getTime() - input.now.getTime()) / 1000,
              ),
            ),
          };
        }

        const [activeForUser, activeGlobal] = await Promise.all([
          transaction.judgeExecutionLease.count({
            where: {
              namespace: input.namespace,
              userKey: input.userKey,
              expiresAt: { gt: input.now },
            },
          }),
          transaction.judgeExecutionLease.count({
            where: {
              namespace: input.namespace,
              expiresAt: { gt: input.now },
            },
          }),
        ]);

        if (activeForUser >= input.limits.maxConcurrentPerUser) {
          return {
            allowed: false,
            reason: "user_busy",
            retryAfterSeconds: 1,
          };
        }
        if (activeGlobal >= input.limits.maxConcurrentGlobal) {
          return {
            allowed: false,
            reason: "server_busy",
            retryAfterSeconds: 1,
          };
        }

        await transaction.judgeExecutionLease.create({
          data: {
            id: input.leaseId,
            namespace: input.namespace,
            userKey: input.userKey,
            expiresAt: input.leaseExpiresAt,
          },
        });

        return { allowed: true, leaseId: input.leaseId };
      },
      {
        maxWait: Math.min(3_000, input.limits.requestTimeoutMs),
        timeout: Math.min(5_000, input.limits.requestTimeoutMs),
      },
    );
  }

  async release(leaseId: string): Promise<void> {
    await db.judgeExecutionLease.deleteMany({ where: { id: leaseId } });
  }
}

export class PostgresJudgeLimiter implements JudgeLimiter {
  constructor(
    private readonly limits: PostgresLimiterLimits,
    private readonly namespace: string,
    private readonly store: PostgresLimiterStore =
      new PrismaPostgresLimiterStore(),
    private readonly now: () => number = Date.now,
  ) {}

  async acquire(userId: string): Promise<LimiterDecision> {
    const nowMs = this.now();
    const now = new Date(nowMs);
    const userKey = createHash("sha256")
      .update(`${this.namespace}:${userId}`)
      .digest("hex")
      .slice(0, 32);
    const bucketStartMs =
      Math.floor(nowMs / this.limits.rateLimitWindowMs) *
      this.limits.rateLimitWindowMs;
    const bucketExpiresAt = new Date(
      bucketStartMs + this.limits.rateLimitWindowMs,
    );
    const bucketId = createHash("sha256")
      .update(`${this.namespace}:${userKey}:${bucketStartMs}`)
      .digest("hex");
    const leaseId = randomUUID();
    const leaseExpiresAt = new Date(
      nowMs + this.limits.requestTimeoutMs + 10_000,
    );

    try {
      const result = await this.store.acquire({
        namespace: this.namespace,
        userKey,
        now,
        bucketId,
        bucketExpiresAt,
        leaseId,
        leaseExpiresAt,
        limits: this.limits,
      });
      if (!result.allowed) return result;

      let released = false;
      return {
        allowed: true,
        lease: {
          release: async () => {
            if (released) return;
            released = true;
            await this.store.release(result.leaseId);
          },
        },
      };
    } catch {
      return { allowed: false, reason: "unavailable", retryAfterSeconds: 1 };
    }
  }
}
