//Alexander Tu

"use client";

import { useState } from "react";
import OllamaChat from "./OllamaChat";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-orange-400 px-5 py-3 text-white shadow-lg hover:bg-orange-500"
        aria-label="Open chat"
      >
        {open ? "Close" : "Chat"}
      </button>

      {/* Floating panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[360px] max-w-[90vw] rounded-xl border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">Assistant</span>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Close
            </button>
          </div>
          <div className="max-h-[60vh] overflow-auto p-4">
            <OllamaChat />
          </div>
        </div>
      )}
    </>
  );
}