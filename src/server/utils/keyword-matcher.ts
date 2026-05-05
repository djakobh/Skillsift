/**
 * Keyword extraction and matching utilities for ATS resume scoring.
 * Compares resume text against job description keywords to produce
 * match results used by the scoring formula.
 */

// ============================================
// Types
// ============================================

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  category: KeywordCategory;
}

export interface KeywordMatchResult {
  matches: KeywordMatch[];
  matchedCount: number;
  totalKeywords: number;
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  categoryBreakdown: Record<KeywordCategory, { matched: number; total: number }>;
}

export enum KeywordCategory {
  TECHNICAL_SKILL = "technical_skill",
  SOFT_SKILL = "soft_skill",
  TOOL = "tool",
  CERTIFICATION = "certification",
  EDUCATION = "education",
  INDUSTRY_TERM = "industry_term",
  GENERAL = "general",
}

// ============================================
// Curated keyword dictionaries
// ============================================

const TECHNICAL_SKILLS = new Set([
  // Programming languages
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go",
  "golang", "rust", "swift", "kotlin", "php", "scala", "r", "matlab",
  "perl", "haskell", "elixir", "clojure", "dart", "lua", "sql", "html",
  "css", "sass", "less", "bash", "shell", "powershell", "objective-c",
  // Frontend frameworks/libraries
  "react", "angular", "vue", "svelte", "next.js", "nextjs", "nuxt",
  "gatsby", "remix", "ember", "backbone", "jquery", "bootstrap",
  "tailwind", "tailwindcss", "material ui", "chakra ui", "redux",
  "mobx", "zustand", "webpack", "vite", "rollup", "parcel",
  // Backend frameworks
  "node.js", "nodejs", "express", "fastify", "nestjs", "django",
  "flask", "fastapi", "spring", "spring boot", "rails", "laravel",
  "asp.net", ".net", "gin", "fiber", "actix",
  // Mobile
  "react native", "flutter", "ionic", "xamarin", "swiftui",
  // Databases
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "dynamodb", "cassandra", "sqlite", "oracle", "sql server", "mariadb",
  "neo4j", "couchdb", "firebase", "supabase", "prisma",
  // Cloud & DevOps
  "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
  "terraform", "ansible", "jenkins", "github actions", "gitlab ci",
  "circleci", "travis ci", "nginx", "apache", "linux", "unix",
  // Data/ML
  "machine learning", "deep learning", "neural networks", "tensorflow",
  "pytorch", "scikit-learn", "pandas", "numpy", "spark", "hadoop",
  "data science", "data engineering", "data analysis", "nlp",
  "computer vision", "artificial intelligence", "ai", "ml",
  // Testing
  "jest", "mocha", "cypress", "selenium", "playwright", "junit",
  "pytest", "rspec", "testing", "unit testing", "integration testing",
  "test driven development", "tdd", "bdd",
  // Other technical
  "rest", "restful", "graphql", "grpc", "websocket", "microservices",
  "api", "apis", "oauth", "jwt", "authentication", "authorization",
  "encryption", "security", "ci/cd", "cicd", "git", "github", "gitlab",
  "bitbucket", "svn", "agile", "scrum", "kanban", "jira", "confluence",
  "design patterns", "oop", "functional programming", "algorithms",
  "data structures", "system design", "distributed systems",
  "cloud computing", "serverless", "saas", "paas", "iaas",
  "containerization", "virtualization", "networking", "tcp/ip",
  "http", "https", "dns", "load balancing", "caching",
]);

const SOFT_SKILLS = new Set([
  "leadership", "communication", "teamwork", "collaboration",
  "problem solving", "problem-solving", "critical thinking",
  "time management", "project management", "mentoring",
  "adaptability", "creativity", "innovation", "attention to detail",
  "analytical", "strategic thinking", "decision making",
  "interpersonal", "presentation", "public speaking",
  "negotiation", "conflict resolution", "self-motivated",
  "initiative", "organizational", "multitasking", "prioritization",
  "customer service", "stakeholder management", "cross-functional",
]);

const TOOLS = new Set([
  "jira", "confluence", "slack", "trello", "asana", "notion",
  "figma", "sketch", "adobe xd", "photoshop", "illustrator",
  "vs code", "vscode", "visual studio", "intellij", "eclipse",
  "xcode", "android studio", "postman", "insomnia", "swagger",
  "datadog", "splunk", "grafana", "prometheus", "new relic",
  "sentry", "pagerduty", "tableau", "power bi", "looker",
  "excel", "google sheets", "salesforce", "hubspot",
]);

const CERTIFICATIONS = new Set([
  "aws certified", "azure certified", "google certified",
  "pmp", "scrum master", "csm", "cissp", "comptia",
  "cka", "ckad", "ceh", "ccna", "ccnp",
  "aws solutions architect", "aws developer",
  "google professional cloud", "microsoft certified",
]);

const EDUCATION_TERMS = new Set([
  "phd", "ph.d", "doctorate", "mba", "associate",
  "computer science", "software engineering", "information technology",
  "information systems", "electrical engineering", "mathematics",
  "statistics", "data science", "cybersecurity",
  "degree", "diploma", "certification", "certified",
]);

