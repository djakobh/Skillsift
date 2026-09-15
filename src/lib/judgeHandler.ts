import { randomUUID } from "node:crypto";
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

const MAX_RUNNER_SOURCE_BYTES = 256 * 1024;
const MAX_RUNNER_RESPONSE_BYTES = 80 * 1024;
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

const runnerResultSchema = z
  .object({
    stdout: z.string().max(MAX_RUNNER_RESPONSE_BYTES),
    stderr: z.string().max(MAX_RUNNER_RESPONSE_BYTES),
    compile_output: z.string().max(MAX_RUNNER_RESPONSE_BYTES),
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
  fetchImpl?: typeof fetch;
  loadQuestion?: (questionId: string) => Question | null;
}

let questionCache: Question[] | null = null;
let limiterCache: { key: string; limiter: JudgeLimiter } | null = null;

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

async function readBoundedResponse(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Runner response exceeded the output limit.");
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
  return new TextDecoder().decode(bytes);
}

function safeRunnerUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/submissions`;
  url.search = "";
  url.hash = "";
  return url.toString();
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
    new TextEncoder().encode(codeToRun).byteLength > MAX_RUNNER_SOURCE_BYTES
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

  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.limits.upstreamTimeoutMs,
  );

  try {
    const response = await fetchImpl(safeRunnerUrl(config.runnerUrl!), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.runnerToken!}`,
        "Content-Type": "application/json",
        "X-Request-ID": randomUUID(),
      },
      body: JSON.stringify({
        language: submission.language,
        source_code: codeToRun,
        stdin: submission.stdin,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const responseText = await readBoundedResponse(
      response,
      MAX_RUNNER_RESPONSE_BYTES,
    );
    let responseBody: unknown = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      // A malformed runner response is handled below without returning its contents.
    }

    if (!response.ok) {
      const upstreamCode =
        responseBody &&
        typeof responseBody === "object" &&
        "code" in responseBody
          ? (responseBody as { code?: unknown }).code
          : undefined;
      if (response.status === 503 && upstreamCode === "EXECUTION_DISABLED") {
        return json(EXECUTION_DISABLED_RESPONSE, 503);
      }
      if (response.status === 429) {
        return json(
          {
            error: "The code runner is busy. Please try again shortly.",
            code: "RUNNER_BUSY",
          },
          429,
          { "Retry-After": response.headers.get("retry-after") ?? "1" },
        );
      }
      return json(
        {
          error: "Code execution is temporarily unavailable.",
          code: "RUNNER_ERROR",
        },
        502,
      );
    }

    const parsedResult = runnerResultSchema.safeParse(responseBody);
    if (!parsedResult.success) {
      return json(
        {
          error: "The code runner returned an invalid response.",
          code: "INVALID_RUNNER_RESPONSE",
        },
        502,
      );
    }

    const result = parsedResult.data;
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return json(
        {
          error: "Code execution timed out before the runner responded.",
          code: "RUNNER_TIMEOUT",
        },
        504,
      );
    }
    return json(
      {
        error: "Code execution is temporarily unavailable.",
        code: "RUNNER_UNREACHABLE",
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
