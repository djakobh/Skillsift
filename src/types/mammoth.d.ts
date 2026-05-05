/**
 * Type declarations for the "mammoth" library.
 * Mammoth is used to extract raw text from .docx files
 * during the resume parsing step of the upload pipeline.
 */
declare module "mammoth" {
  interface ExtractRawTextResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  interface ConvertOptions {
    buffer?: Buffer;
    path?: string;
    arrayBuffer?: ArrayBuffer;
  }

  export function extractRawText(options: ConvertOptions): Promise<ExtractRawTextResult>;
  export function convertToHtml(options: ConvertOptions): Promise<{ value: string; messages: unknown[] }>;
}
