//Author: Brandon Christian
//Date: 4/23/2026

//Fetch the user interview sessions for the current user from the DB
export async function GetUserBehavioralSessions() {
    const response = await fetch(`/api/interview/session/currentuser/behavioral`, {
        method: "GET"
    });

    const sessions : any[] = await response.json();

    return sessions;
}
