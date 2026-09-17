// Server-only catalogue access for the AI Stylist (Phase 7).
//
// These helpers speak to Prisma/the real catalogue and are NEVER imported
// statically by the service or tests — they are injected lazily so the whole
// stylist pipeline stays testable without a database. They perform the actual
// grounding: every product a provider can see comes from the ACTIVE catalogue,
// and every facet filter is applied here against real data.

import { effectivePrice, formatINR } from "@/lib/products/format";
import { categoryKeywords, type StylistCatalogueDictionary } from "./intent";
import { filterByFacets } from "./verification";
import type {
  StylistCandidateProduct,
  StylistCatalogueItem,
  StylistFacets,
} from "./types";

async function loadKeywordDictionary(): Promise<{
  categories: { slug: string; name: string }[];
  brands: { name: string }[];
  colours: { name: string }[];
}> {
  const { db } = await import("@/lib/db");
  const [categories, brands, colours] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    db.colour.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  return { categories, brands, colours };
}

/** Real categories/brands/colours used to ground intent matching. */
export async function loadCatalogueDictionary(): Promise<StylistCatalogueDictionary> {
  const { categories, brands, colours } = await loadKeywordDictionary();
  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      keywords: categoryKeywords(c),
    })),
    brands: brands.map((b) => b.name),
    colours: colours.map((c) => c.name),
  };
}

/**
 * Query real, ACTIVE catalogue products for the given facets. Primary filters
 * (search, first category, first colour, availability, first size) are applied
 * by the shared catalogue query; the remaining multi-value + price-cap filters
 * are applied here against the returned rows so constraints come from real
 * data every time.
 */
export async function queryCatalogueMatches(
  facets: StylistFacets
): Promise<StylistCandidateProduct[]> {
  const { getCatalogue } = await import("@/lib/products/queries");
  const result = await getCatalogue({
    search: facets.query.length > 0 ? facets.query : undefined,
    category: facets.categorySlugs[0],
    colour: facets.colourNames[0],
    // "unknown" is a display state introduced in Phase 9; the catalogue query
    // only understands concrete states, so treat it as "any availability".
    availability:
      facets.availability === "unknown" ? undefined : (facets.availability ?? undefined),
    size: facets.sizeLabels[0],
    sort: "featured",
  });

  // Lightweight structural mapping; CatalogueProduct satisfies the candidate
  // shape (colours/gender/availability line up with StylistCandidateProduct).
  const products: StylistCandidateProduct[] = result.products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandName: p.brandName,
    categorySlug: p.categorySlug,
    categoryName: p.categoryName,
    priceInr: p.priceInr,
    salePriceInr: p.salePriceInr,
    imageUrl: p.imageUrl,
    colours: p.colours,
    availableSizes: p.availableSizes,
    availability: p.availability,
    gender: p.gender,
  }));

  // DB-enforced constraint pass (also covers multi-category/multi-colour and
  // the effective-price cap, which the shared query price filters may not).
  return filterByFacets(products, facets);
}

/** Serialise a bounded, grounded view of a product for a provider. */
export function toStylistItem(
  candidate: StylistCandidateProduct
): StylistCatalogueItem {
  const effective = effectivePrice(candidate);
  return {
    id: candidate.id,
    slug: candidate.slug,
    name: candidate.name,
    brandName: candidate.brandName,
    categorySlug: candidate.categorySlug,
    categoryName: candidate.categoryName,
    priceInr: candidate.priceInr,
    salePriceInr: candidate.salePriceInr,
    effectivePriceInr: effective,
    priceLabel: formatINR(effective),
    imageUrl: candidate.imageUrl,
    colours: candidate.colours.map((c) => c.name),
    availableSizes: candidate.availableSizes,
    availability: candidate.availability,
    gender: candidate.gender,
  };
}

/** Cap how much catalogue context a provider ever receives (cost control). */
export const STYLIST_CONTEXT_LIMIT = 24;

export function buildCatalogueContext(
  candidates: readonly StylistCandidateProduct[],
  limit = STYLIST_CONTEXT_LIMIT
): StylistCatalogueItem[] {
  return candidates.slice(0, limit).map(toStylistItem);
}