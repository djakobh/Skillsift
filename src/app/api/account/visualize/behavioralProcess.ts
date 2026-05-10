//Author: Brandon Christian
//Date: 3/3/2026


/*
 Graph Behavioral Score
 1. Filter to behavioral sessions
 2. group sessions by category
 3. group sessions in a category by date
 4. find the average score of a category on a day
 5. find the overall average of a category on a day
*/


import { FilterByType, GroupByRoundedDate, GraphType, CreateGraphItem } from "./generalProcess";
import type { GraphPoint, GraphItem  } from "./generalProcess";

export function GraphItemsFromBehavioralScore(sessions: any[]) {

    console.log("Begin GraphItemsFromBehavioralScore");

    const gpByCategory: Record<string, GraphPoint[]> = GraphPointsFromBehavioralScore(sessions);
    const graphItems: GraphItem[] = []

    Object.entries(gpByCategory).forEach(
        ([category, graphPoints]) => {
            console.log("GraphItemsFromBehavioralScore for " + category);

            graphItems.push(CreateGraphItem(graphPoints, category, GraphType.BEHAVIORAL));
        }
    );

    return graphItems;
}

//convert Record of Records into GraphPoint[]
function GraphPointsFromBehavioralScore(sessions: any[]) {
    const overallAveragesByCategoryAndDate : Record<string, Record<number, number>> = GraphByBehavioralScore(sessions);
    const graphPointsByCategory: Record<string, GraphPoint[]> = {};

    console.log("Begin GraphPointsFromBehavioralScore");

    //for every category
    Object.entries(overallAveragesByCategoryAndDate).forEach(
        ([category, byDate]) => {

            console.log("GraphItemsFromBehavioralScore for " + category);

            graphPointsByCategory[category] = OverallAveragesToGraphPoints(byDate);

        }
    );

    return graphPointsByCategory;
}

function OverallAveragesToGraphPoints(byDate: Record<number, number>) {

    const graphPoints: GraphPoint[] = [];

    //graph point from date and value
    Object.entries(byDate).forEach(
        ([date, average]) => {

            const graphPoint: GraphPoint = { date: Number(date), value: average };
            graphPoints.push(graphPoint);

        }
    );

    return graphPoints;
}


function GraphByBehavioralScore(sessions: any[]) {
    //Filter to beahvioral sessions
    //group by feedback category
    //group those further by date
    //for each category
    //turn into graph points of average score on each day
    //convert those points into
    //average score over time

    console.log("Begin GraphByBehavioralScore");

    const filtered = FilterByType(sessions, "BEHAVIORAL");
    const byCategoryAndDate: Record<string, Record<number, any[]>> = GroupByFeedbackCategoryThenDate(filtered);

    const overallAveragesByCategoryAndDate: Record<string, Record<number, number>> = {};

    Object.entries(byCategoryAndDate).forEach(
        ([category, byDate]) => {

            console.log("GraphByBehavioralScore for " + category);

            //get averages per day first
            const averagesByDay: Record<number, number> = AverageByDay(category, byDate);

            //Average those by day into by over time
            const overallAverageByDay: Record<number, number> = OverallAverageByDay(averagesByDay);

            overallAveragesByCategoryAndDate[category] = overallAverageByDay;
        }
    );

    return overallAveragesByCategoryAndDate;
}


function AverageByDay(category: string, byDate: Record<number, any[]>) {

    const averagesByDay: Record<number, number> = {};

    Object.entries(byDate).forEach(
        ([date, sessions]) => {

            //start at 0
            let total = 0;

            sessions.forEach(
                (session) => {

                    total += GetFeedbackScore(session, category);

                }
            );

            averagesByDay[Number(date)] = total / sessions.length;

        }
    );

    return averagesByDay;

}

function OverallAverageByDay(averagesByDay: Record<number, number>) {

    let total = 0;
    let i = 0;

    const overallAveragesByDay: Record<number, number> = {};

    Object.entries(averagesByDay).forEach(
        ([date, average]) => {
            i += 1;
            total += average;

            overallAveragesByDay[Number(date)] = total / i;
        }
    );

    return overallAveragesByDay;
}

function GetFeedbackScore(session: any, category: string) {
    const feedback = session.feedback;

    //Don't use for each to search because the return from
    //it doesnt return fully
    //if (feedback && category in feedback) {
    if (feedback) {

        const found = feedback.find((item: any) => item.key === category);

        console.log("GetFeedbackScore " + found.score);

        return found ? found.score : 0;

        //return Number(feedback[category]);
    }

    return -1;
}

function GroupByFeedbackCategoryThenDate(sessions: any[]) {
    //group by feedback
    //for each feedback category
    //group sessions in that category by rounded date

    const byCategory: Record<string, any[]> = GroupByFeedbackCategory(sessions);
    const byCategoryAndDate: Record<string, Record<number, any[]> > = { }

    Object.entries(byCategory).forEach(
        ([category, sessions]) => {

            const byDate: Record<number, any[]> = GroupByRoundedDate(sessions);
            byCategoryAndDate[category] = byDate;
        }
    )

    return byCategoryAndDate;
}


//Dynamic, will group by any feedback name as long as the value stored is a number
function GroupByFeedbackCategory(sessions: any[]) {
    //for each session
    //for each fb category in that session
    //add session to list_category (create if doesnt exist)
    const byCategory: Record<string, any[]> = {}

    sessions.forEach(
        (session: any) => {

            const feedback = session.feedback;

            //if there is feedback, for every kv pair in the feedback
            if (feedback) {
                //Object.entries(feedback).forEach(
                feedback.forEach(
                    (item: any) => {

                        console.log("GroupByFeedbackCategory try item");

                        //refactor to be based on the key, score, notes format of objects
                        //push the session to that type of category
                        //add the category if it doesnt exist
                        if (item.key != null && item.score != null) {

                            console.log("GroupByFeedbackCategory for " + item.key);

                            (byCategory[item.key] ??= []).push(session);
                        }
                    }

                    /*([key, value]) => {

                        //skip categories that don't use numbers as values
                        //push the session to that type of category
                        //add the category if it doesnt exist
                        if (typeof value === "number")
                            (byCategory[key] ??= []).push(session);

                    }*/
                );
            }

        }
    );

    return byCategory;
}




