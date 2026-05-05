//Alexander Tu

"use client";

import { useRef, useState } from "react";

export default function VideoAnalysisPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  async function upload() {
    if (!file) {
      setError("Please choose a video file first.");
      return;
    }

    setBusy(true);
    setError(null);
    setVideoId(null);
    setAnalysis(null);

    try {
      const fd = new FormData();
      fd.append("video", file);

      const res = await fetch("/api/behavioral-analyzer", {
        method: "POST",
        body: fd,
      });

      const raw = await res.text();

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response:\n${raw.slice(0, 800)}`);
      }

      if (!res.ok) {
        throw new Error(JSON.stringify(data, null, 2));
      }

      setVideoId(data.videoId);
      setAnalysis(data.analysis);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-5xl font-black text-center mt-24">
        Behavioral Video Analysis
      </h1>

      <div className="relative z-[9999] mt-16 flex flex-col items-center gap-6">
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Choose video
        </button>

        <div className="text-sm text-gray-600">
          {file ? `Selected: ${file.name}` : "No file selected"}
        </div>

        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="px-10 py-4 rounded-xl bg-orange-300 text-white font-semibold hover:bg-orange-400 disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Upload & Analyze"}
        </button>

        {error && (
          <div className="w-full max-w-4xl rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
            <div className="font-semibold text-xl mb-2">Error</div>
            <pre className="whitespace-pre-wrap text-sm overflow-auto">
              {error}
            </pre>
          </div>
        )}

        {videoId && (
          <div className="w-full max-w-4xl space-y-4">
            <div className="font-semibold text-xl">Playback</div>
            <video
              controls
              className="w-full rounded-lg border"
              src={`/api/videos/${videoId}`}
            />

            <div className="font-semibold text-xl">Analysis</div>
            <pre className="overflow-auto text-sm bg-gray-50 border rounded p-4">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}