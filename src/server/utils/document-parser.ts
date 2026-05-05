/**
 * Document parsing utilities for text extraction from resume files
 */

const pdfParse = require("pdf-parse/lib/pdf-parse");
import mammoth from "mammoth";
import type { FileType } from "./file-validation";

export interface ExtractionResult {
  success: true;
  text: string;
  pageCount?: number;
}

export interface ExtractionError {
  success: false;
  error: string;
}

export type ParseResult = ExtractionResult | ExtractionError;

/**
 * Extracts text content from a PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdfParse(buffer);
    return {
      success: true,
      text: cleanText(data.text),
      pageCount: data.numpages,
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return {
      success: false,
      error: "Failed to parse PDF file",
    };
  }
}

/**
 * Extracts text content from a DOCX file
 */
export async function extractTextFromDOCX(
  buffer: Buffer
): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      success: true,
      text: cleanText(result.value),
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return {
      success: false,
      error: "Failed to parse DOCX file",
    };
  }
}

/**
 * Extracts text content from a TXT file
 */
export function extractTextFromTXT(buffer: Buffer): ParseResult {
  try {
    const text = buffer.toString("utf-8");
    return {
      success: true,
      text: cleanText(text),
    };
  } catch (error) {
    console.error("TXT extraction error:", error);
    return {
      success: false,
      error: "Failed to parse TXT file",
    };
  }
}

/**
 * Main dispatcher function - extracts text based on file type
 */
export async function extractText(
  buffer: Buffer,
  fileType: FileType
): Promise<ParseResult> {
  switch (fileType) {
    case "pdf":
      return extractTextFromPDF(buffer);
    case "docx":
      return extractTextFromDOCX(buffer);
    case "txt":
      return extractTextFromTXT(buffer);
    default:
      return {
        success: false,
        error: `Unsupported file type: ${fileType}`,
      };
  }
}

/**
 * Cleans extracted text by normalizing whitespace
 */
function cleanText(text: string): string {
  return (
    text
      // Replace multiple spaces with single space
      .replace(/[ \t]+/g, " ")
      // Replace multiple newlines with double newline (paragraph break)
      .replace(/\n{3,}/g, "\n\n")
      // Trim whitespace from each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Trim overall text
      .trim()
  );
}

/**
 * Preprocesses job description text for ATS analysis
 */
export function preprocessJobDescription(text: string): string {
  return (
    text
      // Normalize whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      // Trim lines
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim()
  );
}
