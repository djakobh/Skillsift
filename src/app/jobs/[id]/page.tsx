// Alvin Ngo student work report 3
// Job detail page — shows all information for a single job application.
// Includes: application details card, job description, notes,
// a status history timeline showing every status change with timestamps,
// and inline status change via dropdown.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2, Clock } from "lucide-react";

// Represents a single entry in the status change timeline
type StatusHistoryEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  changedAt: string;
};

type JobDetail = {
  id: string;
  company: string;
  position: string;
  jobDescription: string | null;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
};

const STATUS_OPTIONS = [
  "SAVED", "APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE",
  "OFFER", "ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED",
];

const STATUS_COLORS: Record<string, string> = {
  SAVED: "bg-gray-200 text-gray-700",
  APPLIED: "bg-blue-100 text-blue-700",
  PHONE_SCREEN: "bg-purple-100 text-purple-700",
  TECHNICAL: "bg-indigo-100 text-indigo-700",
  ONSITE: "bg-cyan-100 text-cyan-700",
  OFFER: "bg-green-100 text-green-700",
  ACCEPTED: "bg-green-500 text-white",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-orange-100 text-orange-700",
  GHOSTED: "bg-gray-400 text-white",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => "$" + n.toLocaleString();
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function JobDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated" && id) {
      fetchJob();
    }
  }, [authStatus, id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        setError("Job not found.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setJob(data);
    } catch {
      setError("Failed to load job.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      router.push("/jobs");
    } catch {
      setDeleting(false);
    }
  };

  // Update status via the dedicated PATCH endpoint, which also
  // creates a StatusHistory record for the timeline
  const handleStatusChange = async (newStatus: string) => {
    if (!job || newStatus === job.status) return;
    try {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchJob();
      }
    } catch {
      // silently fail
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/jobs" className="mb-6 inline-block text-sm text-gray-600 hover:text-black">
            &larr; Back to Job Tracker
          </Link>
          <p className="text-sm text-red-600">{error || "Job not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        {/* Back Button */}
        <Link href="/jobs" className="mb-6 inline-block text-sm text-gray-600 hover:text-black">
          &larr; Back to Job Tracker
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">{job.position}</h1>
            <p className="text-lg text-gray-600">{job.company}</p>
            {job.location && (
              <p className="mt-1 text-sm text-gray-400">{job.location}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/jobs?edit=${job.id}`)}
              className="rounded-md bg-orange-400 px-4 py-2 text-sm text-white hover:bg-orange-500"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column — Details */}
          <div className="col-span-2 space-y-6">
            {/* Info Card */}
            <div className="rounded-lg border-2 border-black bg-white p-6">
              <h2 className="mb-4 text-base font-semibold">Application Details</h2>
              <hr className="-mx-6 mb-6 border-t-2 border-black" />

              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <div className="mt-1">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[job.status] || "bg-gray-200"} border-0 focus:outline-none focus:ring-2 focus:ring-orange-400`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{formatStatus(s)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date Applied</p>
                  <p className="mt-1 text-sm text-gray-800">{formatDate(job.appliedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Salary Range</p>
                  <p className="mt-1 text-sm text-gray-800">
                    {formatSalary(job.salaryMin, job.salaryMax) || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Job URL</p>
                  {job.jobUrl ? (
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-orange-500 hover:underline"
                    >
                      View Posting <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">Not provided</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Added</p>
                  <p className="mt-1 text-sm text-gray-800">{formatDate(job.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</p>
                  <p className="mt-1 text-sm text-gray-800">{formatDate(job.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Job Description */}
            {job.jobDescription && (
              <div className="rounded-lg border-2 border-black bg-white p-6">
                <h2 className="mb-4 text-base font-semibold">Job Description</h2>
                <hr className="-mx-6 mb-6 border-t-2 border-black" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {job.jobDescription}
                </p>
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <div className="rounded-lg border-2 border-black bg-white p-6">
                <h2 className="mb-4 text-base font-semibold">Notes</h2>
                <hr className="-mx-6 mb-6 border-t-2 border-black" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {job.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Column — Status Timeline */}
          <div>
            <div className="rounded-lg border-2 border-black bg-white p-6">
              <h2 className="mb-4 text-base font-semibold">Status History</h2>
              <hr className="-mx-6 mb-6 border-t-2 border-black" />

              {job.statusHistory.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  <Clock className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-xs">No status changes yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {job.statusHistory.map((entry) => (
                      <div key={entry.id} className="relative flex gap-4 pl-8">
                        {/* Dot */}
                        <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-orange-400 bg-white" />

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[entry.fromStatus] || "bg-gray-200"}`}
                            >
                              {formatStatus(entry.fromStatus)}
                            </span>
                            <span className="text-xs text-gray-400">&rarr;</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[entry.toStatus] || "bg-gray-200"}`}
                            >
                              {formatStatus(entry.toStatus)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDateTime(entry.changedAt)}
                          </p>
                          {entry.note && (
                            <p className="mt-1 text-xs text-gray-600">{entry.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold">Delete Application</h2>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to delete your application for{" "}
              <strong>{job.position}</strong> at <strong>{job.company}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
