//Alexander Tu

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";

const ANALYZER_URL = process.env.ANALYZER_URL;
const ANALYZER_SECRET = process.env.ANALYZER_SECRET ?? "";

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

    if (!ANALYZER_URL) {
      return NextResponse.json(
        { error: "Analyzer service not configured." },
        { status: 503 }
      );
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

    // Forward the video to the Railway analyzer service
    const forwardForm = new FormData();
    forwardForm.append("video", file);

    const analyzerRes = await fetch(`${ANALYZER_URL}/analyze-video`, {
      method: "POST",
      headers: { "X-Analyzer-Secret": ANALYZER_SECRET },
      body: forwardForm,
    });

    if (!analyzerRes.ok) {
      console.error("Analyzer service returned:", analyzerRes.status);
      return NextResponse.json(
        { error: "Analysis failed. Please try again." },
        { status: 500 }
      );
    }

    const analysis = await analyzerRes.json();

    const storageKey = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const row = await db.videoUpload.create({
      data: {
        userId: user.id,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey,
        analyzedAt: new Date(),
        analysis: analysis.summary ?? analysis,
      },
    });

    if (Array.isArray(analysis.segments) && analysis.segments.length > 0) {
      await db.videoAnalysisSegment.createMany({
        data: analysis.segments.map((segment: any) => ({
          videoUploadId: row.id,
          category: segment.category,
          startSec: typeof segment.startSec === "number" ? segment.startSec : 0,
          endSec: typeof segment.endSec === "number" ? segment.endSec : 0,
          isGood: Boolean(segment.isGood),
          scoreAvg: typeof segment.scoreAvg === "number" ? segment.scoreAvg : null,
          note: typeof segment.note === "string" ? segment.note : null,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      videoId: row.id,
      playbackUrl: `/api/videos/${row.id}`,
      analysis: row.analysis,
      segmentsSaved: Array.isArray(analysis.segments) ? analysis.segments.length : 0,
    });
  } catch (err) {
    console.error("behavioral-analyzer error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
