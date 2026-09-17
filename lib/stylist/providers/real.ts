// Real AI stylist provider (Phase 7) — OpenAI-compatible chat completions.
//
// Implements StylistProvider against an OpenAI-compatible `/chat/completions`
// endpoint configured by server-side env vars. It is a BOUNDARY only: the
// default provider is `mock`, tests never call this, and it only runs when an
// operator explicitly configures STYLIST_PROVIDER=real. The API key travels in
// the Authorization header and is NEVER included in any prompt context.
//
// The model's output is trusted as little as any other network input: it is
// parsed and re-validated with the shared structured-output Zod schema, then
// every suggested productId is re-verified against the real catalogue by the
// service (see lib/stylist/verification.ts).

import { getServerEnv } from "@/lib/env";
import { errors } from "../errors";
import { buildStylistSystemPrompt, buildStylistUserPrompt } from "../prompt";
import { stylistProviderResponseSchema } from "../types";
import type {
  StylistProviderResponse,
  StylistSuggestion,
} from "../types";
import type { StylistProvider, StylistProviderInput } from "./types";

const REQUEST_TIMEOUT_MS = 30_000;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function requireConfig(): { apiUrl: string; apiKey: string; model: string } {
  const env = getServerEnv();
  if (!env.STYLIST_API_URL) {
    throw errors.providerNotConfigured(
      "STYLIST_API_URL is not configured. Set STYLIST_API_URL in your .env to use the real stylist provider."
    );
  }
  if (!env.STYLIST_API_KEY) {
    throw errors.providerNotConfigured(
      "STYLIST_API_KEY is not configured. Set STYLIST_API_KEY in your .env to use the real stylist provider."
    );
  }
  return { apiUrl: env.STYLIST_API_URL, apiKey: env.STYLIST_API_KEY, model: env.STYLIST_MODEL };
}

function historyToChat(input: StylistProviderInput): ChatMessage[] {
  const history: ChatMessage[] = (input.conversation ?? []).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
  // Keep the window small and only ever pass text — no images, no secrets.
  return history.slice(-6);
}

/** Extract a JSON object from a model's text (tolerates code fences). */
function extractJson(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  return JSON.parse(raw) as Record<string, unknown>;
}

export class RealStylistProvider implements StylistProvider {
  readonly name = "real-llm";
  readonly mode = "real" as const;

  async generate(input: StylistProviderInput): Promise<StylistProviderResponse> {
    const { apiUrl, apiKey, model } = requireConfig();

    const messages: ChatMessage[] = [
      { role: "system", content: buildStylistSystemPrompt() },
      ...historyToChat(input),
      {
        role: "user",
        content: buildStylistUserPrompt(input.message, input.catalogue, input.facets),
      },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || undefined,
          messages,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
    } catch {
      throw errors.providerFailed(
        "The styling provider could not be reached. Please try again."
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw errors.providerFailed(
        `The styling provider returned an error (${response.status}). Please try again.`
      );
    }

    let payload: unknown;
    let content: string;
    try {
      payload = await response.json();
      const choices = (payload as { choices?: { message?: { content?: unknown } }[] })
        .choices;
      const first = choices?.[0]?.message?.content;
      if (typeof first !== "string" || first.trim().length === 0) {
        throw new Error("empty completion");
      }
      content = first;
    } catch {
      throw errors.providerFailed(
        "The styling provider returned an unreadable response. Please try again."
      );
    }

    let json: Record<string, unknown>;
    try {
      json = extractJson(content);
    } catch {
      throw errors.invalidProviderOutput();
    }

    const parsed = stylistProviderResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw errors.invalidProviderOutput();
    }

    // Belt-and-braces: never send back more than 5, and trim reasons.
    const suggestions: StylistSuggestion[] = parsed.data.suggestions.map((s) => ({
      productId: s.productId,
      reason: s.reason.slice(0, 500),
    }));
    return { message: parsed.data.message, suggestions };
  }
}