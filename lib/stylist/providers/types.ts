// Provider contract for the AI stylist (Phase 7).
//
// The rest of the application talks to `StylistProvider` — never to a specific
// LLM vendor. Adding a real provider later means implementing this interface
// in `providers/<real>.ts` and registering it in `index.ts`.

import type {
  StylistCatalogueItem,
  StylistConversationTurn,
  StylistFacets,
  StylistProviderResponse,
} from "../types";

/** Everything a provider needs to answer one stylist turn. */
export type StylistProviderInput = {
  /** The customer's latest message. */
  message: string;
  /** Prior session-only turns (text only — never a conversation database). */
  conversation: StylistConversationTurn[];
  /**
   * The bounded, grounded catalogue subset. Providers MUST only ever
   * recommend products from this array.
   */
  catalogue: StylistCatalogueItem[];
  /** Deterministic facets derived from message + conversation. */
  facets: StylistFacets;
};

/**
 * A styling provider (interpreter + recommender).
 *
 * Implementations contain ALL provider-specific behaviour (prompt framing,
 * request shape, auth, vendor API calls). The service and UI only depend on
 * this interface, so swapping mock -> real never touches the frontend.
 */
export interface StylistProvider {
  /** Stable identifier, e.g. "mock" or "openai-chat". */
  readonly name: string;
  /**
   * "demo" — deterministic simulation; "real" — an actual LLM API call.
   * The UI surfaces this so a demo is never mistaken for real AI.
   */
  readonly mode: "demo" | "real";
  /** Produce a structured response. Throw `StylistError` on failure. */
  generate(input: StylistProviderInput): Promise<StylistProviderResponse>;
}