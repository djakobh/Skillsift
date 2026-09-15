import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string().optional(),
    AUTH_DISCORD_SECRET: z.string().optional(),
    DATABASE_URL: z.string().url(),
    ADZUNA_APP_ID: z.string().optional(),
    ADZUNA_APP_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GROQ_API_KEY: z.string(),
    GEMINI_API_KEY: z.string().optional(),
    ASSEMBLY_AI_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
    CODE_EXECUTION_ENABLED: z.enum(["true", "false"]).default("false"),
    CODE_RUNNER_URL: z.string().url().optional(),
    CODE_RUNNER_TOKEN: z.string().min(32).optional(),
    JUDGE_LIMITER_MODE: z.enum(["memory", "upstash"]).default("memory"),
    JUDGE_LIMITER_NAMESPACE: z.string().optional(),
    JUDGE_MAX_BODY_BYTES: z.string().regex(/^\d+$/).optional(),
    JUDGE_MAX_CODE_BYTES: z.string().regex(/^\d+$/).optional(),
    JUDGE_MAX_STDIN_BYTES: z.string().regex(/^\d+$/).optional(),
    JUDGE_RATE_LIMIT_MAX: z.string().regex(/^\d+$/).optional(),
    JUDGE_RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).optional(),
    JUDGE_MAX_CONCURRENT_PER_USER: z.string().regex(/^\d+$/).optional(),
    JUDGE_MAX_CONCURRENT_GLOBAL: z.string().regex(/^\d+$/).optional(),
    JUDGE_UPSTREAM_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    ANALYZER_URL: z.string().url().optional(),
    ANALYZER_SECRET: z.string().optional(),
    OLLAMA_BASE: z.string().url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("llama3.2"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
    NODE_ENV: process.env.NODE_ENV,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ASSEMBLY_AI_API_KEY: process.env.ASSEMBLY_AI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CODE_EXECUTION_ENABLED: process.env.CODE_EXECUTION_ENABLED,
    CODE_RUNNER_URL: process.env.CODE_RUNNER_URL,
    CODE_RUNNER_TOKEN: process.env.CODE_RUNNER_TOKEN,
    JUDGE_LIMITER_MODE: process.env.JUDGE_LIMITER_MODE,
    JUDGE_LIMITER_NAMESPACE: process.env.JUDGE_LIMITER_NAMESPACE,
    JUDGE_MAX_BODY_BYTES: process.env.JUDGE_MAX_BODY_BYTES,
    JUDGE_MAX_CODE_BYTES: process.env.JUDGE_MAX_CODE_BYTES,
    JUDGE_MAX_STDIN_BYTES: process.env.JUDGE_MAX_STDIN_BYTES,
    JUDGE_RATE_LIMIT_MAX: process.env.JUDGE_RATE_LIMIT_MAX,
    JUDGE_RATE_LIMIT_WINDOW_MS: process.env.JUDGE_RATE_LIMIT_WINDOW_MS,
    JUDGE_MAX_CONCURRENT_PER_USER: process.env.JUDGE_MAX_CONCURRENT_PER_USER,
    JUDGE_MAX_CONCURRENT_GLOBAL: process.env.JUDGE_MAX_CONCURRENT_GLOBAL,
    JUDGE_UPSTREAM_TIMEOUT_MS: process.env.JUDGE_UPSTREAM_TIMEOUT_MS,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ANALYZER_URL: process.env.ANALYZER_URL,
    ANALYZER_SECRET: process.env.ANALYZER_SECRET,
    OLLAMA_BASE: process.env.OLLAMA_BASE,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
