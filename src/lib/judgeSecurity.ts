import { createHash } from "node:crypto";
import { z } from "zod";

export const EXECUTION_DISABLED_RESPONSE = {
  error:
    "Code execution is temporarily unavailable. You can still edit code and use hints.",
  code: "EXECUTION_DISABLED",
} as const;

export class JudgeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "JudgeRequestError";
  }
}

export interface JudgeLimits {
  maxBodyBytes: number;
  maxCodeBytes: number;
  maxStdinBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  maxConcurrentPerUser: number;
  maxConcurrentGlobal: number;
  upstreamTimeoutMs: number;
}

export interface JudgeConfig {
  enabled: boolean;
  nodeEnv: "development" | "test" | "production";
  runnerUrl?: string;
  runnerToken?: string;
  limiterMode: "memory" | "upstash";
  upstashUrl?: string;
  upstashToken?: string;
  limiterNamespace: string;
  limits: JudgeLimits;
}

const judgeRequestSchema = z
  .object({
    source_code: z.string().min(1),
    language: z.string().min(1),
    questionId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
    stdin: z.string().optional().default(""),
  })
  .strict();

export interface JudgeRequestPayload {
  source_code: string;
  language: "python";
  questionId: string;
  stdin: string;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function readPositiveInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  maximum: number,
): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    return fallback;
  }
  return value;
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function getJudgeConfig(
  env: NodeJS.ProcessEnv = process.env,
): JudgeConfig {
  const nodeEnv =
    env.NODE_ENV === "production" || env.NODE_ENV === "test"
      ? env.NODE_ENV
      : "development";
  const limiterMode =
    env.JUDGE_LIMITER_MODE === "upstash" ? "upstash" : "memory";
  const configuredNamespace = env.JUDGE_LIMITER_NAMESPACE?.trim();

  return {
    enabled: isTrue(env.CODE_EXECUTION_ENABLED),
    nodeEnv,
    runnerUrl: env.CODE_RUNNER_URL,
    runnerToken: env.CODE_RUNNER_TOKEN,
    limiterMode,
    upstashUrl: env.UPSTASH_REDIS_REST_URL,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN,
    limiterNamespace:
      configuredNamespace && configuredNamespace.length > 0
        ? configuredNamespace
        : "skillsift:judge",
    limits: {
      maxBodyBytes: readPositiveInt(
        env,
        "JUDGE_MAX_BODY_BYTES",
        80 * 1024,
        1024 * 1024,
      ),
      maxCodeBytes: readPositiveInt(
        env,
        "JUDGE_MAX_CODE_BYTES",
        64 * 1024,
        512 * 1024,
      ),
      maxStdinBytes: readPositiveInt(
        env,
        "JUDGE_MAX_STDIN_BYTES",
        8 * 1024,
        64 * 1024,
      ),
      rateLimitMax: readPositiveInt(env, "JUDGE_RATE_LIMIT_MAX", 5, 100),
      rateLimitWindowMs: readPositiveInt(
        env,
        "JUDGE_RATE_LIMIT_WINDOW_MS",
        60_000,
        60 * 60_000,
      ),
      maxConcurrentPerUser: readPositiveInt(
        env,
        "JUDGE_MAX_CONCURRENT_PER_USER",
        1,
        10,
      ),
      maxConcurrentGlobal: readPositiveInt(
        env,
        "JUDGE_MAX_CONCURRENT_GLOBAL",
        4,
        100,
      ),
      upstreamTimeoutMs: readPositiveInt(
        env,
        "JUDGE_UPSTREAM_TIMEOUT_MS",
        8_000,
        30_000,
      ),
    },
  };
}

export function getExecutionConfigError(config: JudgeConfig): string | null {
  if (!config.enabled) return null;

  if (
    !config.runnerUrl ||
    !config.runnerToken ||
    config.runnerToken.length < 32
  ) {
    return "The code runner connection is not configured.";
  }

  try {
    const url = new URL(config.runnerUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "The code runner URL is invalid.";
    }
  } catch {
    return "The code runner URL is invalid.";
  }

  if (config.nodeEnv === "production" && config.limiterMode !== "upstash") {
    return "A shared judge limiter is required in production.";
  }

  if (config.limiterMode === "upstash") {
    if (!config.upstashUrl || !config.upstashToken) {
      return "The shared judge limiter is not configured.";
    }
    try {
      if (new URL(config.upstashUrl).protocol !== "https:") {
        return "The shared judge limiter URL must use HTTPS.";
      }
    } catch {
      return "The shared judge limiter URL is invalid.";
    }
  }

  return null;
}

