//Author: Brandon Christian
//Date: 3/3/2026

/*
 Graph Session Count
 1. Filter by interview type
 2. group by day
 3. graph points by count on each day
*/


import { FilterByType, GroupByRoundedDate, CreateGraphItem, GraphType} from "./generalProcess";
import type { GraphPoint, GraphItem} from "./generalProcess";

export function GraphItemsFromSessionCount(sessions: any[]) {
    const graphItems: GraphItem[] = []

    //Get list of GraphPoints containing count of a type of session on each day
    const gpCountBehavioral = GraphByCount(sessions, "BEHAVIORAL");
    const gpCountTechnical = GraphByCount(sessions, "TECHNICAL");

    graphItems.push(CreateGraphItem(gpCountBehavioral, "Behavioral Session Count", GraphType.BEHAVIORAL));
    graphItems.push(CreateGraphItem(gpCountTechnical, "Technical Session Count", GraphType.TECHNICAL));

    return graphItems;
}


//filter, group, and count the sessions
function GraphByCount(sessions: any[], type: string) {
    const filtered = FilterByType(sessions, type);
    const grouped = GroupByRoundedDate(filtered);
    const points = GraphPointsByCount(grouped);

    return points;
}


//create graph points for each day
//in this case, count the number of sessions on that dday
function GraphPointsByCount(sessionsByDate: Record<number, any[]>) {

    const graphPoints: GraphPoint[] = [];

    Object.entries(sessionsByDate).forEach(
        ([date, sessions]) => {

            const count: number = sessions.length;

            //covnvert back to number
            //as the key is given to us as a string
            const graphPoint : GraphPoint = { date: Number(date), value: count };
            graphPoints.push(graphPoint);
        }
    );

    return graphPoints;
}