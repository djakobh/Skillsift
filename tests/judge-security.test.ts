import assert from "node:assert/strict";
import { before, test } from "node:test";

import {
  InMemoryJudgeLimiter,
  UpstashJudgeLimiter,
  getExecutionConfigError,
  getJudgeConfig,
  isExecutionAvailable,
  parseJudgeRequest,
  type JudgeConfig,
  type JudgeLimiter,
} from "../src/lib/judgeSecurity";
import type {
  ExecutionBackend,
  ExecutionResult,
} from "../src/lib/vercelSandboxBackend";

process.env.SKIP_ENV_VALIDATION = "1";

let handleAuthenticatedJudgeRequest: typeof import("../src/lib/judgeHandler").handleAuthenticatedJudgeRequest;

before(async () => {
  ({ handleAuthenticatedJudgeRequest } =
    await import("../src/lib/judgeHandler"));
});

const limits = {
  maxBodyBytes: 80 * 1024,
  maxCodeBytes: 64 * 1024,
  maxStdinBytes: 8 * 1024,
  rateLimitMax: 2,
  rateLimitWindowMs: 60_000,
  maxConcurrentPerUser: 1,
  maxConcurrentGlobal: 2,
  requestTimeoutMs: 100,
  sandboxTimeoutMs: 80,
  executionTimeoutMs: 50,
  maxOutputBytes: 64 * 1024,
  memoryBytes: 512 * 1024 * 1024,
  maxProcesses: 64,
  maxFileBytes: 1024 * 1024,
};

function config(overrides: Partial<JudgeConfig> = {}): JudgeConfig {
  return {
    enabled: true,
    nodeEnv: "test",
    executionBackend: "vercel-sandbox",
    limiterMode: "memory",
    limiterNamespace: "test:judge",
    limits: { ...limits },
    ...overrides,
  };
}

function request(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("http://app.test/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const question = {
  id: "sum",
  functionName: "add",
  params: [
    { name: "a", type: "int" },
    { name: "b", type: "int" },
  ],
  outputType: "int",
  testCases: [{ input: { a: 1, b: 2 }, expectedOutput: 3, isHidden: false }],
};

const allowOnce: JudgeLimiter = {
  async acquire() {
    return { allowed: true, lease: { async release() {} } };
  },
};

test("the authenticated app endpoint fails closed when execution is disabled", async () => {
  let executionCalls = 0;
  const response = await handleAuthenticatedJudgeRequest(
    request({
      source_code: "class Solution: pass",
      language: "python",
      questionId: "sum",
    }),
    "user-1",
    {
      config: config({ enabled: false }),
      executionBackend: {
        async execute() {
          executionCalls += 1;
          throw new Error("must not run");
        },
      },
    },
  );

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "EXECUTION_DISABLED");
  assert.equal(executionCalls, 0);
});

test("execution defaults to disabled when the switch is unset", () => {
  assert.equal(getJudgeConfig({ NODE_ENV: "production" }).enabled, false);
});

test("the UI only advertises execution when the full server configuration is valid", () => {
  assert.equal(
    isExecutionAvailable({
      NODE_ENV: "development",
      CODE_EXECUTION_ENABLED: "true",
      CODE_EXECUTION_BACKEND: "vercel-sandbox",
    }),
    true,
  );
  assert.equal(
    isExecutionAvailable({
      NODE_ENV: "production",
      CODE_EXECUTION_ENABLED: "true",
      CODE_EXECUTION_BACKEND: "vercel-sandbox",
      JUDGE_LIMITER_MODE: "memory",
    }),
    false,
  );
});

test("request parsing rejects unknown fields, unsupported languages, and byte oversize", async () => {
  await assert.rejects(
    parseJudgeRequest(
      request({
        source_code: "x",
        language: "python",
        questionId: "sum",
        unexpected: true,
      }),
      limits,
    ),
    { code: "INVALID_REQUEST" },
  );

  await assert.rejects(
    parseJudgeRequest(
      request({ source_code: "x", language: "cpp", questionId: "sum" }),
      limits,
    ),
    { code: "UNSUPPORTED_LANGUAGE" },
  );

  await assert.rejects(
    parseJudgeRequest(
      request({ source_code: "ééé", language: "python", questionId: "sum" }),
      {
        ...limits,
        maxCodeBytes: 5,
      },
    ),
    { code: "SOURCE_TOO_LARGE" },
  );
});

test("the in-memory limiter enforces per-user concurrency, global concurrency, and rate", async () => {
  let now = 1_000;
  const limiter = new InMemoryJudgeLimiter(
    {
      rateLimitMax: 2,
      rateLimitWindowMs: 60_000,
      maxConcurrentPerUser: 1,
      maxConcurrentGlobal: 2,
    },
    () => now,
  );

  const first = await limiter.acquire("a");
  assert.equal(first.allowed, true);
  assert.deepEqual(await limiter.acquire("a"), {
    allowed: false,
    reason: "user_busy",
    retryAfterSeconds: 1,
  });
  const secondUser = await limiter.acquire("b");
  assert.equal(secondUser.allowed, true);
  assert.equal((await limiter.acquire("c")).allowed, false);
  if (first.allowed) await first.lease.release();
  assert.equal(
    (await limiter.acquire("a")).allowed,
    false,
    "rejected attempts count toward the rate",
  );
  if (secondUser.allowed) await secondUser.lease.release();

  now += 60_001;
  const reset = await limiter.acquire("a");
  assert.equal(reset.allowed, true);
  if (reset.allowed) await reset.lease.release();
});

