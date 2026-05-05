//Author: Brandon Christian
//Date: 2/2/2026
//Initial Creation

//Date: 2/3/2026
//Change to non-dynamic route and remove userID param

//Date: 2/5/2026
//Obsoleted report query

import { InterviewSessionsToInterviewItems } from "./interviewItem";
//import { InteriewReportToReportItem, CreateTestReport } from "./interviewItem";

//Fetch the user interview sessions for the current user from the DB
export async function GetCurrentUserInterviewData() {
    const response = await fetch(`/api/interview/session/currentuser`, {
        method: "GET"
    });

    const sessions = await response.json();

    //Convert InterviewSessions to list of InterviewItems
    const items = InterviewSessionsToInterviewItems(sessions);

    return items;
}

/* DEPRECATED
export async function GetSessionReportData(sessionID: string) {
    const response = await fetch(`/api/interview/report/${sessionID}`, {
        method: "GET"
    });

    const report = await response.json();

    if (report.error) {
        console.log(report.error);
        return report;
    }


    console.log("got report")
    console.log(report)

    const item = InteriewReportToReportItem(report);

    return item;
}*/

