"use client";

// BehavioralTour.tsx

import { useTour } from "~/components/tutorial-tour/useTour";

export default function BehavioralTour() {
  useTour({
    page: "behavioral",
    startStep: 2,
    steps: [
      {
        element: "#tour-camera-box",
        popover: {
          title: "Camera and Microphone",
          description:
            "Your camera and microphone are used during the behavioral interview so your responses can be evaluated for clarity, tone, and professionalism in real time.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-start-interview",
        popover: {
          title: "Start Interview",
          description:
            "Click here when you are ready to begin the behavioral interview. You will be given a prompt and asked to respond as you would in a real interview.",
          side: "top",
          align: "center",
        },
      },
    ],
    nextPage: "/technical",
  });

  return null;
}
