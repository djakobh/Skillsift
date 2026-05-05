// Types for AI-powered resume recommendations

export type RecommendationCategory =
  | "technical"
  | "experience"
  | "education"
  | "softSkills"
  | "formatting"
  | "keywords";

export interface Recommendation {
  id: string;
  originalText: string;   // verbatim substring of resume to highlight
  suggestion: string;     // replacement text
  reason: string;         // one-sentence explanation
  category: RecommendationCategory;
  issue: string;          // the ATS issue this addresses
}
