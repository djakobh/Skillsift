//Alexander Tu

"use client";

import { useState } from "react";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export default function OllamaChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your SkillSift Assistant.\n\n" +
        "I can help you with:\n" +
        "- Explaining how the app works\n" +
        "- Updating your profile and settings\n" +
        "- Finding session history\n\n" +
        "What would you like help with?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;

    const userMsg: Msg = { role: "user", content: input };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          model: "llama3.1",     
        }),
      });

      const raw = await res.text();
      let data: any;

      try {
        data = JSON.parse(raw);
      } catch {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Non-JSON response:\n${raw}` },
        ]);
        return;
      }

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `API ${res.status}: ${JSON.stringify(data)}` },
        ]);
        return;
      }

      const assistantText =
        data?.message?.content ??
        data?.response ??
        data?.choices?.[0]?.message?.content ??
        `Unexpected response: ${JSON.stringify(data)}`;

      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error contacting server: ${err?.message ?? String(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-3 space-y-2">
        {messages
          .filter((m) => m.role !== "system")
          .map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className="inline-block max-w-[90%] whitespace-pre-wrap rounded-lg bg-gray-100 p-2 text-sm text-gray-900">
                {m.content}
              </div>
            </div>
          ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
          placeholder="Ask something..."
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={loading}
        />
        <button
          onClick={send}
          className="rounded-md bg-orange-400 px-3 py-2 text-sm text-white hover:bg-orange-500 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}


