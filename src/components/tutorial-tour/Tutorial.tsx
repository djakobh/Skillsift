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
      {/* Take the Tour button — sits in the Navbar next to the user avatar */}
      <button onClick={openTour} className="btn-outline btn-sm">
        Take the Tour
      </button>

      {/* First visit welcome modal */}
      {isWelcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">

            {/* Header — matches every card in the app */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h3 className="text-gray-900 m-0">Welcome to SkillSift!</h3>
            </div>

            {/* Body */}
            <div className="px-6 py-6 flex flex-col gap-5">
              <p className="description m-0">
                SkillSift helps you prepare for job interviews with AI-powered
                tools. Would you like a quick tour of what you can do here?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={startTour}
                  className="btn-primary w-full justify-center"
                >
                  Yes, show me around
                </button>
                <button
                  onClick={skipTutorial}
                  className="btn-ghost w-full justify-center"
                >
                  No thanks, I&apos;ll explore on my own
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
