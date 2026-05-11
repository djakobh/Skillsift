// Dylan Hartley
// 12/12/2025
// initial template

// Brandon Christian
// 4/23/2026
// fetch interviews filter and display overview

"use client"

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Clock, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

import { GetUserBehavioralSessions } from "./behavioralHistoryService";
import { DisplayFeedbackItems } from "../../interview/behavioral/feedbackDisplay";
import { FilterItems, FilterDisplay, DateDisplay } from "../../account/overview/listFilter";

export function BehavioralInterviewHistoryPageContents() {
  return (
    <main className="page-blob-bg pt-12 pb-16 min-h-screen">
      <div className="mx-auto max-w-4xl px-6 flex flex-col gap-6">
        <div className="page-animate" style={{ animationDelay: "0.05s" }}>
          <Link href="/history" className="btn-ghost btn-sm inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
        </div>
        <div className="page-animate text-center" style={{ animationDelay: "0.1s" }}>
          <h1 className="m-0">Behavioral Interview History</h1>
          <p className="description m-0 mt-1">
            Access all your behavioral interview sessions and improve your soft skills.
          </p>
        </div>
        <div className="page-animate" style={{ animationDelay: "0.2s" }}>
          <ResultsContainer />
        </div>
      </div>
    </main>
  );
}

function ResultsContainer() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [empty, setEmpty] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [filterType, setFilter] = useState("all");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");

  useEffect(() => {
    (async () => {
      const asyncItems = await GetUserBehavioralSessions();
      setItems(asyncItems);
      setFilteredItems(asyncItems);
      setLoaded(true);
      setEmpty(asyncItems.length === 0);
    })();
  }, []);

  useEffect(() => {
    const filtered = FilterItems(startDate, endDate, filterType, items);
    setFilteredItems(filtered);
  }, [startDate, endDate, filterType]);

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 className="text-gray-900 m-0">All Behavioral Interviews</h3>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {items.length} Total
        </span>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <DateDisplay startDate={startDate} endDate={endDate} setStartDate={setStart} setEndDate={setEnd} />
          <FilterDisplay filterType={filterType} setFilterType={setFilter} />
        </div>

        {!loaded && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}

        {loaded && empty && <EmptyList />}

        {loaded && !empty && (
          <>
            <FilledList sessions={filteredItems} />
            <div className="flex justify-center pt-2">
              <Link href="/interview/behavioral" className="btn-primary btn-sm">
                <Plus className="h-4 w-4" />
                New Interview
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <MessageSquare className="h-10 w-10 text-gray-300" />
      <p className="text-sm font-medium text-gray-700 m-0">No behavioral interviews yet</p>
      <p className="text-xs text-gray-400 m-0">Start a behavioral interview to see your results here</p>
      <Link href="/interview/behavioral" className="btn-primary btn-sm mt-1">
        <Plus className="h-3.5 w-3.5" />
        Start Interview
      </Link>
    </div>
  );
}

function FilledList({ sessions }: { sessions: any[] }) {
  return (
    <div className="flex flex-col gap-3">
      {sessions.map((s, index) => (
        <ListItem key={index} s={s} />
      ))}
    </div>
  );
}

function ListItem({ s }: { s: any }) {
  let statusColor = "bg-yellow-100 text-yellow-700";
  let statusLabel = "In Progress";

  if (s.status === "COMPLETED") {
    statusColor = "bg-green-100 text-green-700";
    statusLabel = "Completed";
  } else if (s.status === "ABANDONED") {
    statusColor = "bg-red-100 text-red-600";
    statusLabel = "Abandoned";
  }

  const [display, setDisplay] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
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
            Time spent: {formatDuration(s.startedAt, s.completedAt, s.pausedAt, s.resumedAt, s.status)}
          </p>
          {s.responses.length > 0 && (
            <p className="text-xs text-gray-500 m-0">
              {s.responses.length} question{s.responses.length !== 1 ? "s" : ""} attempted
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {s.status === "IN_PROGRESS" && (
            <Link href="/interview/behavioral" className="btn-primary btn-sm">
              Resume
            </Link>
          )}
          {s.status === "COMPLETED" && (
            <button
              onClick={() => setDisplay(!display)}
              className="btn-ghost btn-sm"
            >
              {display ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              View Results
            </button>
          )}
        </div>
      </div>

      {display && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          <OverviewBox item={s} />
        </div>
      )}
    </div>
  );
}

function OverviewBox({ item }: { item: any }) {
  return (
    <div>
      {item.feedback ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide m-0">Feedback</p>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <DisplayFeedbackItems items={item.feedback} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 m-0">No feedback available.</p>
      )}
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

// Author: Justin Do
function formatDuration(startedAt: Date, completedAt: Date | null, pausedAt: Date | null, resumedAt: Date | null, status?: string) {
  if (!completedAt && pausedAt && !resumedAt) {
    const activeMs = new Date(pausedAt).getTime() - new Date(startedAt).getTime();
    const totalSeconds = Math.floor(activeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "m " + seconds + "s";
  }

  if (!completedAt) return status === "ABANDONED" ? "not recorded" : "-";

  const endTime = new Date(completedAt).getTime();
  let pausedMs = 0;
  if (pausedAt && resumedAt) {
    pausedMs = new Date(resumedAt).getTime() - new Date(pausedAt).getTime();
  }

  const activeMs = endTime - new Date(startedAt).getTime() - pausedMs;
  if (activeMs <= 0) return "< 1m";
  const totalSeconds = Math.floor(activeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + "m " + seconds + "s";
}
