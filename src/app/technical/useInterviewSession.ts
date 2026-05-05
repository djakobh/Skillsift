"use client";

import { useEffect, useRef, useState } from "react";

export type SessionStatus = "idle" | "active" | "paused" | "ended";

export type SessionResponse = {
  question: string;
  answer: string;
};

export type InterviewSession = {
  dbSessionId: string | null;
  startedAt: Date | null;
  status: SessionStatus;
  totalPausedMs: number;
};

type UseInterviewSessionReturn = {
  session: InterviewSession;
  timeLeft: number;
  startSession: (question1Id: string, question2Id: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: (responses: SessionResponse[]) => Promise<void>;
  hydrateSession: (dbSessionId: string, totalPausedMs: number, startedAt: string) => void;
  formatTime: (seconds: number) => string;
};

const INTERVIEW_DURATION_SECONDS = 60 * 60; // 60 minutes

export function useInterviewSession(
  onTimeExpired: () => void
): UseInterviewSessionReturn {

  const [session, setSession] = useState<InterviewSession>({
    dbSessionId: null,
    startedAt: null,
    status: "idle",
    totalPausedMs: 0,
  });

  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SECONDS);

  // Track when the session was paused locally so we can accumulate paused time
  const pausedAtRef = useRef<number | null>(null);

  // Refs so event listeners always read the latest values without stale closures
  const statusRef = useRef<SessionStatus>("idle");
  const dbSessionIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    statusRef.current = session.status;
  }, [session.status]);

  useEffect(() => {
    dbSessionIdRef.current = session.dbSessionId;
  }, [session.dbSessionId]);

  // Timer — only ticks when session is active
  useEffect(() => {
    if (session.status !== "active") {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setSession((prev) => ({ ...prev, status: "ended" }));
          onTimeExpired();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, onTimeExpired]);

  // Auto pause/resume when user switches tabs or windows
  useEffect(() => {

    async function handleVisibilityChange() {
      if (document.hidden) {
        if (statusRef.current === "active") {
          pausedAtRef.current = Date.now();
          setSession((prev) => ({ ...prev, status: "paused" }));
          if (dbSessionIdRef.current) {
            await callApi(dbSessionIdRef.current, { action: "pause" });
          }
        }
      } else {
        if (statusRef.current === "paused") {
          let pausedMs = 0;
          if (pausedAtRef.current !== null) {
            pausedMs = Date.now() - pausedAtRef.current;
          }
          pausedAtRef.current = null;
          setSession((prev) => ({
            ...prev,
            status: "active",
            totalPausedMs: prev.totalPausedMs + pausedMs,
          }));
          if (dbSessionIdRef.current) {
            await callApi(dbSessionIdRef.current, { action: "resume" });
          }
        }
      }
    }

    async function handleWindowBlur() {
      if (statusRef.current === "active") {
        pausedAtRef.current = Date.now();
        setSession((prev) => ({ ...prev, status: "paused" }));
        if (dbSessionIdRef.current) {
          await callApi(dbSessionIdRef.current, { action: "pause" });
        }
      }
    }

    async function handleWindowFocus() {
      if (statusRef.current === "paused") {
        let pausedMs = 0;
        if (pausedAtRef.current !== null) {
          pausedMs = Date.now() - pausedAtRef.current;
        }
        pausedAtRef.current = null;
        setSession((prev) => ({
          ...prev,
          status: "active",
          totalPausedMs: prev.totalPausedMs + pausedMs,
        }));
        if (dbSessionIdRef.current) {
          await callApi(dbSessionIdRef.current, { action: "resume" });
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Helper to call the session PATCH endpoint
  async function callApi(sessionId: string, body: object) {
    try {
      const res = await fetch(`/api/interview/session/currentuser/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("Session API error:", await res.json());
      }
    } catch (err) {
      console.error("Session API call failed:", err);
    }
  }

  // Create the DB session record and start the timer
  async function startSession(question1Id: string, question2Id: string) {
    try {
      const res = await fetch("/api/interview/session/currentuser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question1Id, question2Id }),
      });

      if (!res.ok) {
        console.error("Failed to create session in DB");
        return;
      }

      const data = await res.json();

      setSession({
        dbSessionId: data.id,
        startedAt: new Date(),
        status: "active",
        totalPausedMs: 0,
      });
    } catch (err) {
      console.error("startSession error:", err);
    }
  }

  // Manually pause
  async function pauseSession() {
    if (statusRef.current !== "active") {
      return;
    }
    pausedAtRef.current = Date.now();
    setSession((prev) => ({ ...prev, status: "paused" }));
    if (dbSessionIdRef.current) {
      await callApi(dbSessionIdRef.current, { action: "pause" });
    }
  }

  // Manually resume
  async function resumeSession() {
    if (statusRef.current !== "paused") {
      return;
    }
    let pausedMs = 0;
    if (pausedAtRef.current !== null) {
      pausedMs = Date.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;
    setSession((prev) => ({
      ...prev,
      status: "active",
      totalPausedMs: prev.totalPausedMs + pausedMs,
    }));
    if (dbSessionIdRef.current) {
      await callApi(dbSessionIdRef.current, { action: "resume" });
    }
  }

  // Complete the session and save responses to DB
  async function endSession(responses: SessionResponse[]) {
    const sessionId = dbSessionIdRef.current;
    setSession((prev) => ({ ...prev, status: "ended" }));
    if (sessionId) {
      await callApi(sessionId, { action: "complete", responses });
    }
  }

  // Hydrate an existing session from the DB — used when resuming from history
  function hydrateSession(dbSessionId: string, totalPausedMs: number, startedAt: string) {
    dbSessionIdRef.current = dbSessionId;
    statusRef.current = "paused";

    const startedAtMs = new Date(startedAt).getTime();
    const elapsedMs = Date.now() - startedAtMs;
    const activeMs = elapsedMs - totalPausedMs;
    const activeSeconds = Math.floor(activeMs / 1000);
    const remaining = INTERVIEW_DURATION_SECONDS - activeSeconds;

    // If the session has already exceeded 60 minutes of active time,
    // give the user 5 minutes to wrap up instead of instantly ending
    const clampedRemaining = remaining <= 0 ? 5 * 60 : remaining;

    setTimeLeft(clampedRemaining);
    setSession({
      dbSessionId,
      startedAt: new Date(startedAt),
      status: "paused",
      totalPausedMs,
    });
  }

  // Format seconds as mm:ss
  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + s.toString().padStart(2, "0");
  }

  return {
    session,
    timeLeft,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    hydrateSession,
    formatTime,
  };
}