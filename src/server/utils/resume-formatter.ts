/**
 * Resume Formatting Checker
 * Rule-based checks that evaluate the visual structure and layout quality
 * of a resume based on its extracted plain text. 
 */

// ============================================
// Types
// ============================================

export interface FormattingCheck {
    /** Display name shown in the dashboard */
    name: string;
    /** Whether this check passed */
    passed: boolean;
    /** Human-readable explanation */
    explanation: string;
}

export interface FormattingResult {
    checks: FormattingCheck[];
    /** 0–100 score based on fraction of checks passed */
    score: number;
}

// ============================================
// Layout checks
// ============================================

/**
 * Detects likely multi-column layout by looking for lines with multiple
 * tab characters — a common sign of side-by-side columns or tables.
 * ATS systems read multi-column resumes left-to-right, mangling the order.
 */
function checkSingleColumn(text: string): FormattingCheck {
    const lines = text.split("\n");
    const tabHeavyLines = lines.filter(l => (l.match(/\t/g) ?? []).length >= 2).length;
    const passed = tabHeavyLines <= 3;
    return {
        name: "Single Column Layout",
        passed,
        explanation: passed
            ? "No multi-column formatting detected — ATS can parse your content in the correct order."
            : "Possible multi-column or table layout detected. ATS systems read left-to-right and often scramble multi-column resumes. Use a single-column layout.",
    };
}

/**
 * Checks whether bullet point characters are consistent throughout the resume.
 * Mixing •, -, *, –, ► etc. looks unprofessional and may confuse ATS parsing.
 * Allows up to 2 distinct types (e.g. main bullets + sub-bullets).
 */
function checkBulletConsistency(text: string): FormattingCheck {
    const bulletLines = text.match(/^[\s]*([•\-\*\–\—◦▪▸►])/gm) ?? [];
    if (bulletLines.length < 3) {
        return {
            name: "Consistent Bullet Style",
            passed: true,
            explanation: "Not enough bullet points to evaluate consistency.",
        };
    }
    const bulletChars = new Set(bulletLines.map(l => l.trim()[0]));
    const passed = bulletChars.size <= 2;
    return {
        name: "Consistent Bullet Style",
        passed,
        explanation: passed
            ? "Bullet point style is consistent throughout your resume."
            : `${bulletChars.size} different bullet styles detected. Use one consistent bullet character for a cleaner, more professional appearance.`,
    };
}

/**
 * Checks for excessive consecutive blank lines, which indicate inconsistent
 * spacing and often arise from poor template usage or copy-paste issues.
 */
function checkSpacing(text: string): FormattingCheck {
    const passed = !/\n{4,}/.test(text);
    return {
        name: "Section Spacing",
        passed,
        explanation: passed
            ? "Section spacing is clean and consistent."
            : "Excessive blank lines detected between sections. Use one consistent blank line as a separator for a cleaner layout.",
    };
}

/**
 * Checks for lines exceeding 120 characters. Very long lines typically
 * indicate PDF extraction artifacts or formatting that will not transfer
 * cleanly into an ATS system.
 */
function checkLineLength(text: string): FormattingCheck {
    const longLines = text.split("\n").filter(l => l.length > 120).length;
    const passed = longLines <= 2;
    return {
        name: "Line Length",
        passed,
        explanation: passed
            ? "Line lengths look clean — no layout artifacts detected."
            : `${longLines} lines exceed 120 characters. This typically indicates formatting artifacts from conversion that may disrupt ATS parsing.`,
    };
}

// ============================================
// Page setup checks
// ============================================

/**
 * Estimates page count using ~450 words per resume page.
 * One to two pages is the professional standard for most roles.
 */
function checkPageLength(text: string): FormattingCheck {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const estimatedPages = words / 450;
    const rounded = Math.round(estimatedPages * 10) / 10;
    const passed = estimatedPages >= 0.6 && estimatedPages <= 2.3;
    return {
        name: "Page Length",
        passed,
        explanation: passed
            ? `Estimated ${rounded} page(s) — within the recommended 1–2 page range.`
            : estimatedPages < 0.6
                ? `Resume appears very short (~${rounded} page). Add more detail to fill at least one full page.`
                : `Resume appears long (~${rounded} pages). Condense to 2 pages or less for most roles.`,
    };
}

// ============================================
// Readability checks
// ============================================

/**
 * Checks for excessive use of ALL CAPS text across multiple full lines.
 * Section headers in ALL CAPS are fine; full paragraphs in caps are not.
 */
function checkCasing(text: string): FormattingCheck {
    const lines = text.split("\n");
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    const allCapsLines = nonEmpty.filter(l => {
        const words = l.trim().split(/\s+/);
        return words.length > 5 && l.trim() === l.trim().toUpperCase() && /[A-Z]/.test(l);
    }).length;
    const ratio = nonEmpty.length > 0 ? allCapsLines / nonEmpty.length : 0;
    const passed = ratio < 0.1;
    return {
        name: "Text Casing",
        passed,
        explanation: passed
            ? "Text casing is natural and readable throughout."
            : "Multiple full lines appear to be written in ALL CAPS. Excessive capitalization reduces readability and can confuse ATS keyword matching.",
    };
}

/**
 * Detects decorative Unicode symbols used as visual elements (stars, arrows,
 * boxes, etc.). ATS systems often strip or misread these characters.
 */
function checkDecorativeCharacters(text: string): FormattingCheck {
    const decorative = /[★☆■□▲△▶►◆◇✓✗✘✪☞☛❖❤♦♠♣♥🔹🔸]/g;
    const matches = text.match(decorative) ?? [];
    const passed = matches.length <= 2;
    return {
        name: "Special Characters",
        passed,
        explanation: passed
            ? "No problematic decorative characters detected — ATS can parse your text cleanly."
            : `${matches.length} decorative characters found (e.g. ★, ■, ✓). These are often stripped or misread by ATS systems. Replace with plain text or standard bullets.`,
    };
}

/**
 * Checks for common text encoding artifacts from PDF extraction — replacement
 * characters (U+FFFD) or dense non-Latin character sequences.
 * These indicate the resume may not parse correctly in all ATS systems.
 */
function checkTextEncoding(text: string): FormattingCheck {
    const artifacts = text.match(/\ufffd|[^\x00-\x7F\u00C0-\u024F\n\r\t ]{3,}/g) ?? [];
    const passed = artifacts.length === 0;
    return {
        name: "Text Encoding",
        passed,
        explanation: passed
            ? "No text encoding issues detected — content is clean and machine-readable."
            : "Possible encoding issues detected. Some characters may not be readable by ATS systems. Re-save your resume as a clean .docx or .txt file.",
    };
}

// ============================================
// Main function
// ============================================

export function computeFormattingScore(resumeText: string): FormattingResult {
    const checks: FormattingCheck[] = [
        checkSingleColumn(resumeText),
        checkBulletConsistency(resumeText),
        checkSpacing(resumeText),
        checkLineLength(resumeText),
        checkPageLength(resumeText),
        checkCasing(resumeText),
        checkDecorativeCharacters(resumeText),
        checkTextEncoding(resumeText),
    ];

    const passed = checks.filter(c => c.passed).length;
    const score = Math.round((passed / checks.length) * 100);

    return { checks, score };
}
