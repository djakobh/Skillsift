"use client";

// useTour.ts
// Hook used by each page to check if a tour is active and run Driver.js steps

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TOUR_ACTIVE_KEY = "skillsift-tour-active";
const TOUR_STEP_KEY = "skillsift-tour-step";

export type TourPageConfig = {
  page: string;
  startStep: number;
  steps: {
    element: string;
    popover: {
      title: string;
      description: string;
      side?: string;
      align?: string;
    };
  }[];
  nextPage?: string;
};

export function useTour(config: TourPageConfig) {
  const router = useRouter();

  useEffect(() => {
    const isActive = localStorage.getItem(TOUR_ACTIVE_KEY);
    const currentStep = parseInt(localStorage.getItem(TOUR_STEP_KEY) ?? "0");

    if (!isActive || currentStep !== config.startStep) {
      return;
    }

    const timeout = setTimeout(async () => {
      // Inject Driver.js CSS from CDN if not already present
      if (!document.getElementById("driver-js-css")) {
        const link = document.createElement("link");
        link.id = "driver-js-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css";
        document.head.appendChild(link);
        // Wait for CSS to load before starting the tour
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const { driver } = await import("driver.js");

      const driverObj = driver({
        showProgress: false,
        animate: true,
        overlayColor: "rgba(0,0,0,0.5)",
        nextBtnText: config.nextPage ? "Next Page" : "Done",
        prevBtnText: "Back",
        doneBtnText: "Done",
        onDestroyStarted: () => {
          localStorage.removeItem(TOUR_ACTIVE_KEY);
          localStorage.removeItem(TOUR_STEP_KEY);
          driverObj.destroy();
        },
        onNextClick: () => {
          const currentIndex = driverObj.getActiveIndex() ?? 0;
          const isLastStep = currentIndex === config.steps.length - 1;

          if (isLastStep && config.nextPage) {
            const nextStep = config.startStep + config.steps.length;
            localStorage.setItem(TOUR_STEP_KEY, String(nextStep));
            driverObj.destroy();
            router.push(config.nextPage);
          } else {
            driverObj.moveNext();
          }
        },
        steps: config.steps.map((s) => ({
          element: s.element,
          popover: s.popover,
        })),
      });

      driverObj.drive();
    }, 800);

    return () => clearTimeout(timeout);
  }, []);
}