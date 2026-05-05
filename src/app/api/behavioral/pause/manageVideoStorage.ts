//Author: Brandon Christian
//Date: 3/20/2026
//handle video storage/retrieval between AWS S3 storage system

//TODO: get S3 env variables
//process.env.AWS_REGION,
//process.env.S3_BUCKET_NAME
//and set up API access with S3 


//packages for video download/upload:
//npm install @aws-sdk/client-s3

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: process.env.AWS_REGION,
});

export async function StoreVideoData(videoData: Blob, userId: string, sessionId: string) {

    const arrayBuffer = await videoData.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    //store video based on combination of user id, session id and current time
    const storageKey = `videos/${userId}/${sessionId}/${Date.now().toString()}.webm`;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: storageKey,
        Body: videoBuffer,
        ContentType: "video/webm",
    });

    //Send the data to S3
    s3.send(command);

    return storageKey; //use stoage key and bucket name to get download later
}


export async function DownloadVideoData(storageKey: string) {
    const result = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: storageKey,
        })
    );

    if (result.Body) {
        //also delete the file once we've gotten the data
        ClearVideoData(storageKey);

        const bytes = await result.Body.transformToByteArray();

        // Convert to Node Buffer if you want to work with it server-side
        const buffer = Buffer.from(bytes);
        const blob = new Blob([buffer], { type: "video/webm" });

        return blob;
    }

    return null;
}

export async function ClearVideoData(storageKey: string) {
    await s3.send(
        new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: storageKey,
        })
    );
}