/**
 * Education terms that have multiple variant spellings.
 * Map from canonical form → list of variants to search for.
 * Only the canonical form is emitted as a keyword.
 */
const EDUCATION_VARIANTS: Map<string, string[]> = new Map([
  ["bachelor's", ["bachelor", "bachelors", "bachelor's"]],
  ["master's", ["master", "masters", "master's"]],
]);

// Stop words are no longer needed — keyword extraction now relies
// exclusively on the curated dictionaries above, which eliminates
// generic job-posting boilerplate ("please", "apply", "benefits", etc.).

/**
 * Keywords that are also common English words. These require nearby
 * technical context to be counted — otherwise "express written consent"
 * would match the Express.js framework.
 *
 * Each entry maps the ambiguous term to a list of context words that,
 * if found within a ±5-word window, confirm the technical meaning.
 */
const AMBIGUOUS_KEYWORDS: Map<string, string[]> = new Map([
  ["express",  ["node", "nodejs", "node.js", "js", "javascript", "api", "server", "backend", "framework", "middleware", "routing"]],
  ["go",       ["golang", "lang", "goroutine", "concurrency", "programming", "language", "developer", "engineer"]],
  ["r",        ["programming", "language", "statistical", "rstudio", "cran", "data analysis", "statistics"]],
  ["rust",     ["programming", "language", "cargo", "systems", "memory", "developer", "engineer"]],
  ["swift",    ["ios", "apple", "xcode", "swiftui", "mobile", "programming", "language", "developer"]],
  ["spring",   ["java", "boot", "framework", "bean", "mvc", "microservice", "backend"]],
  ["rest",     ["api", "apis", "restful", "endpoint", "http", "json", "service", "request"]],
  ["dart",     ["flutter", "programming", "language", "mobile", "google", "developer"]],
  ["flask",    ["python", "api", "framework", "backend", "server", "web"]],
  ["rails",    ["ruby", "framework", "web", "backend", "mvc", "api"]],
  ["ember",    ["javascript", "js", "framework", "frontend", "web"]],
  ["backbone", ["javascript", "js", "framework", "frontend", "web", "model"]],
  ["redux",    ["react", "state", "store", "action", "reducer", "javascript", "frontend"]],
  ["spark",    ["apache", "hadoop", "data", "big data", "scala", "cluster", "distributed"]],
  ["oracle",   ["database", "db", "sql", "plsql", "java", "cloud", "dba"]],
  ["ionic",    ["mobile", "angular", "hybrid", "app", "framework", "cordova"]],
  ["fiber",    ["go", "golang", "framework", "web", "api", "server"]],
  ["gin",      ["go", "golang", "framework", "web", "api", "server"]],
  ["less",     ["css", "stylesheet", "preprocessor", "style", "sass", "frontend"]],
  ["sass",     ["css", "stylesheet", "preprocessor", "style", "less", "frontend", "scss"]],
  ["agile",    ["scrum", "sprint", "kanban", "methodology", "standup", "retrospective", "jira", "development"]],
  ["angular",  ["typescript", "javascript", "framework", "frontend", "component", "rxjs", "web"]],
  ["react",    ["javascript", "typescript", "jsx", "tsx", "component", "frontend", "hooks", "redux", "nextjs", "next.js", "web"]],
  ["vue",      ["javascript", "typescript", "framework", "frontend", "component", "nuxt", "web"]],
  ["html",     ["css", "javascript", "web", "frontend", "markup", "dom", "page", "website"]],
]);

// ============================================
// Core functions
// ============================================

/**
 * Normalizes text for consistent keyword comparison.
 * Strips URLs first so that tokens inside links (e.g. ".html" in a URL)
 * don't produce false-positive matches.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/[^\s)]+/g, " ")  // strip URLs
    .replace(/www\.[^\s)]+/g, " ")         // strip www. links
    .replace(/['']/g, "'")    // normalize smart quotes
    .replace(/[""]/g, '"')    // normalize smart double quotes
    .replace(/[\r\n]+/g, " ") // newlines to spaces
    .replace(/\s+/g, " ")     // collapse whitespace
    .trim();
}

/**
 * Checks if a multi-word phrase exists in the normalized text.
 */
