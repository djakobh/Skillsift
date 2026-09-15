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
  requestTimeoutMs: number;
  sandboxTimeoutMs: number;
  executionTimeoutMs: number;
  maxOutputBytes: number;
  memoryBytes: number;
  maxProcesses: number;
  maxFileBytes: number;
}

export interface JudgeConfig {
  enabled: boolean;
  nodeEnv: "development" | "test" | "production";
  executionBackend: "disabled" | "vercel-sandbox";
  limiterMode: "memory" | "postgres";
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
    env.JUDGE_LIMITER_MODE === "postgres" ? "postgres" : "memory";
  const configuredNamespace = env.JUDGE_LIMITER_NAMESPACE?.trim();

  return {
    enabled: isTrue(env.CODE_EXECUTION_ENABLED),
    nodeEnv,
    executionBackend:
      env.CODE_EXECUTION_BACKEND === "vercel-sandbox"
        ? "vercel-sandbox"
        : "disabled",
    limiterMode,
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
      requestTimeoutMs: readPositiveInt(
        env,
        "JUDGE_REQUEST_TIMEOUT_MS",
        15_000,
        30_000,
      ),
      sandboxTimeoutMs: readPositiveInt(
        env,
        "JUDGE_SANDBOX_TIMEOUT_MS",
        12_000,
        30_000,
      ),
      executionTimeoutMs: readPositiveInt(
        env,
        "JUDGE_EXECUTION_TIMEOUT_MS",
        5_000,
        10_000,
      ),
      maxOutputBytes: readPositiveInt(
        env,
        "JUDGE_MAX_OUTPUT_BYTES",
        64 * 1024,
        512 * 1024,
      ),
      memoryBytes: readPositiveInt(
        env,
        "JUDGE_SANDBOX_MEMORY_BYTES",
        512 * 1024 * 1024,
        1024 * 1024 * 1024,
      ),
      maxProcesses: readPositiveInt(
        env,
        "JUDGE_SANDBOX_MAX_PROCESSES",
        64,
        256,
      ),
      maxFileBytes: readPositiveInt(
        env,
        "JUDGE_SANDBOX_MAX_FILE_BYTES",
        1024 * 1024,
        10 * 1024 * 1024,
      ),
    },
  };
}

export function getExecutionConfigError(config: JudgeConfig): string | null {
  if (!config.enabled) return null;

  if (config.executionBackend !== "vercel-sandbox") {
    return "The isolated execution backend is not configured.";
  }

  if (config.nodeEnv === "production" && config.limiterMode !== "postgres") {
    return "A shared judge limiter is required in production.";
  }

  return null;
}

export function isExecutionAvailable(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const config = getJudgeConfig(env);
  return config.enabled && getExecutionConfigError(config) === null;
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

export function createJudgeLimiter(
  config: JudgeConfig,
): JudgeLimiter {
  return new InMemoryJudgeLimiter(config.limits);
}
