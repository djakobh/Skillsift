// Author: Dylan Hartley
// Date: 04/24/2026

import type { ATSScoreResult } from "~/server/utils/ats-scorer";

// Common job-description header phrases that are not useful as display labels.
// Records saved before the companyName field was added may have these as their label.
const JD_HEADER_PHRASES = [
  "about the job",
  "about this job",
  "job description",
  "position overview",
  "role overview",
  "overview",
  "about the role",
  "about us",
];

export function resolveLabel(stored: string | null | undefined): string {
  if (!stored) return "Untitled Role";
  const lower = stored.trim().toLowerCase();
  if (JD_HEADER_PHRASES.some((p) => lower.startsWith(p))) return "Untitled Role";
  return stored.trim();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DotStatus = "green" | "yellow" | "red";

export interface CategoryDotData {
    label: string;
    status: DotStatus;
}

// ─── Category computation ─────────────────────────────────────────────────────

function dotStatus(score: number, greenThreshold = 60, yellowThreshold = 40): DotStatus {
    if (score >= greenThreshold) return "green";
    if (score >= yellowThreshold) return "yellow";
    return "red";
}

export function getCategories(atsResult: ATSScoreResult): CategoryDotData[] {
    const { score, breakdown, keywordResult, formattingResult } = atsResult;

    const totalChecks = formattingResult.checks.length;
    const passedChecks = formattingResult.checks.filter((c) => c.passed).length;
    const formattingScore = totalChecks === 0 ? 100 : Math.round((passedChecks / totalChecks) * 100);

    const totalKw = keywordResult.matches.length;
    const foundKw = keywordResult.matches.filter((m) => m.found).length;
    const keywordScore = totalKw === 0 ? 100 : Math.round((foundKw / totalKw) * 100);

    return [
        { label: "ATS Matching",   status: dotStatus(breakdown.technicalSkills.score) },
        { label: "Formatting",     status: dotStatus(formattingScore) },
        { label: "Skills Match",   status: dotStatus(breakdown.softSkills.score) },
        { label: "Keywords",       status: dotStatus(keywordScore) },
        { label: "Recruiter Tips", status: dotStatus(score, 75, 50) },
    ];
}

// ─── Dot colors ───────────────────────────────────────────────────────────────

const DOT_COLOR: Record<DotStatus, string> = {
    green:  "bg-green-500",
    yellow: "bg-yellow-400",
    red:    "bg-red-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

export function CategoryDot({ label, status }: CategoryDotData) {
    return (
        <span className="flex items-center gap-1.5 text-xs text-gray-700 whitespace-nowrap">
            <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOR[status]}`} />
            {label}
        </span>
    );
}

export function CategoryDotGrid({ categories }: { categories: CategoryDotData[] }) {
    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {categories.map((cat) => (
                <CategoryDot key={cat.label} {...cat} />
            ))}
        </div>
    );
}

// ─── Mini half-circle ─────────────────────────────────────────────────────────
// Matches the HalfCircleChart style from resumeCharts.tsx, scaled down.
// Only the percentage is shown, centered inside the arc.

export function MiniDonut({ score }: { score: number }) {
    // Identical geometry to HalfCircleChart — just rendered at 65% of the original size
    const r = 80;
    const cx = 100;
    const cy = 100;
    const arcLength = Math.PI * r;
    const clampedScore = Math.min(Math.max(score, 0), 100);
    const offset = arcLength * (1 - clampedScore / 100);
    const color = clampedScore >= 70 ? "#22c55e" : clampedScore >= 50 ? "#FF6900" : "#ef4444";

    return (
        <div className="flex flex-col items-center flex-shrink-0">
            <svg width="140" height="77" viewBox="0 0 200 108" aria-label={`Score: ${score}%`}>
                {/* Track */}
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="16"
                    strokeLinecap="round"
                />
                {/* Progress */}
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={arcLength}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
                {/* Percentage */}
                <text x={cx} y={cy - 18} textAnchor="middle" style={{ fontSize: "32px", fontWeight: 700, fill: "#141212" }}>
                    {clampedScore}%
                </text>
                {/* Label */}
                <text x={cx} y={cy - 1} textAnchor="middle" style={{ fontSize: "13px", fill: "#898989", letterSpacing: "0.03em" }}>
                    Matching Score
                </text>
            </svg>
        </div>
    );
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

export function GradeBadge({ grade }: { grade: string }) {
    const color =
        grade.startsWith("A") ? "bg-green-100 text-green-700" :
        grade.startsWith("B") ? "bg-blue-100 text-blue-700" :
        grade.startsWith("C") ? "bg-yellow-100 text-yellow-700" :
        "bg-red-100 text-red-700";

    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${color}`}>
            {grade}
        </span>
    );
}

// ─── Dimension bar ────────────────────────────────────────────────────────────
// Shows one ATS dimension as a labeled progress bar with score.

export function DimensionBar({ label, score, weight }: { label: string; score: number; weight: number }) {
    const barColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f97316" : "#ef4444";
    return (
        <div className="flex items-center gap-2">
            <span className="w-32 text-xs text-gray-600 truncate flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, backgroundColor: barColor }}
                />
            </div>
            <span className="w-7 text-right text-xs text-gray-500 flex-shrink-0">{score}</span>
            <span className="text-xs text-gray-300 flex-shrink-0">{Math.round(weight * 100)}%</span>
        </div>
    );
}

// ─── Full dimension breakdown ─────────────────────────────────────────────────

export function DimensionBreakdown({ atsResult }: { atsResult: ATSScoreResult }) {
    const { breakdown } = atsResult;
    const dims = [
        breakdown.technicalSkills,
        breakdown.experience,
        breakdown.education,
        breakdown.softSkills,
        breakdown.toolsAndCertifications,
    ];
    return (
        <div className="flex flex-col gap-1.5">
            {dims.map((d) => (
                <DimensionBar key={d.label} label={d.label} score={d.score} weight={d.weight} />
            ))}
        </div>
    );
}
