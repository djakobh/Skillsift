// Author: Dylan Hartley
// Date: 04/24/2026

import { notFound, redirect } from "next/navigation";
import { auth } from "~/server/auth";
import Link from "next/link";
import { db } from "~/server/db";
import type { ATSScoreResult } from "~/server/utils/ats-scorer";
import { MiniDonut, GradeBadge, getCategories, CategoryDotGrid, resolveLabel } from "../_components/resumeAnalysisHelpers";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-orange-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{score}</span>
    </div>
  );
}

export default async function ResumeAnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const analysis = await db.resumeAnalysis.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!analysis) notFound();

  const atsResult = analysis.feedback as unknown as ATSScoreResult;
  const { score, grade, breakdown, keywordResult, details, formattingResult } = atsResult;
  const categories = getCategories(atsResult);

  const technicalMatches = keywordResult.matches.filter(
    (m) => m.category === "technical_skill" || m.category === "tool"
  );
  const softMatches = keywordResult.matches.filter(
    (m) => m.category !== "technical_skill" && m.category !== "tool"
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">

        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/history/resume-analysis" className="text-sm text-gray-500 hover:text-black">
            ← Back to All Scans
          </Link>
          <Link
            href="/resume"
            className="rounded-full bg-orange-500 px-5 py-2 text-sm text-white hover:bg-orange-600"
          >
            Scan a new resume →
          </Link>
        </div>

        {/* Hero row */}
        <div className="mb-6 flex items-center gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <MiniDonut score={score} size={110} />
            <GradeBadge grade={grade} />
          </div>

          <div className="w-px self-stretch bg-gray-100" />

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {resolveLabel(analysis.jobDescription)}
            </h1>
            <p className="text-sm text-gray-400">{analysis.resumeName}</p>
            <p className="text-xs text-gray-400 mt-1">Scanned {formatDate(analysis.analyzedAt)}</p>
          </div>

          <div className="w-px self-stretch bg-gray-100" />

          <div className="flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Category Summary</p>
            <CategoryDotGrid categories={categories} />
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* ── ATS Dimension Breakdown ── */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">ATS Dimension Breakdown</h2>
              <p className="text-xs text-gray-500 mt-0.5">Weighted score across 5 hiring dimensions</p>
            </div>
            <div className="divide-y divide-gray-100">
              {details.map((d) => {
                const dimKey = Object.values(breakdown).find(
                  (b) => b.label === d.dimension
                );
                return (
                  <div key={d.dimension} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{d.dimension}</span>
                      {dimKey && (
                        <span className="text-xs text-gray-400">
                          {Math.round(dimKey.weight * 100)}% weight
                        </span>
                      )}
                    </div>
                    <ScoreBar score={d.score} />
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{d.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right column: keywords + formatting ── */}
          <div className="flex flex-col gap-6">

            {/* Technical Skills */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Technical Skills</h2>
                <span className="text-xs text-gray-500">
                  {technicalMatches.filter((m) => m.found).length} / {technicalMatches.length} found
                </span>
              </div>
              {technicalMatches.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 italic">No technical skills detected in job description.</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                  {technicalMatches.map((m) => (
                    <div key={m.keyword} className="flex items-center justify-between px-5 py-2.5">
                      <span className="text-sm text-gray-700">{m.keyword}</span>
                      <span className={`text-xs font-medium ${m.found ? "text-green-600" : "text-red-500"}`}>
                        {m.found ? "✓ Found" : "✗ Missing"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Soft Skills */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Soft Skills & Keywords</h2>
                <span className="text-xs text-gray-500">
                  {softMatches.filter((m) => m.found).length} / {softMatches.length} found
                </span>
              </div>
              {softMatches.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 italic">No soft skills detected in job description.</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                  {softMatches.map((m) => (
                    <div key={m.keyword} className="flex items-center justify-between px-5 py-2.5">
                      <span className="text-sm text-gray-700">{m.keyword}</span>
                      <span className={`text-xs font-medium ${m.found ? "text-green-600" : "text-red-500"}`}>
                        {m.found ? "✓ Found" : "✗ Missing"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formatting checks */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Formatting</h2>
                <span className="text-xs text-gray-500">
                  {formattingResult.checks.filter((c) => c.passed).length} / {formattingResult.checks.length} passed
                </span>
              </div>
              {formattingResult.checks.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 italic">No formatting checks available.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {formattingResult.checks.map((c) => (
                    <div key={c.name} className="flex items-start gap-3 px-5 py-2.5">
                      <span className="mt-0.5 flex-shrink-0">{c.passed ? "✅" : "❌"}</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        <span className="text-xs text-gray-500">{c.explanation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
