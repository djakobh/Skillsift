#!/usr/bin/env python3
"""Authenticated broker for a future per-submission isolation service.

This service intentionally has no local subprocess execution fallback. Railway's
service container is not a per-submission security boundary, so enabling the
feature without an independently verified backend still fails closed.
"""

from __future__ import annotations

import hmac
import os
import threading
from collections.abc import Mapping
from typing import Any, Protocol

from flask import Flask, Response, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge


DISABLED_RESPONSE = {
    "error": "Code execution is temporarily unavailable. You can still edit code and use hints.",
    "code": "EXECUTION_DISABLED",
}


class ExecutionBackend(Protocol):
    """Contract for an out-of-process, per-submission sandbox backend.

    Implementations must enforce output limits while streaming. The broker's
    response validation is only a second bound, not a substitute for that.
    """

    name: str

    @property
    def ready(self) -> bool: ...

    def execute(self, language: str, source_code: str, stdin: str) -> Mapping[str, Any]: ...


class UnavailableExecutionBackend:
    """Fail-closed default used until a real isolation service is connected."""

    name = "unavailable"
    ready = False

    def execute(self, language: str, source_code: str, stdin: str) -> Mapping[str, Any]:
        raise RuntimeError("No isolated execution backend is configured.")


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() == "true"


def _env_int(name: str, default: int, maximum: int) -> int:
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if 0 < value <= maximum else default


def _error(message: str, code: str, status: int, headers: Mapping[str, str] | None = None):
    response = jsonify({"error": message, "code": code})
    response.status_code = status
    if headers:
        response.headers.update(headers)
    return response


def _authorized(configured_secret: str) -> bool:
    value = request.headers.get("Authorization", "")
    prefix = "Bearer "
    if not value.startswith(prefix):
        return False
    supplied = value[len(prefix) :]
    return bool(supplied) and hmac.compare_digest(supplied, configured_secret)


def _validated_backend_result(
    result: Mapping[str, Any], max_output_bytes: int
) -> dict[str, Any]:
    stdout = result.get("stdout")
    stderr = result.get("stderr")
    compile_output = result.get("compile_output")
    status = result.get("status")
    if not all(isinstance(value, str) for value in (stdout, stderr, compile_output)):
        raise ValueError("Backend output fields must be strings.")
    output_bytes = sum(
        len(value.encode("utf-8")) for value in (stdout, stderr, compile_output)
    )
    if output_bytes > max_output_bytes:
        raise ValueError("Backend output exceeded the broker limit.")
    if not isinstance(status, Mapping):
        raise ValueError("Backend status is invalid.")
    status_id = status.get("id")
    status_description = status.get("description")
    if not isinstance(status_id, int) or not isinstance(status_description, str):
        raise ValueError("Backend status is invalid.")

    time_value = result.get("time")
    memory_value = result.get("memory")
    if time_value is not None and not isinstance(time_value, str):
        raise ValueError("Backend time is invalid.")
    if memory_value is not None and not isinstance(memory_value, (int, float)):
        raise ValueError("Backend memory is invalid.")

    return {
        "stdout": stdout,
        "stderr": stderr,
        "compile_output": compile_output,
        "status": {"id": status_id, "description": status_description[:100]},
        "time": time_value,
        "memory": memory_value,
    }


