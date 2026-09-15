import type { Sandbox } from "@vercel/sandbox";

import type { JudgeLimits } from "~/lib/judgeSecurity";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

export interface ExecutionRequest {
  language: "python";
  sourceCode: string;
  stdin: string;
}

export interface ExecutionBackend {
  execute(
    request: ExecutionRequest,
    signal: AbortSignal,
  ): Promise<ExecutionResult>;
}

interface SandboxCommandLike {
  logs(options?: { signal?: AbortSignal }): AsyncIterable<{
    stream: string;
    data: string;
  }>;
  wait(options?: { signal?: AbortSignal }): Promise<{
    exitCode: number;
    durationMs?: number;
  }>;
  kill(signal?: "SIGKILL"): Promise<void>;
}

interface SandboxUserLike {
  writeFiles(
    files: Array<{ path: string; content: Uint8Array; mode?: number }>,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  runCommand(parameters: {
    cmd: string;
    args: string[];
    env: Record<string, string>;
    detached: true;
    sudo: false;
    signal: AbortSignal;
    timeoutMs: number;
  }): Promise<SandboxCommandLike>;
}

interface SandboxLike {
  createUser(
    username: string,
    options?: { signal?: AbortSignal },
  ): Promise<SandboxUserLike>;
  stop(options?: { signal?: AbortSignal }): Promise<unknown>;
}

export type SandboxFactory = (
  parameters: Parameters<typeof Sandbox.create>[0],
) => Promise<SandboxLike>;

const encoder = new TextEncoder();

function isSafeMethod(method: string | undefined): boolean {
  return method === undefined || method === "GET" || method === "HEAD";
}

/**
 * The SDK retries transient API responses by default. Retrying a create or
 * command POST could create two sandboxes or execute one submission twice.
 * Convert retryable responses/errors for non-idempotent requests into terminal
 * failures before the SDK retry wrapper sees them.
 */
export const singleAttemptFetch: typeof fetch = async (input, init) => {
  const method = (
    init?.method ?? (input instanceof Request ? input.method : undefined)
  )?.toUpperCase();
  try {
    const response = await fetch(input, init);
    if (
      !isSafeMethod(method) &&
      (response.status === 429 || response.status >= 500)
    ) {
      return new Response(response.body, {
        status: 400,
        statusText: "Non-idempotent sandbox request failed",
        headers: response.headers,
      });
    }
    return response;
  } catch (error) {
    if (
      !isSafeMethod(method) &&
      !(error instanceof DOMException && error.name === "AbortError")
    ) {
      throw new DOMException(
        "Non-idempotent sandbox request failed without retry.",
        "AbortError",
      );
    }
    throw error;
  }
};

function buildLauncher(limits: JudgeLimits): string {
  const cpuSeconds = Math.max(1, Math.ceil(limits.executionTimeoutMs / 1000));
  return `import os
import resource

resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
resource.setrlimit(resource.RLIMIT_CPU, (${cpuSeconds}, ${cpuSeconds}))
resource.setrlimit(resource.RLIMIT_FSIZE, (${limits.maxFileBytes}, ${limits.maxFileBytes}))
resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
resource.setrlimit(resource.RLIMIT_NPROC, (${limits.maxProcesses}, ${limits.maxProcesses}))
resource.setrlimit(resource.RLIMIT_AS, (${limits.memoryBytes}, ${limits.memoryBytes}))

stdin_file = open("stdin.txt", "rb", buffering=0)
os.dup2(stdin_file.fileno(), 0)
os.execve(
    "/usr/bin/python3",
    ["python3", "-I", "-B", "submission.py"],
    {"HOME": os.getcwd(), "LANG": "C.UTF-8", "PATH": "/usr/bin:/bin", "PYTHONIOENCODING": "utf-8"},
)
`;
}

function appendBounded(
  chunks: string[],
  value: string,
  state: { bytes: number },
  limit: number,
): boolean {
  const bytes = encoder.encode(value).byteLength;
  if (state.bytes + bytes > limit) return false;
  state.bytes += bytes;
  chunks.push(value);
  return true;
}

async function defaultSandboxFactory(
  parameters: Parameters<typeof Sandbox.create>[0],
): Promise<SandboxLike> {
  const { Sandbox: VercelSandbox } = await import("@vercel/sandbox");
  return VercelSandbox.create(parameters);
}

export class VercelSandboxBackend implements ExecutionBackend {
  constructor(
    private readonly limits: JudgeLimits,
    private readonly createSandbox: SandboxFactory = defaultSandboxFactory,
  ) {}

  async execute(
    request: ExecutionRequest,
    signal: AbortSignal,
  ): Promise<ExecutionResult> {
    if (request.language !== "python") {
      throw new Error("Unsupported sandbox language.");
    }

    let sandbox: SandboxLike | undefined;
    let command: SandboxCommandLike | undefined;
    const startedAt = Date.now();

    try {
      sandbox = await this.createSandbox({
        image: "vercel/sandbox/universal",
        persistent: false,
        timeout: this.limits.sandboxTimeoutMs,
        resources: { vcpus: 1 },
        networkPolicy: "deny-all",
        ports: [],
        env: {},
        signal,
        fetch: singleAttemptFetch,
      });

      const user = await sandbox.createUser("runner", { signal });
      await user.writeFiles(
        [
          {
            path: "submission.py",
            content: encoder.encode(request.sourceCode),
            mode: 0o400,
          },
          {
            path: "stdin.txt",
            content: encoder.encode(request.stdin),
            mode: 0o400,
          },
          {
            path: "launch.py",
            content: encoder.encode(buildLauncher(this.limits)),
            mode: 0o500,
          },
        ],
        { signal },
      );

      command = await user.runCommand({
        cmd: "/usr/bin/python3",
        args: ["-I", "-B", "launch.py"],
        env: {
          HOME: "/home/runner",
          LANG: "C.UTF-8",
          PATH: "/usr/bin:/bin",
          PYTHONDONTWRITEBYTECODE: "1",
          PYTHONIOENCODING: "utf-8",
        },
        detached: true,
        sudo: false,
        signal,
        timeoutMs: this.limits.executionTimeoutMs,
      });

      const stdout: string[] = [];
      const stderr: string[] = [];
      const outputState = { bytes: 0 };
      let outputExceeded = false;

      for await (const log of command.logs({ signal })) {
        const target = log.stream === "stderr" ? stderr : stdout;
        if (
          !appendBounded(
            target,
            log.data,
            outputState,
            this.limits.maxOutputBytes,
          )
        ) {
          outputExceeded = true;
          await command.kill("SIGKILL").catch(() => undefined);
          break;
        }
      }

      const finished = await command.wait({ signal });
      const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(3);

      if (outputExceeded) {
        return {
          stdout: stdout.join(""),
          stderr: stderr.join(""),
          compile_output: "",
          status: { id: 10, description: "Output Limit Exceeded" },
          time: durationSeconds,
          memory: null,
        };
      }

      const timedOut = [124, 137, 152, -9].includes(finished.exitCode);
      return {
        stdout: stdout.join(""),
        stderr: stderr.join(""),
        compile_output: "",
        status: timedOut
          ? { id: 5, description: "Time Limit Exceeded" }
          : finished.exitCode === 0
            ? { id: 3, description: "Accepted" }
            : { id: 11, description: "Runtime Error" },
        time: durationSeconds,
        memory: null,
      };
    } finally {
      if (signal.aborted && command) {
        await command.kill("SIGKILL").catch(() => undefined);
      }
      if (sandbox) {
        await sandbox.stop({ signal: AbortSignal.timeout(5_000) });
      }
    }
  }
}
