import { NextResponse } from "next/server";
import { GetCurrentUserSessions } from "../../interview/session/currentuser/route"
import { ProcessSessionsToGraphData } from "./sessionProcess"

export async function GET() {
    console.log("Visualize GET called");

    const response = await GetCurrentUserSessions();
    const sessions : any[] = await response.json();

    console.log("GOT user sessions");

    const processedData = ProcessSessionsToGraphData(sessions);

    console.log("PROCESSED user sessions");

    return NextResponse.json(processedData);
}

