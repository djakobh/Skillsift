import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import type { FeedbackItem } from "~/app/resume/feedbackItem";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.1-8b-instant";

function buildPrompt(
  resumeText: string,
  issues: FeedbackItem[],
  jobDescription: string
): string {
  const failed = issues.filter((i) => !i.status);
  const issueList =
    failed.length > 0
      ? failed.map((i) => `- [${i.key}] ${i.name}: ${i.description}`).join("\n")
      : "- General ATS optimization needed";

  return `You are a professional resume optimizer. Analyze the resume below and provide specific, targeted recommendations to improve its ATS score.

ATS Issues Found:
${issueList}

Job Description (excerpt):
${jobDescription.slice(0, 600)}

Instructions:
- Find specific passages in the resume that relate to the issues above
- For each passage, provide a concrete improved replacement
- Focus on: adding missing keywords, strengthening action verbs, quantifying achievements, improving clarity

Respond with ONLY a raw JSON object. No markdown, no code fences, no explanation. Exact format:
{
  "recommendations": [
    {
      "id": "rec_1",
      "originalText": "exact verbatim text copied from the resume",
      "suggestion": "the improved replacement text",
      "reason": "one sentence explaining how this improves ATS score",
      "category": "keywords",
      "issue": "the issue name this addresses"
    }
  ]
}

Rules:
- originalText MUST be copied verbatim from the resume — exact characters, exact spacing
- Keep originalText to one sentence or one bullet point
- Provide 4 to 8 recommendations
- category must be one of: technical, experience, education, softSkills, formatting, keywords

RESUME:
${resumeText}`;
}

function extractJson(raw: string): string {
  // Strip markdown code fences if the LLM wrapped output
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();

  // Find outermost { ... }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);

  return raw.trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "Groq API key not configured" }, { status: 503 });
  }

  const body = await req.json() as {
    resumeText: string;
    feedbackItems: FeedbackItem[];
    jobDescription: string;
  };

  const { resumeText, feedbackItems, jobDescription } = body;

  if (!resumeText || !Array.isArray(feedbackItems)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = buildPrompt(resumeText, feedbackItems, jobDescription ?? "");

  let groqRes: Response;
  try {
    groqRes = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Groq API" }, { status: 502 });
  }

  if (!groqRes.ok) {
    return NextResponse.json({ error: "Groq API returned an error" }, { status: 502 });
  }

  const groqData = await groqRes.json() as { choices?: { message: { content: string } }[] };
  const rawContent = groqData?.choices?.[0]?.message?.content ?? "";

  try {
    const jsonStr = extractJson(rawContent);
    const parsed = JSON.parse(jsonStr) as { recommendations: unknown[] };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse Groq response as JSON", raw: rawContent },
      { status: 500 }
    );
  }
}
