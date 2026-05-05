import { NextRequest, NextResponse } from "next/server";

//Alvin - added imports for test harness builder and question loader
import { readFileSync } from "fs";
import path from "path";
import {
  buildPythonHarness,
  parseTestOutput,
  type TestCase,
} from "~/lib/testHarness";

// points to our docker code-runner container
const CODE_RUNNER_URL = process.env.CODE_RUNNER_URL || "http://localhost:2358";

interface ExecutionRequest {
  source_code: string;
  language: string;
  //Alvin - added questionId to trigger test harness mode
  questionId?: string;
  stdin?: string;
}

interface CodeRunnerResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

//Alvin - loads a single question with test cases from the JSON file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadQuestion(questionId: string): any | null {
  const filePath = path.join(process.cwd(), "prisma/data/consolidated-questions.json");
  const all = JSON.parse(readFileSync(filePath, "utf-8"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return all.find((q: any) => q.id === questionId) ?? null;
}

//Alvin - wraps user's Python Solution class with a test runner
function buildHarness(
  source_code: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  question: any,
  testCases: TestCase[]
): string {
  const meta = {
    functionName: question.functionName as string,
    params: question.params as { name: string; type: string }[],
    outputType: question.outputType as string,
  };

  return buildPythonHarness(source_code, meta, testCases);
}

// receives code from frontend, forwards to docker container, returns result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source_code, language, questionId, stdin = "" } = body as ExecutionRequest;

    if (!source_code || !language) {
      return NextResponse.json(
        { error: "Missing source_code or language" },
        { status: 400 }
      );
    }

    //Alvin - if questionId provided, wrap code with test harness before executing
    let codeToRun = source_code;
    let question = null;

    if (questionId) {
      question = loadQuestion(questionId);
      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      const testCases: TestCase[] = question.testCases ?? [];
      codeToRun = buildHarness(source_code, question, testCases);
    }

    // send code to docker container for execution
    const response = await fetch(`${CODE_RUNNER_URL}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        source_code: codeToRun,
        stdin,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Code execution failed: ${errorText}` },
        { status: 500 }
      );
    }

    const result: CodeRunnerResult = await response.json();

    //Alvin - parse from stdout into per-test-case results and return them
    if (question) {
      const testCases: TestCase[] = question.testCases ?? [];
      const testResults = parseTestOutput(
        result.stdout ?? "",
        testCases,
        question.outputType as string
      );

      const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);

      return NextResponse.json({
        testResults,
        status: result.status.description,
        compile_output: result.compile_output || "",
        stderr: result.stderr || "",
        allPassed,
      });
    }

    // Raw execution in case of no question id error handling
    return NextResponse.json({
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      compile_output: result.compile_output || "",
      status: result.status.description,
      time: result.time,
      memory: result.memory,
    });
  } catch (error) {
    console.error("Code execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