async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0) {
      throw new JudgeRequestError(
        "Invalid Content-Length header.",
        400,
        "INVALID_REQUEST",
      );
    }
    if (parsedLength > maxBytes) {
      throw new JudgeRequestError(
        "Request body is too large.",
        413,
        "REQUEST_TOO_LARGE",
      );
    }
  }

  if (!request.body) {
    throw new JudgeRequestError(
      "Request body is required.",
      400,
      "INVALID_REQUEST",
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new JudgeRequestError(
          "Request body is too large.",
          413,
          "REQUEST_TOO_LARGE",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new JudgeRequestError(
      "Request body must be valid UTF-8.",
      400,
      "INVALID_REQUEST",
    );
  }
}

export async function parseJudgeRequest(
  request: Request,
  limits: Pick<JudgeLimits, "maxBodyBytes" | "maxCodeBytes" | "maxStdinBytes">,
): Promise<JudgeRequestPayload> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new JudgeRequestError(
      "Content-Type must be application/json.",
      415,
      "INVALID_CONTENT_TYPE",
    );
  }

  const raw = await readBoundedBody(request, limits.maxBodyBytes);
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new JudgeRequestError(
      "Request body must be valid JSON.",
      400,
      "INVALID_JSON",
    );
  }

  const parsed = judgeRequestSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new JudgeRequestError(
      "Expected source_code, language, questionId, and optional stdin only.",
      400,
      "INVALID_REQUEST",
    );
  }

  if (parsed.data.language !== "python") {
    throw new JudgeRequestError(
      "Only Python submissions are supported for question tests.",
      422,
      "UNSUPPORTED_LANGUAGE",
    );
  }
  if (utf8Bytes(parsed.data.source_code) > limits.maxCodeBytes) {
    throw new JudgeRequestError(
      "Source code is too large.",
      413,
      "SOURCE_TOO_LARGE",
    );
  }
  if (utf8Bytes(parsed.data.stdin) > limits.maxStdinBytes) {
    throw new JudgeRequestError(
      "Standard input is too large.",
      413,
      "STDIN_TOO_LARGE",
    );
  }

  return { ...parsed.data, language: "python" };
}

export type LimiterRejection =
  | "rate_limited"
  | "user_busy"
  | "server_busy"
  | "unavailable";

export interface LimiterLease {
  release(): Promise<void>;
}

export type LimiterDecision =
  | { allowed: true; lease: LimiterLease }
  | { allowed: false; reason: LimiterRejection; retryAfterSeconds: number };

export interface JudgeLimiter {
  acquire(userId: string): Promise<LimiterDecision>;
}

export class InMemoryJudgeLimiter implements JudgeLimiter {
  private readonly windows = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly activeByUser = new Map<string, number>();
  private activeGlobal = 0;

  constructor(
    private readonly limits: Pick<
      JudgeLimits,
      | "rateLimitMax"
      | "rateLimitWindowMs"
      | "maxConcurrentPerUser"
      | "maxConcurrentGlobal"
    >,
    private readonly now: () => number = Date.now,
  ) {}

  async acquire(userId: string): Promise<LimiterDecision> {
    const now = this.now();
    let window = this.windows.get(userId);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + this.limits.rateLimitWindowMs };
      this.windows.set(userId, window);
    }
    window.count += 1;

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((window.resetAt - now) / 1000),
    );
    if (window.count > this.limits.rateLimitMax) {
      return { allowed: false, reason: "rate_limited", retryAfterSeconds };
    }

    const activeForUser = this.activeByUser.get(userId) ?? 0;
    if (activeForUser >= this.limits.maxConcurrentPerUser) {
      return { allowed: false, reason: "user_busy", retryAfterSeconds: 1 };
    }
    if (this.activeGlobal >= this.limits.maxConcurrentGlobal) {
      return { allowed: false, reason: "server_busy", retryAfterSeconds: 1 };
    }

    this.activeByUser.set(userId, activeForUser + 1);
    this.activeGlobal += 1;
    let released = false;

    return {
      allowed: true,
      lease: {
        release: async () => {
          if (released) return;
          released = true;
          const current = this.activeByUser.get(userId) ?? 0;
          if (current <= 1) this.activeByUser.delete(userId);
          else this.activeByUser.set(userId, current - 1);
          this.activeGlobal = Math.max(0, this.activeGlobal - 1);
        },
      },
    };
  }
}

