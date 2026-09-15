# Code-execution security and deployment runbook

## Current safety state

Public code execution is **disabled by default and must not be re-enabled yet**.

The old runner executed submitted Python and C++ directly as child processes of the Flask service. That path has been removed. The deployed runner image is now an authenticated broker with no compiler and no local subprocess fallback. Until a separately deployed per-submission isolation backend implements `ExecutionBackend`, an enabled broker still returns `503 SANDBOX_UNAVAILABLE`.

This is intentional fail-closed behavior. A temporary directory, timeout, import blacklist, container-level non-root user, or service-level CPU/memory limit would not make arbitrary code safe to run in the API service container.

Code in this branch does not protect any already-running deployment until the branch is reviewed, merged, and deployed.

## Immediate containment for the existing deployment

These are deployment actions for an authorized operator; this branch does not make them automatically.

1. In Vercel, set `CODE_EXECUTION_ENABLED=false` for Production, Preview, and Development, then redeploy the application. Confirm an authenticated `POST /api/judge` returns `503` with code `EXECUTION_DISABLED`.
2. In Railway, set `CODE_EXECUTION_ENABLED=false` on the code-runner service and restart/redeploy it. Confirm an authenticated `POST /submissions` returns the same controlled `503` code.
3. Stop the old runner replica if it is not needed. Otherwise remove its public domain under **Settings → Networking**. Railway documents that public domains can be deleted and sibling services can use `<service>.railway.internal`; note that a Vercel deployment cannot reach a Railway-private hostname, so do not point Vercel at that hostname without an approved network/hosting change.
4. If the old runner must remain temporarily reachable during migration, keep execution disabled and require the new shared secret before any request parsing. Remove public exposure as soon as the caller has a private route.

Do not rotate a live secret or change production networking without an approved maintenance action. After approval, generate a new random value of at least 32 bytes and set the same value as `CODE_RUNNER_TOKEN` in Vercel and `RUNNER_SHARED_SECRET` in Railway. Never use a `NEXT_PUBLIC_` variable for it.

Railway references:

