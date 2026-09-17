// Pure verification + constraint enforcement for the AI Stylist (Phase 7).
//
// These functions hold the ONLY rules that decide whether a suggested product
// is allowed through. They are deliberately DB-free and deterministic so the
// hard guarantees are unit-testable:
//
// 1. A suggestion is only kept when its productId resolves to a real, ACTIVE
//    catalogue product (the candidate set is itself assembled from ACTIVE
//    rows — anything else is dropped).
// 2. Price / category / brand / colour / size / availability filters are
//    enforced against the product's REAL data here, on the server, not by the
//    provider. If the provider suggests something outside a stated constraint,
//    it is dropped.
// 3. Deduplicated, capped at MAX_RECOMMENDATIONS, deterministic order.

import { effectivePrice } from "@/lib/products/format";
import {
  MAX_RECOMMENDATIONS,
  type StylistCandidateProduct,
  type StylistFacets,
  type StylistSuggestion,
} from "./types";

// ---------------------------------------------------------------------------
// Brand matching is hyphen/space/case agnostic: "I-RIS Essentials",
// "Iris Essentials" and "IRISESSENTIALS" are the same brand to a shopper.
// ---------------------------------------------------------------------------

export function cleanPhrase(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** True when the full brand phrase appears inside `text` (case/space/hyphen-insensitive). */
export function brandMentioned(text: string, brand: string): boolean {
  const textCleaned = cleanPhrase(text);
  const brandCleaned = cleanPhrase(brand);
  return brandCleaned.length > 0 && textCleaned.includes(brandCleaned);
}

/** True when a product's brand satisfies a stated brand facet. */
export function brandNameMatches(productBrand: string, facetBrand: string): boolean {
  const productCleaned = cleanPhrase(productBrand);
  const facetCleaned = cleanPhrase(facetBrand);
  if (facetCleaned.length === 0) return false;
  return productCleaned === facetCleaned || productCleaned.includes(facetCleaned);
}

export type VerificationOptions = {
  limit?: number;
};

export type VerifiedSuggestion<T extends StylistCandidateProduct> = {
  productId: string;
  reason: string;
  product: T;
};

/**
 * The facet predicate applied to real product data. This is the enforcement
 * point: nothing passes a constraint unless the DATABASE says it does.
 */
export function matchesFacets(
  product: StylistCandidateProduct,
  facets: StylistFacets
): boolean {
  if (facets.priceCap !== null && effectivePrice(product) > facets.priceCap) {
    return false;
  }
  if (
    facets.categorySlugs.length > 0 &&
    !facets.categorySlugs.includes(product.categorySlug)
  ) {
    return false;
  }
  if (facets.brandNames.length > 0) {
    if (!facets.brandNames.some((b) => brandNameMatches(product.brandName, b))) {
      return false;
    }
  }
  if (facets.colourNames.length > 0) {
    const owned = new Set(product.colours.map((c) => c.name.toLowerCase()));
    if (!facets.colourNames.some((c) => owned.has(c.toLowerCase()))) {
      return false;
    }
  }
  if (facets.sizeLabels.length > 0) {
    const owned = new Set(product.availableSizes);
    if (!facets.sizeLabels.some((s) => owned.has(s))) {
      return false;
    }
  }
  if (facets.availability !== null && product.availability !== facets.availability) {
    return false;
  }
  return true;
}

/** Keep only products that satisfy every facet (used by the catalogue loader). */
export function filterByFacets<T extends StylistCandidateProduct>(
  products: readonly T[],
  facets: StylistFacets
): T[] {
  return products.filter((p) => matchesFacets(p, facets));
}

/**
 * Turn provider suggestions into verified recommendations. A suggestion is
 * dropped when its id is not in `candidates`, when it duplicates an earlier
 * one, or when the candidate violates the facets. Order is preserved; the
 * result never exceeds the limit.
 */
export function verifySuggestions<T extends StylistCandidateProduct>(
  suggestions: readonly StylistSuggestion[],
  candidates: ReadonlyMap<string, T>,
  facets: StylistFacets,
  options: VerificationOptions = {}
): VerifiedSuggestion<T>[] {
  const limit = options.limit ?? MAX_RECOMMENDATIONS;
  const seen = new Set<string>();
  const verified: VerifiedSuggestion<T>[] = [];

  for (const suggestion of suggestions) {
    if (verified.length >= limit) break;
    const id = suggestion.productId;
    if (seen.has(id)) continue;
    const product = candidates.get(id);
    if (!product) continue;
    if (!matchesFacets(product, facets)) continue;

    seen.add(id);
    verified.push({
      productId: id,
      reason: suggestion.reason.trim().slice(0, 500),
      product,
    });
  }

  return verified;
}