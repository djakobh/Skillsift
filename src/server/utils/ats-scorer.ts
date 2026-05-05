/**
 * ATS Scoring Engine — Workday-style weighted formula.
 *
 * Workday ranks candidates by how closely a resume matches the job
 * requisition across five weighted dimensions:
 *
 *   1. Technical / Hard Skills  (40%)  — programming languages, frameworks, etc.
 *   2. Experience Level         (25%)  — years-of-experience alignment
 *   3. Education                (15%)  — degree level & field-of-study match
 *   4. Soft Skills              (10%)  — leadership, communication, etc.
 *   5. Tools & Certifications   (10%)  — specific platforms, certs
 *
 */

import {
  matchKeywords,
  KeywordCategory,
  type KeywordMatchResult,
} from "./keyword-matcher";
import { computeFormattingScore, type FormattingResult } from "./resume-formatter";

// ============================================
// Types
// ============================================

export interface ATSScoreResult {
  /** Final weighted ATS score 0-100 */
  score: number;
  /** Letter grade (A+ through F) */
  grade: string;
  /** Individual dimension scores */
  breakdown: ATSBreakdown;
  /** The underlying keyword match data */
  keywordResult: KeywordMatchResult;
  /** Human-readable explanations per dimension */
  details: ATSDetail[];
  /** Rule-based resume formatting checks */
  formattingResult: FormattingResult;
}

export interface ATSBreakdown {
  technicalSkills: DimensionScore;
  experience: DimensionScore;
  education: DimensionScore;
  softSkills: DimensionScore;
  toolsAndCertifications: DimensionScore;
}

export interface DimensionScore {
  /** Raw score for this dimension, 0-100 */
  score: number;
  /** Weight applied (0-1, all weights sum to 1.0) */
  weight: number;
  /** Weighted contribution to final score */
  weighted: number;
  /** Short label */
  label: string;
}

export interface ATSDetail {
  dimension: string;
  score: number;
  maxScore: number;
  explanation: string;
}

// ============================================
// Weights (must sum to 1.0)
// ============================================

const WEIGHTS = {
  technicalSkills: 0.40,
  experience: 0.25,
  education: 0.15,
  softSkills: 0.10,
  toolsAndCertifications: 0.10,
} as const;

// ============================================
// Experience extraction
// ============================================

/**
 * Extracts the number of years of experience requested from a job
 * description by scanning for common patterns like:
 *   "3+ years", "5-7 years of experience", "minimum 2 years"
 *
 * Returns the highest requirement found, or 0 if none detected.
 */
export function extractRequiredYears(jobDescription: string): number {
  const text = jobDescription.toLowerCase();

  const patterns = [
    // "5+ years", "3+ yrs"
    /(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of\s+(?:professional\s+)?experience)?/g,
    // "minimum 3 years", "at least 5 years"
    /(?:minimum|at\s+least|min\.?)\s*(\d{1,2})\s*(?:years?|yrs?)/g,
    // "3-5 years", "5 to 7 years"
    /(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(?:years?|yrs?)/g,
  ];

  let maxYears = 0;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // For range patterns (3-5 years) use the lower bound
      const years = parseInt(match[1]!, 10);
      if (!isNaN(years) && years > maxYears && years <= 30) {
        maxYears = years;
      }
    }
  }

  return maxYears;
}

/**
 * Extracts the highest number of years of experience a candidate claims
 * from their resume. Looks for patterns like:
 *   "5 years of experience", "3+ years in…", date ranges that imply tenure.
 */
export function extractResumeYears(resumeText: string): number {
  const text = resumeText.toLowerCase();

  let maxYears = 0;

  // Direct mentions: "5 years of experience", "3+ years in…"
  const directPatterns = [
    /(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of\s+(?:professional\s+)?(?:experience|expertise))?/g,
    /(?:over|more\s+than)\s+(\d{1,2})\s*(?:years?|yrs?)/g,
  ];

  for (const pattern of directPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const years = parseInt(match[1]!, 10);
      if (!isNaN(years) && years > maxYears && years <= 40) {
        maxYears = years;
      }
    }
  }

  // Date-range tenure: "2018 - 2023", "Jan 2019 – Present"
  const dateRangePattern =
    /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{4})\s*[-–—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{4}|present|current)/g;

  const currentYear = new Date().getFullYear();
  let match;
  while ((match = dateRangePattern.exec(text)) !== null) {
    const startYear = parseInt(match[1]!, 10);
    const endStr = match[2]!;
    const endYear =
      endStr === "present" || endStr === "current"
        ? currentYear
        : parseInt(endStr, 10);

    if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear) {
      const span = endYear - startYear;
      if (span > maxYears && span <= 40) {
        maxYears = span;
      }
    }
  }

  return maxYears;
}

