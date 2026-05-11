// Dylan Hartley
// 12/12/2025

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import Link from "next/link";
import { db } from "~/server/db";
import { ArrowLeft, Plus, Clock, Brain } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDuration(startedAt: Date, completedAt: Date | null, totalPausedMs: number | null, status?: string) {
  if (!completedAt) return status === "ABANDONED" ? "not recorded" : "-";
  const pausedMs = totalPausedMs ?? 0;
  const activeMs = completedAt.getTime() - startedAt.getTime() - pausedMs;
  if (activeMs <= 0) return "< 1m";
  const totalSeconds = Math.floor(activeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + "m " + seconds + "s";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TechnicalInterviewHistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const sessions = await db.interviewSession.findMany({
    where: { userId: session.user.id, type: "TECHNICAL" },
    orderBy: { startedAt: "desc" },
    include: { responses: true },
  });

  return (
    <main className="page-blob-bg pt-12 pb-16 min-h-screen">
      <div className="mx-auto max-w-4xl px-6 flex flex-col gap-6">

        {/* Back link */}
        <div className="page-animate" style={{ animationDelay: "0.05s" }}>
          <Link href="/history" className="btn-ghost btn-sm inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
        </div>

        {/* Header */}
        <div className="page-animate text-center" style={{ animationDelay: "0.1s" }}>
          <h1 className="m-0">Technical Interview History</h1>
          <p className="description m-0 mt-1">
            Review all your technical interview sessions and track your coding progress.
          </p>
        </div>

        {/* Main card */}
        <div className="page-animate border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden" style={{ animationDelay: "0.2s" }}>
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-gray-900 m-0">All Technical Interviews</h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {sessions.length} Total
            </span>
          </div>

          <div className="p-6">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Brain className="h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-700 m-0">No technical interviews yet</p>
                <p className="text-xs text-gray-400 m-0">Start a technical interview to see your results here</p>
                <Link href="/technical" className="btn-primary btn-sm mt-1">
                  <Plus className="h-3.5 w-3.5" />
                  Start Interview
                </Link>
              </div>
            ) : (
              <>
              <div className="flex flex-col gap-3">
                {sessions.map((s) => {
                  let statusColor = "bg-yellow-100 text-yellow-700";
                  let statusLabel = "In Progress";

                  if (s.status === "COMPLETED") {
                    statusColor = "bg-green-100 text-green-700";
                    statusLabel = "Completed";
                  } else if (s.status === "ABANDONED") {
                    statusColor = "bg-red-100 text-red-600";
                    statusLabel = "Abandoned";
                  }

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-5 py-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {formatDate(s.startedAt)}
                          </span>
                          <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + statusColor}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 m-0">
                          Time spent: {formatDuration(s.startedAt, s.completedAt, s.totalPausedMs, s.status)}
                        </p>
                        {s.responses.length > 0 && (
                          <p className="text-xs text-gray-500 m-0">
                            {s.responses.length} question{s.responses.length !== 1 ? "s" : ""} attempted
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {s.status === "IN_PROGRESS" && (
                          <Link href={"/technical?sessionId=" + s.id} className="btn-primary btn-sm">
                            Resume
                          </Link>
                        )}
                        {s.status === "COMPLETED" && (
                          <Link href={"/history/technical-interview/" + s.id} className="btn-ghost btn-sm">
                            View Results
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center pt-2">
                <Link href="/technical" className="btn-primary btn-sm">
                  <Plus className="h-4 w-4" />
                  New Interview
                </Link>
              </div>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
