"use client";

// TechnicalTour.tsx

import { useTour } from "~/components/tutorial-tour/useTour";

export default function TechnicalTour() {
  useTour({
    page: "technical",
    startStep: 4,
    steps: [
      {
        element: "#tour-timer",
        popover: {
          title: "Interview Timer",
          description:
            "You have 60 minutes to complete both questions. The timer pauses automatically if you switch tabs or minimize the window, and you can resume your session from the History page anytime.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tour-question-list",
        popover: {
          title: "Your Questions",
          description:
            "You will be assigned two coding questions of different difficulty levels. Click Start on any question to begin coding. You can switch between questions at any time.",
          side: "top",
          align: "center",
        },
      },
    ],
    nextPage: "/jobs",
  });

  return null;
}
