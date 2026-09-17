// Shared AI Stylist domain types (Phase 7).
//
// The contract on the wire:
//   Browser -> POST /api/stylist -> StylistService -> StylistProvider
//
// The provider is an *interpreter*: it reads the customer's message and the
// bounded, grounded catalogue context and returns structured recommendations.
// The service + database remain the source of truth — every suggested product
// id is re-verified against the real catalogue and price/category/brand/colour
// constraints are enforced by data, not by whatever the model said.

import { z } from "zod";
import type { Availability } from "@/lib/products/format";

// ---------------------------------------------------------------------------
// Request / conversation
// ---------------------------------------------------------------------------

export type StylistRole = "user" | "assistant";

export type StylistConversationTurn = {
  role: StylistRole;
  content: string;
};

export const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1, "conversation content is empty").max(1500),
});

export const stylistRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "message is required")
    .max(2000, "message is too long"),
  conversation: z.array(conversationTurnSchema).max(20).default([]),
});

export type StylistRequestInput = z.infer<typeof stylistRequestSchema>;

// ---------------------------------------------------------------------------
// Facets — the deterministic, database-grounded interpretation of intent.
// A provider may use these to rank, but the database enforces them.
// ---------------------------------------------------------------------------

export type SizeLabel = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export type StylistFacets = {
  /** Free-text search terms derived from the message (safe for full-text). */
  query: string;
  /** Category slugs resolved against the real Category table. */
  categorySlugs: string[];
  /** Brand names resolved against the real Brand table. */
  brandNames: string[];
  /** Colour names resolved against the real Colour table. */
  colourNames: string[];
  /** Price cap on the *effective selling price* (sale price when active). */
  priceCap: number | null;
  /** Size labels the customer asked for ("in size M"). */
  sizeLabels: SizeLabel[];
  /** "in stock" / null. */
  availability: Availability | null;
  /** A colour the customer named that is NOT in the catalogue. */
  unsupportedColour: string | null;
};

// ---------------------------------------------------------------------------
// Structured provider output
// ---------------------------------------------------------------------------

export const stylistSuggestionSchema = z.object({
  productId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(500),
});

export const stylistProviderResponseSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  suggestions: z.array(stylistSuggestionSchema).max(5).default([]),
});

export type StylistSuggestion = z.infer<typeof stylistSuggestionSchema>;
export type StylistProviderResponse = z.infer<
  typeof stylistProviderResponseSchema
>;

/** Hard limit on recommendations returned to the customer. */
export const MAX_RECOMMENDATIONS = 5;

/**
 * A product candidate in its structural, serialisable shape. Both the
 * Prisma-backed catalogue loader and the injected test fixtures satisfy this
 * shape, so none of the pipeline below depends on Prisma being reachable.
 */
export type StylistCandidateProduct = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string;
  categoryName: string;
  priceInr: number;
  salePriceInr: number | null;
  imageUrl: string | null;
  colours: readonly { name: string }[];
  availableSizes: string[];
  availability: Availability;
  gender: "MEN" | "WOMEN" | "UNISEX";
};

/** The bounded, serialisable view of a product handed to a provider. */
export type StylistCatalogueItem = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string;
  categoryName: string;
  priceInr: number;
  salePriceInr: number | null;
  effectivePriceInr: number;
  priceLabel: string;
  imageUrl: string | null;
  colours: string[];
  availableSizes: string[];
  availability: Availability;
  gender: "MEN" | "WOMEN" | "UNISEX";
};

export type StylistRecommendation = {
  product: StylistCatalogueItem;
  reason: string;
  links: {
    product: string;
    size: string;
    tryOn: string;
  };
};

export type StylistFacetsSummary = {
  query: string;
  categorySlugs: string[];
  brandNames: string[];
  colourNames: string[];
  priceCap: number | null;
  sizeLabels: SizeLabel[];
  availability: Availability | null;
  unsupportedColour: string | null;
};

export type StylistApiResult = {
  provider: { name: string; mode: "demo" | "real" };
  message: string;
  recommendations: StylistRecommendation[];
  facets: StylistFacetsSummary;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type StylistErrorCode =
  | "invalid-request"
  | "catalogue-unavailable"
  | "provider-not-configured"
  | "provider-failed"
  | "invalid-provider-output"
  | "unexpected";

export type StylistErrorInfo = {
  code: StylistErrorCode;
  message: string;
  retryable: boolean;
};

export type StylistApiResponse =
  | { success: true; result: StylistApiResult }
  | { success: false; error: StylistErrorInfo };