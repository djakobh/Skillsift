import assert from "node:assert/strict";
import { test } from "node:test";

import type { JudgeLimits } from "../src/lib/judgeSecurity";
import {
  VercelSandboxBackend,
  singleAttemptFetch,
  type SandboxFactory,
} from "../src/lib/vercelSandboxBackend";

const limits: JudgeLimits = {
  maxBodyBytes: 80 * 1024,
  maxCodeBytes: 64 * 1024,
  maxStdinBytes: 8 * 1024,
  rateLimitMax: 5,
  rateLimitWindowMs: 60_000,
  maxConcurrentPerUser: 1,
  maxConcurrentGlobal: 4,
  requestTimeoutMs: 15_000,
  sandboxTimeoutMs: 12_000,
  executionTimeoutMs: 5_000,
  maxOutputBytes: 64,
  memoryBytes: 512 * 1024 * 1024,
  maxProcesses: 64,
  maxFileBytes: 1024 * 1024,
};

function fakeFactory(options: {
  logs?: Array<{ stream: string; data: string }>;
  exitCode?: number;
  onCreate?: (parameters: Record<string, unknown>) => void;
}) {
  const state = {
    users: [] as string[],
    files: [] as Array<{ path: string; content: Uint8Array; mode?: number }>,
    command: undefined as Record<string, unknown> | undefined,
    kills: 0,
    stops: 0,
  };

  const create: SandboxFactory = async (parameters) => {
    options.onCreate?.(parameters as Record<string, unknown>);
    return {
      async createUser(username) {
        state.users.push(username);
        return {
          async writeFiles(files) {
            state.files.push(...files);
          },
          async runCommand(parameters) {
            state.command = parameters;
            return {
              async *logs() {
                for (const log of options.logs ?? []) yield log;
              },
              async wait() {
                return { exitCode: options.exitCode ?? 0, durationMs: 10 };
              },
              async kill() {
                state.kills += 1;
              },
            };
          },
        };
      },
      async stop() {
        state.stops += 1;
      },
    };
  };

  return { create, state };
}

test("each submission uses a disposable, network-denied microVM and non-root user", async () => {
  let createParameters: Record<string, unknown> | undefined;
  const { create, state } = fakeFactory({
    logs: [{ stream: "stdout", data: "test_case_output:3\n" }],
    onCreate(parameters) {
      createParameters = parameters;
    },
  });
  const backend = new VercelSandboxBackend(
    { ...limits, maxOutputBytes: 1024 },
    create,
  );

  const result = await backend.execute(
    {
      language: "python",
      sourceCode: "print('test_case_output:3')",
      stdin: "input",
    },
    new AbortController().signal,
  );

  assert.equal(createParameters?.persistent, false);
  assert.equal(createParameters?.image, "vercel/sandbox/universal");
  assert.equal(createParameters?.networkPolicy, "deny-all");
  assert.deepEqual(createParameters?.ports, []);
  assert.deepEqual(createParameters?.env, {});
  assert.deepEqual(createParameters?.resources, { vcpus: 1 });
  assert.deepEqual(state.users, ["runner"]);
  assert.equal(state.command?.sudo, false);
  assert.equal(state.command?.timeoutMs, limits.executionTimeoutMs);
  assert.deepEqual(state.command?.env, {
    HOME: "/home/runner",
    LANG: "C.UTF-8",
    PATH: "/usr/bin:/bin",
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONIOENCODING: "utf-8",
  });
  const launcher = state.files.find((file) => file.path === "launch.py");
  assert.ok(launcher);
  const launcherText = new TextDecoder().decode(launcher.content);
  assert.match(launcherText, /RLIMIT_AS/);
  assert.match(launcherText, /RLIMIT_NPROC/);
  assert.match(launcherText, /RLIMIT_FSIZE/);
  assert.doesNotMatch(launcherText, /DUMMY_SERVICE_SECRET/);
  assert.equal(result.status.description, "Accepted");
  assert.equal(state.stops, 1);
});

test("output is bounded during collection and the entire sandbox is stopped", async () => {
  const { create, state } = fakeFactory({
    logs: [{ stream: "stdout", data: "x".repeat(65) }],
  });
  const backend = new VercelSandboxBackend(limits, create);
  const result = await backend.execute(
    { language: "python", sourceCode: "print('x')", stdin: "" },
    new AbortController().signal,
  );

  assert.equal(result.status.description, "Output Limit Exceeded");
  assert.equal(new TextEncoder().encode(result.stdout).byteLength <= 64, true);
  assert.equal(state.kills, 1);
  assert.equal(state.stops, 1);
});

test("an aborted request kills the command and destroys the sandbox", async () => {
  const controller = new AbortController();
  const state = { kills: 0, stops: 0 };
  const create: SandboxFactory = async () => ({
    async createUser() {
      return {
        async writeFiles() {},
        async runCommand() {
          return {
            async *logs() {
              controller.abort();
              throw new DOMException("aborted", "AbortError");
            },
            async wait() {
              return { exitCode: 0 };
            },
            async kill() {
              state.kills += 1;
            },
          };
        },
      };
    },
    async stop() {
      state.stops += 1;
    },
  });

  await assert.rejects(
    new VercelSandboxBackend(limits, create).execute(
      { language: "python", sourceCode: "while True: pass", stdin: "" },
      controller.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(state.kills, 1);
  assert.equal(state.stops, 1);
});

test("concurrent jobs receive different sandbox instances", async () => {
  let creations = 0;
  const create: SandboxFactory = async () => {
    creations += 1;
    return fakeFactory({}).create({});
  };
  const backend = new VercelSandboxBackend(limits, create);
  await Promise.all([
    backend.execute(
      { language: "python", sourceCode: "pass", stdin: "" },
      new AbortController().signal,
    ),
    backend.execute(
      { language: "python", sourceCode: "pass", stdin: "" },
      new AbortController().signal,
    ),
  ]);
  assert.equal(creations, 2);
});

test("non-idempotent provider failures are made terminal for the SDK", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    const response = await singleAttemptFetch("https://sandbox.test", {
      method: "POST",
    });
    assert.equal(response.status, 400);

    globalThis.fetch = async () => {
      throw new TypeError("network failed");
    };
    await assert.rejects(
      singleAttemptFetch("https://sandbox.test", { method: "POST" }),
      { name: "AbortError" },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
