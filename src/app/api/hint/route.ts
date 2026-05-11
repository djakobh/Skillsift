import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.1-8b-instant";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 503 });
    }

    const { questionTitle, questionDescription, code, hintLevel } = await req.json();

    const levelDescriptions = [
      "Give a very general high-level hint about the approach or data structure to use. Do not give any code.",
      "Give a more specific hint about the algorithm or key steps involved. Do not give any code.",
      "Give a near-complete hint that explains the logic step by step. You may reference pseudocode but do not give working code.",
    ];

    const prompt =
      "You are a technical interview assistant helping a candidate who is stuck.\n\n" +
      "Question: " + questionTitle + "\n" +
      questionDescription + "\n\n" +
      "Candidate's current code:\n" + (code || "(no code written yet)") + "\n\n" +
      "This is hint " + hintLevel + " of 3. " + levelDescriptions[hintLevel - 1] + "\n" +
      "Keep the hint concise and under 5 sentences.";

    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
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

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to generate hint" }, { status: 502 });
    }

    const data = await response.json() as { choices?: { message: { content: string } }[] };
    const hintText = data?.choices?.[0]?.message?.content ?? "Could not generate hint.";

    return NextResponse.json({ hint: hintText });
  } catch (err) {
    console.error("HINT GENERATION ERROR:", err);
    return NextResponse.json({ error: "Failed to generate hint" });
  }
}
