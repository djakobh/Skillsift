import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" });
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

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const hintText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Could not generate hint.";

    return NextResponse.json({ hint: hintText });
  } catch (err) {
    console.error("HINT GENERATION ERROR:", err);
    return NextResponse.json({ error: "Failed to generate hint" });
  }
}