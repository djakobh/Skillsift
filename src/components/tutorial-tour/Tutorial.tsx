"use client";

// Tutorial.tsx
// Welcome modal + Take the Tour button
// Starts the multi-page guided tour using Driver.js

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "skillsift-tutorial-seen";
const TOUR_ACTIVE_KEY = "skillsift-tour-active";
const TOUR_STEP_KEY = "skillsift-tour-step";

export default function Tutorial() {
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const router = useRouter();

  // Load Driver.js CSS from CDN on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Show welcome modal on first visit
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setIsWelcomeOpen(true);
    }
  }, []);

  function startTour() {
    setIsWelcomeOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(TOUR_ACTIVE_KEY, "true");
    localStorage.setItem(TOUR_STEP_KEY, "0");
    // Start on Resume Scanner — first page of the tour
    router.push("/resume");
  }

  function skipTutorial() {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.removeItem(TOUR_ACTIVE_KEY);
    localStorage.removeItem(TOUR_STEP_KEY);
    setIsWelcomeOpen(false);
  }

  function openTour() {
    localStorage.setItem(TOUR_ACTIVE_KEY, "true");
    localStorage.setItem(TOUR_STEP_KEY, "0");
    router.push("/resume");
  }

  return (
    <>
      {/* Take the Tour button */}
      <button
        onClick={openTour}
        className="inline-block rounded-full border border-orange-500 px-6 py-2 text-sm text-orange-500 hover:bg-orange-50 transition-colors"
      >
        Take the Tour
      </button>

      {/* First visit welcome modal */}
      {isWelcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">Welcome to SkillSift!</h2>
              <p className="mb-8 text-sm text-gray-600">
                SkillSift helps you prepare for job interviews with AI-powered
                tools. Would you like a quick tour of what you can do here?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={startTour}
                  className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Yes, show me around
                </button>
                <button
                  onClick={skipTutorial}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  No thanks, I will explore on my own
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
