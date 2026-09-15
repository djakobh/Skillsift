import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  EXECUTION_DISABLED_RESPONSE,
  JudgeRequestError,
  createJudgeLimiter,
  getExecutionConfigError,
  getJudgeConfig,
  parseJudgeRequest,
  type JudgeConfig,
  type JudgeLimiter,
} from "~/lib/judgeSecurity";
import {
  buildPythonHarness,
  parseTestOutput,
  type QuestionMeta,
  type TestCase,
} from "~/lib/testHarness";
import {
  VercelSandboxBackend,
  type ExecutionBackend,
} from "~/lib/vercelSandboxBackend";

const MAX_SANDBOX_SOURCE_BYTES = 256 * 1024;
const expectedOutputSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.unknown()),
]);

const questionSchema = z
  .object({
    id: z.string(),
    functionName: z.string().min(1),
    params: z.array(
      z.object({ name: z.string().min(1), type: z.string().min(1) }),
    ),
    outputType: z.string().min(1),
    testCases: z.array(
      z.object({
        input: z.record(z.unknown()),
        expectedOutput: expectedOutputSchema,
        isHidden: z.boolean(),
      }),
    ),
  })
  .passthrough();

type Question = z.infer<typeof questionSchema>;

const executionResultSchema = z
  .object({
    stdout: z.string(),
    stderr: z.string(),
    compile_output: z.string(),
    status: z.object({
      id: z.number().int(),
      description: z.string().max(100),
    }),
    time: z.string().nullable(),
    memory: z.number().nullable(),
  })
  .strict();

interface JudgeHandlerDependencies {
  config?: JudgeConfig;
  limiter?: JudgeLimiter;
  executionBackend?: ExecutionBackend;
  loadQuestion?: (questionId: string) => Question | null;
}

let questionCache: Question[] | null = null;
let limiterCache: { key: string; limiter: JudgeLimiter } | null = null;
let backendCache: { key: string; backend: ExecutionBackend } | null = null;

function json(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function defaultLoadQuestion(questionId: string): Question | null {
  if (!questionCache) {
    const filePath = path.join(
      process.cwd(),
      "prisma/data/consolidated-questions.json",
    );
    const decoded: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
    questionCache = z.array(questionSchema).parse(decoded);
  }
  return questionCache.find((question) => question.id === questionId) ?? null;
}

function getLimiter(config: JudgeConfig): JudgeLimiter {
  const key = JSON.stringify({
    mode: config.limiterMode,
    namespace: config.limiterNamespace,
    upstashUrl: config.upstashUrl,
    limits: config.limits,
  });
  if (limiterCache?.key !== key) {
    limiterCache = { key, limiter: createJudgeLimiter(config) };
  }
  return limiterCache.limiter;
}

function getExecutionBackend(config: JudgeConfig): ExecutionBackend {
  const key = JSON.stringify(config.limits);
  if (backendCache?.key !== key) {
    backendCache = {
      key,
      backend: new VercelSandboxBackend(config.limits),
    };
  }
  return backendCache.backend;
}

export async function handleAuthenticatedJudgeRequest(
  request: Request,
  userId: string,
  dependencies: JudgeHandlerDependencies = {},
): Promise<NextResponse> {
  const config = dependencies.config ?? getJudgeConfig();
  if (!config.enabled) {
    return json(EXECUTION_DISABLED_RESPONSE, 503);
  }

  if (getExecutionConfigError(config)) {
    return json(
      {
        error: "Code execution is temporarily unavailable.",
        code: "EXECUTION_UNAVAILABLE",
      },
      503,
    );
  }

  let submission;
  try {
    submission = await parseJudgeRequest(request, config.limits);
  } catch (error) {
    if (error instanceof JudgeRequestError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    return json({ error: "Invalid request.", code: "INVALID_REQUEST" }, 400);
  }

  const loadQuestion = dependencies.loadQuestion ?? defaultLoadQuestion;
  let question: Question | null;
  try {
    question = loadQuestion(submission.questionId);
  } catch {
    return json(
      { error: "Question data is unavailable.", code: "QUESTION_DATA_ERROR" },
      500,
    );
  }
  if (!question) {
    return json(
      { error: "Question not found.", code: "QUESTION_NOT_FOUND" },
      404,
    );
  }

  const meta: QuestionMeta = {
    functionName: question.functionName,
    params: question.params,
    outputType: question.outputType,
  };
  const testCases: TestCase[] = question.testCases;
  const codeToRun = buildPythonHarness(submission.source_code, meta, testCases);
  if (
    new TextEncoder().encode(codeToRun).byteLength > MAX_SANDBOX_SOURCE_BYTES
  ) {
    return json(
      {
        error: "Generated test program is too large.",
        code: "HARNESS_TOO_LARGE",
      },
      413,
    );
  }

  const limiter = dependencies.limiter ?? getLimiter(config);
  const decision = await limiter.acquire(userId);
  if (!decision.allowed) {
    const unavailable = decision.reason === "unavailable";
    return json(
      {
        error: unavailable
          ? "Code execution is temporarily unavailable."
          : "Too many code execution requests. Please try again shortly.",
        code: unavailable ? "LIMITER_UNAVAILABLE" : "RATE_LIMITED",
      },
      unavailable ? 503 : 429,
      { "Retry-After": String(decision.retryAfterSeconds) },
    );
  }

  const executionBackend =
    dependencies.executionBackend ?? getExecutionBackend(config);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.limits.requestTimeoutMs,
  );

  try {
    const executionResult = await executionBackend.execute(
      {
        language: submission.language,
        sourceCode: codeToRun,
        stdin: submission.stdin,
      },
      controller.signal,
    );
    const parsedResult = executionResultSchema.safeParse(executionResult);
    if (!parsedResult.success) {
      return json(
        {
          error: "The execution sandbox returned an invalid response.",
          code: "INVALID_SANDBOX_RESPONSE",
        },
        502,
      );
    }

    const result = parsedResult.data;
    const combinedOutputBytes = new TextEncoder().encode(
      result.stdout + result.stderr + result.compile_output,
    ).byteLength;
    if (combinedOutputBytes > config.limits.maxOutputBytes) {
      return json(
        {
          error: "The execution sandbox returned too much output.",
          code: "INVALID_SANDBOX_RESPONSE",
        },
        502,
      );
    }
    const testResults = parseTestOutput(
      result.stdout,
      testCases,
      question.outputType,
    );
    const allPassed =
      testResults.length > 0 &&
      testResults.every((testResult) => testResult.passed);

    return json({
      testResults,
      status: result.status.description,
      compile_output: result.compile_output,
      stderr: result.stderr,
      allPassed,
    });
  } catch {
    if (controller.signal.aborted) {
      return json(
        {
          error: "Code execution timed out.",
          code: "SANDBOX_TIMEOUT",
        },
        504,
      );
    }
    return json(
      {
        error: "Code execution is temporarily unavailable.",
        code: "SANDBOX_UNAVAILABLE",
      },
      502,
    );
  } finally {
    clearTimeout(timeout);
    try {
      await decision.lease.release();
    } catch {
      console.error("Judge concurrency lease release failed.");
    }
  }
}
