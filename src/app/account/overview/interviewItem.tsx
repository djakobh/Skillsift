//Author: Brandon Christian
//Date: 2/2/2026
//Initial Creation

//Date: 2/5/2026
//Obsoleted report
import type { InterviewResponse } from "./interviewResponse";
import { SessionResponseToInterviewResponses } from "./interviewResponse";

export type InterviewItem = {
    id: string,
    type: string,
    status: string,
    startedAt: number,
    completedAt: number | null,
    isFavorite: boolean,
    feedback: any | null,
    responses: InterviewResponse[] | null,
    overallScore: number | null
}

export function CreateTestInterviewItems() {
    const items: InterviewItem[] = new Array(1);

    items.push({
        id: "0",
        type: "INTERVIEWS",
        status: "LOADING",
        startedAt: 0,
        completedAt: null,
        isFavorite: false,
        feedback: null,
        responses: null,
        overallScore: null
    });

    return items;
}

//Convert InterviewSession DB object into a form readable by the UI
export function InterviewSessionsToInterviewItems(sessions: any[]) {
    const items: InterviewItem[] = new Array(sessions.length);

    sessions.forEach(
        (session) => {
            items.push(SessionToItem(session));
        }
    );

    return items;
}

function SessionToItem(session: any)
{
    const item: InterviewItem = {
        id: session.id,
        type: session.type, 
        status: session.status,
        isFavorite: session.isFavorite ? session.isFavorite : false, //TODO: add isFavorite column to InterviewSession table in DB
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        feedback: session.feedback,
        responses: SessionResponseToInterviewResponses(session.responses),
        overallScore: session.overallScore
    };

    return item;

}

//DEPRECATED BELOW THIS LINE
/*
export type ReportItem = {
    summary: string,
    isFavorite: boolean,
    createdAt: any
}

export function CreateTestReport() {
    const item: ReportItem = { summary: "No report found", isFavorite: false, createdAt: Date.now() }; 
    return item;
}

export function InteriewReportToReportItem(report: any) {
    const item: ReportItem = { summary: report.summary, isFavorite: report.isFavorite, createdAt: report.createdAt };
    return item;
}*/