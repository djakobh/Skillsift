# Code-execution security and deployment runbook

## Current safety state

Public code execution is **disabled by default**. It may be enabled only when the Vercel Sandbox backend and shared PostgreSQL limiter are both configured; invalid or missing configuration fails closed.

The application now has a concrete isolated backend: each submission creates a new non-persistent [Vercel Sandbox](https://vercel.com/docs/sandbox) Firecracker microVM directly from the authenticated Next.js route. The old Railway runner is no longer in the execution path and still has no local subprocess fallback. There is no silent fallback to the Next.js process or Railway service container.

Code in this branch does not protect an already-running deployment until it is merged and deployed. The additive limiter migration has been applied to the existing Neon database, but the application changes are not active in production until the reviewed branch is deployed. No purchase or new database is required.

## Why Vercel Sandbox

Vercel Sandbox is the best fit for this project because it provides a fresh Firecracker microVM, separate filesystem and network, automatic Vercel OIDC authentication, and a deny-all egress policy through the SDK. It avoids exposing a Docker socket or operating a privileged worker cluster.

It also has a no-purchase path. As of September 15, 2026, the [Vercel pricing page](https://vercel.com/pricing) lists the Hobby allowance as 5 sandbox active CPU hours, 420 GB-hours of sandbox memory, 5,000 creations, 20 GB of data transfer, and 10 concurrent sandboxes per month. Vercel documents that Hobby accounts are paused at their included limits rather than charged for overages. Hobby is limited to personal, non-commercial use; if SkillSift becomes commercial, this free-plan assumption must be revisited.

The shared limiter uses the project's existing Neon PostgreSQL database, so no additional service, database, account, or purchase is required. Two small tables store hashed fixed-window counters and expiring concurrency leases; submitted code and raw user identifiers are never stored in them.

## Per-submission isolation controls

`src/lib/vercelSandboxBackend.ts` creates one sandbox per request with:

- `persistent: false`, no mounts, no exposed ports, and unconditional `sandbox.stop()` in `finally`;
- `networkPolicy: "deny-all"` from sandbox creation;
- no application environment variables passed to the sandbox;
- a new `runner` Linux user for the submission and `sudo: false`;
- one vCPU, a 12-second VM lifetime, and a 5-second command deadline by default;
- process, address-space, file-size, open-file, CPU, and core-dump limits applied before Python starts;
- a 64 KiB combined stdout/stderr limit enforced while logs stream;
- SIGKILL on output overflow or request cancellation, followed by destruction of the whole microVM;
- a single-attempt transport for non-idempotent provider calls so SDK retries cannot execute a submission twice.

The provider supplies the host-enforced microVM, vCPU, and 2 GB VM-memory boundary. The in-guest 512 MiB address-space, 64-process, and 1 MiB per-file defaults are additional controls. The entire disposable VM is the writable-storage boundary.

Expected answers and hidden/public test metadata stay in the Next.js process. Only user source, test inputs, standard input, and the minimal Python harness enter the sandbox.

## Application controls

The authenticated Next.js route retains:

- the user-session check;
- a kill switch that is disabled when unset;
- strict JSON shape, language allowlisting, and byte limits;
- per-user rate and concurrency limits plus a global concurrency limit;
- a production requirement for the shared PostgreSQL limiter, which fails closed;
- one overall request deadline and no application-level execution retry;
- controlled error responses that do not include provider or credential details.

The technical-interview UI disables only the Run action when execution is unavailable. Questions, editing, hints, and solutions remain usable, and loading state resets in `finally` after failures.

## Environment variables

### Next.js / Vercel

| Name                            | Required to enable | Default / purpose                                |
| ------------------------------- | ------------------ | ------------------------------------------------ |
| `CODE_EXECUTION_ENABLED`        | Yes                | Unset is disabled; only `true` enables requests. |
| `CODE_EXECUTION_BACKEND`        | Yes                | Unset is `disabled`; must be `vercel-sandbox`.   |
| `JUDGE_LIMITER_MODE`            | Yes in production  | Must be `postgres`; `memory` is local/test only. |
| `JUDGE_LIMITER_NAMESPACE`       | No                 | `skillsift:judge`.                               |
| `JUDGE_MAX_BODY_BYTES`          | No                 | `81920`.                                         |
| `JUDGE_MAX_CODE_BYTES`          | No                 | `65536`.                                         |
| `JUDGE_MAX_STDIN_BYTES`         | No                 | `8192`.                                          |
| `JUDGE_RATE_LIMIT_MAX`          | No                 | `5` requests per user per window.                |
| `JUDGE_RATE_LIMIT_WINDOW_MS`    | No                 | `60000`.                                         |
| `JUDGE_MAX_CONCURRENT_PER_USER` | No                 | `1`.                                             |
| `JUDGE_MAX_CONCURRENT_GLOBAL`   | No                 | `4`.                                             |
| `JUDGE_REQUEST_TIMEOUT_MS`      | No                 | `15000`, capped at 30 seconds.                   |
| `JUDGE_SANDBOX_TIMEOUT_MS`      | No                 | `12000`, capped at 30 seconds.                   |
| `JUDGE_EXECUTION_TIMEOUT_MS`    | No                 | `5000`, capped at 10 seconds.                    |
| `JUDGE_MAX_OUTPUT_BYTES`        | No                 | `65536` combined bytes.                          |
| `JUDGE_SANDBOX_MEMORY_BYTES`    | No                 | `536870912` (512 MiB address space).             |
| `JUDGE_SANDBOX_MAX_PROCESSES`   | No                 | `64`.                                            |
| `JUDGE_SANDBOX_MAX_FILE_BYTES`  | No                 | `1048576` per file.                              |

Vercel injects `VERCEL_OIDC_TOKEN` automatically into Vercel deployments for Sandbox authentication. Do not expose it, copy it into browser configuration, or pass it to the sandbox. Local live verification requires a short-lived development OIDC token obtained through the normal Vercel link/environment workflow; it must never be committed or printed.

### Retired Railway broker

The checked-in broker remains fail-closed for containment of any old deployment. Its variables are:

- `CODE_EXECUTION_ENABLED` — keep `false`;
- `RUNNER_SHARED_SECRET` — at least 32 characters while the service remains reachable;
- `RUNNER_ALLOWED_LANGUAGES`, `RUNNER_MAX_REQUEST_BYTES`, `RUNNER_MAX_SOURCE_BYTES`, `RUNNER_MAX_STDIN_BYTES`, `RUNNER_MAX_OUTPUT_BYTES`, `RUNNER_MAX_CONCURRENT_JOBS`, and `PORT` — legacy broker limits.

The Next.js sandbox backend does not use `CODE_RUNNER_URL`, `CODE_RUNNER_TOKEN`, or any Railway credential.

## Immediate containment for an existing deployment

These are operator actions; this branch did not perform them.

1. Set `CODE_EXECUTION_ENABLED=false` in all Vercel environments and redeploy. Confirm an authenticated `POST /api/judge` returns `503 EXECUTION_DISABLED`.
2. Set `CODE_EXECUTION_ENABLED=false` on the Railway code-runner service and restart it.
3. Stop the Railway runner or remove its public domain. It is not needed by the Vercel Sandbox design.
4. Until the old service is removed, keep its bearer authentication and never place `RUNNER_SHARED_SECRET` in a `NEXT_PUBLIC_` variable.

Railway service-level CPU/memory limits are not a per-submission boundary. Do not reintroduce local subprocess execution there. The legacy `railway.toml` can be removed with the service after an approved infrastructure change; no Railway configuration is required for the new backend.

## Verification

Run application and broker tests without creating cloud resources:

```text
npm run test:code-execution
```

The unit suite verifies both kill switches, runner authentication, validation and size limits, shared/in-memory limit behavior, sandbox configuration, non-root execution parameters, environment allowlisting, streamed output bounds, request cancellation cleanup, fresh sandboxes for concurrent jobs, no non-idempotent retry, hidden expected-answer exclusion, valid grading, and controlled failures.

After linking a non-production Vercel preview and explicitly accepting use of the free Sandbox allowance, run the disposable live acceptance suite:

```text
CODE_SANDBOX_LIVE_TEST=true npm run test:sandbox:live
```

On PowerShell:

```text
$env:CODE_SANDBOX_LIVE_TEST="true"
npm run test:sandbox:live
Remove-Item Env:CODE_SANDBOX_LIVE_TEST
```

The live suite creates short-lived microVMs and verifies a valid result, absence of a dummy service secret, absence of the application `.env` path, blocked outbound network access at the TLS/data boundary, bounded excessive output, execution timeout, cleanup, and cross-job filesystem separation. It uses no real service secret and does not target production.

The live Vercel Sandbox acceptance suite passed on September 15, 2026. The guarded PostgreSQL limiter acceptance suite also passed against the existing Neon database, including per-user concurrency, global concurrency, rate limiting, lease release, and cleanup of its temporary rows.

## No-cost preview rollout steps

Rollout status and remaining steps:

1. **Complete:** apply the additive `add_judge_limits` Prisma migration to the existing Neon database.
2. **Complete:** run the sandbox and PostgreSQL live acceptance suites with disposable resources and dummy data.
3. Configure Preview with `CODE_EXECUTION_BACKEND=vercel-sandbox`, `JUDGE_LIMITER_MODE=postgres`, and `CODE_EXECUTION_ENABLED=true`, then deploy the branch.
4. Verify the protected Preview route and authenticated technical-interview UI.
5. Merge and deploy with production initially fail-closed, then configure the same three variables and redeploy the reviewed artifact.
6. Verify production authentication and a valid submission. If the Vercel Sandbox free allowance is exhausted, execution must become unavailable rather than switching to a paid plan.

## Release decision

Application-level controls and the sandbox adapter are implemented and locally unit-tested. The managed host controls have also been exercised with this Vercel project: fresh microVMs, deny-all network behavior, bounded output, timeouts, secret/file separation, concurrent filesystem isolation, and cleanup all passed. The existing Neon database passed the shared limiter acceptance test.

Public execution must remain disabled until the reviewed deployment is configured and its Preview integration smoke test passes. There is no required purchase, new database, or Railway migration.

## Interview summary

“I removed the unsafe same-container execution path and kept a two-layer fail-closed switch. Each submission now gets a fresh non-persistent Firecracker microVM with no application secrets, deny-all networking, a non-root user, OS resource limits, bounded streamed output, hard deadlines, and whole-VM cleanup. Rate and concurrency limits are shared through the existing Neon database, and non-idempotent calls are never retried. Hidden expected answers remain in the application instead of entering the sandbox. I selected a free-tier managed sandbox so the project does not need a privileged Docker host, and verified its real isolation behavior before enabling the feature.”
