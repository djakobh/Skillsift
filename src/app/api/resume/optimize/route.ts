// Author: Dylan Hartley
// Date: 04/03/2026

import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

interface OptimizeRequest {
  resumeText: string;
  jobDescription: string;
  missingKeywords: string[];
  atsScore: number;
}

export interface OptimizeSuggestion {
  section: string;
  issue: string;
  suggestion: string;
  // The exact substring from the resume to replace, and what to replace it with.
  // Empty strings mean the suggestion is advisory only (no direct edit possible).
  originalText: string;
  replacementText: string;
}

export interface OptimizeResponse {
  success: true;
  atsImprovementTips: string[];
  suggestions: OptimizeSuggestion[];
  summary: string;
}

interface OptimizeErrorResponse {
  success: false;
  error: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a resume coach. Given a resume and job description, output JSON only. No extra text.`;

function buildUserPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  atsScore: number
): string {
  return `ATS score: ${atsScore}%. Missing keywords: ${missingKeywords.slice(0, 15).join(", ") || "none"}.

RESUME:
${resumeText.slice(0, 2500)}

JOB DESCRIPTION:
${jobDescription.slice(0, 1000)}

Output this JSON and nothing else:
{
  "summary": "2 sentence assessment",
  "suggestions": [
    {
      "section": "section name",
      "issue": "one sentence max describing the problem",
      "originalText": "exact verbatim line copied from the RESUME above",
      "replacementText": "the improved version of that line"
    }
  ]
}

Rules:
- Output exactly 5 suggestions
- "issue" must be one sentence maximum — no explanations, just the problem
- originalText must be copied verbatim from the RESUME — do not rephrase it
- replacementText is the improved version of that same line
- Focus on the highest-impact changes: missing keywords, weak bullet points, vague descriptions
- NEVER suggest changes to programming languages, tools, or software lists — these are correct as-is and must be ignored entirely
- replacementText must be a concrete, specific improvement — never use vague filler or generic placeholders
- Only suggest changes where the improvement is clear and specific; if you cannot make a meaningful improvement to a line, skip it and pick a different line
- Each originalText must be unique across all suggestions — never use the same resume line more than once
- For experience bullet points, rewrite them using the X-Y-Z format: "Accomplished [X] as measured by [Y], by doing [Z]" — make the impact and method explicit
- NEVER invent specific percentages, numbers, or metrics that are not already in the resume — use placeholders like "XX%" or "[N]x" instead
- NEVER suggest adding a keyword or technology to a section unless that keyword is clearly relevant to the work described in that section — do not force missing keywords into unrelated projects or experience
- NEVER suggest adding a degree, GPA, or education details if they are already present anywhere in the resume. Ensure you read through the entire resume before making any suggestions.
`;
}

export async function POST(req: Request): Promise<NextResponse<OptimizeResponse | OptimizeErrorResponse>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<OptimizeRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { resumeText, jobDescription, missingKeywords = [], atsScore = 0 } = body;

  if (!resumeText || typeof resumeText !== "string") {
    return NextResponse.json({ success: false, error: "resumeText is required" }, { status: 400 });
  }
  if (!jobDescription || typeof jobDescription !== "string") {
    return NextResponse.json({ success: false, error: "jobDescription is required" }, { status: 400 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: "Groq API key not configured" }, { status: 503 });
  }

  try {
    const groqRes = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(resumeText, jobDescription, missingKeywords, atsScore) },
        ],
      }),
    });

    if (!groqRes.ok) {
      return NextResponse.json({ success: false, error: "Groq service unavailable" }, { status: 503 });
    }

    const groqData = await groqRes.json() as { choices?: { message: { content: string } }[] };
    const raw = groqData?.choices?.[0]?.message?.content ?? "";

    // Strip potential markdown fences before parsing
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let parsed: { suggestions?: Partial<OptimizeSuggestion>[]; summary?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Ollama returned non-JSON:", raw);
      return NextResponse.json({ success: false, error: "Model returned invalid JSON. Try again." }, { status: 500 });
    }

    const SKILL_LIST_PATTERN = /^(programming languages|languages|tools|software|frameworks|technologies|tech stack|libraries|databases|platforms)\s*:/i;

    const suggestions: OptimizeSuggestion[] = (parsed.suggestions ?? [])
      .map(s => ({
        section: s.section ?? "",
        issue: s.issue ?? "",
        suggestion: s.suggestion ?? "",
        originalText: s.originalText ?? "",
        replacementText: s.replacementText ?? "",
      }))
      .filter(s => !SKILL_LIST_PATTERN.test(s.originalText.trim()))
      .filter((s, idx, arr) => !s.originalText || arr.findIndex(x => x.originalText === s.originalText) === idx);

    return NextResponse.json({
      success: true,
      atsImprovementTips: [],
      suggestions,
      summary: parsed.summary ?? "",
    });
  } catch (err) {
    console.error("OPTIMIZE ERROR:", err);
    return NextResponse.json({ success: false, error: "Unexpected server error" }, { status: 500 });
  }
}
