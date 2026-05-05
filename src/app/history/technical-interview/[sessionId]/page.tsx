import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TechnicalInterviewResultsPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { sessionId } = params;

  // Fetch the session and its responses from the DB
  const interviewSession = await db.interviewSession.findUnique({
    where: { id: sessionId },
    include: { responses: true },
  });

  // If session not found or doesn't belong to this user, redirect to history
  if (!interviewSession || interviewSession.userId !== session.user.id) {
    redirect("/history/technical-interview");
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

  // Format active time spent
  function formatDuration(startedAt: Date, completedAt: Date | null, totalPausedMs: number | null) {
    const endTime = completedAt ? completedAt.getTime() : Date.now();
    const pausedMs = totalPausedMs ?? 0;
    const activeMs = endTime - startedAt.getTime() - pausedMs;
    const totalSeconds = Math.floor(activeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "m " + seconds + "s";
  }

  return (
    <main className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="mx-auto max-w-3xl">
        <Link
          href="/history/technical-interview"
          className="mb-6 inline-block text-sm text-gray-600 hover:text-black"
        >
          ← Back to History
        </Link>

        {/* Results card */}
        <div className="rounded-lg border-2 border-black bg-white p-8 mt-4">

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Interview Complete</h1>
            <p className="text-sm text-gray-500">
              {formatDate(interviewSession.startedAt)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Time spent: {formatDuration(
                interviewSession.startedAt,
                interviewSession.completedAt,
                interviewSession.totalPausedMs
              )}
            </p>
          </div>

          <hr className="mb-8 border-t-2 border-black" />

          {/* Question results */}
          {interviewSession.responses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No responses were saved for this session.</p>
            </div>
          ) : (
            <ul className="space-y-6">
              {interviewSession.responses.map((response, idx) => (
                <li key={response.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-base">
                      Question #{idx + 1}: {response.question}
                    </h2>
                    {response.answer && response.answer.trim() !== "" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Attempted
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Incomplete
                      </span>
                    )}
                  </div>

                  {/* Show saved code if it exists */}
                  {response.answer && response.answer.trim() !== "" ? (
                    <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded overflow-auto whitespace-pre font-mono leading-relaxed max-h-64">
                      {response.answer}
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No code submitted.</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/technical"
              className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600"
            >
              Start New Interview
            </Link>
            <Link
              href="/history/technical-interview"
              className="inline-block rounded-full border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Back to History
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