test("production refuses an instance-local limiter", () => {
  assert.equal(
    getExecutionConfigError(
      config({ nodeEnv: "production", limiterMode: "memory" }),
    ),
    "A shared judge limiter is required in production.",
  );
});

test("enabled execution fails closed unless the sandbox backend is explicitly selected", () => {
  assert.equal(
    getExecutionConfigError(config({ executionBackend: "disabled" })),
    "The isolated execution backend is not configured.",
  );
});

test("rate-limited requests never reach the sandbox", async () => {
  let executionCalls = 0;
  const response = await handleAuthenticatedJudgeRequest(
    request({
      source_code: "class Solution: pass",
      language: "python",
      questionId: "sum",
    }),
    "user-1",
    {
      config: config(),
      limiter: {
        async acquire() {
          return {
            allowed: false,
            reason: "rate_limited",
            retryAfterSeconds: 12,
          };
        },
      },
      loadQuestion: () => question,
      executionBackend: {
        async execute() {
          executionCalls += 1;
          throw new Error("must not run");
        },
      },
    },
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "12");
  assert.equal(executionCalls, 0);
});

test("the shared limiter uses an atomic script and hashes user identifiers", async () => {
  const commands: unknown[][] = [];
  const limiter = new UpstashJudgeLimiter(
    "https://redis.test",
    "redis-secret",
    "test:judge",
    limits,
    async (_input, init) => {
      const command = JSON.parse(String(init?.body)) as unknown[];
      commands.push(command);
      return Response.json({ result: commands.length === 1 ? [1, 1000] : 1 });
    },
  );

  const decision = await limiter.acquire("person@example.com");
  assert.equal(decision.allowed, true);
  assert.equal(commands[0]?.[0], "EVAL");
  assert.doesNotMatch(JSON.stringify(commands[0]), /person@example\.com/);
  if (decision.allowed) await decision.lease.release();
  assert.equal(commands.length, 2);
});

test("valid sandbox results retain grading without exposing expected answers", async () => {
  let sandboxSource = "";
  const backend: ExecutionBackend = {
    async execute(request): Promise<ExecutionResult> {
      sandboxSource = request.sourceCode;
      return {
        stdout: "test_case_output:3\n",
        stderr: "",
        compile_output: "",
        status: { id: 3, description: "Accepted" },
        time: null,
        memory: null,
      };
    },
  };
  const response = await handleAuthenticatedJudgeRequest(
    request({
      source_code: "class Solution:\n    def add(self, a, b): return a + b",
      language: "python",
      questionId: "sum",
    }),
    "user-1",
    {
      config: config(),
      limiter: allowOnce,
      loadQuestion: () => question,
      executionBackend: backend,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.allPassed, true);
  assert.equal(body.testResults[0].passed, true);
  assert.doesNotMatch(sandboxSource, /expectedOutput|isHidden/);
});

test("the sandbox deadline aborts one execution attempt", async () => {
  let calls = 0;
  const timeoutConfig = config();
  timeoutConfig.limits = { ...timeoutConfig.limits, requestTimeoutMs: 20 };
  const response = await handleAuthenticatedJudgeRequest(
    request({
      source_code: "class Solution: pass",
      language: "python",
      questionId: "sum",
    }),
    "user-1",
    {
      config: timeoutConfig,
      limiter: allowOnce,
      loadQuestion: () => question,
      executionBackend: {
        async execute(_request, signal) {
          calls += 1;
          return await new Promise<ExecutionResult>((_resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          });
        },
      },
    },
  );

  assert.equal(response.status, 504);
  assert.equal((await response.json()).code, "SANDBOX_TIMEOUT");
  assert.equal(calls, 1);
});

test("sandbox output is bounded before it reaches the response", async () => {
  const oversized = "x".repeat(81 * 1024);
  const response = await handleAuthenticatedJudgeRequest(
    request({
      source_code: "class Solution: pass",
      language: "python",
      questionId: "sum",
    }),
    "user-1",
    {
      config: config(),
      limiter: allowOnce,
      loadQuestion: () => question,
      executionBackend: {
        async execute() {
          return {
            stdout: oversized,
            stderr: "",
            compile_output: "",
            status: { id: 3, description: "Accepted" },
            time: null,
            memory: null,
          };
        },
      },
    },
  );

  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, "INVALID_SANDBOX_RESPONSE");
});

test("a sandbox provider failure becomes a controlled error", async () => {
  const response = await handleAuthenticatedJudgeRequest(
    request({
      source_code: "class Solution: pass",
      language: "python",
      questionId: "sum",
    }),
    "user-1",
    {
      config: config(),
      limiter: allowOnce,
      loadQuestion: () => question,
      executionBackend: {
        async execute() {
          throw new Error("provider failure with sensitive details");
        },
      },
    },
  );

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.code, "SANDBOX_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(body), /sensitive details/);
});
