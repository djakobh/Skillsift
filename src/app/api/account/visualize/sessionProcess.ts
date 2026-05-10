//Author: Brandon Christian
//Date: 3/2/2026

import { GraphItemsFromSessionCount } from "./countProcess";
import { GraphItemsFromBehavioralScore } from "./behavioralProcess";
import { GraphItemsFromTechnicalScore } from "./technicalProcess";
import type { GraphItem } from "./generalProcess";

export function ProcessSessionsToGraphData(sessions: any[]) {
    //types of graphs:
    //sessions per day (by type)
    //average score in feedback categories over time
    //average score in technical sessions over time

    const countGraphItems: GraphItem[] = GraphItemsFromSessionCount(sessions);
    const behavioralGraphItems: GraphItem[] = GraphItemsFromBehavioralScore(sessions);
    const technicalGraphItems: GraphItem[] = GraphItemsFromTechnicalScore(sessions);

    //combine graph items to one list and send back to client

    const allItems: GraphItem[] = []

    AddItems(allItems, countGraphItems);
    AddItems(allItems, behavioralGraphItems);
    AddItems(allItems, technicalGraphItems);

    console.log("Returning " + allItems.length + " graphs to client");

    return allItems;
}

function AddItems(addTo: GraphItem[], toAdd: GraphItem[]) {
    toAdd.forEach(
        (item) => {
            addTo.push(item);
        }
    );
}

