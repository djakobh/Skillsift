// Author: Dylan Hartley
// Date: 04/03/2026

import type { FeedbackItem } from "./feedbackItem";
import { FeedbackCategory } from "./feedbackItem";
import type { OptimizeResponse } from "~/app/api/resume/optimize/route";

export async function fetchOptimizations(
    resumeText: string,
    jobDescription: string,
    data: FeedbackItem[]
): Promise<OptimizeResponse> {
    const missingKeywords = data
        .filter(i => i.key === FeedbackCategory.KEYWORDS && !i.status)
        .map(i => i.name);

    const scoreStr = data.find(i => i.key === FeedbackCategory.MATCH_SCORE)?.description ?? "0%";
    const atsScore = parseInt(scoreStr.match(/^(\d+)/)?.[1] ?? "0");

    const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, missingKeywords, atsScore }),
    });

    const json = await res.json() as OptimizeResponse | { success: false; error: string };

    if (!json.success) {
        throw new Error((json as { success: false; error: string }).error);
    }

    return json as OptimizeResponse;
}
