//Author: Brandon Christian
//Date: 2/26/2026
//Take video Blob data, perform an analysis and return the result to behavioralService.tsx
//Date 3/19/2026
//Combine with any stored video data

import { NextRequest } from "next/server";
import { UploadVideo } from "./uploadVideo";

export async function POST(req: NextRequest) {
    return UploadVideo(req);

}