const ACQUIRE_SCRIPT = `
local rate = redis.call('INCR', KEYS[1])
if rate == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
local retry_ms = redis.call('PTTL', KEYS[1])
if rate > tonumber(ARGV[1]) then return {2, retry_ms} end
local user_active = tonumber(redis.call('GET', KEYS[2]) or '0')
if user_active >= tonumber(ARGV[3]) then return {3, 1000} end
local global_active = tonumber(redis.call('GET', KEYS[3]) or '0')
if global_active >= tonumber(ARGV[4]) then return {4, 1000} end
redis.call('INCR', KEYS[2])
redis.call('PEXPIRE', KEYS[2], ARGV[5])
redis.call('INCR', KEYS[3])
redis.call('PEXPIRE', KEYS[3], ARGV[5])
return {1, retry_ms}
`;

const RELEASE_SCRIPT = `
local user_active = tonumber(redis.call('GET', KEYS[1]) or '0')
if user_active > 1 then redis.call('DECR', KEYS[1]) else redis.call('DEL', KEYS[1]) end
local global_active = tonumber(redis.call('GET', KEYS[2]) or '0')
if global_active > 1 then redis.call('DECR', KEYS[2]) else redis.call('DEL', KEYS[2]) end
return 1
`;

export class UpstashJudgeLimiter implements JudgeLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly namespace: string,
    private readonly limits: Pick<
      JudgeLimits,
      | "rateLimitMax"
      | "rateLimitWindowMs"
      | "maxConcurrentPerUser"
      | "maxConcurrentGlobal"
      | "upstreamTimeoutMs"
    >,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async command(command: unknown[]): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Math.min(1_500, this.limits.upstreamTimeoutMs),
    );
    try {
      const response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Shared limiter rejected the command.");
      const body = (await response.json()) as {
        result?: unknown;
        error?: unknown;
      };
      if (body.error !== undefined || body.result === undefined) {
        throw new Error("Shared limiter returned an invalid response.");
      }
      return body.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async acquire(userId: string): Promise<LimiterDecision> {
    const userKey = createHash("sha256")
      .update(userId)
      .digest("hex")
      .slice(0, 32);
    const bucket = Math.floor(Date.now() / this.limits.rateLimitWindowMs);
    const rateKey = `${this.namespace}:rate:${userKey}:${bucket}`;
    const activeKey = `${this.namespace}:active:user:${userKey}`;
    const globalKey = `${this.namespace}:active:global`;
    const leaseTtlMs = this.limits.upstreamTimeoutMs + 10_000;

    try {
      const result = await this.command([
        "EVAL",
        ACQUIRE_SCRIPT,
        3,
        rateKey,
        activeKey,
        globalKey,
        this.limits.rateLimitMax,
        this.limits.rateLimitWindowMs,
        this.limits.maxConcurrentPerUser,
        this.limits.maxConcurrentGlobal,
        leaseTtlMs,
      ]);
      if (!Array.isArray(result) || typeof result[0] !== "number") {
        throw new Error("Shared limiter returned an invalid result.");
      }

      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((typeof result[1] === "number" ? result[1] : 1000) / 1000),
      );
      if (result[0] === 2)
        return { allowed: false, reason: "rate_limited", retryAfterSeconds };
      if (result[0] === 3)
        return { allowed: false, reason: "user_busy", retryAfterSeconds };
      if (result[0] === 4)
        return { allowed: false, reason: "server_busy", retryAfterSeconds };
      if (result[0] !== 1)
        throw new Error("Shared limiter returned an unknown result.");

      let released = false;
      return {
        allowed: true,
        lease: {
          release: async () => {
            if (released) return;
            released = true;
            await this.command([
              "EVAL",
              RELEASE_SCRIPT,
              2,
              activeKey,
              globalKey,
            ]);
          },
        },
      };
    } catch {
      return { allowed: false, reason: "unavailable", retryAfterSeconds: 1 };
    }
  }
}

export function createJudgeLimiter(
  config: JudgeConfig,
  fetchImpl: typeof fetch = fetch,
): JudgeLimiter {
  if (
    config.limiterMode === "upstash" &&
    config.upstashUrl &&
    config.upstashToken
  ) {
    return new UpstashJudgeLimiter(
      config.upstashUrl,
      config.upstashToken,
      config.limiterNamespace,
      config.limits,
      fetchImpl,
    );
  }
  return new InMemoryJudgeLimiter(config.limits);
}