def create_app(
    execution_backend: ExecutionBackend | None = None,
    config_overrides: Mapping[str, Any] | None = None,
) -> Flask:
    app = Flask(__name__)
    app.config.update(
        CODE_EXECUTION_ENABLED=_env_flag("CODE_EXECUTION_ENABLED"),
        RUNNER_SHARED_SECRET=os.environ.get("RUNNER_SHARED_SECRET", ""),
        RUNNER_MAX_REQUEST_BYTES=_env_int("RUNNER_MAX_REQUEST_BYTES", 300 * 1024, 1024 * 1024),
        RUNNER_MAX_SOURCE_BYTES=_env_int("RUNNER_MAX_SOURCE_BYTES", 256 * 1024, 512 * 1024),
        RUNNER_MAX_STDIN_BYTES=_env_int("RUNNER_MAX_STDIN_BYTES", 8 * 1024, 64 * 1024),
        RUNNER_MAX_OUTPUT_BYTES=_env_int("RUNNER_MAX_OUTPUT_BYTES", 64 * 1024, 512 * 1024),
        RUNNER_MAX_CONCURRENT_JOBS=_env_int("RUNNER_MAX_CONCURRENT_JOBS", 2, 32),
        RUNNER_ALLOWED_LANGUAGES={
            item.strip()
            for item in os.environ.get("RUNNER_ALLOWED_LANGUAGES", "python").split(",")
            if item.strip()
        },
    )
    if config_overrides:
        app.config.update(config_overrides)

    app.config["MAX_CONTENT_LENGTH"] = app.config["RUNNER_MAX_REQUEST_BYTES"]
    backend = execution_backend or UnavailableExecutionBackend()
    concurrency_gate = threading.BoundedSemaphore(app.config["RUNNER_MAX_CONCURRENT_JOBS"])
    app.extensions["execution_backend"] = backend
    app.extensions["execution_concurrency_gate"] = concurrency_gate

    @app.after_request
    def secure_response(response: Response) -> Response:
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.errorhandler(RequestEntityTooLarge)
    def request_too_large(_error_value: RequestEntityTooLarge):
        return _error("Request body is too large.", "REQUEST_TOO_LARGE", 413)

    @app.post("/submissions")
    def submit():
        configured_secret = app.config["RUNNER_SHARED_SECRET"]
        if not isinstance(configured_secret, str) or len(configured_secret) < 32:
            return _error(
                "Code execution is temporarily unavailable.",
                "RUNNER_MISCONFIGURED",
                503,
            )
        if not _authorized(configured_secret):
            return _error("Unauthorized", "UNAUTHORIZED", 401)
        if not app.config["CODE_EXECUTION_ENABLED"]:
            response = jsonify(DISABLED_RESPONSE)
            response.status_code = 503
            return response
        if not backend.ready:
            return _error(
                "Code execution is temporarily unavailable.",
                "SANDBOX_UNAVAILABLE",
                503,
            )

        if request.mimetype != "application/json":
            return _error(
                "Content-Type must be application/json.",
                "INVALID_CONTENT_TYPE",
                415,
            )
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return _error("Request body must be a JSON object.", "INVALID_REQUEST", 400)

        allowed_keys = {"source_code", "language", "stdin"}
        if set(data) - allowed_keys or "source_code" not in data or "language" not in data:
            return _error(
                "Expected source_code, language, and optional stdin only.",
                "INVALID_REQUEST",
                400,
            )

        source_code = data.get("source_code")
        language = data.get("language")
        stdin = data.get("stdin", "")
        if not isinstance(source_code, str) or not source_code:
            return _error("source_code must be a non-empty string.", "INVALID_REQUEST", 400)
        if not isinstance(language, str):
            return _error("language must be a string.", "INVALID_REQUEST", 400)
        if not isinstance(stdin, str):
            return _error("stdin must be a string.", "INVALID_REQUEST", 400)
        if language not in app.config["RUNNER_ALLOWED_LANGUAGES"]:
            return _error("Unsupported language.", "UNSUPPORTED_LANGUAGE", 422)
        if len(source_code.encode("utf-8")) > app.config["RUNNER_MAX_SOURCE_BYTES"]:
            return _error("Source code is too large.", "SOURCE_TOO_LARGE", 413)
        if len(stdin.encode("utf-8")) > app.config["RUNNER_MAX_STDIN_BYTES"]:
            return _error("Standard input is too large.", "STDIN_TOO_LARGE", 413)

        if not concurrency_gate.acquire(blocking=False):
            return _error(
                "The code runner is busy. Please try again shortly.",
                "RUNNER_BUSY",
                429,
                {"Retry-After": "1"},
            )

        try:
            result = backend.execute(language, source_code, stdin)
            return jsonify(
                _validated_backend_result(result, app.config["RUNNER_MAX_OUTPUT_BYTES"])
            )
        except Exception:
            app.logger.error("Isolated execution backend failed.")
            return _error(
                "Code execution is temporarily unavailable.",
                "SANDBOX_ERROR",
                502,
            )
        finally:
            concurrency_gate.release()

    @app.get("/")
    @app.get("/health")
    def health():
        configured = isinstance(app.config["RUNNER_SHARED_SECRET"], str) and len(
            app.config["RUNNER_SHARED_SECRET"]
        ) >= 32
        return jsonify(
            {
                "status": "ok",
                "execution_enabled": bool(app.config["CODE_EXECUTION_ENABLED"]),
                "execution_ready": bool(
                    app.config["CODE_EXECUTION_ENABLED"] and configured and backend.ready
                ),
                "backend": backend.name,
            }
        )

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
