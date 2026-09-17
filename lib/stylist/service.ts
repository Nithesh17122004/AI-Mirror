// AI Stylist service — the single entry point the API route uses.
//
// Responsibilities:
// 1. Ground intent deterministically against the REAL catalogue dictionary.
// 2. Load a bounded, ACTIVE, filter-passing product set from the database.
// 3. Hand message + grounded context to the configured provider.
// 4. Re-verify every suggested productId against the real candidates and
//    re-apply the price/category/brand/colour/size/availability constraints —
//    the DATABASE is the source of truth; the provider only interprets.
// 5. Answer honestly when nothing matches (never a fabricated product).
//
// The service knows nothing about any specific LLM vendor. All database-
// touching work is injected lazily, so the whole pipeline is testable without
// a live database.

import { formatINR } from "@/lib/products/format";
import {
  buildCatalogueContext,
  loadCatalogueDictionary,
  queryCatalogueMatches,
  toStylistItem,
} from "./catalogue";
import { errors } from "./errors";
import { buildFacets, type StylistCatalogueDictionary } from "./intent";
import { getStylistProvider } from "./providers";
import type { StylistProvider } from "./providers/types";
import {
  stylistProviderResponseSchema,
  type StylistApiResult,
  type StylistCandidateProduct,
  type StylistFacets,
  type StylistRecommendation,
  type StylistRequestInput,
} from "./types";
import { verifySuggestions } from "./verification";

export type StylistServiceOptions = {
  /** Override the configured provider (tests, future callers). */
  provider?: StylistProvider;
  /** Load real categories/brands/colours for intent grounding. */
  loadDictionary?: () => Promise<StylistCatalogueDictionary>;
  /**
   * Query ACTIVE catalogue products for the facets. Defaults to the real
   * Prisma-backed loader; tests inject fixture products.
   */
  queryMatches?: (facets: StylistFacets) => Promise<StylistCandidateProduct[]>;
};

function describeFacets(
  facets: StylistFacets,
  dictionary: StylistCatalogueDictionary
): string {
  const parts: string[] = [];
  for (const slug of facets.categorySlugs) {
    const name = dictionary.categories.find((c) => c.slug === slug)?.name ?? slug;
    parts.push(name.toLowerCase());
  }
  parts.push(...facets.brandNames.map((b) => b.toLowerCase()));
  parts.push(...facets.colourNames.map((c) => c.toLowerCase()));
  if (facets.priceCap !== null) parts.push(`under ${formatINR(facets.priceCap)}`);
  if (facets.sizeLabels.length > 0) parts.push(`in size ${facets.sizeLabels.join(" or ")}`);
  if (facets.availability === "in-stock") parts.push("in stock");
  return parts.length > 0 ? parts.join(", ") : "what you asked";
}

function withLinks(productId: string): { product: string; size: string; tryOn: string } {
  return {
    product: `/products/${productId}`,
    size: `/size?product=${productId}`,
    tryOn: `/try-on?product=${productId}`,
  };
}

export class StylistService {
  private readonly provider: StylistProvider;
  private readonly loadDictionary: NonNullable<StylistServiceOptions["loadDictionary"]>;
  private readonly queryMatches: NonNullable<StylistServiceOptions["queryMatches"]>;

  constructor(options: StylistServiceOptions = {}) {
    this.provider = options.provider ?? getStylistProvider();
    this.loadDictionary = options.loadDictionary ?? loadCatalogueDictionary;
    this.queryMatches = options.queryMatches ?? queryCatalogueMatches;
  }

  /**
   * Handle one stylist turn. Throws `StylistError` for every failure mode;
   * the API route converts them into the standard JSON error shape.
   */
  async recommend(input: StylistRequestInput): Promise<StylistApiResult> {
    const message = input?.message?.trim() ?? "";
    if (!message) throw errors.invalidRequest("message is required");

    // 1. Ground the intent against real catalogue records.
    let dictionary: StylistCatalogueDictionary;
    try {
      dictionary = await this.loadDictionary();
    } catch {
      throw errors.catalogueUnavailable();
    }

    const facets = buildFacets(message, input.conversation ?? [], dictionary);

    // 2. An explicitly-named colour we don't carry: answer honestly now, so a
    //    neighbouring colour is never silently substituted.
    if (facets.unsupportedColour) {
      return {
        provider: { name: this.provider.name, mode: this.provider.mode },
        message: `We don't currently carry anything in ${facets.unsupportedColour} in our catalogue. Want me to suggest the closest available colours instead?`,
        recommendations: [],
        facets,
      };
    }

    // 3. Load real, ACTIVE, constraint-passing products from the database.
    let products: StylistCandidateProduct[];
    try {
      products = await this.queryMatches(facets);
    } catch {
      // The catalogue query is the only database touch in this flow; a throw
      // here means the database could not be reached.
      throw errors.catalogueUnavailable();
    }

    if (products.length === 0) {
      return {
        provider: { name: this.provider.name, mode: this.provider.mode },
        message: `I couldn't find anything in the current catalogue for ${describeFacets(facets, dictionary)}. Try widening the price range or removing a filter.`,
        recommendations: [],
        facets,
      };
    }

    // 4. Only this bounded, grounded context is ever shown to a provider.
    const context = buildCatalogueContext(products);

    const providerResult = await this.provider.generate({
      message,
      conversation: input.conversation ?? [],
      catalogue: context,
      facets,
    });

    // 5. Structured output is never trusted without validation.
    const parsed = stylistProviderResponseSchema.safeParse(providerResult);
    if (!parsed.success) throw errors.invalidProviderOutput();

    // 6. Re-verify every suggestion against the real candidates + constraints.
    const candidates = new Map(products.map((p) => [p.id, p]));
    const verified = verifySuggestions(parsed.data.suggestions, candidates, facets);

    if (verified.length === 0) {
      const hadSuggestions = parsed.data.suggestions.length > 0;
      return {
        provider: { name: this.provider.name, mode: this.provider.mode },
        message: hadSuggestions
          ? "Some of those suggestions aren't actually available under the constraints you gave, so I've held them back. Try adjusting the price, brand, or colour."
          : parsed.data.message,
        recommendations: [],
        facets,
      };
    }

    const recommendations: StylistRecommendation[] = verified.map((v) => ({
      product: toStylistItem(v.product),
      reason: v.reason,
      links: withLinks(v.product.id),
    }));

    return {
      provider: { name: this.provider.name, mode: this.provider.mode },
      message: parsed.data.message,
      recommendations,
      facets,
    };
  }
}