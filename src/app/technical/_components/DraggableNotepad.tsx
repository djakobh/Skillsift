"use client";

import { useEffect, useRef, useState } from "react";

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='font-bold mt-2 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='font-bold mt-2 mb-1' style='font-size:1.1em'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='font-bold mt-2 mb-1' style='font-size:1.3em'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='bg-gray-200 px-1 rounded font-mono'>$1</code>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal'>$2</li>")
    .replace(/\n/g, "<br/>");
  return html;
}

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20];

export default function DraggableNotepad() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [notes, setNotes] = useState("");
  const [fontSize, setFontSize] = useState(12);

  // Position and size of the floating window
  const [position, setPosition] = useState({ x: 80, y: 120 });
  const [size, setSize] = useState({ width: 320, height: 380 });

  // Drag state
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resize state
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 320, height: 380 });

  const windowRef = useRef<HTMLDivElement>(null);

  // Load saved notes and preferences from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("interview-notepad");
    const savedFontSize = localStorage.getItem("interview-notepad-fontsize");
    if (savedNotes) {
      setNotes(savedNotes);
    }
    if (savedFontSize) {
      setFontSize(Number(savedFontSize));
    }
  }, []);

  // Auto save notes to localStorage
  useEffect(() => {
    localStorage.setItem("interview-notepad", notes);
  }, [notes]);

  // Save font size preference
  useEffect(() => {
    localStorage.setItem("interview-notepad-fontsize", String(fontSize));
  }, [fontSize]);

  // Drag window
  function handleDragMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }

  // Resize window
  function handleResizeMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    isResizing.current = true;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDragging.current) {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - 60;
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }

      if (isResizing.current) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        setSize({
          width: Math.max(260, resizeStart.current.width + deltaX),
          height: Math.max(200, resizeStart.current.height + deltaY),
        });
      }
    }

    function handleMouseUp() {
      isDragging.current = false;
      isResizing.current = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [size.width]);

  function clearNotes() {
    if (confirm("Clear all notes?")) {
      setNotes("");
    }
  }

  function decreaseFontSize() {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZES[currentIndex - 1]!);
    }
  }

  function increaseFontSize() {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[currentIndex + 1]!);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-6 z-50 bg-gray-800 text-white px-3 py-2 rounded-full text-xs font-medium shadow-lg hover:bg-gray-700"
      >
        Notes
      </button>
    );
  }

  return (
    <div
      ref={windowRef}
      className="fixed z-50 shadow-2xl rounded-lg border border-gray-300 bg-white flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? "auto" : size.height,
      }}
    >
      {/* Title bar — drag handle */}
      <div
        onMouseDown={handleDragMouseDown}
        className="flex items-center justify-between bg-gray-800 text-white px-3 py-2 rounded-t-lg cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <span className="text-xs font-medium"> Interview Notes</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="text-gray-300 hover:text-white text-xs px-1"
          >
            {isMinimized ? "▲" : "▼"}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-300 hover:text-white text-xs px-1"
          >
            X
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar: tabs + font size controls */}
          <div className="flex items-center border-b border-gray-200 shrink-0">
            <button
              onClick={() => setTab("write")}
              className={`px-3 py-1.5 text-xs font-medium ${
                tab === "write"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setTab("preview")}
              className={`px-3 py-1.5 text-xs font-medium ${
                tab === "preview"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Preview
            </button>

            <div className="flex-1" />

            {/* Font size controls */}
            <div className="flex items-center gap-1 px-2">
              <button
                onClick={decreaseFontSize}
                disabled={FONT_SIZES.indexOf(fontSize) === 0}
                className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-xs px-1 py-0.5 border rounded"
              >
                A-
              </button>
              <span className="text-xs text-gray-500 w-6 text-center">{fontSize}</span>
              <button
                onClick={increaseFontSize}
                disabled={FONT_SIZES.indexOf(fontSize) === FONT_SIZES.length - 1}
                className="text-gray-500 hover:text-gray-800 disabled:opacity-30 text-xs px-1 py-0.5 border rounded"
              >
                A+
              </button>
            </div>

            <button
              onClick={clearNotes}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500"
            >
              Clear
            </button>
          </div>

          {/* Write tab */}
          {tab === "write" && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                "Write your notes here...\n\n" +
                "Supports markdown:\n" +
                "# Heading\n" +
                "**bold** *italic*\n" +
                "- bullet point\n" +
                "`inline code`"
              }
              className="flex-1 p-3 resize-none outline-none font-mono"
              style={{ fontSize: fontSize }}
              spellCheck={false}
            />
          )}

          {/* Preview tab */}
          {tab === "preview" && (
            <div
              className="flex-1 p-3 overflow-y-auto"
              style={{ fontSize: fontSize }}
              dangerouslySetInnerHTML={{
                __html:
                  renderMarkdown(notes) ||
                  "<p class='text-gray-400'>Nothing to preview yet.</p>",
              }}
            />
          )}

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-400">Auto-saved</span>
            <span className="text-xs text-gray-400">{notes.length} chars</span>
          </div>

          {/* Resize handle — bottom right corner */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{
              backgroundImage:
                "radial-gradient(circle, #9ca3af 1px, transparent 1px)",
              backgroundSize: "3px 3px",
              backgroundPosition: "bottom right",
            }}
          />
        </>
      )}
    </div>
  );
}
