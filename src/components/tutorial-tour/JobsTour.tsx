"use client";

// JobsTour.tsx

import { useTour } from "~/components/tutorial-tour/useTour";

export default function JobsTour() {
  useTour({
    page: "jobs",
    startStep: 6,
    steps: [
      {
        element: "#tour-add-job",
        popover: {
          title: "Add a Job",
          description:
            "Click here to add a new job application. You can track the company, position, status, salary, and more. Keep all your applications organized in one place.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tour-suggestions",
        popover: {
          title: "Job Suggestions",
          description:
            "Get personalized job listings based on your tracked applications. Click here to scroll down and see suggested jobs matching your interests.",
          side: "bottom",
          align: "start",
        },
      },
    ],
    nextPage: "/history",
  });

  return null;
}
