//Author: Brandon Christian
//Date: 12/12/2025

//Built out by: Dylan Hartley
//Date: 01/20/2026 - End of Semester 

"use client";
import { useState, useCallback, lazy, Suspense } from "react";
import styles from "./test.module.css";
import React from "react";
import { OnUploadResumeClicked, OnAddJobDescriptionClicked } from "./uploadResume"
import type { FeedbackItem } from "./feedbackItem"
import { FeedbackCategory } from "./feedbackItem"
import { JobDescriptionTemplate, JOB_DESCRIPTION_TEMPLATES, JOB_DESCRIPTION_LABELS } from "./jobDescriptionTemplates"
import type { OptimizeSuggestion, OptimizeResponse } from "~/app/api/resume/optimize/route"
import {
    DASHBOARD_SECTIONS,
    buildHighlightedSegments,
    DonutChart,
    CategoryBar,
    ReportSection,
    HighlightedResumeText,
} from "./resumeCharts"
import { fetchOptimizations } from "./optimizerService"

const PdfViewer = lazy(() => import("./PdfViewer"));

function OnFailedUpload() {
    console.log("Failed Upload");
}


//-------------------------------------
//  View
//-------------------------------------

export default function ResumeUpload() {

    return (

        <main className={`${styles.centered_column} pt-12`}>
            <h1>Resume Scanning</h1>
            <p className="description">Upload your resume and get a real ATS score that
                reflects what the big companies are using.</p>
            <Instructions />
            <ViewSwitcher />
            <br />
        </main>


    )
}


enum UploadPageState {
    UPLOAD,
    ADD_JOB_DESC,
    FEEDBACK
}

function ViewSwitcher() {

    const [uploadState, setUploadState] = useState(UploadPageState.UPLOAD);

    const test_items = [
        { key: FeedbackCategory.NONE, name: "Item 1", description: "Lorem Ipsum 1", status: true }
    ];

    const [feedbackData, setFeedbackData] = useState(test_items);

    const [resumeText, setResumeText] = useState("")
    const [resumeFileName, setResumeFileName] = useState("")
    const [jobDescription, setJobDescription] = useState("")
    const [resumeFile, setResumeFile] = useState<File | null>(null)

    switch (uploadState) {
        case UploadPageState.UPLOAD:
            return (<UploadBox changeState={setUploadState} changeResumeText={setResumeText} changeResumeFileName={setResumeFileName} changeResumeFile={setResumeFile} />);

        case UploadPageState.ADD_JOB_DESC:
            return (<AddJobDescriptionBox changeState={setUploadState} changeFeedbackData={setFeedbackData} resumeText={resumeText} resumeFileName={resumeFileName} changeJobDescription={setJobDescription} />);

        case UploadPageState.FEEDBACK:
            return (<ViewFeedbackBox changeState={setUploadState} data={feedbackData} jobDescription={jobDescription} resumeText={resumeText} resumeFile={resumeFile} />);
    }
}

function Instructions() {

    const NumberCircle = ({ number, description }: { number: string; description: string }) => {
        return (
            <div className={`${styles.centered_column}`}>
                <div className={`${styles.circle} outline-2`}>
                    {number}
                </div>
                <p className="sub-description">{description}</p>
            </div>
        );
    }

    return (
        <div className={`${styles.centered_row} align-middle`} >
            <NumberCircle number="1" description="Upload Resume" />

            <span className={`${styles.centered_column}`}>
                <h1>→</h1>
                <div></div>
            </span>

            <NumberCircle number="2" description="Add Job Description" />
            <span className={`${styles.centered_column}`}>
                <h1>→</h1>
                <div></div>
            </span>
            <NumberCircle number="3" description="Get Feedback" />
        </div>
    )
}

