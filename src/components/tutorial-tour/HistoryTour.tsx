"use client";

// HistoryTour.tsx

import { useTour } from "~/components/tutorial-tour/useTour";

export default function HistoryTour() {
  useTour({
    page: "history",
    startStep: 8,
    steps: [
      {
        element: "#tour-resume-card",
        popover: {
          title: "Resume Analysis History",
          description:
            "View all your past resume scans here. Click See All to browse your full resume analysis history.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-technical-card",
        popover: {
          title: "Technical Interview History",
          description:
            "View your technical interview sessions here. You can resume sessions you left mid-way or view your submitted code from completed sessions.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-behavioral-card",
        popover: {
          title: "Behavioral Interview History",
          description:
            "View your behavioral interview sessions here. Track your progress and review past sessions.",
          side: "bottom",
          align: "end",
        },
      },
    ],
    // No nextPage — this is the last page of the tour
  });

  return null;
}
