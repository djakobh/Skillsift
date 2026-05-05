//Author: Brandon Christian
//Date: 2/7/2026
//Initial Creation

export type InterviewResponse = {
    id: string,
    sessionId: string,
    question: string,
    answer: string,
    score: number | null,
    feedback: string | null,
    answeredAt: number
}

//Convert interview response DB data into a form readable by the UI

export function SessionResponseToInterviewResponses(sessionResponses: any[]) {
    const responses: InterviewResponse[] = new Array(sessionResponses.length);

    sessionResponses.forEach(
        (resp) => {
            responses.push(SessionResponseToInterviewResponse(resp));
        }
    );

    return responses;
}

function SessionResponseToInterviewResponse(sessionResponse: any) {
    const response: InterviewResponse = {
        id: sessionResponse.id,
        sessionId: sessionResponse.sessionId,
        question: sessionResponse.question,
        answer: sessionResponse.answer,
        score: sessionResponse.score,
        feedback: sessionResponse.feedback,
        answeredAt: sessionResponse.answeredAt
    }

    return response;
}