// Author: Dylan Hartley
// Date: 04/03/2026

"use client";
import React from "react";
import type { FeedbackItem } from "./feedbackItem";
import { FeedbackCategory } from "./feedbackItem";

// ─── Dashboard config ────────────────────────────────────────────────────────

export type BadgeColor = "orange" | "blue" | "gray";

export const DASHBOARD_SECTIONS: {
    key: FeedbackCategory;
    label: string;
    badge: string;
    badgeColor: BadgeColor;
    description: string;
    placeholder: string;
}[] = [
    {
        key: FeedbackCategory.ATS_SCORE,
        label: "Searchability",
        badge: "IMPORTANT",
        badgeColor: "orange",
        description: "An ATS (Applicant Tracking System) is used by most companies to filter resumes before a recruiter sees them. Fix red items to improve how well your resume is parsed.",
        placeholder: "No ATS data available.",
    },
    {
        key: FeedbackCategory.SKILLS_MATCH,
        label: "Technical Skills",
        badge: "HIGH SCORE IMPACT",
        badgeColor: "blue",
        description: "Hard skills and tools extracted from the job description. These directly impact your ATS score — match as many as possible.",
        placeholder: "No technical skills data available.",
    },
    {
        key: FeedbackCategory.BEHAVIORAL_SKILLS,
        label: "Behavioral Skills",
        badge: "MEDIUM SCORE IMPACT",
        badgeColor: "gray",
        description: "Soft skills and behavioral traits mentioned in the job description. These are secondary to technical skills but contribute to your overall match.",
        placeholder: "No behavioral skills data available.",
    },
    {
        key: FeedbackCategory.RECRUITER_TIPS,
        label: "Recruiter Tips",
        badge: "IMPORTANT",
        badgeColor: "orange",
        description: "Actionable advice to make your resume stand out to recruiters and hiring managers.",
        placeholder: "No recruiter tips available.",
    },
    {
        key: FeedbackCategory.FORMATTING,
        label: "Formatting",
        badge: "MEDIUM SCORE IMPACT",
        badgeColor: "gray",
        description: "Formatting checks ensure your resume is clean, readable, and ATS-compatible.",
        placeholder: "Formatting analysis coming soon.",
    },
];

export const BADGE_STYLES: Record<BadgeColor, string> = {
    orange: "bg-orange-500 text-white",
    blue: "bg-blue-600 text-white",
    gray: "bg-zinc-600 text-zinc-300",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export type Segment = { text: string; color: "green" | "red" | null };

export function buildHighlightedSegments(text: string, keywords: FeedbackItem[]): Segment[] {
    let segments: Segment[] = [{ text, color: null }];

    for (const kw of keywords) {
        const color = kw.status ? "green" : "red";
        const escaped = kw.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "gi");
        const next: Segment[] = [];

        for (const seg of segments) {
            if (seg.color !== null) { next.push(seg); continue; }

            let last = 0;
            let match: RegExpExecArray | null;
            regex.lastIndex = 0;

            while ((match = regex.exec(seg.text)) !== null) {
                if (match.index > last) next.push({ text: seg.text.slice(last, match.index), color: null });
                next.push({ text: match[0], color });
                last = regex.lastIndex;
            }
            if (last < seg.text.length) next.push({ text: seg.text.slice(last), color: null });
        }

        segments = next;
    }

    return segments;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function DonutChart({ score }: { score: number }) {
    const r = 44;
    const cx = 60;
    const cy = 60;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - Math.min(score, 100) / 100);
    const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f97316" : "#ef4444";

    return (
        <svg width="130" height="130" viewBox="0 0 120 120">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
            <text x={cx} y={cy - 7} textAnchor="middle" fill="#111827" fontSize="20" fontWeight="bold">{score}%</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="9">Match Score</text>
        </svg>
    );
}

export function CategoryBar({ label, items }: { label: string; items: FeedbackItem[] }) {
    const total = items.length;
    const passing = items.filter(i => i.status).length;
    const failing = total - passing;
    const pct = total === 0 ? 100 : Math.round((passing / total) * 100);
    const barColor = pct === 100 ? "#22c55e" : pct >= 60 ? "#f97316" : "#ef4444";

    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <span className="text-gray-700 text-sm">{label}</span>
                {total === 0
                    ? <span className="text-gray-400 text-xs">—</span>
                    : failing > 0
                        ? <span className="text-red-500 text-xs">{failing} to fix</span>
                        : <span className="text-green-600 text-xs">All clear</span>
                }
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor, transition: "width 0.5s ease" }} />
            </div>
        </div>
    );
}

export function ReportSection({ label, badge, badgeColor, description, items, placeholder }: {
    label: string;
    badge: string;
    badgeColor: BadgeColor;
    description: string;
    items: FeedbackItem[];
    placeholder: string;
}) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-gray-900 m-0">{label}</h3>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold tracking-wide ${BADGE_STYLES[badgeColor]}`}>{badge}</span>
            </div>
            <p className="text-gray-500 text-sm px-5 py-3 border-b border-gray-200 m-0">{description}</p>
            {items.length === 0 ? (
                <p className="px-5 py-4 text-gray-400 text-sm italic m-0">{placeholder}</p>
            ) : (
                <div className="divide-y divide-gray-100">
                    {items.map((item, i) => (
                        <div key={i} className="grid grid-cols-[minmax(120px,1fr)_36px_3fr] gap-3 px-5 py-3 items-start">
                            <span className="text-gray-800 text-sm font-medium">{item.name}</span>
                            <span className="text-center text-base leading-none pt-0.5">{item.status ? "✅" : "❌"}</span>
                            <span className="text-gray-500 text-sm">{item.description}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Highlighted resume text ─────────────────────────────────────────────────

export function HighlightedResumeText({ text, highlights }: { text: string; highlights: string[] }) {
    if (!text) return <span className="text-gray-400 italic">No resume text available.</span>;
    if (highlights.length === 0) return <>{text}</>;

    type Seg = { text: string; highlight: boolean };
    let segments: Seg[] = [{ text, highlight: false }];

    const normalizeHL = (s: string) => s.replace(/^[\s\u0000-\u001F\u007F-\u00A0\uFFFD*•–—□◦◆▪]+/, "").trim();

    for (const hl of highlights) {
        if (!hl) continue;
        const next: Seg[] = [];

        const tryMatch = (haystack: string): { idx: number; matchLen: number } | null => {
            const exact = haystack.indexOf(hl);
            if (exact !== -1) return { idx: exact, matchLen: hl.length };
            const norm = normalizeHL(hl);
            if (!norm) return null;
            const normIdx = haystack.indexOf(norm);
            if (normIdx !== -1) return { idx: normIdx, matchLen: norm.length };
            return null;
        };

        for (const seg of segments) {
            if (seg.highlight) { next.push(seg); continue; }
            const match = tryMatch(seg.text);
            if (!match) { next.push(seg); continue; }
            if (match.idx > 0) next.push({ text: seg.text.slice(0, match.idx), highlight: false });
            next.push({ text: seg.text.slice(match.idx, match.idx + match.matchLen), highlight: true });
            const after = seg.text.slice(match.idx + match.matchLen);
            if (after) next.push({ text: after, highlight: false });
        }
        segments = next;
    }

    return (
        <>
            {segments.map((seg, i) =>
                seg.highlight
                    ? <mark key={i} className="bg-red-200 text-red-800 rounded-sm">{seg.text}</mark>
                    : <React.Fragment key={i}>{seg.text}</React.Fragment>
            )}
        </>
    );
}
