import { z } from "zod";

/**
 * Server-side environment validation (Phase 1 foundation).
 * Never import this module from client components — secrets must
 * never be exposed to the browser.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").default(""),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required").default(""),
  AI_PROVIDER: z.string().default(""),
  AI_API_URL: z.string().default(""),
  AI_API_KEY: z.string().default(""),
  /**
   * Which virtual try-on provider the app should use:
   * - "mock"        — simulated generation with demo-labelled output (default).
   * - "fashn"       — real VTON via the FASHN AI API (Phase 5). "real" is an
   *                   accepted alias for backward compatibility.
   * - "self-hosted" — real VTON via a self-hosted inference server (Phase 5B).
   */
  TRY_ON_PROVIDER: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return "mock";
      const v = String(value);
      return ["mock", "real", "fashn", "self-hosted"].includes(v)
        ? v
        : "mock";
    },
    z.enum(["mock", "real", "fashn", "self-hosted"])
  ),
  /**
   * FASHN AI API base endpoint (Phase 5).
   * Format: https://api.fashn.ai/v1/run
   */
  TRY_ON_API_URL: z.string().default(""),
  /**
   * FASHN AI API key (Phase 5).
   * Kept server-side only; never expose NEXT_PUBLIC_.
   */
  TRY_ON_API_KEY: z.string().default(""),
  /**
   * Self-hosted VTON inference server base URL (Phase 5B).
   * Points at the FastAPI server described in vton-server/.
   * Example: http://127.0.0.1:8060
   */
  VTON_SERVER_URL: z.string().default(""),
  /**
   * Shared secret between the I-RIS server and the self-hosted VTON
   * inference server (Phase 5B). Sent as `Authorization: Bearer <key>`.
   * Kept server-side only; never expose NEXT_PUBLIC_.
   */
  VTON_SERVER_API_KEY: z.string().default(""),
  /**
   * Which AI stylist provider the app should use (Phase 7):
   * - "mock"  — deterministic, catalogue-grounded demo responses (default).
   * - "real"  — real LLM via STYLIST_API_URL / STYLIST_API_KEY / STYLIST_MODEL.
   * Unknown or empty values fall back to "mock".
   */
  STYLIST_PROVIDER: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return "mock";
      const v = String(value);
      return ["mock", "real"].includes(v) ? v : "mock";
    },
    z.enum(["mock", "real"])
  ),
  /**
   * OpenAI-compatible chat-completions endpoint for the real stylist
   * provider (Phase 7). Example: https://api.openai.com/v1/chat/completions
   * Server-side only; never expose NEXT_PUBLIC_.
   */
  STYLIST_API_URL: z.string().default(""),
  /**
   * API key for the real stylist provider (Phase 7). The key is sent as an
   * `Authorization: Bearer` header and is NEVER included in any prompt.
   * Server-side only; never expose NEXT_PUBLIC_.
   */
  STYLIST_API_KEY: z.string().default(""),
  /**
   * Model name for the real stylist provider (Phase 7), e.g. "gpt-4o-mini".
   * Leave empty when the endpoint supplies its own default.
   */
  STYLIST_MODEL: z.string().default(""),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Validate `process.env` on the server. Call from server-only code. */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_URL: process.env.AI_API_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    TRY_ON_PROVIDER: process.env.TRY_ON_PROVIDER,
    TRY_ON_API_URL: process.env.TRY_ON_API_URL,
    TRY_ON_API_KEY: process.env.TRY_ON_API_KEY,
    VTON_SERVER_URL: process.env.VTON_SERVER_URL,
    VTON_SERVER_API_KEY: process.env.VTON_SERVER_API_KEY,
    STYLIST_PROVIDER: process.env.STYLIST_PROVIDER,
    STYLIST_API_URL: process.env.STYLIST_API_URL,
    STYLIST_API_KEY: process.env.STYLIST_API_KEY,
    STYLIST_MODEL: process.env.STYLIST_MODEL,
  });
}