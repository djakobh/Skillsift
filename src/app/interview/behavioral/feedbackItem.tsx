//Author: Brandon Christian
//Date: 12/12/2025
//Initial creation
//Date: 1/31/2026
//Separate into own file, conversion functions

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
    const analysisItems: AnalysisItem[] = JSON.parse(analysisJSON);

    const fbItems: FeedbackItem[] = [];

    analysisItems.forEach((element) => {

        let category = element.category;
        let content = element.content;
        let score = element.score;
        let graph = element.graph;

        console.log("Create FBItem from analysisItem: " + element);

        let fbItem: FeedbackItem = CreateFeedbackItem(category, content, score, graph);
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
    a.forEach((fbItem) => {
        b.push(fbItem);
    });

    return b;
}