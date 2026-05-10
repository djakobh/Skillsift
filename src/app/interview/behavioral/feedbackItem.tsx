//Author: Brandon Christian
//Date: 12/12/2025
//Initial creation
//Date: 1/31/2026
//Separate into own file, conversion functions

export enum FeedbackCategory {
    NONE = "None",
    NOTES = "Notes",
    EYE_CONTACT = "Eye Contact",
    CONFIDENCE = "Confidence",
    QUALITY_OF_ANSWERS = "Quality of Answers",
    SOCIABILITY = "Sociability",
    CLEAR_SPEECH = "Clear Speech"
}
import type { AnalysisItem } from "../../api/behavioral/analyze/analysisItem";

export type FeedbackItem = {
    key: string,
    content?: string,
    score?: number,
    graph? : any[]
}

/*Convert analysis response into form the UI can read*/

export function AnalysisResultToFBItems(analysisJSON: string)
{
    const parsed = JSON.parse(analysisJSON);

    // NEW: handle both formats safely
    let analysisItems: any[];

    if (Array.isArray(parsed)) {
        // old format
        analysisItems = parsed;
    } else if (parsed.feedback && Array.isArray(parsed.feedback)) {
        // new format
        analysisItems = parsed.feedback;
    } else {
        console.error("Invalid analysis format:", parsed);
        return [];
    }

    // FIX: don't pre-size array + push (that creates empty slots)
    const fbItems: FeedbackItem[] = [];

    analysisItems.forEach((element) => {
        const fbItem: FeedbackItem = CreateFeedbackItem(
            element.category,
            element.content,
            element.score
        );
        fbItems.push(fbItem);
    });

    return fbItems;
}

export function CreateFeedbackItem(acategory: string, acontent?: string, ascore?: number, agraph?: any[])
{
    let category = acategory;

    console.log("Created FBItem with category " + category + " and content " + acontent + " and score " + ascore);

    const fbItem: FeedbackItem = { key: category, content: acontent, score: ascore, graph: agraph };

    return fbItem   
}

export function CombineFeedback(a: FeedbackItem[], b: FeedbackItem[]) {
    return [...b, ...a]; // cleaner + avoids mutation bugs
}