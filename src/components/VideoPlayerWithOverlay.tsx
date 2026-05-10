"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type VideoAnalysisSegment = {
  id?: string;
  category: "posture" | "eye_contact" | "facial_expression" | string;
  startSec: number;
  endSec: number;
  isGood: boolean;
  scoreAvg?: number | null;
  note?: string | null;
  createdAt?: Date | string;
};

type Props = {
  videoSrc: string;
  segments: VideoAnalysisSegment[];
  title?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  posture: "Posture",
  eye_contact: "Eye Contact",
  facial_expression: "Facial Expression",
};

const CATEGORY_COLORS: Record<string, string> = {
  posture: "bg-blue-500",
  eye_contact: "bg-green-500",
  facial_expression: "bg-purple-500",
};

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  posture: "border-blue-500",
  eye_contact: "border-green-500",
  facial_expression: "border-purple-500",
};

export default function VideoPlayerWithOverlay({
  videoSrc,
  segments,
  title = "Video Analysis Playback",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration || 0);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => a.startSec - b.startSec);
  }, [segments]);

  const activeSegments = useMemo(() => {
    return sortedSegments.filter(
      (segment) =>
        currentTime >= segment.startSec && currentTime <= segment.endSec
    );
  }, [sortedSegments, currentTime]);

  const groupedActiveSegments = useMemo(() => {
    return {
      posture: activeSegments.find((s) => s.category === "posture"),
      eye_contact: activeSegments.find((s) => s.category === "eye_contact"),
      facial_expression: activeSegments.find(
        (s) => s.category === "facial_expression"
      ),
    };
  }, [activeSegments]);

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function jumpToTime(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    setCurrentTime(seconds);
  }

  function segmentLeft(segment: VideoAnalysisSegment) {
    if (!duration) return 0;
    return (segment.startSec / duration) * 100;
  }

  function segmentWidth(segment: VideoAnalysisSegment) {
    if (!duration) return 0;
    return Math.max(((segment.endSec - segment.startSec) / duration) * 100, 0.6);
  }

  function markerColor(category: string, isGood: boolean) {
    if (isGood) {
      if (category === "posture") return "bg-blue-400";
      if (category === "eye_contact") return "bg-green-400";
      if (category === "facial_expression") return "bg-purple-400";
      return "bg-gray-400";
    }

    if (category === "posture") return "bg-red-500";
    if (category === "eye_contact") return "bg-yellow-500";
    if (category === "facial_expression") return "bg-pink-500";
    return "bg-red-500";
  }

  return (
    <div className="w-full max-w-5xl space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>

      <div className="relative">
        <video
          ref={videoRef}
          controls
          className="w-full rounded-xl border bg-black"
          src={videoSrc}
        />

        {/* Active overlays */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-4 right-4 flex max-w-sm flex-col gap-3">
            {groupedActiveSegments.facial_expression && (
              <OverlayCard segment={groupedActiveSegments.facial_expression} />
            )}
            {groupedActiveSegments.posture && (
              <OverlayCard segment={groupedActiveSegments.posture} />
            )}
            {groupedActiveSegments.eye_contact && (
              <OverlayCard segment={groupedActiveSegments.eye_contact} />
            )}
          </div>
        </div>
      </div>

      {/* Current time */}
      <div className="text-sm text-gray-600">
        Current Time: {formatTime(currentTime)} / {formatTime(duration || 0)}
      </div>

      {/* Timeline */}
      <div className="space-y-4 rounded-xl border p-4">
        <div className="text-lg font-semibold">Analysis Timeline</div>

        {(["facial_expression", "posture", "eye_contact"] as const).map(
          (category) => {
            const categorySegments = sortedSegments.filter(
              (s) => s.category === category
            );

            return (
              <div key={category} className="space-y-2">
                <div className="text-sm font-medium">
                  {CATEGORY_LABELS[category]}
                </div>

                <div className="relative h-8 w-full rounded bg-gray-200">
                  {categorySegments.map((segment, index) => {
                    const segId =
                      segment.id ??
                      `${segment.category}-${segment.startSec}-${segment.endSec}-${index}`;

                    return (
                      <button
                        key={segId}
                        type="button"
                        onClick={() => jumpToTime(segment.startSec)}
                        onMouseEnter={() => setHoveredSegmentId(segId)}
                        onMouseLeave={() => setHoveredSegmentId(null)}
                        className={`absolute top-1 h-6 rounded ${
                          markerColor(segment.category, segment.isGood)
                        } border border-white transition-opacity hover:opacity-80`}
                        style={{
                          left: `${segmentLeft(segment)}%`,
                          width: `${segmentWidth(segment)}%`,
                        }}
                        title={`${CATEGORY_LABELS[segment.category] ?? segment.category}: ${segment.note ?? ""} (${formatTime(segment.startSec)} - ${formatTime(segment.endSec)})`}
                      >
                        <span className="sr-only">
                          {segment.note ?? `${segment.category} segment`}
                        </span>
                      </button>
                    );
                  })}

                  {/* Playhead */}
                  {duration > 0 && (
                    <div
                      className="pointer-events-none absolute top-0 h-8 w-0.5 bg-black"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                  )}
                </div>

                {/* Hovered segment details */}
                {hoveredSegmentId && (
                  <div className="text-xs text-gray-700">
                    {(() => {
                      const hovered = categorySegments.find((segment, index) => {
                        const segId =
                          segment.id ??
                          `${segment.category}-${segment.startSec}-${segment.endSec}-${index}`;
                        return segId === hoveredSegmentId;
                      });

                      if (!hovered) return null;

                      return (
                        <>
                          <span className="font-semibold">
                            {hovered.isGood ? "Good" : "Needs attention"}:
                          </span>{" "}
                          {hovered.note ?? "No note"} ({formatTime(hovered.startSec)} -{" "}
                          {formatTime(hovered.endSec)})
                          {typeof hovered.scoreAvg === "number" && (
                            <> · Score {hovered.scoreAvg.toFixed(2)}</>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          }
        )}

        {/* Clickable list */}
        <div className="pt-2">
          <div className="mb-2 text-sm font-semibold">Segments</div>
          <div className="max-h-72 space-y-2 overflow-auto">
            {sortedSegments.map((segment, index) => {
              const segId =
                segment.id ??
                `${segment.category}-${segment.startSec}-${segment.endSec}-${index}`;

              return (
                <button
                  key={segId}
                  type="button"
                  onClick={() => jumpToTime(segment.startSec)}
                  className={`flex w-full items-start justify-between rounded-lg border p-3 text-left hover:bg-gray-50 ${
                    CATEGORY_BORDER_COLORS[segment.category] ?? "border-gray-300"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {CATEGORY_LABELS[segment.category] ?? segment.category} ·{" "}
                      {segment.isGood ? "Good" : "Needs attention"}
                    </div>
                    <div className="text-sm text-gray-700">
                      {segment.note ?? "No note"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(segment.startSec)} - {formatTime(segment.endSec)}
                    </div>
                  </div>

                  {typeof segment.scoreAvg === "number" && (
                    <div className="text-sm font-medium text-gray-600">
                      {segment.scoreAvg.toFixed(2)}
                    </div>
                  )}
                </button>
              );
            })}

            {sortedSegments.length === 0 && (
              <div className="text-sm text-gray-500">No segments available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayCard({ segment }: { segment: VideoAnalysisSegment }) {
  const label = CATEGORY_LABELS[segment.category] ?? segment.category;
  const badgeColor =
    CATEGORY_COLORS[segment.category] ?? "bg-gray-500";

  return (
    <div className="rounded-xl bg-black/80 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${badgeColor}`} />
        <div className="text-sm font-semibold">{label}</div>
      </div>

      <div className="mt-1 text-sm">
        {segment.isGood ? "Good" : "Needs attention"}
      </div>

      {segment.note && (
        <div className="mt-1 text-xs text-gray-200">{segment.note}</div>
      )}

      {typeof segment.scoreAvg === "number" && (
        <div className="mt-2 text-xs text-gray-300">
          Score: {segment.scoreAvg.toFixed(2)}
        </div>
      )}
    </div>
  );
}