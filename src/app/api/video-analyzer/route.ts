//Alexander Tu

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = path.join(process.cwd(), "tmp_uploads");

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("video");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing video file. Make sure FormData key is 'video'." },
        { status: 400 }
      );
    }

    // Basic validation
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: `Not a video. Received type: ${file.type}` },
        { status: 400 }
      );
    }

    // Save to disk
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const id = randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const videoPath = path.join(UPLOAD_DIR, `${id}-${safeName}`);

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(videoPath, buf);

    // Call python analyzer script
    const scriptPath = path.join(process.cwd(), "scripts", "analyze_video.py");

    const PYTHON_CMD = process.platform === "win32" ? "py" : "python3";

    const { stdout, stderr } = await execFileAsync(
      PYTHON_CMD,
      [scriptPath, videoPath],
      { maxBuffer: 20 * 1024 * 1024 } // allow larger JSON output
    );

    if (stderr?.trim()) {
      console.warn("Python stderr:", stderr);
    }

    // Analyzer should print JSON to stdout
    let result: any;
    try {
      result = JSON.parse(stdout);
    } catch {
      return NextResponse.json(
        { error: "Analyzer did not return JSON", stdout, stderr },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      file: { name: file.name, type: file.type, size: file.size },
      result,
    });
  } catch (err: any) {
    console.error("behavioral-analyzer route error:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
