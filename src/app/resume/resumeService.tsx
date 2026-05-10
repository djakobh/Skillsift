//Author: Brandon Christian
//Date: 2/10/2026
//Initial Creation

export async function SendResumeToServer(file: File) {

    /* Send the resume text file to the server. It will Confirm that the resume
    contains text and will return that text as a plain string back to the client. */


    console.log("file type client:");
    console.log(file.type);

    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    console.log("sending file to server")



    const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData
    });



    return response;
}

export async function SendResumeTextAndJobDescToServer(resumeText: string, jobDescText: string, resumeFileName: string, companyName?: string) {

    /* Send the resume text string back to the server as well as the job description
    At this point we should perform an analysis of the resume and job desc and receive that
    as a response here.*/

    const response = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            resumeText,
            jobDescription: jobDescText,
            resumeFileName,
            companyName,
        })
    });

    return response;

}