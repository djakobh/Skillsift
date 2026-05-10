//Author: Brandon Christian
//Date: 2/10/2026
//Move to separate file

import { SendResumeToServer, SendResumeTextAndJobDescToServer } from "./resumeService";
import type { FeedbackItem } from "./feedbackItem"
import { FeedbackCategory } from "./feedbackItem"

interface UploadResult {
    success: true;
    fileName: string;
    extractedText: string;
    textLength: number;
    file: File;
}

interface UploadError {
    success: false;
    error: string;
}

type UploadResponse = UploadResult | UploadError;

export async function OnUploadResumeClicked(): Promise<UploadResponse>  {

    try {
        /*Pause excution and wait for the user to select a non-empty
        valid file*/

        const file = await WaitForFile();
        console.log("Selected file:", file);

        //Send that file to the server
        const resp = await SendResumeToServer(file);
        const result = await resp.json();

        if (!result.success) {
            return {
                success: false,
                error: result.error?.message || "Upload failed",
            };
        }

        return {
            success: true,
            fileName: result.data.fileName,
            extractedText: result.data.extractedText,
            textLength: result.data.textLength,
            file,
        };

    } catch (err) {
        console.error(err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Upload failed",
        };
    }

};

async function WaitForFile(): Promise<File> {

    /*Wait for file to be selected by the user*/

    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.docx,.txt";

        input.onchange = () => {
            const file = input.files?.item(0);

            if (!file) {
                console.log("no file or bad file selected")
                reject(new Error("No file selected"));
                return;
            }

            console.log("resolving with file -->")
            console.log(file.name);
            resolve(file);
        };

        input.onerror = () => reject(new Error("File selection failed"));

        input.click();
    });
}

export async function OnAddJobDescriptionClicked(
    resumeText: string,
    jobDesc: string,
    resumeFileName: string,
    companyName?: string
): Promise<FeedbackItem[]> {

    //Send resume and job desc to server to be analyzed
    const response = await SendResumeTextAndJobDescToServer(resumeText, jobDesc, resumeFileName, companyName);
    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error?.message || "Analysis failed");
    }

    const { atsResult } = result.data;
    const { keywordResult, breakdown, details, score, grade, formattingResult } = atsResult;

    // Build FeedbackItem[] from ATS scoring results
    const items: FeedbackItem[] = [];

    // Match Score (overall ATS score displayed as the big number)
    items.push({
        key: FeedbackCategory.MATCH_SCORE,
        name: "none",
        description: `${score}% (${grade})`,
        status: true,
    });

    // ATS Score section: weighted breakdown per dimension
    items.push({
        key: FeedbackCategory.ATS_SCORE,
        name: "Overall",
        description: `ATS Score: ${score}/100 — Grade: ${grade}`,
        status: score >= 60,
    });

    for (const detail of details) {
        items.push({
            key: FeedbackCategory.ATS_SCORE,
            name: detail.dimension,
            description: `${detail.score}/100 — ${detail.explanation}`,
            status: detail.score >= 50,
        });
    }

    // Technical Skills: hard skills and tools extracted from the job description
    const technicalMatches = keywordResult.matches.filter(
        (m: { category: string }) => m.category === "technical_skill" || m.category === "tool"
    );
    for (const match of technicalMatches) {
        items.push({
            key: FeedbackCategory.SKILLS_MATCH,
            name: match.keyword,
            description: match.found
                ? `"${match.keyword}" matched`
                : `Missing: "${match.keyword}"`,
            status: match.found,
        });
    }

    // Behavioral Skills: soft skills and non-technical keywords from the job description
    const behavioralMatches = keywordResult.matches.filter(
        (m: { category: string }) => m.category !== "technical_skill" && m.category !== "tool"
    );
    for (const match of behavioralMatches) {
        items.push({
            key: FeedbackCategory.BEHAVIORAL_SKILLS,
            name: match.keyword,
            description: match.found
                ? `"${match.keyword}" found in resume`
                : `"${match.keyword}" missing from resume`,
            status: match.found,
        });
    }

    // Keywords: all keywords used for job description tab highlighting
    for (const match of keywordResult.matches) {
        items.push({
            key: FeedbackCategory.KEYWORDS,
            name: match.keyword,
            description: match.found
                ? `"${match.keyword}" found in resume`
                : `"${match.keyword}" missing from resume`,
            status: match.found,
        });
    }

    // Recruiter Tips: actionable advice based on scores
    if (keywordResult.missingKeywords.length > 0) {
        const topMissing = keywordResult.missingKeywords.slice(0, 5);
        items.push({
            key: FeedbackCategory.RECRUITER_TIPS,
            name: "Add Keywords",
            description: `Consider adding: ${topMissing.join(", ")}`,
            status: false,
        });
    }

    if (breakdown.experience.score < 50) {
        items.push({
            key: FeedbackCategory.RECRUITER_TIPS,
            name: "Experience",
            description: "Your experience may fall short — highlight relevant projects or internships",
            status: false,
        });
    }

    if (breakdown.education.score < 50) {
        items.push({
            key: FeedbackCategory.RECRUITER_TIPS,
            name: "Education",
            description: "Education requirement may not be met — emphasize certifications or coursework",
            status: false,
        });
    }

    if (score >= 75) {
        items.push({
            key: FeedbackCategory.RECRUITER_TIPS,
            name: "Strong Match",
            description: "Your resume is well-aligned with this job — likely to pass ATS screening",
            status: true,
        });
    } else if (score >= 50) {
        items.push({
            key: FeedbackCategory.RECRUITER_TIPS,
            name: "Moderate Match",
            description: "Your resume partially matches — tailor it more closely to this specific role",
            status: false,
        });
    } else {
        items.push({
            key: FeedbackCategory.RECRUITER_TIPS,
            name: "Weak Match",
            description: "Significant gaps detected — heavily tailor your resume for this role",
            status: false,
        });
    }

    // Formatting: rule-based checks on resume structure
    for (const check of formattingResult.checks) {
        items.push({
            key: FeedbackCategory.FORMATTING,
            name: check.name,
            description: check.explanation,
            status: check.passed,
        });
    }

    return items;
};

