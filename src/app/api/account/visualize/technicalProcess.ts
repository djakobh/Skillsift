//Author: Brandon Christian
//Date: 3/5/2026


/*
 Graph Technical Score
 1. Filter to technical sessions
 3. group sessions by date
 4. find the average score on a day
 5. find the overall average on a day
*/


import { FilterByType, GroupByRoundedDate, GraphType, CreateGraphItem } from "./generalProcess";
import type { GraphPoint, GraphItem  } from "./generalProcess";

export function GraphItemsFromTechnicalScore(sessions: any[]) {

    const gps: GraphPoint[] = GraphPointsFromTechnicalScore(sessions);
    const graphItems: GraphItem[] = []

    graphItems.push(CreateGraphItem(gps, "Technical Score", GraphType.TECHNICAL));

    return graphItems;
}

//convert Record into GraphPoint object
function GraphPointsFromTechnicalScore(sessions: any[]) {
    const overallAveragesByDate : Record<number, number> = GraphByTechnicalScore(sessions);
    const graphPoints: GraphPoint[] = [];

    //for every category
    Object.entries(overallAveragesByDate).forEach(
        ([date, score]) => {

            const gp: GraphPoint = { date: Number(date), value: score };
            graphPoints.push(gp);

        }
    );

    return graphPoints;
}


function GraphByTechnicalScore(sessions: any[]) {
    //Filter to beahvioral sessions
    //group by feedback category
    //group those further by date
    //for each category
    //turn into graph points of average score on each day
    //convert those points into 
    //average score over time

    const filtered = FilterByType(sessions, "TECHNICAL");
    const byDate: Record<number, any[]> = GroupByRoundedDate(filtered);

    const averagesByDay: Record<number, number> = {};

    Object.entries(byDate).forEach(
        ([date, sessions]) => {

            //get averages per day first
            averagesByDay[Number(date)] = AverageByDay(sessions);
        }
    );

    //Average those by day into by over time
    const overallAverageByDay: Record<number, number> = OverallAverageByDay(averagesByDay);

    return overallAverageByDay;
}


//Find the average of all sessions on this day
function AverageByDay(sessions: any[]) {

    let total = 0;
    let i = 0;

    sessions.forEach(
        (session) => {
            if (session.overallScore) {
                total += session.overallScore;
                i += 1;
            }
                
        }
    )

    const average = total / i;

    return average;

}

//Find the accumulated average of all sessions from beginning to each day
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
