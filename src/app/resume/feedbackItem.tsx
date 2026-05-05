//Author: Dylan Hartley
//Date: 2/10/2026

export enum FeedbackCategory {
    NONE = "none",
    ATS_SCORE = "ats_score",
    SKILLS_MATCH = "skills_match",
    BEHAVIORAL_SKILLS = "behavioral_skills",
    FORMATTING = "formatting",
    RECRUITER_TIPS = "recruiter_tips",
    KEYWORDS = "keywords",
    MATCH_SCORE = "match_score"
}

export type FeedbackItem = {
    key: FeedbackCategory
    name: string;
    description: string;
    status: boolean;
};
