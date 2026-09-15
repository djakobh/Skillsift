import assert from "node:assert/strict";

import type { JudgeLimits } from "../src/lib/judgeSecurity";
import { VercelSandboxBackend } from "../src/lib/vercelSandboxBackend";

if (process.env.CODE_SANDBOX_LIVE_TEST !== "true") {
  throw new Error(
    "Refusing to create sandbox resources. Set CODE_SANDBOX_LIVE_TEST=true for this explicit live acceptance test.",
  );
}

const limits: JudgeLimits = {
  maxBodyBytes: 80 * 1024,
  maxCodeBytes: 64 * 1024,
  maxStdinBytes: 8 * 1024,
  rateLimitMax: 5,
  rateLimitWindowMs: 60_000,
  maxConcurrentPerUser: 1,
  maxConcurrentGlobal: 4,
  requestTimeoutMs: 20_000,
  sandboxTimeoutMs: 15_000,
  executionTimeoutMs: 3_000,
  maxOutputBytes: 16 * 1024,
  memoryBytes: 256 * 1024 * 1024,
  maxProcesses: 16,
  maxFileBytes: 256 * 1024,
};

const backend = new VercelSandboxBackend(limits);

async function execute(sourceCode: string) {
  return backend.execute(
    { language: "python", sourceCode, stdin: "" },
    AbortSignal.timeout(limits.requestTimeoutMs),
  );
}

async function main() {
  process.env.DUMMY_SERVICE_SECRET = "must-not-enter-the-sandbox";

  const valid = await execute("print('valid-result')");
  assert.equal(valid.status.description, "Accepted");
  assert.equal(valid.stdout.trim(), "valid-result");

  const isolation = await execute(`
import json
import os
import pathlib
import socket
import ssl

try:
    pathlib.Path("/vercel/path0/.env").read_text()
    protected_file_visible = True
except Exception:
    protected_file_visible = False

try:
    connection = socket.create_connection(("1.1.1.1", 443), timeout=2)
    with ssl.create_default_context().wrap_socket(
        connection,
        server_hostname="one.one.one.one",
    ) as tls_connection:
        tls_connection.sendall(b"GET / HTTP/1.0\\r\\nHost: one.one.one.one\\r\\n\\r\\n")
        tls_connection.recv(1)
    network_available = True
except Exception:
    network_available = False

print(json.dumps({
    "secret": os.environ.get("DUMMY_SERVICE_SECRET"),
    "protected_file_visible": protected_file_visible,
    "network_available": network_available,
}))
`);
  const isolationResult = JSON.parse(isolation.stdout.trim()) as {
    secret: string | null;
    protected_file_visible: boolean;
    network_available: boolean;
  };
  assert.equal(isolationResult.secret, null);
  assert.equal(isolationResult.protected_file_visible, false);
  assert.equal(isolationResult.network_available, false);

  const excessiveOutput = await execute(
    `print("x" * ${limits.maxOutputBytes + 1})`,
  );
  assert.equal(excessiveOutput.status.description, "Output Limit Exceeded");

  const timeout = await execute("while True: pass");
  assert.equal(timeout.status.description, "Time Limit Exceeded");

  const markers = await Promise.all(
    ["job-a", "job-b"].map((marker) =>
      execute(`
from pathlib import Path
from time import sleep
Path("marker.txt").write_text("${marker}")
sleep(0.2)
print(Path("marker.txt").read_text())
`),
    ),
  );
  assert.deepEqual(markers.map((result) => result.stdout.trim()).sort(), [
    "job-a",
    "job-b",
  ]);

  console.log("Vercel Sandbox live acceptance checks passed.");
}

await main();
