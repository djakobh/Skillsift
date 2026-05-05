//Alexander Tu

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const UPLOAD_DIR = path.join(process.cwd(), "tmp_uploads");

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("video");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing video file. FormData key must be 'video'." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: `Not a video. Received type: ${file.type}` },
        { status: 400 }
      );
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const uuid = randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${uuid}-${safeName}`;
    const videoPath = path.join(UPLOAD_DIR, storageKey);

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(videoPath, buf);

    const scriptPath = path.join(process.cwd(), "scripts", "analyze_video.py");

    const PYTHON_CMD =
      process.platform === "win32"
        ? path.join(process.cwd(), "venv310", "Scripts", "python.exe")
        : path.join(process.cwd(), "venv310", "bin", "python");

    let analysis: any = null;

    try {
      const { stdout, stderr } = await execFileAsync(
        PYTHON_CMD,
        [scriptPath, videoPath],
        { maxBuffer: 20 * 1024 * 1024 }
      );

      if (stderr?.trim()) {
        console.error("Python stderr:", stderr);
      }

      analysis = JSON.parse(stdout);
    } catch (e: any) {
      console.error("Python analysis failed:", e);

      return NextResponse.json(
        {
          error: "analysis_failed",
          detail: e?.message ?? String(e),
          stderr: e?.stderr ?? null,
          stdout: e?.stdout ?? null,
          scriptPath,
          pythonCmd: PYTHON_CMD,
          videoPath,
        },
        { status: 500 }
      );
    }

    const row = await db.videoUpload.create({
      data: {
        userId: user.id,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey,
        analysis,
      },
    });

    return NextResponse.json({
      ok: true,
      videoId: row.id,
      playbackUrl: `/api/videos/${row.id}`,
      analysis: row.analysis,
    });
  } catch (err: any) {
    console.error("behavioral-analyzer error:", err);
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}