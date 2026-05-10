// Author: Dylan Hartley
// Date: 04/24/2026

"use client";

import { useEffect, useRef, useState } from "react";

interface PdfViewerProps {
    file: File;
}

export default function PdfViewer({ file }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function renderPdf() {
            setLoading(true);
            setError(null);

            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }

            try {
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

                const arrayBuffer = await file.arrayBuffer();
                if (cancelled) return;

                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                if (cancelled) return;

                // Read container width now — div is always mounted so clientWidth is real
                const containerWidth = containerRef.current?.clientWidth ?? 800;

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    if (cancelled) break;

                    const page = await pdf.getPage(pageNum);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = containerWidth / baseViewport.width;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.display = "block";
                    canvas.style.width = "100%";
                    canvas.style.marginBottom = "8px";
                    canvas.style.borderRadius = "2px";
                    canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.12)";

                    containerRef.current?.appendChild(canvas);
                    await page.render({ canvas, viewport }).promise;
                }

                if (!cancelled) setLoading(false);
            } catch (err) {
                if (!cancelled) {
                    console.error("PDF render error:", err);
                    setError("Failed to render PDF.");
                    setLoading(false);
                }
            }
        }

        void renderPdf();
        return () => { cancelled = true; };
    }, [file]);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-gray-100 overflow-y-auto p-4 relative">

            {/* Spinner overlays the container while rendering */}
            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm m-0">Rendering PDF...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="m-4 border border-red-200 rounded-lg p-3 bg-red-50 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Always mounted so clientWidth is readable during render */}
            <div ref={containerRef} />
        </div>
    );
}
