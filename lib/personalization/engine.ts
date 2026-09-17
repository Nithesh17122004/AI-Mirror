// Deterministic, guest-first personalisation.
//
// RULES (per the Phase 8 specification):
//  - Signals come ONLY from explicit session/browser actions: wishlist items,
//    recently-viewed items and on-page preferences. No hidden tracking, no
//    inferred sensitive characteristics, no LLM.
//  - Every recommendation resolves against the REAL catalogue: the engine can
//    only rank candidates it is given, it can never invent a product.
//  - Scoring is deterministic and transparent: overlap on category, brand and
//    colour, weighted by how often each signal element appears.
//  - Products already in the signal set are never recommended back.

export type PersonalisableProduct = {
  id: string;
  categorySlug: string;
  brandSlug: string;
  colourNames: string[];
  name: string;
};

export type PreferenceProfile = {
  categories: Record<string, number>;
  brands: Record<string, number>;
  colours: Record<string, number>;
  itemCount: number;
};

/** Count how often each category / brand / colour appears in the signals. */
export function buildPreferenceProfile(
  items: PersonalisableProduct[]
): PreferenceProfile {
  const profile: PreferenceProfile = {
    categories: {},
    brands: {},
    colours: {},
    itemCount: items.length,
  };
  for (const item of items) {
    profile.categories[item.categorySlug] =
      (profile.categories[item.categorySlug] ?? 0) + 1;
    profile.brands[item.brandSlug] = (profile.brands[item.brandSlug] ?? 0) + 1;
    for (const colour of item.colourNames) {
      profile.colours[colour] = (profile.colours[colour] ?? 0) + 1;
    }
  }
  return profile;
}

/** Overlap score: sum of category/brand/colour signal frequencies matched. */
export function scoreProduct(
  profile: PreferenceProfile,
  candidate: PersonalisableProduct
): number {
  let score = 0;
  score += profile.categories[candidate.categorySlug] ?? 0;
  score += profile.brands[candidate.brandSlug] ?? 0;
  for (const colour of candidate.colourNames) {
    score += profile.colours[colour] ?? 0;
  }
  return score;
}

export type ScoredCandidate<T extends PersonalisableProduct> = {
  product: T;
  score: number;
};

/**
 * Rank candidates by overlap with `signals`, excluding the signal products
 * themselves. Deterministic tie-break: score desc, then name asc.
 * Returns an empty list when there are no signals or nothing overlaps.
 */
export function recommendFromSignals<T extends PersonalisableProduct>(
  candidates: T[],
  signals: PersonalisableProduct[],
  opts: { excludeIds?: ReadonlySet<string>; limit?: number } = {}
): ScoredCandidate<T>[] {
  const limit = opts.limit ?? 6;
  const excludeIds = new Set(opts.excludeIds ?? []);
  for (const signal of signals) excludeIds.add(signal.id);

  const profile = buildPreferenceProfile(signals);
  if (profile.itemCount === 0) return [];

  const scored: { product: T; score: number }[] = [];
  for (const candidate of candidates) {
    if (excludeIds.has(candidate.id)) continue;
    const score = scoreProduct(profile, candidate);
    if (score <= 0) continue;
    scored.push({ product: candidate, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name);
  });

  return scored.slice(0, limit);
}