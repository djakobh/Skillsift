"use client";

// Dylan Hartley
// 12/12/2025

import { useEffect, useState } from "react";
import CodeEditor, { getStarterCode, type SupportedLanguage } from "./_components/CodeEditor";
import { useInterviewSession, type SessionResponse } from "./useInterviewSession";
import type { TestResult } from "~/lib/testHarness";
import type { QuestionSummary } from "~/app/api/questions/route";
import DraggableNotepad from "./_components/DraggableNotepad";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Lightbulb,
  ChevronRight,
  Lock,
  Unlock,
} from "lucide-react";

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

  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [code, setCode] = useState("");

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [compileOutput, setCompileOutput] = useState("");
  const [stderr, setStderr] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [questionStatus, setQuestionStatus] = useState<boolean[]>([]);
  const [showLeaveNotice, setShowLeaveNotice] = useState(false);

  const [solutions, setSolutions] = useState<SolutionsMap>({});
  const [rightTab, setRightTab] = useState<"results" | "solution" | "hint">("results");

  const [hints, setHints] = useState<string[]>([]);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [lockHovered, setLockHovered] = useState(false);

  const [questionCode, setQuestionCode] = useState<string[]>([]);

  function handleTimeExpired() {
    setPageState(TIPageState.END);
  }

  const { session, timeLeft, startSession, resumeSession, endSession, hydrateSession, formatTime } =
    useInterviewSession(handleTimeExpired);

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

    fetch("/api/solutions")
      .then((r) => {
        if (!r.ok) throw new Error(`/api/solutions returned ${r.status}`);
        return r.json();
      })
      .then((data: SolutionsMap) => setSolutions(data))
      .catch((e) => console.error("Failed to load solutions:", e));
  }, []);

  useEffect(() => {
    function handleBeforeUnload() {
      if (session.status === "active" && session.dbSessionId) {
        navigator.sendBeacon(
          `/api/interview/session/currentuser/${session.dbSessionId}`,
          JSON.stringify({ action: "pause" })
        );
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session.status, session.dbSessionId]);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!resumeSessionId) return;
    async function loadExistingSession() {
      try {
        const res = await fetch(`/api/interview/session/currentuser/${resumeSessionId}`);
        if (!res.ok) return;
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

  function saveCurrentCode() {
    setQuestionCode((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = code;
      return updated;
    });
  }

  async function startInterview(index: number) {
    setCurrentQuestionIndex(index);
    setTestResults([]);
    setCompileOutput("");
    setStderr("");
    setPageState(TIPageState.ACTIVE);
    setHints([]);
    setHintError(null);
    setSolutionRevealed(false);
    setLockHovered(false);

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
        await startSession(questions[0]!.id, questions[1]!.id, questions[2]?.id);
      }
    } else if (session.status === "paused") {
      await resumeSession();
    }
  }

  async function finishEarly() {
    saveCurrentCode();
    const responses: SessionResponse[] = questions.map((q, idx) => ({
      question: q.title,
      answer: questionCode[idx] ?? "",
    }));
    await endSession(responses);
    setPageState(TIPageState.END);
  }

  function backToQuestions() {
    saveCurrentCode();
    setShowLeaveNotice(true);
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

  function DifficultyBadge({ difficulty }: { difficulty: string }) {
    let badgeColor = "bg-gray-100 text-gray-600";
    if (difficulty === "Easy") badgeColor = "bg-green-100 text-green-700";
    else if (difficulty === "Medium") badgeColor = "bg-yellow-100 text-yellow-700";
    else if (difficulty === "Hard") badgeColor = "bg-red-100 text-red-600";
    return (
      <span className={"text-xs px-2 py-1 rounded-full font-medium " + badgeColor}>
        {difficulty}
      </span>
    );
  }

  function SessionBadge() {
    let badgeColor = "bg-gray-100 text-gray-600";
    let badgeText = "Not Started";
    if (session.status === "active") {
      badgeColor = "bg-green-100 text-green-700";
      badgeText = "Session Active";
    } else if (session.status === "paused") {
      badgeColor = "bg-yellow-100 text-yellow-700";
      badgeText = "Paused";
    } else if (session.status === "ended") {
      badgeColor = "bg-red-100 text-red-600";
      badgeText = "Session Ended";
    }
    return (
      <span className={"text-xs px-2.5 py-1 rounded-full font-medium " + badgeColor}>
        {badgeText}
      </span>
    );
  }

  /* ── Views ── */
  switch (pageState) {

    /* ── START ── */
    case TIPageState.START:
      return (
        <main className="page-blob-bg pt-12 pb-16 min-h-screen">
          <div className="max-w-3xl mx-auto px-6 flex flex-col gap-6">

            {/* Page title */}
            <div className="page-animate text-center" style={{ animationDelay: "0.05s" }}>
              <h1>Technical Interview</h1>
              <p className="description">
                Sharpen your problem-solving skills with timed coding challenges.
              </p>
            </div>

            {/* Header container */}
            <div className="page-animate border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm" style={{ animationDelay: "0.15s" }}>
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 m-0">Session Info</p>
                  <p className="text-xs text-gray-500 m-0 mt-0.5">60 minutes to complete all three questions</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                    <Clock size={14} className="text-gray-400" />
                    {formatTime(timeLeft)}
                  </div>
                  <SessionBadge />
                </div>
              </div>

              {/* Leave notice */}
              {showLeaveNotice && (
                <div className="mx-4 mt-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                  <span>Your session is still running. Return to a question to continue.</span>
                  <button
                    onClick={() => setShowLeaveNotice(false)}
                    className="ml-4 text-yellow-600 hover:text-yellow-800 font-medium text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Question list */}
              <div className="divide-y divide-gray-100">
                {questions.length === 0 && (
                  <div className="px-6 py-8 text-gray-400 text-sm text-center">Loading questions...</div>
                )}
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold text-gray-400 shrink-0">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{q.title}</span>
                      <DifficultyBadge difficulty={q.difficulty} />
                      {questionStatus[index] === true ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                          <CheckCircle size={13} /> Complete
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 shrink-0">Incomplete</span>
                      )}
                    </div>
                    <button
                      onClick={() => void startInterview(index)}
                      className="btn-primary btn-sm shrink-0 ml-4"
                    >
                      {session.status === "idle" ? "Start" : "Continue"}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      );

    /* ── ACTIVE ── */
    case TIPageState.ACTIVE:
      return (
        <main className="h-screen flex flex-col overflow-hidden page-blob-bg">

          {/* Single constrained column — all content lives here */}
          <div className="flex flex-col flex-1 min-h-0 w-full max-w-7xl self-center px-3 pt-6 pb-3 gap-3">

          {/* Header bar */}
          <div className="bg-white border border-gray-200 rounded-xl shrink-0 shadow-sm">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={backToQuestions} className="btn-ghost btn-sm">
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  onClick={() => void finishEarly()}
                  className="btn-outline btn-sm"
                  style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                >
                  Finish Early
                </button>
              </div>
              <div className="flex items-center gap-3">
                <SessionBadge />
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Clock size={14} className="text-gray-400" />
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          </div>

          {/* Pause banner */}
          {session.status === "paused" && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm text-center shrink-0">
              Timer paused. Your session will resume when you return to this tab.
            </div>
          )}

          {/* Question panel - top */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm shrink-0 overflow-y-auto" style={{ maxHeight: "32vh" }}>
            <div className="px-6 py-4">
              {currentQuestion && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900 m-0">{currentQuestion.title}</h3>
                    <DifficultyBadge difficulty={currentQuestion.difficulty} />
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed m-0">
                    {currentQuestion.description}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Code + Results side-by-side */}
          <div className="flex flex-1 min-h-0 gap-3">

            {/* Left: Code editor */}
            <div className="flex flex-col flex-1 min-w-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 shrink-0">
                <h4 className="text-sm font-semibold text-gray-800 m-0">Code Editor</h4>
                <button
                  onClick={() => void runCode()}
                  disabled={isRunning}
                  className={`btn-primary btn-sm ${isRunning ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Play size={13} />
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

            {/* Right: Results / Solution / Hints */}
            <div className="flex flex-col w-96 shrink-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">

              {/* Tab bar */}
              <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
                {(["results", "solution", "hint"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      rightTab === tab
                        ? "border-b-2 border-orange-500 text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "results" && "Test Results"}
                    {tab === "solution" && "Solution"}
                    {tab === "hint" && (
                      <span className="flex items-center gap-1.5">
                        <Lightbulb size={13} />
                        Hints {hints.length > 0 ? `(${hints.length}/3)` : ""}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Test Results */}
              {rightTab === "results" && (
                <div className="flex-1 overflow-y-auto p-4">
                  {compileOutput && (
                    <pre className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 mb-3 whitespace-pre-wrap">
                      Compile Error:{"\n"}{compileOutput}
                    </pre>
                  )}
                  {stderr && !compileOutput && (
                    <pre className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 mb-3 whitespace-pre-wrap">
                      {stderr}
                    </pre>
                  )}
                  {testResults.length === 0 && !compileOutput && !stderr && (
                    <p className="text-gray-400 text-sm text-center mt-8">Run your code to see test results.</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {testResults.map((r) => (
                      <div
                        key={r.case}
                        className={`p-3 rounded-lg border text-sm ${
                          r.passed
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-gray-700">
                            Case {r.case}{r.isHidden ? " (hidden)" : ""}
                          </span>
                          {r.passed
                            ? <CheckCircle size={14} className="text-green-600" />
                            : <XCircle size={14} className="text-red-500" />
                          }
                        </div>
                        {r.error ? (
                          <p className="text-red-700 text-xs m-0">{r.error}</p>
                        ) : (
                          <>
                            <p className="text-gray-600 text-xs m-0">
                              Expected: <code className="bg-white px-1 rounded border border-gray-200">{r.expected}</code>
                            </p>
                            {!r.passed && (
                              <p className="text-gray-600 text-xs mt-0.5 m-0">
                                Got: <code className="bg-white px-1 rounded border border-gray-200">{r.actual}</code>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {testResults.length > 0 && (
                    <p className="text-sm font-semibold mt-3 text-gray-700">
                      {testResults.filter((r) => r.passed).length} / {testResults.length} passed
                    </p>
                  )}
                </div>
              )}

              {/* Solution */}
              {rightTab === "solution" && (
                <div className="flex-1 overflow-y-auto p-4">
                  {currentQuestion && solutions[currentQuestion.id]?.python ? (
                    solutionRevealed ? (
                      <>
                        <p className="text-xs text-gray-400 mb-2 m-0">Python reference solution</p>
                        <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-auto whitespace-pre font-mono leading-relaxed">
                          {solutions[currentQuestion.id]!.python}
                        </pre>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[200px]">
                        {/* Blurred code preview behind overlay */}
                        <div className="relative w-full rounded-lg overflow-hidden">
                          <pre className="bg-gray-900 text-gray-100 text-xs p-4 font-mono leading-relaxed select-none"
                            style={{ filter: "blur(6px)", opacity: 0.5, userSelect: "none", pointerEvents: "none" }}>
                            {solutions[currentQuestion.id]!.python}
                          </pre>

                          {/* Gray overlay */}
                          <div className="absolute inset-0 bg-gray-100/80 flex flex-col items-center justify-center gap-3 rounded-lg">
                            {/* Lock / Unlock icon with hover animation */}
                            <button
                              onMouseEnter={() => setLockHovered(true)}
                              onMouseLeave={() => setLockHovered(false)}
                              onClick={() => setSolutionRevealed(true)}
                              className="flex flex-col items-center gap-3 group"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-all duration-200 group-hover:border-orange-300 group-hover:shadow-md">
                                {lockHovered ? (
                                  <Unlock size={20} className="text-orange-500 transition-all duration-200" />
                                ) : (
                                  <Lock size={20} className="text-gray-500 transition-all duration-200" />
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-gray-700 m-0">View Solution?</p>
                                <p className="text-xs text-gray-400 m-0 mt-0.5">Make sure you have given this your best effort first.</p>
                              </div>
                              <span className="btn-primary btn-sm">
                                Reveal Solution
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-gray-400 text-sm text-center mt-8">No solution available for this question.</p>
                  )}
                </div>
              )}

              {/* Hints */}
              {rightTab === "hint" && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

                  {/* Empty state — centered, matches solution view */}
                  {hints.length === 0 && !isLoadingHint && !hintError && (
                    <div className="flex flex-col items-center justify-center flex-1 min-h-[200px]">
                      <button
                        onClick={() => void getHint()}
                        className="flex flex-col items-center gap-3 group"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                      >
                        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-all duration-200 group-hover:border-orange-300 group-hover:shadow-md">
                          <Lightbulb size={20} className="text-gray-400 transition-all duration-200 group-hover:text-orange-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-700 m-0">Need a nudge?</p>
                          <p className="text-xs text-gray-400 m-0 mt-0.5">Hints get progressively more specific. You have 3.</p>
                        </div>
                        <span className="btn-primary btn-sm">
                          <Lightbulb size={13} /> Get First Hint
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Revealed hints */}
                  {hints.map((hint, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={13} className="text-orange-500" />
                        <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                          Hint {idx + 1} of 3
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 m-0 leading-relaxed">{hint}</p>
                    </div>
                  ))}

                  {/* Loading */}
                  {isLoadingHint && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                      Generating hint...
                    </div>
                  )}

                  {/* Error */}
                  {hintError && (
                    <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-red-600 text-xs">
                      {hintError}
                    </div>
                  )}

                  {/* Get next hint button — shown after first hint revealed */}
                  {hints.length > 0 && hints.length < 3 && !isLoadingHint && (
                    <button onClick={() => void getHint()} className="btn-primary btn-sm self-start">
                      <Lightbulb size={13} />
                      Get Next Hint ({hints.length + 1}/3)
                    </button>
                  )}

                  {/* Max reached */}
                  {hints.length >= 3 && (
                    <p className="text-xs text-gray-400 italic text-center py-2">
                      Maximum hints reached for this question.
                    </p>
                  )}

                </div>
              )}

            </div>
          </div>

          </div>{/* end constrained column */}

          <DraggableNotepad />
        </main>
      );

    /* ── END ── */
    case TIPageState.END:
      return (
        <main className="page-blob-bg flex items-center justify-center px-6" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div className="page-animate border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm w-full max-w-md">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h3 className="text-gray-900 m-0">Interview Complete</h3>
              <p className="text-sm text-gray-500 m-0 mt-1">Here is a summary of your session.</p>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{q.title}</span>
                  {questionStatus[idx] ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <CheckCircle size={13} /> Complete
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                      <XCircle size={13} /> Incomplete
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-5">
              <button
                className="btn-primary w-full justify-center"
                onClick={() => {
                  setPageState(TIPageState.START);
                  setQuestionStatus(questions.map(() => false));
                  setQuestionCode(questions.map(() => ""));
                  setTestResults([]);
                  setHints([]);
                  setSolutionRevealed(false);
                }}
              >
                Start New Session <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </main>
      );
  }
}
