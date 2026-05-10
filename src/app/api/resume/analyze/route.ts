import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { preprocessJobDescription } from "~/server/utils/document-parser";
import { computeATSScore } from "~/server/utils/ats-scorer";
import type { ATSScoreResult } from "~/server/utils/ats-scorer";
import { VALIDATION_CONFIG } from "~/server/utils/file-validation";
import { db } from "~/server/db";

// ============================================
// Types
// ============================================

interface AnalyzeRequest {
  resumeText: string;
  jobDescription: string;
  resumeFileName: string;
  companyName?: string;
}

interface AnalyzeSuccessResponse {
  success: true;
  data: {
    atsResult: ATSScoreResult;
    resumeFileName: string;
  };
}

interface AnalyzeErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;

// ============================================
// POST /api/resume/analyze
// ============================================

export async function POST(req: Request): Promise<NextResponse<AnalyzeResponse>> {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please log in to analyze your resume",
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = (await req.json()) as Partial<AnalyzeRequest>;

    const { resumeText, jobDescription, resumeFileName, companyName } = body;

    // 3. Validate inputs
    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_RESUME",
            message: "Resume text is required",
          },
        },
        { status: 400 }
      );
    }

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JOB_DESC",
            message: "Job description is required",
          },
        },
        { status: 400 }
      );
    }

    if (resumeText.trim().length < VALIDATION_CONFIG.MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESUME_TOO_SHORT",
            message: `Resume must contain at least ${VALIDATION_CONFIG.MIN_TEXT_LENGTH} characters`,
          },
        },
        { status: 400 }
      );
    }

    if (jobDescription.trim().length < VALIDATION_CONFIG.MIN_JOB_DESC_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "JOB_DESC_TOO_SHORT",
            message: `Job description must contain at least ${VALIDATION_CONFIG.MIN_JOB_DESC_LENGTH} characters`,
          },
        },
        { status: 400 }
      );
    }

    // 4. Preprocess job description
    const cleanedJobDesc = preprocessJobDescription(jobDescription);

    // 5. Compute full ATS score (includes keyword matching internally)
    const atsResult = computeATSScore(resumeText, cleanedJobDesc);

    // 6. Persist to ResumeAnalysis (non-fatal — never blocks the response)
    try {
      const roleTitle =
        companyName?.trim() ||
        jobDescription.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ||
        "Untitled Role";

      await db.resumeAnalysis.create({
        data: {
          userId: session.user.id,
          resumeName: resumeFileName ?? "resume",
          jobDescription: roleTitle,
          atsScore: atsResult.score,
          matchScore: atsResult.score,
          feedback: atsResult as object,
        },
      });

      // Enforce 10-scan cap — delete oldest beyond limit
      const all = await db.resumeAnalysis.findMany({
        where: { userId: session.user.id },
        orderBy: { analyzedAt: "desc" },
        select: { id: true },
      });
      if (all.length > 10) {
        const toDelete = all.slice(10).map((a) => a.id);
        await db.resumeAnalysis.deleteMany({ where: { id: { in: toDelete } } });
      }
    } catch (saveErr) {
      console.error("Failed to save resume analysis:", saveErr);
    }

    // 7. Return results
    return NextResponse.json(
      {
        success: true,
        data: {
          atsResult,
          resumeFileName: resumeFileName ?? "resume",
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("RESUME ANALYZE ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "An unexpected error occurred during analysis",
        },
      },
      { status: 500 }
    );
  }
}
