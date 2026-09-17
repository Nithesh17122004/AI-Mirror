// Mock AI stylist provider (Phase 7).
//
// A deterministic, transparent simulation. It does NOT call any LLM. It scores
// the grounded, bounded catalogue subset against the facets derived from the
// customer's message and picks the top matches, then writes plain-English
// reasons from the *real* product data it was given. Same input -> same output,
// always. The UI labels this mode explicitly so it is never mistaken for real
// AI inference.

import { formatINR, isSellableAvailability } from "@/lib/products/format";
import { brandNameMatches } from "../verification";
import type {
  StylistCatalogueItem,
  StylistProviderResponse,
  StylistSuggestion,
} from "../types";
import type { StylistProvider, StylistProviderInput } from "./types";

function availabilityRank(availability: string): number {
  if (availability === "in-stock") return 0;
  if (availability === "limited") return 1;
  if (availability === "unavailable") return 2;
  // "unknown" — no inventory evidence — ranks below known-out-of-stock so it
  // is only considered when nothing better is available, and it never claims
  // stock.
  return 3;
}

function bestReason(item: StylistCatalogueItem, input: StylistProviderInput): string {
  const f = input.facets;
  const bits: string[] = [];

  if (f.categorySlugs.includes(item.categorySlug)) {
    bits.push(`a ${item.categoryName.toLowerCase()}`);
  }
  if (f.brandNames.some((b) => brandNameMatches(item.brandName, b))) {
    bits.push(`from ${item.brandName}`);
  }
  if (f.colourNames.some((c) => item.colours.some((name) => name.toLowerCase() === c.toLowerCase()))) {
    bits.push(`in ${item.colours.join("/")}`);
  }
  if (f.priceCap !== null) bits.push(`under ${formatINR(f.priceCap)}`);
  if (f.availability !== null && item.availability === f.availability) {
    bits.push("in stock");
  }

  const opening =
    bits.length > 0 ? `matches your request (${bits.join(", ")})` : "a solid match for what you asked";
  if (isSellableAvailability(item.availability)) {
    const sizes =
      item.availableSizes.length > 0
        ? item.availableSizes.join(", ")
        : "selected sizes";
    return `${item.name} ${opening}. Currently ${formatINR(item.effectivePriceInr)} and available in sizes ${sizes}.`;
  }
  return `${item.name} ${opening}. Currently ${formatINR(item.effectivePriceInr)} — check availability in your nearest store.`;
}

function buildMessage(
  suggestions: StylistSuggestion[],
  input: StylistProviderInput
): string {
  const f = input.facets;
  const hasFacets =
    f.categorySlugs.length > 0 ||
    f.brandNames.length > 0 ||
    f.colourNames.length > 0 ||
    f.priceCap !== null ||
    f.sizeLabels.length > 0 ||
    f.availability !== null;

  if (suggestions.length === 0) {
    return "I couldn't find anything in the current catalogue that matches exactly what you asked for. Try widening the price range or removing a brand/colour filter.";
  }
  if (hasFacets) {
    const count = suggestions.length === 1 ? "a piece" : `${suggestions.length} pieces`;
    return `Here ${suggestions.length === 1 ? "is" : "are"} ${count} from the current catalogue that ${suggestions.length === 1 ? "matches" : "match"} your request.`;
  }
  return "Here are a few pieces from the current catalogue to get you started.";
}

export class MockStylistProvider implements StylistProvider {
  readonly name = "mock";
  readonly mode = "demo" as const;

  async generate(input: StylistProviderInput): Promise<StylistProviderResponse> {
    const facets = input.facets;

    const scored = input.catalogue
      .map((item) => {
        let score = 0;
        if (facets.categorySlugs.length > 0) {
          score += facets.categorySlugs.includes(item.categorySlug) ? 3 : -1;
        }
        if (facets.brandNames.length > 0) {
          score += facets.brandNames.some((b) =>
            brandNameMatches(item.brandName, b)
          )
            ? 3
            : -1;
        }
        if (facets.colourNames.length > 0) {
          score += facets.colourNames.some((c) =>
            item.colours.some((name) => name.toLowerCase() === c.toLowerCase())
          )
            ? 3
            : -1;
        }
        if (facets.priceCap !== null) {
          score += item.effectivePriceInr <= facets.priceCap ? 2 : -2;
        }
        if (facets.sizeLabels.length > 0) {
          score += facets.sizeLabels.some((s) => item.availableSizes.includes(s))
            ? 2
            : -1;
        }
        if (facets.availability !== null) {
          score += item.availability === facets.availability ? 2 : -1;
        }
        return { item, score };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const rankDiff =
          availabilityRank(a.item.availability) - availabilityRank(b.item.availability);
        if (rankDiff !== 0) return rankDiff;
        const priceDiff = a.item.effectivePriceInr - b.item.effectivePriceInr;
        if (priceDiff !== 0) return priceDiff;
        return a.item.name.localeCompare(b.item.name);
      });

    // Only suggest products with real sellable evidence. Products with zero
    // stock or no inventory evidence are held back unless there is literally
    // nothing sellable to recommend.
    const sellable = scored.filter((r) => isSellableAvailability(r.item.availability));
    const pool =
      sellable.length > 0 && sellable.length < scored.length
        ? sellable
        : scored;

    const hasAnyFacet =
      facets.categorySlugs.length > 0 ||
      facets.brandNames.length > 0 ||
      facets.colourNames.length > 0 ||
      facets.priceCap !== null ||
      facets.sizeLabels.length > 0 ||
      facets.availability !== null;

    // When the customer stated constraints, only positively-scored matches
    // qualify; a request for something we don't carry ends up with zero
    // suggestions and the service answers honestly.
    const finalPool = hasAnyFacet
      ? pool.filter((r) => r.score >= 1)
      : pool;

    const suggestions: StylistSuggestion[] = finalPool
      .slice(0, 5)
      .map(({ item }) => ({ productId: item.id, reason: bestReason(item, input) }));

    return { message: buildMessage(suggestions, input), suggestions };
  }
}