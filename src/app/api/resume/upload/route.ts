import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import {
  validateUploadedFile,
  validateTextContent,
  ValidationErrorCode,
  ERROR_MESSAGES,
} from "~/server/utils/file-validation";
import { extractText } from "~/server/utils/document-parser";

interface UploadSuccessResponse {
  success: true;
  data: {
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedText: string;
    textLength: number;
  };
}

interface UploadErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

export async function POST(req: Request): Promise<NextResponse<UploadResponse>> {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please log in to upload a resume",
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // 3. Validate file (size, extension, MIME type)
    const validationResult = await validateUploadedFile(file);

    if (!validationResult.valid) {
      const statusCode =
        validationResult.error === ValidationErrorCode.FILE_TOO_LARGE
          ? 413
          : validationResult.error === ValidationErrorCode.NO_FILE
            ? 400
            : 415;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: validationResult.error,
            message: validationResult.message,
          },
        },
        { status: statusCode }
      );
    }

    // 4. Extract text from file
    const buffer = Buffer.from(await file!.arrayBuffer());
    const extractionResult = await extractText(buffer, validationResult.fileType);

    if (!extractionResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ValidationErrorCode.CORRUPTED_FILE,
            message: ERROR_MESSAGES[ValidationErrorCode.CORRUPTED_FILE],
          },
        },
        { status: 422 }
      );
    }

    // 5. Validate extracted content
    if (!validateTextContent(extractionResult.text)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ValidationErrorCode.INSUFFICIENT_CONTENT,
            message: ERROR_MESSAGES[ValidationErrorCode.INSUFFICIENT_CONTENT],
          },
        },
        { status: 422 }
      );
    }

    // 6. Return success with extracted text
    return NextResponse.json(
      {
        success: true,
        data: {
          fileName: file!.name,
          fileType: validationResult.fileType,
          fileSize: file!.size,
          extractedText: extractionResult.text,
          textLength: extractionResult.text.length,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("RESUME UPLOAD ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
