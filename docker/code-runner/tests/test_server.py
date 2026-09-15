import pathlib
import sys
import unittest


RUNNER_DIRECTORY = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RUNNER_DIRECTORY))

from server import DISABLED_RESPONSE, create_app  # noqa: E402


TOKEN = "t" * 32


class FakeBackend:
    name = "fake-isolated"
    ready = True

    def __init__(self):
        self.calls = []

    def execute(self, language, source_code, stdin):
        self.calls.append((language, source_code, stdin))
        return {
            "stdout": "test_case_output:3\n",
            "stderr": "",
            "compile_output": "",
            "status": {"id": 3, "description": "Accepted"},
            "time": None,
            "memory": None,
        }


def app_config(**overrides):
    config = {
        "TESTING": True,
        "CODE_EXECUTION_ENABLED": True,
        "RUNNER_SHARED_SECRET": TOKEN,
        "RUNNER_MAX_REQUEST_BYTES": 4096,
        "RUNNER_MAX_SOURCE_BYTES": 1024,
        "RUNNER_MAX_STDIN_BYTES": 128,
        "RUNNER_MAX_OUTPUT_BYTES": 1024,
        "RUNNER_MAX_CONCURRENT_JOBS": 1,
        "RUNNER_ALLOWED_LANGUAGES": {"python"},
    }
    config.update(overrides)
    return config


def authorization(token=TOKEN):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class RunnerSecurityTests(unittest.TestCase):
    def test_missing_and_invalid_authentication_are_rejected(self):
        app = create_app(FakeBackend(), app_config())
        client = app.test_client()

        missing = client.post("/submissions", json={"source_code": "x", "language": "python"})
        invalid = client.post(
            "/submissions",
            json={"source_code": "x", "language": "python"},
            headers=authorization("x" * 32),
        )

        self.assertEqual(missing.status_code, 401)
        self.assertEqual(invalid.status_code, 401)
        self.assertEqual(missing.json["code"], "UNAUTHORIZED")

    def test_missing_server_secret_fails_closed(self):
        app = create_app(FakeBackend(), app_config(RUNNER_SHARED_SECRET=""))
        response = app.test_client().post(
            "/submissions",
            json={"source_code": "x", "language": "python"},
            headers=authorization(),
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["code"], "RUNNER_MISCONFIGURED")

    def test_authenticated_request_cannot_bypass_disabled_execution(self):
        backend = FakeBackend()
        app = create_app(backend, app_config(CODE_EXECUTION_ENABLED=False))
        response = app.test_client().post(
            "/submissions",
            json={"source_code": "x", "language": "python"},
            headers=authorization(),
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json, DISABLED_RESPONSE)
        self.assertEqual(backend.calls, [])

    def test_production_default_has_no_local_execution_backend(self):
        app = create_app(config_overrides=app_config())
        response = app.test_client().post(
            "/submissions",
            json={"source_code": "x", "language": "python"},
            headers=authorization(),
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["code"], "SANDBOX_UNAVAILABLE")

    def test_invalid_oversized_and_unsupported_requests_are_rejected(self):
        app = create_app(
            FakeBackend(),
            app_config(RUNNER_MAX_SOURCE_BYTES=4, RUNNER_MAX_STDIN_BYTES=2),
        )
        client = app.test_client()

        unknown = client.post(
            "/submissions",
            json={"source_code": "x", "language": "python", "unknown": True},
            headers=authorization(),
        )
        unsupported = client.post(
            "/submissions",
            json={"source_code": "x", "language": "cpp"},
            headers=authorization(),
        )
        large_source = client.post(
            "/submissions",
            json={"source_code": "12345", "language": "python"},
            headers=authorization(),
        )
        large_stdin = client.post(
            "/submissions",
            json={"source_code": "x", "language": "python", "stdin": "123"},
            headers=authorization(),
        )

        self.assertEqual(unknown.status_code, 400)
        self.assertEqual(unsupported.status_code, 422)
        self.assertEqual(large_source.status_code, 413)
        self.assertEqual(large_stdin.status_code, 413)

    def test_total_request_body_is_bounded_before_json_buffering(self):
        app = create_app(FakeBackend(), app_config(RUNNER_MAX_REQUEST_BYTES=64))
        response = app.test_client().post(
            "/submissions",
            data=b"x" * 65,
            headers=authorization(),
        )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json["code"], "REQUEST_TOO_LARGE")

    def test_concurrency_gate_rejects_a_job_when_busy(self):
        app = create_app(FakeBackend(), app_config())
        gate = app.extensions["execution_concurrency_gate"]
        self.assertTrue(gate.acquire(blocking=False))
        try:
            response = app.test_client().post(
                "/submissions",
                json={"source_code": "x", "language": "python"},
                headers=authorization(),
            )
        finally:
            gate.release()

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json["code"], "RUNNER_BUSY")
        self.assertEqual(response.headers["Retry-After"], "1")

    def test_valid_submission_preserves_the_backend_result(self):
        backend = FakeBackend()
        app = create_app(backend, app_config())
        response = app.test_client().post(
            "/submissions",
            json={"source_code": "class Solution: pass", "language": "python", "stdin": ""},
            headers=authorization(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"]["description"], "Accepted")
        self.assertEqual(backend.calls, [("python", "class Solution: pass", "")])

    def test_backend_output_is_bounded_before_returning_to_the_app(self):
        backend = FakeBackend()
        app = create_app(backend, app_config(RUNNER_MAX_OUTPUT_BYTES=4))
        response = app.test_client().post(
            "/submissions",
            json={"source_code": "x", "language": "python"},
            headers=authorization(),
        )
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json["code"], "SANDBOX_ERROR")

    def test_runner_source_contains_no_subprocess_execution_fallback(self):
        source = (RUNNER_DIRECTORY / "server.py").read_text(encoding="utf-8")
        dockerfile = (RUNNER_DIRECTORY / "Dockerfile").read_text(encoding="utf-8")
        self.assertNotIn("import subprocess", source)
        self.assertNotIn("subprocess.", source)
        self.assertNotIn("apt-get install", dockerfile)
        self.assertIn("USER 10001:10001", dockerfile)


if __name__ == "__main__":
    unittest.main()