/**
 * Scores how well the candidate's experience matches the requirement.
 *
 * - Meets or exceeds requirement → 100
 * - Within 1 year of requirement → 75
 * - Within 2 years              → 50
 * - Has some experience but far short → 25
 * - No experience detected, no requirement → 70 (neutral)
 * - No experience detected, requirement exists → 15
 */
function scoreExperience(requiredYears: number, resumeYears: number): number {
  // No requirement stated in job description
  if (requiredYears === 0) {
    return resumeYears > 0 ? 85 : 70;
  }

  if (resumeYears >= requiredYears) return 100;
  if (resumeYears >= requiredYears - 1) return 75;
  if (resumeYears >= requiredYears - 2) return 50;
  if (resumeYears > 0) return 25;
  return 15;
}

// ============================================
// Education scoring
// ============================================

/** Degree levels ordered by seniority */
const DEGREE_LEVELS: { pattern: RegExp; level: number }[] = [
  { pattern: /\b(?:ph\.?d|doctorate|doctoral)\b/i, level: 4 },
  { pattern: /\b(?:master'?s?|m\.?s\.?|m\.?a\.?|mba|m\.?eng)\b/i, level: 3 },
  { pattern: /\b(?:bachelor'?s?|b\.?s\.?|b\.?a\.?|b\.?eng|undergraduate)\b/i, level: 2 },
  { pattern: /\b(?:associate'?s?|a\.?s\.?|a\.?a\.?)\b/i, level: 1 },
];

function detectDegreeLevel(text: string): number {
  let highest = 0;
  for (const { pattern, level } of DEGREE_LEVELS) {
    if (pattern.test(text)) {
      highest = Math.max(highest, level);
    }
  }
  return highest;
}

/** Common field-of-study terms to match between JD and resume */
const FIELD_PATTERNS = [
  "computer science",
  "software engineering",
  "information technology",
  "information systems",
  "electrical engineering",
  "computer engineering",
  "data science",
  "mathematics",
  "statistics",
  "cybersecurity",
  "engineering",
  "business",
  "related field",
  "stem",
];

function detectFields(text: string): string[] {
  const lower = text.toLowerCase();
  return FIELD_PATTERNS.filter((f) => lower.includes(f));
}

/**
 * Scores education alignment.
 *
 * - Degree level meets/exceeds requirement & field matches → 100
 * - Degree level meets requirement, field doesn't match    → 75
 * - Degree level one below requirement                     → 50
 * - Has a degree but far below requirement                 → 30
 * - No degree detected, requirement exists                 → 10
 * - No requirement detected                                → 70 (neutral)
 */
function scoreEducation(
  jobDescription: string,
  resumeText: string
): { score: number; explanation: string } {
  const requiredLevel = detectDegreeLevel(jobDescription);
  const resumeLevel = detectDegreeLevel(resumeText);

  const requiredFields = detectFields(jobDescription);
  const resumeFields = detectFields(resumeText);

  // No education requirement stated
  if (requiredLevel === 0 && requiredFields.length === 0) {
    if (resumeLevel > 0) {
      return { score: 80, explanation: "Degree detected (no specific requirement listed)" };
    }
    return { score: 70, explanation: "No education requirement specified" };
  }

  // Check field overlap
  const fieldMatch =
    requiredFields.length === 0 ||
    requiredFields.some((f) => f === "related field" || resumeFields.includes(f));

  if (resumeLevel >= requiredLevel && fieldMatch) {
    return { score: 100, explanation: "Education fully meets requirements" };
  }
  if (resumeLevel >= requiredLevel) {
    return { score: 75, explanation: "Degree level met; field of study differs" };
  }
  if (resumeLevel === requiredLevel - 1) {
    return {
      score: 50,
      explanation: "Degree level one step below requirement",
    };
  }
  if (resumeLevel > 0) {
    return { score: 30, explanation: "Has a degree but below required level" };
  }
  return { score: 10, explanation: "No degree detected; requirement exists" };
}

// ============================================
// Category ratio helper
// ============================================

/**
 * Calculates a 0-100 score from matched/total for one or more
 * KeywordCategory entries in the keyword result.
 * Returns 70 (neutral) if the JD had zero keywords in those categories.
 */
function categoryScore(
  keywordResult: KeywordMatchResult,
  categories: KeywordCategory[]
): number {
  let matched = 0;
  let total = 0;

  for (const cat of categories) {
    const b = keywordResult.categoryBreakdown[cat];
    matched += b.matched;
    total += b.total;
  }

  if (total === 0) return 70; // neutral — JD didn't mention this dimension
  return Math.round((matched / total) * 100);
}

// ============================================
// Grade mapping
// ============================================

function toGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D+";
  if (score >= 45) return "D";
  if (score >= 40) return "D-";
  return "F";
}

// ============================================
// Main scoring function
// ============================================

/**
 * Computes a Workday-style ATS score for a resume against a job description.
 */
export function computeATSScore(
  resumeText: string,
  jobDescriptionText: string
): ATSScoreResult {
  // 1. Run keyword matching (reuse existing logic)
  const keywordResult = matchKeywords(resumeText, jobDescriptionText);

  // 2. Score each dimension
  const techScore = categoryScore(keywordResult, [
    KeywordCategory.TECHNICAL_SKILL,
  ]);

  const requiredYears = extractRequiredYears(jobDescriptionText);
  const resumeYears = extractResumeYears(resumeText);
  const expScore = scoreExperience(requiredYears, resumeYears);

  const eduResult = scoreEducation(jobDescriptionText, resumeText);
  const eduScore = eduResult.score;

  const softScore = categoryScore(keywordResult, [KeywordCategory.SOFT_SKILL]);

  const toolCertScore = categoryScore(keywordResult, [
    KeywordCategory.TOOL,
    KeywordCategory.CERTIFICATION,
  ]);

  // 3. Build breakdown
  const breakdown: ATSBreakdown = {
    technicalSkills: {
      score: techScore,
      weight: WEIGHTS.technicalSkills,
      weighted: Math.round(techScore * WEIGHTS.technicalSkills),
      label: "Technical Skills",
    },
    experience: {
      score: expScore,
      weight: WEIGHTS.experience,
      weighted: Math.round(expScore * WEIGHTS.experience),
      label: "Experience Level",
    },
    education: {
      score: eduScore,
      weight: WEIGHTS.education,
      weighted: Math.round(eduScore * WEIGHTS.education),
      label: "Education",
    },
    softSkills: {
      score: softScore,
      weight: WEIGHTS.softSkills,
      weighted: Math.round(softScore * WEIGHTS.softSkills),
      label: "Soft Skills",
    },
    toolsAndCertifications: {
      score: toolCertScore,
      weight: WEIGHTS.toolsAndCertifications,
      weighted: Math.round(toolCertScore * WEIGHTS.toolsAndCertifications),
      label: "Tools & Certifications",
    },
  };

  // 4. Weighted total
  const rawScore =
    techScore * WEIGHTS.technicalSkills +
    expScore * WEIGHTS.experience +
    eduScore * WEIGHTS.education +
    softScore * WEIGHTS.softSkills +
    toolCertScore * WEIGHTS.toolsAndCertifications;

  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  // 5. Build human-readable details
  const details: ATSDetail[] = [];

  // Technical skills detail
  const techBd = keywordResult.categoryBreakdown[KeywordCategory.TECHNICAL_SKILL];
  details.push({
    dimension: "Technical Skills",
    score: techScore,
    maxScore: 100,
    explanation:
      techBd.total > 0
        ? `${techBd.matched} of ${techBd.total} required technical skills found (weight: 40%)`
        : "No specific technical skills listed in job description (weight: 40%)",
  });

  // Experience detail
  details.push({
    dimension: "Experience",
    score: expScore,
    maxScore: 100,
    explanation:
      requiredYears > 0
        ? `Job requires ${requiredYears}+ years; resume shows ~${resumeYears} years (weight: 25%)`
        : resumeYears > 0
          ? `No specific years required; ~${resumeYears} years detected (weight: 25%)`
          : "No specific experience requirement or mentions detected (weight: 25%)",
  });

  // Education detail
  details.push({
    dimension: "Education",
    score: eduScore,
    maxScore: 100,
    explanation: `${eduResult.explanation} (weight: 15%)`,
  });

  // Soft skills detail
  const softBd = keywordResult.categoryBreakdown[KeywordCategory.SOFT_SKILL];
  details.push({
    dimension: "Soft Skills",
    score: softScore,
    maxScore: 100,
    explanation:
      softBd.total > 0
        ? `${softBd.matched} of ${softBd.total} soft skills found (weight: 10%)`
        : "No specific soft skills listed in job description (weight: 10%)",
  });

  // Tools & certs detail
  const toolBd = keywordResult.categoryBreakdown[KeywordCategory.TOOL];
  const certBd = keywordResult.categoryBreakdown[KeywordCategory.CERTIFICATION];
  const toolCertTotal = toolBd.total + certBd.total;
  const toolCertMatched = toolBd.matched + certBd.matched;
  details.push({
    dimension: "Tools & Certifications",
    score: toolCertScore,
    maxScore: 100,
    explanation:
      toolCertTotal > 0
        ? `${toolCertMatched} of ${toolCertTotal} required tools/certifications found (weight: 10%)`
        : "No specific tools or certifications listed in job description (weight: 10%)",
  });

  const formattingResult = computeFormattingScore(resumeText);

  return {
    score,
    grade: toGrade(score),
    breakdown,
    keywordResult,
    details,
    formattingResult,
  };
}
