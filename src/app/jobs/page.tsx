// Alvin Ngo student work report 3
// Main Job Tracker dashboard page.
// Displays all tracked job applications in a sortable, filterable table.
// Includes: stats bar, search/filter controls, inline status dropdown,
// add/edit modal, delete confirmation, and links to job detail pages.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Search, ChevronDown, Trash2, ExternalLink, ArrowUpDown, Sparkles } from "lucide-react";
import JobSuggestions from "./_components/JobSuggestions";
import JobsTour from "~/components/tutorial-tour/JobsTour";

// TypeScript type matching the JobApplication Prisma model
type JobApplication = {
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
};

// All possible application statuses — matches the ApplicationStatus enum in Prisma
const STATUS_OPTIONS = [
  "SAVED",
  "APPLIED",
  "PHONE_SCREEN",
  "TECHNICAL",
  "ONSITE",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "GHOSTED",
];

// Color-coded badge styles for each status (Tailwind classes)
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

// ─── Add/Edit Job Modal ─────────────────────────────────────────────
// Reused for both creating and editing jobs.
// When `job` prop is null, it renders as "Add". When a job is passed, it pre-fills fields for editing.

function JobFormModal({
  job,
  onClose,
  onSaved,
}: {
  job: JobApplication | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!job; // Determines if we're editing an existing job or creating a new one
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [company, setCompany] = useState(job?.company || "");
  const [position, setPosition] = useState(job?.position || "");
  const [jobDescription, setJobDescription] = useState(job?.jobDescription || "");
  const [jobUrl, setJobUrl] = useState(job?.jobUrl || "");
  const [salaryMin, setSalaryMin] = useState(job?.salaryMin?.toString() || "");
  const [salaryMax, setSalaryMax] = useState(job?.salaryMax?.toString() || "");
  const [location, setLocation] = useState(job?.location || "");
  const [status, setStatus] = useState(job?.status || "SAVED");
  const [notes, setNotes] = useState(job?.notes || "");
  const [appliedAt, setAppliedAt] = useState(
    job?.appliedAt ? new Date(job.appliedAt).toISOString().split("T")[0] : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!company.trim() || !position.trim()) {
      setError("Company and position are required.");
      return;
    }

    if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) {
      setError("Minimum salary cannot exceed maximum salary.");
      return;
    }

    if (jobUrl && !/^https?:\/\/.+/.test(jobUrl)) {
      setError("Please enter a valid URL (starting with http:// or https://).");
      return;
    }

    setSaving(true);

    const payload = {
      company: company.trim(),
      position: position.trim(),
      jobDescription: jobDescription.trim() || null,
      jobUrl: jobUrl.trim() || null,
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
      location: location.trim() || null,
      status,
      notes: notes.trim() || null,
      appliedAt: appliedAt || null,
    };

    try {
      const res = await fetch(isEdit ? `/api/jobs/${job.id}` : "/api/jobs", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setSaving(false);
        return;
      }

      onSaved();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {isEdit ? "Edit Job Application" : "Add Job Application"}
        </h2>

        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {/* Company */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Company *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. Google"
              />
            </div>

            {/* Position */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Position *</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. Software Engineer"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. Remote, San Francisco, CA"
              />
            </div>

            {/* Salary Min */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Salary Min</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. 80000"
              />
            </div>

            {/* Salary Max */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Salary Max</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. 120000"
              />
            </div>

            {/* Job URL */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Job URL</label>
              <input
                type="text"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="https://..."
              />
            </div>

            {/* Applied Date */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium">Date Applied</label>
              <input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Job Description */}
          <div className="mt-4 flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">Job Description</label>
              <span className="text-xs text-gray-400">
                {jobDescription.length} characters
              </span>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="h-28 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-orange-400 focus:outline-none"
              placeholder="Paste the job description here..."
            />
          </div>

          {/* Notes */}
          <div className="mt-4 flex flex-col">
            <label className="mb-1 text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-orange-400 focus:outline-none"
              placeholder="Any personal notes about this application..."
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-orange-400 px-6 py-2 text-white hover:bg-orange-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Job"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm text-gray-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ──────────────────────────────────────

function DeleteConfirmModal({
  job,
  onClose,
  onDeleted,
}: {
  job: JobApplication;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      onDeleted();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold">Delete Application</h2>
        <p className="mb-6 text-sm text-gray-600">
          Are you sure you want to delete your application for{" "}
          <strong>{job.position}</strong> at <strong>{job.company}</strong>? This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
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
  );
}

// ─── Inline Status Dropdown ─────────────────────────────────────────
// Clickable status badge that opens a dropdown to quickly change status
// without opening the full edit modal. Detects available viewport space
// and opens upward if near the bottom of the screen.

function StatusBadge({
  job,
  onStatusChanged,
}: {
  job: JobApplication;
  onStatusChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Check if there's enough space below the button for the dropdown (280px),
  // otherwise open it upward to prevent it from going off-screen
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 280);
    }
    setOpen(!open);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === job.status) {
      setOpen(false);
      return;
    }
    setUpdating(true);
    try {
      await fetch(`/api/jobs/${job.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChanged();
    } catch {
      // silently fail
    }
    setUpdating(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={updating}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${STATUS_COLORS[job.status] || "bg-gray-200 text-gray-700"}`}
      >
        {updating ? "..." : formatStatus(job.status)}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 z-50 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(s);
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${
                s === job.status ? "font-bold text-orange-500" : "text-gray-700"
              }`}
            >
              {formatStatus(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats Bar ──────────────────────────────────────────────────────
// Summary cards shown above the job list when the user has applications.
// "Active" counts applications still in progress (not in a terminal state).

function StatsBar({ jobs }: { jobs: JobApplication[] }) {
  const total = jobs.length;
  // Active = everything except terminal statuses
  const active = jobs.filter(
    (j) => !["ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED"].includes(j.status)
  ).length;
  const offers = jobs.filter((j) => j.status === "OFFER" || j.status === "ACCEPTED").length;
  const rate = total > 0 ? Math.round((offers / total) * 100) : 0;

  const stats = [
    { label: "Total", value: total },
    { label: "Active", value: active },
    { label: "Offers", value: offers },
    { label: "Offer Rate", value: `${rate}%` },
  ];

  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center"
        >
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function JobsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobApplication | null>(null);

  // Fetch jobs from the API with current filter/sort state.
  // Wrapped in useCallback so it can be used as a dependency in useEffect
  // and re-called when filters change.
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [statusFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchJobs();
    }
  }, [authStatus, fetchJobs, router]);

  const handleSaved = () => {
    setShowAddModal(false);
    setEditingJob(null);
    fetchJobs();
  };

  const handleDeleted = () => {
    setDeletingJob(null);
    fetchJobs();
  };

  // Toggle sort direction on the same column, or switch to a new column (default desc)
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (authStatus === "loading") {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Job Tracker</h1>
            <p className="text-sm text-gray-600">
              Track your job applications and monitor your progress.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              id="tour-suggestions"
              href="#suggestions"
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Sparkles className="h-4 w-4 text-orange-500" />
              See Suggestions
            </a>
            <button
              id="tour-add-job"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Job
            </button>
          </div>
        </div>

        {/* Stats */}
        {jobs.length > 0 && <StatsBar jobs={jobs} />}

        {/* Filters */}
        <div className="mb-6 rounded-lg border-2 border-black bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">All Applications</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {jobs.length} Total
            </span>
          </div>
          <hr className="-mx-6 mb-6 border-t-2 border-black" />

          {/* Search & Filter Controls */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Job List */}
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
          ) : jobs.length === 0 ? (
            <div className="space-y-6 py-12 text-center text-gray-500">
              <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
              <p className="text-sm">No job applications yet</p>
              <p className="text-xs">
                Start tracking your applications to stay organized!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600"
              >
                Add Your First Job
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200">
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_2fr_140px_140px_140px_80px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <button
                  onClick={() => toggleSort("company")}
                  className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Company
                  <ArrowUpDown className="h-3 w-3" />
                </button>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Position
                </span>
                <button
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </button>
                <button
                  onClick={() => toggleSort("appliedAt")}
                  className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Applied
                  <ArrowUpDown className="h-3 w-3" />
                </button>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Salary
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </span>
              </div>

              {/* Table Rows */}
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="grid cursor-pointer grid-cols-[2fr_2fr_140px_140px_140px_80px] gap-2 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {job.company}
                    </p>
                    {job.location && (
                      <p className="text-xs text-gray-400">{job.location}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-700">{job.position}</p>
                  </div>
                  <div className="flex items-center">
                    <StatusBadge job={job} onStatusChanged={fetchJobs} />
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500">
                      {formatDate(job.appliedAt)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500">
                      {formatSalary(job.salaryMin, job.salaryMax) || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Open job posting"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingJob(job);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingJob(job);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adzuna-powered suggestions embedded below the tracker */}
        <JobSuggestions onJobAdded={fetchJobs} />
      </div>

      {/* Modals */}
      {showAddModal && (
        <JobFormModal job={null} onClose={() => setShowAddModal(false)} onSaved={handleSaved} />
      )}
      {editingJob && (
        <JobFormModal job={editingJob} onClose={() => setEditingJob(null)} onSaved={handleSaved} />
      )}
      {deletingJob && (
        <DeleteConfirmModal job={deletingJob} onClose={() => setDeletingJob(null)} onDeleted={handleDeleted} />
      )}
      <JobsTour />
    </main>
  );
}
