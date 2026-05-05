#!/usr/bin/env python3
# flask server that executes code in a sandbox

import subprocess
import tempfile
import os
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

# language configs: file extension, compile cmd (if needed), run cmd
LANGUAGES = {
    "python": {"ext": ".py", "compile": None, "run": ["python3", "{file}"]},
    "cpp": {"ext": ".cpp", "compile": ["g++", "-o", "{out}", "{file}"], "run": ["{out}"]},
    # also support numeric ids for compatibility
    71: {"ext": ".py", "compile": None, "run": ["python3", "{file}"]},
    54: {"ext": ".cpp", "compile": ["g++", "-o", "{out}", "{file}"], "run": ["{out}"]},
}

TIMEOUT = 10  # max seconds before killing process


def execute_code(language, source_code, stdin=""):
    # write code to temp file, compile if needed, run, return output
    lang_config = LANGUAGES.get(language)
    if not lang_config:
        return {"error": f"Unsupported language: {language}"}

    # temp directory auto-deletes when done (isolation + cleanup)
    with tempfile.TemporaryDirectory() as tmpdir:
        file_id = str(uuid.uuid4())
        source_file = os.path.join(tmpdir, f"{file_id}{lang_config['ext']}")
        output_file = os.path.join(tmpdir, file_id)

        # Write source code
        with open(source_file, "w") as f:
            f.write(source_code)

        compile_output = ""

        # step 1: compile (only for c++)
        if lang_config["compile"]:
            compile_cmd = [
                c.format(file=source_file, out=output_file)
                for c in lang_config["compile"]
            ]
            try:
                result = subprocess.run(
                    compile_cmd,
                    capture_output=True,
                    text=True,
                    timeout=TIMEOUT
                )
                if result.returncode != 0:
                    return {
                        "stdout": "",
                        "stderr": result.stderr,
                        "compile_output": result.stderr,
                        "status": {"id": 6, "description": "Compilation Error"},
                        "time": None,
                        "memory": None,
                    }
                compile_output = result.stderr
            except subprocess.TimeoutExpired:
                return {
                    "stdout": "",
                    "stderr": "Compilation timed out",
                    "compile_output": "Compilation timed out",
                    "status": {"id": 6, "description": "Compilation Error"},
                    "time": None,
                    "memory": None,
                }

        # step 2: run the code and capture output
        run_cmd = [
            c.format(file=source_file, out=output_file)
            for c in lang_config["run"]
        ]
        try:
            result = subprocess.run(
                run_cmd,
                input=stdin,
                capture_output=True,
                text=True,
                timeout=TIMEOUT
            )

            if result.returncode == 0:
                status = {"id": 3, "description": "Accepted"}
            else:
                status = {"id": 11, "description": "Runtime Error"}

            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "compile_output": compile_output,
                "status": status,
                "time": None,
                "memory": None,
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Time Limit Exceeded",
                "compile_output": compile_output,
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "time": None,
                "memory": None,
            }


@app.route("/submissions", methods=["POST"])
def submit():
    # main endpoint to receives code, runs it, returns result
    data = request.json
    source_code = data.get("source_code", "")
    language = data.get("language") or data.get("language_id")
    stdin = data.get("stdin", "")

    result = execute_code(language, source_code, stdin)
    return jsonify(result)


@app.route("/about", methods=["GET"])
def about():
    # verifies container is running
    return jsonify({"name": "Simple Code Runner", "version": "1.0"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
