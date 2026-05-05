import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { APP_KNOWLEDGE } from "~/lib/chatbot/knowledge";
import { APP_ROUTES } from "~/lib/chatbot/appRoutes";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      profile: true,
      settings: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { messages } = await req.json();
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }

  const USER_CONTEXT = {
    name: user.name,
    email: user.email,
    settings: user.settings
      ? {
          prefersDarkMode: user.settings.prefersDarkMode,
          languagePref: user.settings.languagePref,
        }
      : null,
  };

  const systemMessage = {
    role: "system",
    content:
      `You are the in-app assistant for this application.\n` +
      `Use APP_KNOWLEDGE and APP_ROUTES to answer questions about the app.\n` +
      `Use USER_CONTEXT only for the authenticated user's account/settings questions.\n` +
      `When the user asks "where" or "how do I get to", answer with the route path from APP_ROUTES.\n\n` +
      `APP_KNOWLEDGE:\n${JSON.stringify(APP_KNOWLEDGE, null, 2)}\n\n` +
      `APP_ROUTES:\n${JSON.stringify(APP_ROUTES, null, 2)}\n\n` +
      `USER_CONTEXT:\n${JSON.stringify(USER_CONTEXT, null, 2)}`,
  };

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "Groq API key not configured" }, { status: 503 });
  }

  let r: Response;
  try {
    r = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        stream: false,
        messages: [systemMessage, ...messages],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Groq API" }, { status: 502 });
  }

  if (!r.ok) {
    return NextResponse.json({ error: "Groq API returned an error" }, { status: 502 });
  }

  const data = await r.json() as { choices?: { message: { content: string } }[] };
  const content = data?.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ message: { role: "assistant", content } });
}
