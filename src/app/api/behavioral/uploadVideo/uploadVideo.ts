//Author: Brandon Christian
//Date: 3/20/2026 separate into own file
//Alexander Tu
//Date: 4/17/2026 Updated

//import { DownloadVideoData } from "../pause/manageVideoStorage"

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR =
  process.env.UPLOAD_DIR
    ? path.join(process.cwd(), process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "tmp_uploads");

const PYTHON_CMD =
  process.env.PYTHON_PATH ||
  (process.platform === "win32"
    ? path.join(process.cwd(), "venv310", "Scripts", "python.exe")
    : path.join(process.cwd(), "venv310", "bin", "python"));

type FeedbackItem = {
  category: string;
  content: string;
  score: number;
};

type RawVideoAnalysis = {
  summary?: {
    video?: {
      sample_fps?: number;
      sampled_frames?: number;
    };
    posture?: {
      valid_frames?: number;
      good_frames?: number;
      good_percent?: number;
    };
    eye_contact?: {
      valid_frames?: number;
      good_frames?: number;
      good_percent?: number;
    };
    facial_expression?: {
      valid_frames?: number;
      good_frames?: number;
      good_percent?: number;
    };
  };
  segments?: Array<{
    id?: string;
    category: string;
    startSec: number;
    endSec: number;
    isGood: boolean;
    scoreAvg?: number | null;
    note?: string | null;
    createdAt?: string;
  }>;
  error?: string;
};

export async function GetVideoFeedback(videoPath: string) {
  const scriptPath = path.join(process.cwd(), "scripts", "analyze_video.py");

  const { stdout, stderr } = await execFileAsync(
    PYTHON_CMD,
    [scriptPath, videoPath],
    { maxBuffer: 20 * 1024 * 1024 }
  );

  if (stderr?.trim()) {
    console.error("Python stderr:", stderr);
  }

  const parsed = JSON.parse(stdout);

  if (parsed?.error) {
    throw new Error(parsed.error);
  }

  const summary = parsed.summary ?? {};

  const test_items: FeedbackItem[] = [
    {
      category: "Eye Contact",
      content: "Estimated from face orientation over time.",
      score: summary.eye_contact?.good_percent ?? 0,
    },
    {
      category: "Confidence",
      content: "Estimated from posture and facial engagement.",
      score:
        ((summary.posture?.good_percent ?? 0) +
          (summary.facial_expression?.good_percent ?? 0)) / 2,
    },
    {
      category: "Sociability",
      content: "Estimated from facial engagement.",
      score: summary.facial_expression?.good_percent ?? 0,
    },
  ];

  return {
    feedbackItems: test_items,
    rawAnalysis: parsed as RawVideoAnalysis,
  };
}

export async function UploadVideo(req: NextRequest) {
    let filePath: string | null = null;
    try {
        //extract the video from the formData sent
        const formData = await req.formData();
        const video = formData.get("video") as Blob | null;

        if (!video || !(video instanceof Blob)) {
            return NextResponse.json(
              { error: "No video file received" },
              { status: 400 }
            );
        }

        const sessionId: string = formData.get("sessionId") as string;
        if (!sessionId) {
            return NextResponse.json(
                { error: "Missing sessionID" },
                { status: 400 }
            );
        }

        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        const fileName = `${randomUUID()}.webm`;
        filePath = path.join(UPLOAD_DIR, fileName);

        const bytes = Buffer.from(await video.arrayBuffer());
        await fs.writeFile(filePath, bytes);

        const { feedbackItems, rawAnalysis } = await GetVideoFeedback(filePath);
        const averaged_items = await AverageFeedbackItems(feedbackItems, sessionId);

        //send to behavioralService.tsx
        return NextResponse.json({
            feedback: averaged_items,
            rawAnalysis,
        });

    } catch (err: any) {
        console.error("UploadVideo error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Upload/analyze failed" },
            { status: 500 }
        );
    } finally {
        if (filePath) {
            await fs.unlink(filePath).catch((unlinkErr) => {
                console.warn("Failed to delete temp video", unlinkErr);
            });
        }
    }
}

async function AverageFeedbackItems(base_items: FeedbackItem[], sessionId: string) {
    //collect all feedback items arrays into one array
    const feedback_sets: FeedbackItem[][] = [base_items];

    const storedSessions = await db.storedBehavioralSession.findMany({
        where: {
            sessionId: sessionId,
        },
    });

    storedSessions.forEach(
        (session) => {
            if (session.feedback)
                feedback_sets.push(session.feedback as FeedbackItem[]);
        }
    );

    //total all values and average them, then set each as the score for final_items
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};

    feedback_sets.forEach(
        (feedback_items) => {
            feedback_items.forEach(
                (item: FeedbackItem) => {
                    if (item.category && typeof item.score === "number") {
                        const key = item.category;
                        const value = item.score;
                        totals[key] = (totals[key] || 0) + value;
                        counts[key] = (counts[key] || 0) + 1;
                    }
                }
            );
        }
    );

    //set the average values as the true scores of the final items
    const final_items: FeedbackItem[] = base_items.map((item) => ({ ...item }));

    final_items.forEach(
        (item) => {
            const key = item.category;
            if (totals[key] != null && counts[key] != null) {
                item.score = totals[key] / counts[key];
            }
        }
    );

    return final_items;
}
