//Author: Brandon Christian
//Date: 3/2/2026

//General functions used for mulitple types of processing
//as well as types used to help organize the data as its processed

//Separate graphs by GraphType
//A single type may have multiple lines with different names
export enum GraphType {
    BEHAVIORAL,
    TECHNICAL
}

//A graph by type, name, and the list of date/value points
export type GraphItem = {
    type: GraphType,
    name: string,
    points: GraphPoint[]
}

//A point to be displayed on the graph
export type GraphPoint = {
    date: number,
    value: number
}

export function CreateGraphItem(graphPoints: GraphPoint[], name: string, type: GraphType) {
    const item: GraphItem = { type: type, name: name, points: graphPoints };
    return item;
}

//retrieve sessions by interview type
//only retrieve completed sessions
export function FilterByType(sessions: any[], type: string) {
    const filtered: any[] = [];

    const completed: any[] = FilterByCompleted(sessions);

    completed.forEach(
        (session: any) => {
            if (session.type == type) {
                filtered.push(session);
            }
        }
    );

    return filtered;
}


function FilterByCompleted(sessions: any[]) {
    const filtered: any[] = [];

    sessions.forEach(
        (session: any) => {
            if (session.status == "COMPLETED") {
                filtered.push(session);
            }
        }
    );

    return filtered;
}

function RoundDateToDay(date: any) {
    const dateAsNumber = new Date(date).getTime();

    //trim hours and smaller from the date
    //so it rounds to the day
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayStart = Math.floor(dateAsNumber / DAY_MS) * DAY_MS;

    return dayStart;
}

//group sessions by date, rounded to day
export function GroupByRoundedDate(sessions: any[]) {
    const groupedByRoundedDate: Record<number, any[]> = {};

    sessions.forEach(
        (session: any) => {

            //use only day, month, and year
            const dateRoundedToDay = RoundDateToDay(session.startedAt);

            //add the session
            //add a new list to the dict if it doesnt exist yet
            (groupedByRoundedDate[dateRoundedToDay] ??= []).push(session);
        }

    );

    return groupedByRoundedDate;
}






