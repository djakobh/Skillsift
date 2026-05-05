"use client";

// Dylan Hartley
// 12/12/2025

import { useEffect, useState } from "react";
import CodeEditor, { getStarterCode, type SupportedLanguage } from "./_components/CodeEditor";
import { useInterviewSession, type SessionResponse } from "./useInterviewSession";
import type { TestResult } from "~/lib/testHarness";
import type { QuestionSummary } from "~/app/api/questions/route";
import DraggableNotepad from "./_components/DraggableNotepad";

type SolutionsMap = Record<string, Record<string, string>>;

/* Page States */
enum TIPageState {
  START,
  ACTIVE,
  END,
}

/* View Switcher */
export default function TechnicalInterviewViewSwitcher({
  resumeSessionId,
}: {
  resumeSessionId?: string;
}) {
  const [pageState, setPageState] = useState<TIPageState>(TIPageState.START);

  // Fetch questions dynamically from API
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [code, setCode] = useState("");

  // Real per-test-case results from /api/judge
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [compileOutput, setCompileOutput] = useState("");
  const [stderr, setStderr] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [questionStatus, setQuestionStatus] = useState<boolean[]>([]);

  const [solutions, setSolutions] = useState<SolutionsMap>({});
  const [rightTab, setRightTab] = useState<"results" | "solution" | "hint">("results");

  // Hints up to 3, progressively more specific
  const [hints, setHints] = useState<string[]>([]);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // Store the code written per question so we can save it on finish
  const [questionCode, setQuestionCode] = useState<string[]>([]);

  // Called by the hook when the 60-minute timer hits zero
  function handleTimeExpired() {
    setPageState(TIPageState.END);
  }

  const { session, timeLeft, startSession, resumeSession, endSession, hydrateSession, formatTime } =
    useInterviewSession(handleTimeExpired);

  // Fetch questions and solutions from JSON-backed APIs on mount
  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data: QuestionSummary[]) => {
        setQuestions(data);
        setQuestionStatus(data.map(() => false));
        setQuestionCode(data.map(() => ""));
        if (data[0]) {
          setCode(data[0].starterCode["python"] ?? getStarterCode("python"));
        }
      })
      .catch(console.error);

      //Alvin Ngo work report 3
    fetch("/api/solutions")
      .then((r) => {
        if (!r.ok) throw new Error(`/api/solutions returned ${r.status}`);
        return r.json();
      })
      .then((data: SolutionsMap) => setSolutions(data))
      .catch((e) => console.error("Failed to load solutions:", e));
  }, []);

  // Pause the session in the DB when the user navigates away from the page
  useEffect(() => {
    function handleBeforeUnload() {
      if (session.status === "active" && session.dbSessionId) {
        // sendBeacon is used here because regular fetch gets cancelled on page unload
        navigator.sendBeacon(
          `/api/interview/session/currentuser/${session.dbSessionId}`,
          JSON.stringify({ action: "pause" })
        );
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session.status, session.dbSessionId]);

  const currentQuestion = questions[currentQuestionIndex];

  // If resumeSessionId is provided, load that existing session instead of creating new
  useEffect(() => {
    if (!resumeSessionId) {
      return;
    }

    async function loadExistingSession() {
      try {
        const res = await fetch(`/api/interview/session/currentuser/${resumeSessionId}`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        hydrateSession(data.id, data.totalPausedMs ?? 0, data.startedAt);
      } catch (err) {
        console.error("Failed to load existing session:", err);
      }
    }

    void loadExistingSession();
  }, [resumeSessionId]);

  function handleLanguageChange(newLang: SupportedLanguage) {
    setLanguage(newLang);
    if (currentQuestion) {
      setCode(currentQuestion.starterCode[newLang] ?? getStarterCode(newLang));
    }
  }

  // Save the current editor code into questionCode before navigating away
  function saveCurrentCode() {
    setQuestionCode((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = code;
      return updated;
    });
  }

  // Start a specific question; kicks off or resumes the session
  async function startInterview(index: number) {
    setCurrentQuestionIndex(index);
    setTestResults([]);
    setCompileOutput("");
    setStderr("");
    setPageState(TIPageState.ACTIVE);

    setHints([]);
    setHintError(null);

    // Restore previously written code for this question if it exists
    const selectedQuestion = questions[index];
    if (selectedQuestion) {
      const savedCode = questionCode[index];
      if (savedCode) {
        setCode(savedCode);
      } else {
        const starter = selectedQuestion.starterCode[language];
        setCode(starter ?? getStarterCode(language));
      }
    }

    if (session.status === "idle") {
      if (resumeSessionId) {
        await resumeSession();
      } else {
        await startSession(questions[0]!.id, questions[1]!.id);
      }
    } else if (session.status === "paused") {
      await resumeSession();
    }
  }

  // Finish the interview early
  async function finishEarly() {
    saveCurrentCode();

    const responses: SessionResponse[] = questions.map((q, idx) => ({
      question: q.title,
      answer: questionCode[idx] ?? "",
    }));

    await endSession(responses);
    setPageState(TIPageState.END);
  }

  // Go back to question list; timer keeps running
  function backToQuestions() {
    saveCurrentCode();
    setPageState(TIPageState.START);
  }

  async function runCode() {
    if (!currentQuestion) return;
    setIsRunning(true);
    setTestResults([]);
    setCompileOutput("");
    setStderr("");

    try {
      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language,
          questionId: currentQuestion.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStderr(result.error ?? "Unknown error");
        return;
      }

      setTestResults(result.testResults ?? []);
      setCompileOutput(result.compile_output ?? "");
      setStderr(result.stderr ?? "");

      if (result.allPassed) {
        setQuestionStatus((prev) => {
          const next = [...prev];
          next[currentQuestionIndex] = true;
          return next;
        });
      }

      // Save latest code on run
      setQuestionCode((prev) => {
        const updated = [...prev];
        updated[currentQuestionIndex] = code;
        return updated;
      });
    } catch (error) {
      setStderr(error instanceof Error ? error.message : "Failed to execute");
    } finally {
      setIsRunning(false);
    }
  }

  async function getHint() {
  if (!currentQuestion) return;
  if (hints.length >= 3) return;
  setIsLoadingHint(true);
  setHintError(null);

  try {
    const response = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionTitle: currentQuestion.title,
        questionDescription: currentQuestion.description,
        code: code,
        hintLevel: hints.length + 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      setHintError("Failed to generate hint. Please try again.");
      return;
    }

    setHints((prev) => [...prev, data.hint]);
  } catch (err) {
    setHintError("Failed to generate hint. Please try again.");
    console.error("Hint generation error:", err);
  } finally {
    setIsLoadingHint(false);
  }
}

  // Colored difficulty badge
  function DifficultyBadge({ difficulty }: { difficulty: string }) {
    let badgeColor = "bg-gray-100 text-gray-600";
    if (difficulty === "Easy") badgeColor = "bg-green-100 text-green-700";
    else if (difficulty === "Medium") badgeColor = "bg-yellow-100 text-yellow-700";
    else if (difficulty === "Hard") badgeColor = "bg-red-100 text-red-600";
    return (
      <span className={"text-xs px-2 py-1 rounded-full font-medium ml-2 " + badgeColor}>
        {difficulty}
      </span>
    );
  }

  // Session status badge
  function SessionBadge() {
    let badgeColor = "bg-gray-200 text-gray-600";
    let badgeText = "Not Started";
    if (session.status === "active") {
      badgeColor = "bg-green-100 text-green-700";
      badgeText = "Session Active";
    } else if (session.status === "paused") {
      badgeColor = "bg-yellow-100 text-yellow-700";
      badgeText = "Paused — return to resume";
    } else if (session.status === "ended") {
      badgeColor = "bg-red-100 text-red-600";
      badgeText = "Session Ended";
    }
    return (
      <span className={"text-xs px-2 py-1 rounded-full font-medium " + badgeColor}>
        {badgeText}
      </span>
    );
  }

  /* Views */
  switch (pageState) {
    case TIPageState.START:
      return (
        <main className="min-h-screen px-6 py-10">
          <div className="flex justify-between max-w-4xl mx-auto items-center">
            <div>
              <h1 className="text-3xl font-bold">Technical Interview</h1>
              <p className="text-gray-500 mt-1">
                Time limit of 60 minutes to complete both questions
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="font-semibold">Time Remaining: {formatTime(timeLeft)}</span>
              <SessionBadge />
            </div>
          </div>

          <div className="max-w-2xl mx-auto mt-10 border rounded-lg">
            <div className="bg-orange-500 text-white px-4 py-2 font-semibold">
              Technical Skill Testing
            </div>

            {questions.length === 0 && (
              <div className="px-4 py-6 text-gray-500 text-sm">Loading questions...</div>
            )}

            {questions.map((q, index) => (
              <div
                key={q.id}
                className="flex items-center justify-between px-4 py-4 border-t"
              >
                <span className="flex items-center">
                  Question #{index + 1}: {q.title}
                  <DifficultyBadge difficulty={q.difficulty} />
                  {questionStatus[index] === true ? (
                    <span className="text-green-600 ml-2">(Complete)</span>
                  ) : (
                    <span className="text-gray-400 ml-2">(Incomplete)</span>
                  )}
                </span>
                <button
                  onClick={() => void startInterview(index)}
                  className="bg-orange-500 text-white px-4 py-1 rounded ml-4 shrink-0"
                >
                  {session.status === "idle" ? "Start" : "Continue"}
                </button>
              </div>
            ))}
          </div>
        </main>
      );

    case TIPageState.ACTIVE:
      return (
        <main className="h-screen flex flex-col overflow-hidden px-4">
          {/* Header */}
          <div className="flex items-center justify-between py-2 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={backToQuestions} className="text-sm text-blue-600 underline">
                ← Back
              </button>
              <button
                onClick={() => void finishEarly()}
                className="text-sm underline text-red-600"
              >
                Finish Early
              </button>
            </div>
            <div className="flex items-center gap-3">
              <SessionBadge />
              <span className="font-semibold text-sm">Time Remaining: {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Pause banner */}
          {session.status === "paused" && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm text-center shrink-0">
              Timer paused — your session will resume when you return to this tab.
            </div>
          )}

          {/* Question */}
          {currentQuestion && (
            <div className="border rounded p-3 mt-2 overflow-y-auto max-h-[22vh] shrink-0">
              <div className="flex items-center mb-1">
                <h2 className="font-semibold text-base">{currentQuestion.title}</h2>
                <DifficultyBadge difficulty={currentQuestion.difficulty} />
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {currentQuestion.description}
              </p>
            </div>
          )}

          {/* Code editor — takes remaining vertical space */}
          <div className="border rounded p-3 mt-2 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="font-semibold text-sm">Code</h3>
              <button
                onClick={() => void runCode()}
                disabled={isRunning}
                className={`px-4 py-1 rounded text-white text-sm ${
                  isRunning
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {isRunning ? "Running..." : "Run Code"}
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CodeEditor
                language={language}
                value={code}
                onChange={setCode}
                onLanguageChange={handleLanguageChange}
                height="100%"
              />
            </div>
          </div>

          {/* Bottom panel: Test Results / Solution tabs */}
          <div className="border rounded mt-2 mb-2 flex flex-col shrink-0 h-[28vh]">
            {/* Tab bar */}
            <div className="flex border-b shrink-0">
              <button
                onClick={() => setRightTab("results")}
                className={`px-4 py-2 text-sm font-medium ${
                  rightTab === "results"
                    ? "border-b-2 border-orange-500 text-orange-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Test Results
              </button>
              <button
                onClick={() => setRightTab("solution")}
                className={`px-4 py-2 text-sm font-medium ${
                  rightTab === "solution"
                    ? "border-b-2 border-orange-500 text-orange-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Solution
              </button>

              <button
                onClick={() => setRightTab("hint")}
                className={`px-4 py-2 text-sm font-medium ${
                  rightTab === "hint"
                    ? "border-b-2 border-orange-500 text-orange-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Hints {hints.length > 0 ? "(" + hints.length + "/3)" : ""}
              </button>
            </div>

            {/* Test Results tab */}
            {rightTab === "results" && (
              <div className="p-4 overflow-y-auto flex-1">
                {compileOutput && (
                  <pre className="bg-red-50 text-red-700 text-sm p-3 rounded mb-3 whitespace-pre-wrap">
                    Compile Error:{"\n"}{compileOutput}
                  </pre>
                )}
                {stderr && !compileOutput && (
                  <pre className="bg-red-50 text-red-700 text-sm p-3 rounded mb-3 whitespace-pre-wrap">
                    {stderr}
                  </pre>
                )}
                {testResults.length === 0 && !compileOutput && !stderr && (
                  <p className="text-gray-400 text-sm">Run your code to see test results</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {testResults.map((r) => (
                    <div
                      key={r.case}
                      className={`p-3 rounded border text-sm min-w-[180px] ${
                        r.passed ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">
                          Case {r.case}{r.isHidden ? " (hidden)" : ""}
                        </span>
                        <span className={`font-semibold ${r.passed ? "text-green-600" : "text-red-600"}`}>
                          {r.passed ? "✓" : "✗"}
                        </span>
                      </div>
                      {r.error ? (
                        <p className="text-red-700 text-xs">{r.error}</p>
                      ) : (
                        <>
                          <p className="text-gray-700 text-xs">
                            Expected: <code className="bg-white px-1 rounded border">{r.expected}</code>
                          </p>
                          {!r.passed && (
                            <p className="text-gray-700 text-xs mt-0.5">
                              Got: <code className="bg-white px-1 rounded border">{r.actual}</code>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {testResults.length > 0 && (
                  <p className="text-sm font-semibold mt-3">
                    {testResults.filter((r) => r.passed).length} / {testResults.length} passed
                  </p>
                )}
              </div>
            )}

            {/* Solution tab */}
            {rightTab === "solution" && (
              <div className="p-4 overflow-y-auto flex-1">
                {currentQuestion && solutions[currentQuestion.id]?.python ? (
                  <>
                    <p className="text-xs text-gray-400 mb-2">Python reference solution</p>
                    <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded overflow-auto whitespace-pre font-mono leading-relaxed h-full">
                      {solutions[currentQuestion.id]!.python}
                    </pre>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">No solution available for this question.</p>
                )}
              </div>
            )}
            {/* Hint tab */}
            {rightTab === "hint" && (
              <div className="p-4 overflow-y-auto flex-1">
                {hints.length === 0 && !isLoadingHint && (
                  <p className="text-gray-400 text-sm mb-4">
                    No hints yet. Click below to get your first hint.
                  </p>
                )}

                {/* Show existing hints */}
                <div className="space-y-3 mb-4">
                  {hints.map((hint, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded p-3">
                      <p className="text-xs font-semibold text-orange-600 mb-1">
                        Hint {idx + 1} of 3
                      </p>
                      <p className="text-sm text-gray-700">{hint}</p>
                    </div>
                  ))}
                </div>

                {hintError && (
                  <p className="text-red-500 text-xs mb-3">{hintError}</p>
                )}

                {hints.length < 3 && (
                  <button
                    onClick={() => void getHint()}
                    disabled={isLoadingHint}
                    className={`px-4 py-2 rounded text-white text-sm ${
                      isLoadingHint
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-orange-500 hover:bg-orange-600"
                    }`}
                  >
                    {isLoadingHint
                      ? "Generating hint..."
                      : hints.length === 0
                      ? "Get Hint"
                      : "Get Next Hint (" + (hints.length + 1) + "/3)"}
                  </button>
                )}

                {hints.length >= 3 && (
                  <p className="text-xs text-gray-400 italic">
                    Maximum hints reached for this question.
                  </p>
                )}
              </div>
            )}

          </div>
          <DraggableNotepad />
        </main>
      );


    case TIPageState.END:
      return (
        <main className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6">Interview Complete</h1>
            <ul className="text-sm space-y-2">
              {questions.map((q, idx) => (
                <li key={q.id}>
                  {q.title}:{" "}
                  {questionStatus[idx] ? (
                    <span className="text-green-600 font-semibold">Complete</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Incomplete</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </main>
      );
  }
}