- [Lock down a production project](https://docs.railway.com/guides/lock-down-production-project)
- [Private and public domains](https://docs.railway.com/networking/domains/working-with-domains)
- [Replica resource limits](https://docs.railway.com/pricing/cost-control)

The checked-in `docker/code-runner/railway.toml` still applies to an existing legacy service and now sets a short deploy healthcheck plus a bounded restart policy. Railway has [deprecated Config as Code](https://docs.railway.com/config-as-code) and documents a hard cutoff of December 1, 2026. Before that date, an authorized operator should run `railway config pull`, review the generated `.railway/railway.ts`, and use `railway config plan`; do not apply the infrastructure migration from this PR.

## Environment variables

### Next.js / Vercel

| Name                            | Required to enable | Default / purpose                                                                 |
| ------------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `CODE_EXECUTION_ENABLED`        | Yes                | Unset is disabled; only `true` enables requests.                                  |
| `CODE_RUNNER_URL`               | Yes                | Server-only broker URL. No browser exposure.                                      |
| `CODE_RUNNER_TOKEN`             | Yes                | Server-only bearer secret, at least 32 characters.                                |
| `JUDGE_LIMITER_MODE`            | Yes in production  | Must be `upstash` in production; `memory` is only suitable for one local process. |
| `UPSTASH_REDIS_REST_URL`        | Yes in production  | HTTPS endpoint for shared rate and concurrency state.                             |
| `UPSTASH_REDIS_REST_TOKEN`      | Yes in production  | Server-only Redis REST token.                                                     |
| `JUDGE_LIMITER_NAMESPACE`       | No                 | `skillsift:judge`.                                                                |
| `JUDGE_MAX_BODY_BYTES`          | No                 | `81920`.                                                                          |
| `JUDGE_MAX_CODE_BYTES`          | No                 | `65536`.                                                                          |
| `JUDGE_MAX_STDIN_BYTES`         | No                 | `8192`.                                                                           |
| `JUDGE_RATE_LIMIT_MAX`          | No                 | `5` requests per user per window.                                                 |
| `JUDGE_RATE_LIMIT_WINDOW_MS`    | No                 | `60000`.                                                                          |
| `JUDGE_MAX_CONCURRENT_PER_USER` | No                 | `1`.                                                                              |
| `JUDGE_MAX_CONCURRENT_GLOBAL`   | No                 | `4`.                                                                              |
| `JUDGE_UPSTREAM_TIMEOUT_MS`     | No                 | `8000`, capped in code at 30 seconds.                                             |

The shared limiter uses one atomic Redis script to take a fixed-window rate slot and a per-user/global concurrency lease. Redis failure rejects the request; it does not fail open. The upstream call has one deadline and is never automatically retried.

### Railway code-runner broker

| Name                         | Required            | Default / purpose                                                                                 |
| ---------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| `CODE_EXECUTION_ENABLED`     | Yes to accept jobs  | Unset is disabled. Keep `false` until isolation is verified.                                      |
| `RUNNER_SHARED_SECRET`       | Always              | Must match `CODE_RUNNER_TOKEN` and be at least 32 characters. Missing configuration fails closed. |
| `RUNNER_ALLOWED_LANGUAGES`   | No                  | `python`.                                                                                         |
| `RUNNER_MAX_REQUEST_BYTES`   | No                  | `307200`.                                                                                         |
| `RUNNER_MAX_SOURCE_BYTES`    | No                  | `262144`, allowing the server-generated harness.                                                  |
| `RUNNER_MAX_STDIN_BYTES`     | No                  | `8192`.                                                                                           |
| `RUNNER_MAX_OUTPUT_BYTES`    | No                  | `65536` combined bytes; the future backend must also enforce this while streaming.                |
| `RUNNER_MAX_CONCURRENT_JOBS` | No                  | `2`.                                                                                              |
| `PORT`                       | Railway supplies it | `5000` locally.                                                                                   |

The Docker image runs the broker as UID/GID `10001`, but that hardens the broker only; it is not presented as an untrusted-code sandbox.

## Language contract

The question harness is Python-only. The app API and UI now allow only `python`; C++ is rejected with `422 UNSUPPORTED_LANGUAGE` instead of being wrapped in a Python harness. Reintroducing another language requires a language-specific harness plus the same isolation controls for both compilation and execution.

## Isolation migration plan

Railway's documented resource limits cap a whole replica. They do not create a fresh security boundary, filesystem, network namespace, secret set, or cgroup for each submission. Therefore the current Railway service is suitable as an authenticated broker, not as the execution sandbox.

After approval of a provider or dedicated host:

1. Implement an `ExecutionBackend` adapter that creates one disposable sandbox per submission. Keep provider credentials only in the broker; send only language, generated source, stdin, and opaque job metadata.
2. Use a microVM or hardened container runtime designed for hostile workloads (for example Firecracker, Kata Containers, or gVisor on a dedicated worker cluster). Do not mount a Docker socket into the public broker and do not use privileged containers.
3. Start each compile/run job with no application environment, secrets, volumes, or service-account credentials; a read-only runtime image; a size-limited disposable writable directory; a non-root UID; dropped capabilities; `no-new-privileges`; and a restrictive seccomp/AppArmor profile.
4. Apply default-deny egress and ingress, including loopback/internal metadata and private service ranges. Allow no network for SkillSift question execution.
5. Enforce sandbox-level cgroup CPU, aggregate memory, PID count, filesystem quota, wall time, and streaming stdout/stderr limits. Use the same limits for compilation. On timeout, cancellation, broker disconnect, or output overflow, destroy the entire sandbox rather than killing only its leading process.
6. Return a small typed result to the broker, destroy the sandbox, and verify deletion before releasing the concurrency lease.
7. Run the isolation acceptance suite in a disposable staging environment: descendant-process timeout cleanup; fork/memory/output bombs; access attempts against a dummy secret, protected host file, metadata/private network targets, and a local canary service; and concurrent jobs with unique file markers.
8. Capture provider/runtime configuration and test evidence in the PR. Only then set `CODE_EXECUTION_ENABLED=true` on both services.

A self-hosted implementation requires a dedicated worker cluster and a sandbox runtime class with default-deny network policy; it must not share the SkillSift application or database trust boundary. A managed sandbox provider is operationally simpler, but selecting or purchasing one requires approval.

## Verification boundaries

Application-level tests cover authentication, both kill switches, strict request validation, byte limits, language allowlisting, per-user/global limits, shared-limiter production requirements, upstream deadline/no retry, bounded response collection, controlled errors, and preservation of valid test results through a fake backend.

Runner tests cover fail-closed configuration, authentication, validation, size limits, concurrency rejection, disabled behavior, and the absence of a local subprocess/compiler fallback. Because this workstation has no running Docker/Linux sandbox and no external isolation backend was authorized, host-enforced process, memory, filesystem, and network isolation are **not verified** here. Those acceptance tests are a release gate in the migration plan, not a claimed protection.

## Interview summary

“I treated user code as hostile. I first added a two-layer kill switch and removed the unsafe in-container execution fallback. Then I authenticated service-to-service calls, validated and bounded every request, added per-user and global limits, enforced one upstream deadline without retries, and kept credentials server-only. I fixed the Python/C++ harness mismatch and made the UI degrade gracefully. Most importantly, I separated application controls from real sandbox controls: Railway's service container is not a fresh boundary per submission, so public execution stays off until a disposable microVM or hardened-container backend passes network, secret, filesystem, process, memory, timeout, output, cleanup, and cross-job isolation tests.”
