  /**
   * File validation utilities for resume upload
   */

  import { fileTypeFromBuffer } from "file-type";

  export const VALIDATION_CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MIN_TEXT_LENGTH: 50, // Minimum characters for valid resume
    MAX_TEXT_LENGTH: 100000, // Maximum characters to store
    MIN_JOB_DESC_LENGTH: 20, // Minimum characters for job description
    MAX_JOB_DESC_LENGTH: 50000, // Maximum characters for job description
    ALLOWED_EXTENSIONS: [".pdf", ".docx", ".txt"] as const,
    ALLOWED_MIME_TYPES: new Map<string, FileType>([
      ["application/pdf", "pdf"],
      [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "docx",
      ],
      ["text/plain", "txt"],
    ]),
  } as const;

  export type FileType = "pdf" | "docx" | "txt";

  export type ValidationResult =
    | { valid: true; fileType: FileType }
    | { valid: false; error: ValidationErrorCode; message: string };

  export enum ValidationErrorCode {
    NO_FILE = "NO_FILE",
    FILE_TOO_LARGE = "FILE_TOO_LARGE",
    INVALID_EXTENSION = "INVALID_EXTENSION",
    INVALID_MIME_TYPE = "INVALID_MIME_TYPE",
    CORRUPTED_FILE = "CORRUPTED_FILE",
    INSUFFICIENT_CONTENT = "INSUFFICIENT_CONTENT",
  }

  export const ERROR_MESSAGES: Record<ValidationErrorCode, string> = {
    [ValidationErrorCode.NO_FILE]: "No file was uploaded",
    [ValidationErrorCode.FILE_TOO_LARGE]: "File exceeds 5MB limit",
    [ValidationErrorCode.INVALID_EXTENSION]:
      "Only PDF, DOCX, and TXT files are accepted",
    [ValidationErrorCode.INVALID_MIME_TYPE]:
      "File type does not match extension",
    [ValidationErrorCode.CORRUPTED_FILE]:
      "File appears to be corrupted or unreadable",
    [ValidationErrorCode.INSUFFICIENT_CONTENT]:
      "File does not contain enough text content",
  };

  /**
   * Validates file size against the maximum allowed
   */
  export function validateFileSize(size: number): boolean {
    return size <= VALIDATION_CONFIG.MAX_FILE_SIZE;
  }

  /**
   * Validates file extension
   */
  export function validateExtension(fileName: string): boolean {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
    return VALIDATION_CONFIG.ALLOWED_EXTENSIONS.includes(
      ext as (typeof VALIDATION_CONFIG.ALLOWED_EXTENSIONS)[number]
    );
  }

  /**
   * Gets file type from extension
   */
  export function getFileTypeFromExtension(fileName: string): FileType | null {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
    switch (ext) {
      case ".pdf":
        return "pdf";
      case ".docx":
        return "docx";
      case ".txt":
        return "txt";
      default:
        return null;
    }
  }

  /**
   * Detects actual file type from buffer using magic bytes
   */
  export async function detectFileType(
    buffer: Buffer
  ): Promise<FileType | null> {
    const type = await fileTypeFromBuffer(buffer);

    if (type && VALIDATION_CONFIG.ALLOWED_MIME_TYPES.has(type.mime)) {
      return VALIDATION_CONFIG.ALLOWED_MIME_TYPES.get(type.mime) ?? null;
    }

    return null;
  }

  /**
   * Validates that extracted text meets minimum content requirements
   */
  export function validateTextContent(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.length >= VALIDATION_CONFIG.MIN_TEXT_LENGTH;
  }

  /**
   * Full validation pipeline for uploaded file
   */
  export async function validateUploadedFile(
    file: File | null
  ): Promise<ValidationResult> {
    // Check file exists
    if (!file) {
      return {
        valid: false,
        error: ValidationErrorCode.NO_FILE,
        message: ERROR_MESSAGES[ValidationErrorCode.NO_FILE],
      };
    }

    // Check file size
    if (!validateFileSize(file.size)) {
      return {
        valid: false,
        error: ValidationErrorCode.FILE_TOO_LARGE,
        message: ERROR_MESSAGES[ValidationErrorCode.FILE_TOO_LARGE],
      };
    }

    // Check extension
    if (!validateExtension(file.name)) {
      return {
        valid: false,
        error: ValidationErrorCode.INVALID_EXTENSION,
        message: ERROR_MESSAGES[ValidationErrorCode.INVALID_EXTENSION],
      };
    }

    const extensionType = getFileTypeFromExtension(file.name);

    // Get buffer and detect MIME type
    const buffer = Buffer.from(await file.arrayBuffer());

    // For TXT files, file-type library returns null (no magic bytes)
    // So we trust the extension for text files
    if (extensionType === "txt") {
      return { valid: true, fileType: "txt" };
    }

    const detectedType = await detectFileType(buffer);

    if (!detectedType) {
      return {
        valid: false,
        error: ValidationErrorCode.INVALID_MIME_TYPE,
        message: ERROR_MESSAGES[ValidationErrorCode.INVALID_MIME_TYPE],
      };
    }

    // Verify detected type matches extension
    if (detectedType !== extensionType) {
      return {
        valid: false,
        error: ValidationErrorCode.INVALID_MIME_TYPE,
        message: ERROR_MESSAGES[ValidationErrorCode.INVALID_MIME_TYPE],
      };
    }

    return { valid: true, fileType: detectedType };
  }

  /**
   * Validates job description text input
   */
  export type JobDescValidationResult =
    | { valid: true; text: string }
    | { valid: false; error: string };

  export function validateJobDescription(text: string | null | undefined): JobDescValidationResult {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: "Job description is required" };
    }

    const trimmed = text.trim();

    if (trimmed.length < VALIDATION_CONFIG.MIN_JOB_DESC_LENGTH) {
      return { valid: false, error: "Job description is too short" };
    }

    if (trimmed.length > VALIDATION_CONFIG.MAX_JOB_DESC_LENGTH) {
      return { valid: false, error: "Job description is too long" };
    }

    return { valid: true, text: trimmed };
  }