function UploadBox({ changeState, changeResumeText, changeResumeFileName, changeResumeFile }: {
    changeState: React.Dispatch<React.SetStateAction<UploadPageState>>;
    changeResumeText: React.Dispatch<React.SetStateAction<string>>;
    changeResumeFileName: React.Dispatch<React.SetStateAction<string>>;
    changeResumeFile: React.Dispatch<React.SetStateAction<File | null>>;
}) {

    const [isEmpty, setEmpty] = useState(false);
    const [isValid, setValid] = useState(true);
    const [isLoading, setLoading] = useState(false);

    const UploadResumeButton = async () => {
        try {
            setLoading(true);

            const result = await OnUploadResumeClicked();

            setLoading(false);

            if (!result.success) {
                setValid(false);
                return;
            }

            if (result.extractedText == "") {
                setEmpty(true);
                return;
            }

            console.log("Upload successful:", result.fileName, `(${result.textLength} chars)`);
            changeResumeText(result.extractedText);
            changeResumeFileName(result.fileName);
            changeResumeFile(result.file);

            changeState(UploadPageState.ADD_JOB_DESC);
        } catch (error: any) {
            console.log(error);
            OnFailedUpload();
        }
    };

    return (
        <div className="w-1/2 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-gray-900 m-0">Upload Your Resume</h2>
            </div>

            <div className="flex flex-col items-center gap-4 px-6 py-8">
                {isLoading ? (
                    <p className="text-gray-500 text-sm">Uploading...</p>
                ) : (
                    <>
                        <div className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-200 rounded-lg w-full py-8 px-4">
                            <span className="text-4xl text-gray-300">↑</span>
                            <button className="orange_button" onClick={UploadResumeButton}>Upload Resume</button>
                            <p className="text-gray-400 text-xs m-0">.pdf, .docx, or .txt</p>
                        </div>

                        {isEmpty && (
                            <p className="text-red-500 text-sm m-0">Resume was empty. Please upload a document with text.</p>
                        )}
                        {!isValid && (
                            <p className="text-red-500 text-sm m-0">Invalid file or file type. Please try again.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

function AddJobDescriptionBox(
    { changeState, changeFeedbackData, resumeText, resumeFileName, changeJobDescription } :
        {
            changeState: React.Dispatch<React.SetStateAction<UploadPageState>>;
            changeFeedbackData: React.Dispatch<React.SetStateAction<FeedbackItem[]>>;
            resumeText: string;
            resumeFileName: string;
            changeJobDescription: React.Dispatch<React.SetStateAction<string>>;
        }
) {

    const [isEmpty, setEmpty] = useState(false);
    const [isCompanyEmpty, setCompanyEmpty] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [companyName, setCompanyName] = useState("");

    const AddJobDescButton = async () => {
        try {
            if (companyName.trim() == "") {
                setCompanyEmpty(true);
                return;
            }

            if (template == "") {
                setEmpty(true);
                return;
            }

            setCompanyEmpty(false);

            setLoading(true);

            const result = await OnAddJobDescriptionClicked(resumeText, template, resumeFileName, companyName);

            setLoading(false);

            changeJobDescription(template);
            changeState(UploadPageState.FEEDBACK);
            changeFeedbackData(result);
        } catch (error: any) {
            console.log(error);
            OnFailedUpload();
        }
    };

    const [template, setTemplate] = useState("");

    return (
        <div className="w-1/2 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-gray-900 m-0">Add Job Description</h2>
            </div>

            <div className="flex flex-col gap-4 px-6 py-6">
                {isLoading ? (
                    <p className="text-gray-500 text-sm">Analyzing your resume...</p>
                ) : (
                    <>
                        <textarea
                            className={`w-full h-10 border rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:border-orange-400 ${isCompanyEmpty ? "border-red-400" : "border-gray-200"}`}
                            placeholder="Company / role name..."
                            value={companyName}
                            onChange={(e) => { setCompanyName(e.target.value); setCompanyEmpty(false); }}
                            rows={1}
                        />
                        {isCompanyEmpty && (
                            <p className="text-red-500 text-sm -mt-2 m-0">Please enter a company or role name.</p>
                        )}

                        <textarea
                            className="w-full h-40 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:border-orange-400"
                            placeholder="Paste a job description here..."
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                        />

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <label htmlFor="templates" className="text-sm text-gray-600 whitespace-nowrap">Template:</label>
                                <select
                                    name="Templates"
                                    id="templates"
                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-orange-400"
                                    onChange={(e) => {
                                        const key = e.target.value as JobDescriptionTemplate;
                                        setTemplate(JOB_DESCRIPTION_TEMPLATES[key]);
                                        if (key !== JobDescriptionTemplate.NONE) {
                                            setCompanyName(JOB_DESCRIPTION_LABELS[key]);
                                        }
                                    }}
                                >
                                    {Object.values(JobDescriptionTemplate).map((key) => (
                                        <option key={key} value={key}>{JOB_DESCRIPTION_LABELS[key]}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" onClick={AddJobDescButton} className="orange_button">
                                Analyze Resume
                            </button>
                        </div>

                        {isEmpty && (
                            <p className="text-red-500 text-sm m-0">Job description is empty. Please enter a description or choose a template.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main feedback view ───────────────────────────────────────────────────────

function ViewFeedbackBox({ changeState, data, jobDescription, resumeText, resumeFile }: {
    changeState: React.Dispatch<React.SetStateAction<UploadPageState>>;
    data: FeedbackItem[];
    jobDescription: string;
    resumeText: string;
    resumeFile: File | null;
}) {
    const [activeTab, setActiveTab] = useState<"report" | "jobdesc" | "optimizer">("report");

    // ── Optimizer state ──────────────────────────────────────────────────────
    const [optimizerResult, setOptimizerResult] = useState<OptimizeResponse | null>(null);
    const [optimizerLoading, setOptimizerLoading] = useState(false);
    const [optimizerError, setOptimizerError] = useState<string | null>(null);

    const runOptimizer = useCallback(async () => {
        setOptimizerLoading(true);
        setOptimizerError(null);
        try {
            const result = await fetchOptimizations(resumeText, jobDescription, data);
            setOptimizerResult(result);
        } catch (err: any) {
            setOptimizerError(err.message ?? "Failed to reach the optimization service.");
        } finally {
            setOptimizerLoading(false);
        }
    }, [data, resumeText, jobDescription]);

    const scoreStr = data.find(i => i.key === FeedbackCategory.MATCH_SCORE)?.description ?? "0%";
    const score = parseInt(scoreStr.match(/^(\d+)/)?.[1] ?? "0");

    const keywords = data.filter(i => i.key === FeedbackCategory.KEYWORDS);
    const segments = buildHighlightedSegments(jobDescription, keywords);

    const tabs: { key: "report" | "jobdesc" | "optimizer"; label: string }[] = [
        { key: "report", label: "Resume Report" },
        { key: "jobdesc", label: "Job Description" },
        { key: "optimizer", label: "Resume Optimizer" },
    ];

    return (
        <div className="flex w-11/12 max-w-screen-xl rounded-lg overflow-hidden border border-gray-200 min-h-[80vh]">

            {/* ── Left Sidebar ── */}
            <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col gap-6 p-5">
                <div className="flex flex-col items-center gap-3 pt-2">
                    <DonutChart score={score} />
                    <button className="orange_button w-full text-center text-sm" onClick={() => changeState(UploadPageState.UPLOAD)}>
                        Upload &amp; Rescan
                    </button>
                </div>

                <hr className="border-gray-200" />

                <div className="flex flex-col gap-4">
                    {DASHBOARD_SECTIONS.map(sec => (
                        <CategoryBar
                            key={sec.key}
                            label={sec.label}
                            items={data.filter(i => i.key === sec.key)}
                        />
                    ))}
                </div>
            </aside>

            {/* ── Right Panel ── */}
            <div className="flex flex-col flex-1 min-w-0 bg-white">

                {/* Tab bar */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? "border-b-2 border-orange-500 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className={`flex-1 min-h-0 ${activeTab === "optimizer" ? "flex p-4" : "overflow-y-auto p-6"}`}>

                    {activeTab === "report" && (
                        <div className="flex flex-col gap-5">
                            {DASHBOARD_SECTIONS.map(sec => (
                                <ReportSection
                                    key={sec.key}
                                    label={sec.label}
                                    badge={sec.badge}
                                    badgeColor={sec.badgeColor}
                                    description={sec.description}
                                    items={data.filter(i => i.key === sec.key)}
                                    placeholder={sec.placeholder}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === "jobdesc" && (
                        <div className="max-w-3xl mx-auto">
                            <div className="flex gap-4 mb-5 text-sm">
                                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-500"></span><span className="text-gray-600">Found in resume</span></span>
                                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500"></span><span className="text-gray-600">Missing from resume</span></span>
                            </div>
                            <div className="text-gray-800 text-sm leading-7 whitespace-pre-wrap font-mono bg-gray-50 border border-gray-200 rounded-lg p-5">
                                {segments.map((seg, i) =>
                                    seg.color === "green" ? (
                                        <mark key={i} className="bg-green-100 text-green-800 rounded px-0.5">{seg.text}</mark>
                                    ) : seg.color === "red" ? (
                                        <mark key={i} className="bg-red-100 text-red-700 rounded px-0.5">{seg.text}</mark>
                                    ) : (
                                        <React.Fragment key={i}>{seg.text}</React.Fragment>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "optimizer" && (
                        <div className="flex gap-4 flex-1 min-h-0 w-full">

                            {/* Left — Resume (PDF canvas view or plain text fallback) */}
                            <div className="flex flex-col flex-1 min-w-0 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center flex-shrink-0">
                                    <h4 className="text-gray-800 m-0 text-sm font-semibold">Your Resume</h4>
                                </div>
                                {resumeFile?.type === "application/pdf" ? (
                                    <Suspense fallback={
                                        <div className="flex flex-col items-center justify-center flex-1 gap-3">
                                            <div className="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                                            <p className="text-gray-500 text-sm m-0">Loading viewer...</p>
                                        </div>
                                    }>
                                        <PdfViewer file={resumeFile} />
                                    </Suspense>
                                ) : (
                                    <div className="flex-1 overflow-y-auto p-4 text-gray-800 text-xs leading-6 whitespace-pre-wrap font-mono bg-white">
                                        <HighlightedResumeText
                                            text={resumeText}
                                            highlights={optimizerResult
                                                ? optimizerResult.suggestions
                                                    .filter(s => !!s.originalText)
                                                    .map(s => s.originalText)
                                                : []
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Right — Suggestions */}
                            <div className="flex flex-col w-96 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                                    <h4 className="text-gray-800 m-0 text-sm font-semibold">Resume Suggestions</h4>
                                    {optimizerResult && !optimizerLoading && (
                                        <button className="orange_button text-xs py-1 px-3" onClick={runOptimizer}>Re-run</button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto">

                                    {/* Pre-run */}
                                    {!optimizerResult && !optimizerLoading && !optimizerError && (
                                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                                            <div>
                                                <p className="text-gray-700 text-sm font-medium m-0 mb-1">Resume Optimizer</p>
                                                <p className="text-gray-400 text-xs m-0">Lines to improve will be highlighted red in your resume.</p>
                                            </div>
                                            <button className="orange_button" onClick={runOptimizer}>Optimize Resume</button>
                                        </div>
                                    )}

                                    {/* Loading */}
                                    {optimizerLoading && (
                                        <div className="flex flex-col items-center gap-3 p-8">
                                            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                                            <p className="text-gray-500 text-sm m-0 text-center">Running analysis...</p>
                                        </div>
                                    )}

                                    {/* Error */}
                                    {optimizerError && !optimizerLoading && (
                                        <div className="m-4 border border-red-200 rounded-lg p-3 bg-red-50 text-red-700 text-sm">
                                            {optimizerError}
                                        </div>
                                    )}

                                    {/* Results */}
                                    {optimizerResult && !optimizerLoading && (
                                        <div className="flex flex-col">

                                            {/* Summary */}
                                            {optimizerResult.summary && (
                                                <div className="mx-4 mt-4 border border-blue-200 rounded-lg overflow-hidden">
                                                    <div className="px-4 py-2 bg-blue-600 flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-white uppercase tracking-wide">Overview</span>
                                                    </div>
                                                    <div className="px-4 py-3 bg-blue-50">
                                                        <p className="text-gray-700 text-xs m-0 leading-relaxed">{optimizerResult.summary}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Cards */}
                                            <div className="flex flex-col gap-4 p-4">
                                                {optimizerResult.suggestions
                                                    .filter(s => (s.originalText || s.suggestion) && s.originalText !== s.replacementText)
                                                    .map((s: OptimizeSuggestion, i: number) => (
                                                        <div key={i} className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">

                                                            {/* Card header */}
                                                            <div className="flex items-start px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-600 uppercase tracking-wide self-start">{s.section}</span>
                                                                    <span className="text-gray-700 text-xs font-medium leading-5">{s.issue}</span>
                                                                </div>
                                                            </div>

                                                            {/* Current → Suggested */}
                                                            {s.originalText ? (
                                                                <div className="divide-y divide-gray-100">
                                                                    <div className="px-4 py-2 bg-red-50">
                                                                        <p className="text-xs text-red-400 font-semibold uppercase tracking-wide m-0 mb-1">Current</p>
                                                                        <p className="text-xs text-red-700 font-mono m-0 leading-5">{s.originalText}</p>
                                                                    </div>
                                                                    <div className="px-4 py-2 bg-green-50">
                                                                        <p className="text-xs text-green-500 font-semibold uppercase tracking-wide m-0 mb-1">Suggested</p>
                                                                        <p className="text-xs text-green-800 font-mono m-0 leading-5">{s.replacementText}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="px-4 py-2">
                                                                    <p className="text-xs text-gray-600 m-0 leading-relaxed">{s.suggestion}</p>
                                                                </div>
                                                            )}

                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
