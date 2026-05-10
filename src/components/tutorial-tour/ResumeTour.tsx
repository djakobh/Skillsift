"use client";

// ResumeTour.tsx

import { useTour } from "~/components/tutorial-tour/useTour";

export default function ResumeTour() {
  useTour({
    page: "resume",
    startStep: 0,
    steps: [
      {
        element: "#tour-upload-box",
        popover: {
          title: "Resume Scanner",
          description:
            "Upload your resume here to get an ATS score and detailed feedback. Companies use automated systems to filter resumes — this tool helps make sure yours gets through.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-upload-btn",
        popover: {
          title: "Upload Resume",
          description:
            "Click here to select your resume file. Supported formats are PDF, DOCX, and TXT.",
          side: "top",
          align: "center",
        },
      },
    ],
    nextPage: "/interview/behavioral",
  });

  return null;
}
