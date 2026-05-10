// Dylan Hartley
// 12/12/2025

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
} from "./resume-analysis/_components/resumeAnalysisHelpers";
import HistoryTour from "~/components/tutorial-tour/HistoryTour";

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const latestTechnical = await db.interviewSession.findFirst({
    where: { userId: session.user.id, type: "TECHNICAL" },
    orderBy: { startedAt: "desc" },
  });

  const recentAnalyses = await db.resumeAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { analyzedAt: "desc" },
    take: 2,
  });

  const latestBehavioral = await db.interviewSession.findFirst({
    where: { userId: session.user.id, type: "BEHAVIORAL" },
    orderBy: { startedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl text-center">
        <h1 className="mb-4 text-3xl font-bold">User History</h1>
        <p className="mb-12 text-sm text-gray-600">
          See your resume and interview history and see your progress!
        </p>
      </div>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 md:grid-cols-3">

        {/* id="tour-resume-card" — targeted by HistoryTour */}
        <div id="tour-resume-card" className="rounded-lg border-2 border-black bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Latest Resume Analysis</h2>
            <Link href="/history/resume-analysis" className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600">See All →</Link>
          </div>
          <hr className="-mx-6 mb-6 border-t-2 border-black" />

          {recentAnalyses.length === 0 ? (
            <div className="space-y-6 text-center text-gray-500">
              <p className="text-sm">No resume analyses yet</p>
              <p className="text-xs">Upload a resume to get started!</p>
              <Link href="/resume" className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600">Upload Resume</Link>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {recentAnalyses.map((analysis, idx) => {
                const atsResult = analysis.feedback as unknown as ATSScoreResult;
                const categories = getCategories(atsResult);
                return (
                  <div key={analysis.id} className={`flex items-center gap-5 ${idx > 0 ? "pt-5" : ""} ${idx < recentAnalyses.length - 1 ? "pb-5" : ""}`}>
                    <MiniDonut score={atsResult.score} size={90} />
                    <div className="flex flex-col gap-3 min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate">{resolveLabel(analysis.jobDescription)}</p>
                      <CategoryDotGrid categories={categories} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* id="tour-technical-card" — targeted by HistoryTour */}
        <div id="tour-technical-card" className="rounded-lg border-2 border-black bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Latest Technical Interview</h2>
            <Link href="/history/technical-interview" className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600">See All →</Link>
          </div>
          <hr className="-mx-6 mb-6 border-t-2 border-black" />
          <DisplayInterview interview={latestTechnical} type="technical" link="/technical" />
        </div>

        {/* id="tour-behavioral-card" — targeted by HistoryTour */}
        <div id="tour-behavioral-card" className="rounded-lg border-2 border-black bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Latest Behavioral Interview</h2>
            <Link href="/history/behavioral-interview" className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600">See All →</Link>
          </div>
          <hr className="-mx-6 mb-6 border-t-2 border-black" />
          <DisplayInterview interview={latestBehavioral} type="behavioral" link="/interview/behavioral" />
        </div>

      </div>

      {/* Tour component — runs Driver.js if tour is active */}
      <HistoryTour />
    </main>
  );
}

function formatDate(date: Date) {
  const newDate = new Date(date);
  return newDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DisplayInterview({ interview, type, link }: { interview: any, type: string, link: string }) {
  return (
    <div>
      {interview ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{formatDate(interview.startedAt)}</p>
          <div className="flex items-center gap-2">
            {interview.status === "COMPLETED" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>}
            {interview.status === "IN_PROGRESS" && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">In Progress</span>}
            {interview.status === "ABANDONED" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Abandoned</span>}
          </div>
          {interview.type == "TECHNICAL" && <TechnicalDisplay interview={interview} />}
          {interview.type == "BEHAVIORAL" && <BehavioralDisplay interview={interview} />}
        </div>
      ) : (
        <div className="space-y-6 text-center text-gray-500">
          <p className="text-sm">No {type} interviews yet</p>
          <p className="text-xs">Start a {type} interview to see your results here!</p>
          <Link href={link} className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600">Start Interview</Link>
        </div>
      )}
    </div>
  );
}

function TechnicalDisplay({ interview }: { interview: any }) {
  return (
    <div className="flex gap-2 pt-2">
      {interview.status === "IN_PROGRESS" && <Link href={"/technical?sessionId=" + interview.id} className="inline-block rounded-full bg-orange-500 px-4 py-2 text-xs text-white hover:bg-orange-600">Resume Session</Link>}
      {interview.status === "COMPLETED" && <Link href={"/history/technical-interview/" + interview.id} className="inline-block rounded-full bg-gray-800 px-4 py-2 text-xs text-white hover:bg-gray-900">View Results</Link>}
      <Link href="/technical" className="inline-block rounded-full border border-orange-500 px-4 py-2 text-xs text-orange-500 hover:bg-orange-50">New Interview</Link>
    </div>
  );
}

function BehavioralDisplay({ interview }: { interview: any }) {
  return (
    <div className="flex gap-2 pt-2">
      {interview.status === "IN_PROGRESS" && <Link href={"/interview/behavioral"} className="inline-block rounded-full bg-orange-500 px-4 py-2 text-xs text-white hover:bg-orange-600">Resume Session</Link>}
      {interview.status === "COMPLETED" && <Link href={"/history/behavioral-interview"} className="inline-block rounded-full bg-gray-800 px-4 py-2 text-xs text-white hover:bg-gray-900">View Results</Link>}
      <Link href={"/interview/behavioral"} className="inline-block rounded-full border border-orange-500 px-4 py-2 text-xs text-orange-500 hover:bg-orange-50">New Interview</Link>
    </div>
  );
}
