// Author: Dylan Hartley
// Date: 04/24/2026

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import Link from "next/link";
import { db } from "~/server/db";
import { ArrowLeft, Plus, FileText } from "lucide-react";
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
    <main className="page-blob-bg pt-12 pb-16 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 flex flex-col gap-6">

        {/* Back link */}
        <div className="page-animate" style={{ animationDelay: "0.05s" }}>
          <Link href="/history" className="btn-ghost btn-sm inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
        </div>

        {/* Header */}
        <div className="page-animate text-center" style={{ animationDelay: "0.1s" }}>
          <h1 className="m-0">Resume Analysis History</h1>
          <p className="description m-0 mt-1">
            Your last {analyses.length} resume scan{analyses.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Content */}
        <div className="page-animate" style={{ animationDelay: "0.2s" }}>
          {analyses.length === 0 ? (
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-700 m-0">No resume analyses yet</p>
              <p className="text-xs text-gray-400 m-0">Upload a resume to get started</p>
              <Link href="/resume" className="btn-primary btn-sm mt-1">
                <Plus className="h-3.5 w-3.5" />
                Upload Resume
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {analyses.map((analysis) => {
                const atsResult = analysis.feedback as unknown as ATSScoreResult;
                const categories = getCategories(atsResult);

                return (
                  <div
                    key={analysis.id}
                    className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
                  >
                    {/* Card header bar */}
                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 m-0 truncate">
                        {resolveLabel(analysis.jobDescription)}
                      </p>
                      <Link
                        href={`/history/resume-analysis/${analysis.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 flex-shrink-0 ml-3"
                      >
                        View Details
                      </Link>
                    </div>

                    {/* Card body */}
                    <div className="flex items-center gap-6 p-5">

                      {/* Half-circle */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <MiniDonut score={atsResult.score} />
                        <GradeBadge grade={atsResult.grade} />
                      </div>

                      <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

                      {/* Resume name + date */}
                      <div className="flex flex-col gap-1 min-w-0 w-44 flex-shrink-0">
                        <p className="text-xs text-gray-500 truncate m-0">{analysis.resumeName}</p>
                        <p className="text-xs text-gray-400 m-0">{formatDate(analysis.analyzedAt)}</p>
                      </div>

                      <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

                      {/* ATS breakdown */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 m-0">
                          ATS Breakdown
                        </p>
                        <DimensionBreakdown atsResult={atsResult} />
                      </div>

                      <div className="w-px self-stretch bg-gray-100 flex-shrink-0" />

                      {/* Category dots */}
                      <div className="flex-shrink-0">
                        <CategoryDotGrid categories={categories} />
                      </div>

                    </div>
                  </div>
                );
              })}

              <div className="flex justify-center pt-2">
                <Link href="/resume" className="btn-primary btn-sm">
                  <Plus className="h-4 w-4" />
                  Scan a New Resume
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
