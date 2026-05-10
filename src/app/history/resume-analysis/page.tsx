// Author: Dylan Hartley
// Date: 04/24/2026

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import Link from "next/link";
import { db } from "~/server/db";
import type { ATSScoreResult } from "~/server/utils/ats-scorer";
import {
  getCategories,
  resolveLabel,
  MiniDonut,
  CategoryDotGrid,
  GradeBadge,
  DimensionBreakdown,
} from "./_components/resumeAnalysisHelpers";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ResumeAnalysisHistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const analyses = await db.resumeAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { analyzedAt: "desc" },
    take: 10,
  });

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <Link href="/history" className="mb-6 inline-block text-sm text-gray-500 hover:text-black">
          ← Back to History
        </Link>

        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Resume Analysis History</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your last {analyses.length} resume scan{analyses.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/resume"
            className="rounded-full bg-orange-500 px-5 py-2 text-sm text-white hover:bg-orange-600"
          >
            Scan a new resume →
          </Link>
        </div>

        {/* Empty state */}
        {analyses.length === 0 ? (
          <div className="rounded-lg border-2 border-black bg-white p-12 text-center">
            <p className="mb-2 text-sm text-gray-500">No resume analyses yet</p>
            <p className="mb-6 text-xs text-gray-400">Upload a resume to get started!</p>
            <Link
              href="/resume"
              className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600"
            >
              Upload Resume
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {analyses.map((analysis) => {
              const atsResult = analysis.feedback as unknown as ATSScoreResult;
              const categories = getCategories(atsResult);

              return (
                <div
                  key={analysis.id}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  {/* Top row */}
                  <div className="flex items-center gap-6 p-5">

                    {/* Donut + grade */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <MiniDonut score={atsResult.score} size={88} />
                      <GradeBadge grade={atsResult.grade} />
                    </div>

                    <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

                    {/* Role + meta */}
                    <div className="flex flex-col gap-0.5 min-w-0 w-44 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {resolveLabel(analysis.jobDescription)}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{analysis.resumeName}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(analysis.analyzedAt)}</p>
                    </div>

                    <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

                    {/* ATS dimension bars */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        ATS Breakdown
                      </p>
                      <DimensionBreakdown atsResult={atsResult} />
                    </div>

                    <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

                    {/* Category dots + action */}
                    <div className="flex flex-col items-start gap-4 flex-shrink-0">
                      <CategoryDotGrid categories={categories} />
                      <Link
                        href={`/history/resume-analysis/${analysis.id}`}
                        className="w-full text-center rounded-full bg-orange-500 px-4 py-1.5 text-xs text-white hover:bg-orange-600"
                      >
                        View Details →
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
