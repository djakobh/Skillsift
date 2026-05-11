// Dylan Hartley
// 12/12/2025

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import Link from "next/link";
import { db } from "~/server/db";
import { FileText, Brain, MessageSquare, ArrowRight, Clock, Plus } from "lucide-react";
import HistoryTour from "~/components/tutorial-tour/HistoryTour";
import type { ATSScoreResult } from "~/server/utils/ats-scorer";
import {
  getCategories,
  resolveLabel,
  MiniDonut,
  CategoryDotGrid,
} from "./resume-analysis/_components/resumeAnalysisHelpers";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const recentTechnical = await db.interviewSession.findMany({
    where: { userId: session.user.id, type: "TECHNICAL" },
    orderBy: { startedAt: "desc" },
    take: 3,
  });

  const recentAnalyses = await db.resumeAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { analyzedAt: "desc" },
    take: 3,
  });

  const recentBehavioral = await db.interviewSession.findMany({
    where: { userId: session.user.id, type: "BEHAVIORAL" },
    orderBy: { startedAt: "desc" },
    take: 3,
  });

  return (
    <main className="page-blob-bg pt-12 pb-16 min-h-screen">
      <HistoryTour />
      <div className="mx-auto max-w-[1600px] px-6 flex flex-col gap-6">

        {/* Header */}
        <div className="page-animate text-center" style={{ animationDelay: "0.05s" }}>
          <h1 className="m-0">History</h1>
          <p className="description m-0 mt-1">
            Review your resume analyses and interview sessions.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* Resume Analysis Card */}
          <div
            id="tour-resume-card"
            className="page-animate border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-gray-900 m-0">Resume Analysis</h3>
              <Link href="/history/resume-analysis" className="btn-ghost btn-sm">
                See All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {recentAnalyses.length === 0 ? (
                <EmptyState
                  message="No resume analyses yet"
                  sub="Upload a resume to get started"
                  href="/resume"
                  cta="Upload Resume"
                />
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex flex-col divide-y divide-gray-100">
                    {recentAnalyses.map((analysis, idx) => {
                      const atsResult = analysis.feedback as unknown as ATSScoreResult;
                      const categories = getCategories(atsResult);
                      return (
                        <div
                          key={analysis.id}
                          className={`flex items-center gap-3 ${idx > 0 ? "pt-3" : ""} ${idx < recentAnalyses.length - 1 ? "pb-3" : ""}`}
                        >
                          <MiniDonut score={atsResult.score} />
                          <div className="flex flex-col gap-2 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate m-0">
                              {resolveLabel(analysis.jobDescription)}
                            </p>
                            <CategoryDotGrid categories={categories} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {recentAnalyses.length < 3 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                      <p className="text-xs text-gray-400 m-0">Want to see more results?</p>
                      <Link href="/resume" className="btn-outline btn-sm">
                        <Plus className="h-3.5 w-3.5" />
                        Upload Resume
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Technical Interview Card */}
          <div
            id="tour-technical-card"
            className="page-animate border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-gray-900 m-0">Technical Interview</h3>
              <Link href="/history/technical-interview" className="btn-ghost btn-sm">
                See All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <DisplayInterview interviews={recentTechnical} type="technical" link="/technical" />
            </div>
          </div>

          {/* Behavioral Interview Card */}
          <div
            id="tour-behavioral-card"
            className="page-animate border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-gray-900 m-0">Behavioral Interview</h3>
              <Link href="/history/behavioral-interview" className="btn-ghost btn-sm">
                See All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <DisplayInterview interviews={recentBehavioral} type="behavioral" link="/interview/behavioral" />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function EmptyState({ message, sub, href, cta }: { message: string; sub: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm font-medium text-gray-700 m-0">{message}</p>
      <p className="text-xs text-gray-400 m-0">{sub}</p>
      <Link href={href} className="btn-primary btn-sm mt-1">
        <Plus className="h-3.5 w-3.5" />
        {cta}
      </Link>
    </div>
  );
}

function formatDate(date: Date) {
  const newDate = new Date(date);
  return newDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startedAt: Date, completedAt: Date | null, totalPausedMs: number | null): string {
  if (!completedAt) return "";
  const pausedMs = totalPausedMs ?? 0;
  const activeMs = new Date(completedAt).getTime() - new Date(startedAt).getTime() - pausedMs;
  if (activeMs <= 0) return "< 1m";
  const totalSeconds = Math.floor(activeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + "m " + seconds + "s";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED")
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Completed
      </span>
    );
  if (status === "IN_PROGRESS")
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
        In Progress
      </span>
    );
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
      Abandoned
    </span>
  );
}

function DisplayInterview({ interviews, type, link }: { interviews: any[], type: string, link: string }) {
  if (interviews.length === 0) {
    return (
      <EmptyState
        message={`No ${type} interviews yet`}
        sub={`Start a ${type} interview to see your results here`}
        href={link}
        cta="Start Interview"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col divide-y divide-gray-100">
        {interviews.map((interview, idx) => (
          <div
            key={interview.id}
            className={`flex flex-col gap-3 ${idx > 0 ? "pt-5" : ""} ${idx < interviews.length - 1 ? "pb-5" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500 m-0 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(interview.startedAt)}
              </p>
              <StatusBadge status={interview.status} />
            </div>
            {(() => {
              const time = formatDuration(interview.startedAt, interview.completedAt, interview.totalPausedMs);
              return time ? (
                <p className="text-sm text-gray-400 m-0">Time spent: {time}</p>
              ) : null;
            })()}
            {interview.type === "TECHNICAL" && <TechnicalDisplay interview={interview} />}
            {interview.type === "BEHAVIORAL" && <BehavioralDisplay interview={interview} />}
          </div>
        ))}
      </div>
      {interviews.length < 3 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs text-gray-400 m-0">Want to see more results?</p>
          <Link href={link} className="btn-outline btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Start Interview
          </Link>
        </div>
      )}
    </div>
  );
}

function TechnicalDisplay({ interview }: { interview: any }) {
  return (
    <div className="flex gap-1.5 pt-1 flex-wrap">
      {interview.status === "IN_PROGRESS" && (
        <Link href={"/technical?sessionId=" + interview.id} className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">
          Resume Session
        </Link>
      )}
      {interview.status === "COMPLETED" && (
        <Link href={"/history/technical-interview/" + interview.id} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
          View Results
        </Link>
      )}
      <Link href="/technical" className="inline-flex items-center gap-1 rounded-full border border-orange-500 px-3 py-1 text-xs font-medium text-orange-500 hover:bg-orange-50">
        <Plus className="h-3 w-3" />
        New Interview
      </Link>
    </div>
  );
}

function BehavioralDisplay({ interview }: { interview: any }) {
  return (
    <div className="flex gap-1.5 pt-1 flex-wrap">
      {interview.status === "IN_PROGRESS" && (
        <Link href={"/interview/behavioral"} className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">
          Resume Session
        </Link>
      )}
      {interview.status === "COMPLETED" && (
        <Link href={"/history/behavioral-interview"} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
          View Results
        </Link>
      )}
      <Link href={"/interview/behavioral"} className="inline-flex items-center gap-1 rounded-full border border-orange-500 px-3 py-1 text-xs font-medium text-orange-500 hover:bg-orange-50">
        <Plus className="h-3 w-3" />
        New Interview
      </Link>
    </div>
  );
}
