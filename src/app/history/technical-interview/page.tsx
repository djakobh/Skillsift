// Dylan Hartley
// 12/12/2025

import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import Link from "next/link";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export default async function TechnicalInterviewHistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch all technical sessions for this user, newest first
  const sessions = await db.interviewSession.findMany({
    where: {
      userId: session.user.id,
      type: "TECHNICAL",
    },
    orderBy: {
      startedAt: "desc",
    },
    include: {
      responses: true,
    },
  });

  // Format milliseconds into a readable duration string
  function formatDuration(startedAt: Date, completedAt: Date | null, totalPausedMs: number | null) {
    const endTime = completedAt ? completedAt.getTime() : Date.now();
    const pausedMs = totalPausedMs ?? 0;
    const activeMs = endTime - startedAt.getTime() - pausedMs;
    const totalSeconds = Math.floor(activeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "m " + seconds + "s";
  }

  // Format date into a readable string
  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="mx-auto max-w-7xl">
        <Link
          href="/history"
          className="mb-6 inline-block text-sm text-gray-600 hover:text-black"
        >
          ← Back to History
        </Link>
        <h1 className="mb-4 text-3xl font-bold">Technical Interview History</h1>
        <p className="mb-12 text-sm text-gray-600">
          Review all your technical interview sessions and track your coding progress.
        </p>
      </div>

      {/* Results Container */}
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg border-2 border-black bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">All Technical Interviews</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {sessions.length} Total
            </span>
          </div>
          <hr className="-mx-6 mb-6 border-t-2 border-black" />

          {sessions.length === 0 ? (
            // Empty state
            <div className="space-y-6 py-12 text-center text-gray-500">
              <p className="text-sm">No technical interviews yet</p>
              <p className="text-xs">Start a technical interview to see your results here!</p>
              <Link
                href="/technical"
                className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600"
              >
                Start Interview
              </Link>
            </div>
          ) : (
            // Session list
            <div className="space-y-4">
              {sessions.map((s) => {

                // Determine status badge color and label
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
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatDate(s.startedAt)}
                        </span>
                        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + statusColor}>
                          {statusLabel}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Time spent: {formatDuration(s.startedAt, s.completedAt, s.totalPausedMs)}
                      </p>

                      {s.responses.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {s.responses.length} question{s.responses.length !== 1 ? "s" : ""} attempted
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {s.status === "IN_PROGRESS" && (
                        <Link
                          href={"/technical?sessionId=" + s.id}
                          className="rounded-full bg-orange-500 px-4 py-1 text-xs text-white hover:bg-orange-600"
                        >
                          Resume
                        </Link>
                      )}
                      {s.status === "COMPLETED" && (
                        <Link
                          href={"/history/technical-interview/" + s.id}
                          className="rounded-full bg-gray-800 px-4 py-1 text-xs text-white hover:bg-gray-900"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