function phraseExistsInText(phrase: string, normalizedText: string): boolean {
  // Build a regex that allows flexible whitespace/punctuation between words
  const words = phrase.split(/[\s\-\/\.]+/).filter(Boolean);
  if (words.length === 0) return false;

  if (words.length === 1) {
    // Single word: match as whole word (word boundary)
    const word = escapeRegex(words[0]!);
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(normalizedText);
  }

  // Multi-word: allow flexible separators between words
  const pattern = words.map(escapeRegex).join("[\\s\\-\\/\\.]+");
  const regex = new RegExp(`\\b${pattern}\\b`, "i");
  return regex.test(normalizedText);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * For ambiguous keywords (common English words that are also tech terms),
 * checks whether any technical context word appears within a ±5-word window
 * around the keyword occurrence. Returns true only if context confirms
 * technical usage (e.g. "express" near "node" or "api").
 */
function hasNearbyTechContext(
  keyword: string,
  normalizedText: string,
  contextWords: string[]
): boolean {
  const windowSize = 5;
  const tokens = normalizedText.split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    // Check if this token matches the keyword
    if (tokens[i] === keyword || tokens[i] === keyword + "js" || tokens[i] === keyword + ".js") {
      // Look at surrounding window
      const start = Math.max(0, i - windowSize);
      const end = Math.min(tokens.length, i + windowSize + 1);
      const window = tokens.slice(start, end).join(" ");

      for (const ctx of contextWords) {
        if (window.includes(ctx)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Categorizes a keyword based on the curated dictionaries.
 */
function categorizeKeyword(keyword: string): KeywordCategory {
  const lower = keyword.toLowerCase();
  if (TECHNICAL_SKILLS.has(lower)) return KeywordCategory.TECHNICAL_SKILL;
  if (SOFT_SKILLS.has(lower)) return KeywordCategory.SOFT_SKILL;
  if (TOOLS.has(lower)) return KeywordCategory.TOOL;
  if (CERTIFICATIONS.has(lower)) return KeywordCategory.CERTIFICATION;
  if (EDUCATION_TERMS.has(lower)) return KeywordCategory.EDUCATION;
  // Check education variant canonical forms (e.g. "bachelor's", "master's")
  if (EDUCATION_VARIANTS.has(lower)) return KeywordCategory.EDUCATION;
  return KeywordCategory.GENERAL;
}

/**
 * Extracts meaningful keywords from a job description.
 * Uses only curated dictionaries so that generic boilerplate words
 * ("please", "apply", "benefits", "insurance", etc.) are never included.
 * Education variant forms (bachelor/bachelors/bachelor's) are collapsed
 * into a single canonical keyword to avoid double-counting.
 */
export function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const found = new Set<string>();

  // 1. Check curated single/multi-word dictionaries
  const allDictionaries = [
    TECHNICAL_SKILLS, SOFT_SKILLS, TOOLS, CERTIFICATIONS, EDUCATION_TERMS,
  ];

  for (const dict of allDictionaries) {
    for (const term of dict) {
      if (!phraseExistsInText(term, normalized)) continue;

      // For ambiguous terms, require nearby technical context
      const contextWords = AMBIGUOUS_KEYWORDS.get(term);
      if (contextWords) {
        if (!hasNearbyTechContext(term, normalized, contextWords)) continue;
      }

      found.add(term);
    }
  }

  // 2. Education variants — collapse "bachelor/bachelors/bachelor's" into one
  for (const [canonical, variants] of EDUCATION_VARIANTS) {
    const anyVariantFound = variants.some((v) => phraseExistsInText(v, normalized));
    if (anyVariantFound) {
      // Remove any individual variant that snuck in, keep only canonical
      for (const v of variants) {
        found.delete(v);
      }
      found.add(canonical);
    }
  }

  return Array.from(found);
}

/**
 * Matches job description keywords against resume text.
 * Returns detailed results including per-keyword matches,
 * overall percentage, and category breakdown.
 */
export function matchKeywords(
  resumeText: string,
  jobDescriptionText: string
): KeywordMatchResult {
  const jobKeywords = extractKeywords(jobDescriptionText);
  const normalizedResume = normalizeText(resumeText);

  const matches: KeywordMatch[] = [];
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  // Initialize category breakdown
  const categoryBreakdown: Record<KeywordCategory, { matched: number; total: number }> = {
    [KeywordCategory.TECHNICAL_SKILL]: { matched: 0, total: 0 },
    [KeywordCategory.SOFT_SKILL]: { matched: 0, total: 0 },
    [KeywordCategory.TOOL]: { matched: 0, total: 0 },
    [KeywordCategory.CERTIFICATION]: { matched: 0, total: 0 },
    [KeywordCategory.EDUCATION]: { matched: 0, total: 0 },
    [KeywordCategory.INDUSTRY_TERM]: { matched: 0, total: 0 },
    [KeywordCategory.GENERAL]: { matched: 0, total: 0 },
  };

  for (const keyword of jobKeywords) {
    const category = categorizeKeyword(keyword);
    const found = phraseExistsInText(keyword, normalizedResume);

    matches.push({ keyword, found, category });
    categoryBreakdown[category].total++;

    if (found) {
      matchedKeywords.push(keyword);
      categoryBreakdown[category].matched++;
    } else {
      missingKeywords.push(keyword);
    }
  }

  const totalKeywords = jobKeywords.length;
  const matchedCount = matchedKeywords.length;
  const matchPercentage = totalKeywords > 0
    ? Math.round((matchedCount / totalKeywords) * 100)
    : 0;

  return {
    matches,
    matchedCount,
    totalKeywords,
    matchPercentage,
    matchedKeywords,
    missingKeywords,
    categoryBreakdown,
  };
}
