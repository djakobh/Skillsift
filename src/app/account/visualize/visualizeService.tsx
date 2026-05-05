//Author: Brandon Christian
//Date: 3/2/2026

import type { GraphItem, GraphPoint } from "./graphDisplay";

//Fetch the user interview sessions for the current user from the DB
//Process them server side then return the JSON to the client
//The processed data is organized as graph points with X as the date and Y as a numerical score
async function GetGraphData() {

    console.log("about to call Data");

    const response = await fetch(`/api/account/visualize`, {
        method: "GET"
    });

    console.log("Got data back");

    //type as any so we can iterate over it later
    const parsedData : any[] = await response.json();

    return parsedData;
}

//get and process raw data into form to be read by UI
export async function GetGraphDataAsync(
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setGraphData: React.Dispatch<React.SetStateAction<GraphItem[]>>,
) {
    setLoading(true);

    console.log("getting data");

    //fetch raw data from visualizeService
    const rawItems: any[] = await GetGraphData();

    console.log("got data");

    //convert response into GraphItems
    const graphItems: GraphItem[] = [];

    //FIXME: can't process raw Items as an array?

    rawItems.forEach(
        (rawItem: any) => {

            const item: GraphItem = { type: rawItem.type, name: rawItem.name, points: ProcessRawPoints(rawItem.points) };
            graphItems.push(item);

        }
    );


    //alert finished loading
    //and set graph data
    setLoading(false);
    setGraphData(graphItems);
}

function ProcessRawPoints(rawPoints: any[]) {
    const points: GraphPoint[] = [];

    rawPoints.forEach(
        (rawPoint: any) => {

            const point: GraphPoint = { date: rawPoint.date, value: rawPoint.value };
            points.push(point);
        }
    );

    return points;
}

