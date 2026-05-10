// Alvin Ngo student work report 3
// Main Job Tracker dashboard page.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Search, ChevronDown, Trash2, ExternalLink, ArrowUpDown, Pencil } from "lucide-react";
import JobSuggestions from "./_components/JobSuggestions";
import { LocationInput } from "./_components/LocationInput";

type JobApplication = {
  id: string;
  company: string;
  position: string;
  jobDescription: string | null;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  experienceLevel: string | null;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const EXPERIENCE_LEVEL_OPTIONS = [
  "Internship",
  "Entry Level",
  "Mid Level",
  "Senior Level",
  "Lead / Principal",
];

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
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Shared input class ─────────────────────────────────────────────
const inputClass =
  "rounded-lg border border-gray-200 p-2 text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-white w-full";

// ─── Add/Edit Job Modal ─────────────────────────────────────────────

function JobFormModal({
  job,
  onClose,
  onSaved,
}: {
  job: JobApplication | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!job;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [company, setCompany] = useState(job?.company || "");
  const [position, setPosition] = useState(job?.position || "");
  const [jobDescription, setJobDescription] = useState(job?.jobDescription || "");
  const [jobUrl, setJobUrl] = useState(job?.jobUrl || "");
  const [salaryMin, setSalaryMin] = useState(job?.salaryMin?.toString() || "");
  const [salaryMax, setSalaryMax] = useState(job?.salaryMax?.toString() || "");
  const [location, setLocation] = useState(job?.location || "");
  const [experienceLevel, setExperienceLevel] = useState(job?.experienceLevel || "");
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
      experienceLevel: experienceLevel || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">
        {/* Modal header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <h3 className="text-gray-900 m-0">
            {isEdit ? "Edit Job Application" : "Add Job Application"}
          </h3>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company *</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} placeholder="e.g. Google" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position *</label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={inputClass} placeholder="e.g. Software Engineer" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience Level</label>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={inputClass}>
                  <option value="">Any</option>
                  {EXPERIENCE_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</label>
                <LocationInput value={location} onChange={setLocation} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Salary Min</label>
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className={inputClass} placeholder="e.g. 80000" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Salary Max</label>
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className={inputClass} placeholder="e.g. 120000" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job URL</label>
                <input type="text" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} className={inputClass} placeholder="https://..." />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Applied</label>
                <input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Description</label>
                <span className="text-xs text-gray-400">{jobDescription.length} characters</span>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="h-28 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-800 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="Paste the job description here..."
              />
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-800 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="Any personal notes about this application..."
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Job"}
              </button>
            </div>
          </form>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <h3 className="text-gray-900 m-0">Delete Application</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 m-0">
            Are you sure you want to delete your application for{" "}
            <strong>{job.position}</strong> at <strong>{job.company}</strong>? This action cannot be undone.
          </p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-outline btn-sm"
              style={{ color: "#ef4444", borderColor: "#fca5a5" }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Status Dropdown ─────────────────────────────────────────

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
    if (newStatus === job.status) { setOpen(false); return; }
    setUpdating(true);
    try {
      await fetch(`/api/jobs/${job.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChanged();
    } catch { /* silently fail */ }
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
          className={`absolute left-0 z-50 w-40 rounded-lg bg-white shadow-lg border border-gray-200 ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); void handleStatusChange(s); }}
              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${s === job.status ? "font-bold text-orange-500" : "text-gray-700"}`}
            >
              {formatStatus(s)}
            </button>
          ))}
        </div>
      )}
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobApplication | null>(null);

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
    } catch { /* silently fail */ }
    setLoading(false);
  }, [statusFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") { fetchJobs(); }
  }, [authStatus, fetchJobs, router]);

  const handleSaved = () => { setShowAddModal(false); setEditingJob(null); fetchJobs(); };
  const handleDeleted = () => { setDeletingJob(null); fetchJobs(); };

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
      <main className="page-blob-bg min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="page-blob-bg pt-12 pb-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-6 flex flex-col gap-6">

        {/* Header */}
        <div className="page-animate text-center" style={{ animationDelay: "0.05s" }}>
          <h1 className="m-0">Job Tracker</h1>
          <p className="description m-0 mt-1">
            Track your job applications and monitor your progress.
          </p>
        </div>

        {/* Main content card */}
        <div
          className="page-animate border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
          style={{ animationDelay: "0.25s" }}
        >
          {/* Card header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-gray-900 m-0">All Applications</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {jobs.length > 0 && [
                { label: "Total", value: jobs.length },
                { label: "Active", value: jobs.filter((j) => !["ACCEPTED","REJECTED","WITHDRAWN","GHOSTED"].includes(j.status)).length },
                { label: "Offers", value: jobs.filter((j) => j.status === "OFFER" || j.status === "ACCEPTED").length },
                { label: "Offer Rate", value: `${jobs.length > 0 ? Math.round((jobs.filter((j) => j.status === "OFFER" || j.status === "ACCEPTED").length / jobs.length) * 100) : 0}%` },
              ].map((stat) => (
                <span key={stat.label} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  <span className="font-bold text-gray-800">{stat.value}</span> {stat.label}
                </span>
              ))}
              <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
                <Plus className="h-4 w-4" />
                Add Job
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Search & Filter Controls */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by company or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>

            {/* Job List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <Briefcase className="h-12 w-12 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-700 m-0">No job applications yet</p>
                  <p className="text-xs text-gray-400 m-0 mt-1">Start tracking your applications to stay organized.</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
                  <Plus className="h-4 w-4" /> Add Your First Job
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_2fr_140px_140px_140px_80px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                  <button onClick={() => toggleSort("company")} className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Company <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Position</span>
                  <button onClick={() => toggleSort("status")} className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <button onClick={() => toggleSort("appliedAt")} className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Applied <ArrowUpDown className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Salary</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</span>
                </div>

                {/* Table Rows */}
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="grid cursor-pointer grid-cols-[2fr_2fr_140px_140px_140px_80px] gap-2 border-b border-gray-100 last:border-0 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 m-0">{job.company}</p>
                      {job.location && (
                        <p className="text-xs text-gray-400 m-0 mt-0.5">{job.location}</p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700 m-0">{job.position}</p>
                    </div>
                    <div className="flex items-center">
                      <StatusBadge job={job} onStatusChanged={fetchJobs} />
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm text-gray-500 m-0">{formatDate(job.appliedAt)}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm text-gray-500 m-0">
                        {formatSalary(job.salaryMin, job.salaryMax) || "-"}
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
                        onClick={(e) => { e.stopPropagation(); setEditingJob(job); }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingJob(job); }}
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
        </div>

        {/* Job Suggestions */}
        <div className="page-animate" style={{ animationDelay: "0.35s" }} id="suggestions">
          <JobSuggestions onJobAdded={fetchJobs} />
        </div>

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
    </main>
  );
}
