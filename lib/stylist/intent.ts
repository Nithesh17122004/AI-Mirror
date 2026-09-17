// Deterministic intent interpretation for the AI Stylist (Phase 7).
//
// These functions are PURE and DB-free. They translate a customer message (plus
// prior conversation turns for refinement) into structured `StylistFacets`.
// The facets are only ever grounded in data the caller supplies — category,
// brand and colour matches resolve against the real records the service loads
// from the database. A provider may rank by these, but the DATABASE enforces
// them: nothing that fails a facet is ever recommended.

import type { Availability } from "@/lib/products/format";
import { brandMentioned } from "./verification";
import type { SizeLabel, StylistFacets } from "./types";

export type StylistCategoryDomain = {
  slug: string;
  name: string;
  keywords: string[];
};

export type StylistCatalogueDictionary = {
  categories: StylistCategoryDomain[];
  brands: string[];
  colours: string[];
};

/**
 * Keyword triggers per known category. Deliberately static so intent matching
 * is deterministic and auditable; unknown future categories fall back to the
 * words in their real Category.name.
 */
const DEFAULT_CATEGORY_KEYWORDS: Record<string, string[]> = {
  "mens-shirts": ["shirt", "shirts", "oxford"],
  "mens-tshirts": ["t-shirt", "t-shirts", "tshirt", "tshirts", "tee", "tees", "polo"],
  "womens-dresses": ["dress", "dresses", "gown", "gowns"],
  "womens-kurtas": ["kurta", "kurtas", "kurti", "kurtis"],
  sarees: ["saree", "sarees", "sari", "saris"],
  jeans: ["jeans", "denim", "trouser", "trousers"],
};

/**
 * Colours commonly named by shoppers that are NOT in the demo catalogue.
 * When one of these appears, the service tells the customer honestly instead
 * of silently substituting a different colour.
 */
const UNSUPPORTED_COLOURS = [
  "orange", "maroon", "purple", "yellow", "gold", "silver", "grey", "gray",
  "olive", "emerald", "turquoise", "magenta", "violet", "indigo", "rust",
  "teal", "lavender", "multicolour", "multicolor", "mustard", "peach",
];

const SIZE_LABELS: SizeLabel[] = ["XS", "S", "M", "L", "XL", "XXL"];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "want", "like", "please",
  "need", "looking", "under", "below", "less", "than", "within", "budget",
  "around", "some", "any", "very", "really", "just", "get", "me", "my",
  "from", "of", "in", "on", "at", "to", "is", "are", "it", "that", "this",
  "what", "can", "you", "recommend", "suggest", "show", "find", "there",
  "here", "would", "could", "have", "has", "about", "for", "not",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Category keywords, incl. fallback from the real category name. */
export function categoryKeywords(category: {
  slug: string;
  name: string;
}): string[] {
  const defaults = DEFAULT_CATEGORY_KEYWORDS[category.slug];
  if (defaults) return defaults;
  return category.name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9-]/g, ""))
    .filter((w) => w.length > 2);
}

/**
 * Highest price cap implied by the text. Only amounts tied to a currency
 * marker (₹ / rs / inr) or a budget phrase ("under", "below", "less than",
 * "within ₹X", "budget of", "up to", "upto", "max") are considered, so a
 * request like "2 shirts" never becomes a ₹2 cap. Returns the smallest cap,
 * in whole rupees.
 */
export function extractPriceCap(text: string): number | null {
  const amounts: number[] = [];
  const currency = /(?:[₹\u20b9]\s*([0-9][0-9,]*(?:\.\d+)?)|(?:rs\.?|inr)\s*([0-9][0-9,]*(?:\.\d+)?))/gi;
  for (const match of text.matchAll(currency)) {
    const raw = match[1] ?? match[2];
    if (raw) amounts.push(Number(raw.replace(/,/g, "")));
  }
  const phrased = /(?:under|below|less than|within|budget[^\d]{0,14}|up to|upto|max(?:imum)?[^\d]{0,5})\s*([0-9][0-9,]*(?:\.\d+)?)/gi;
  for (const match of text.matchAll(phrased)) {
    const raw = match[1];
    if (raw) amounts.push(Number(raw.replace(/,/g, "")));
  }
  if (amounts.length === 0) return null;
  const cap = Math.min(...amounts);
  return Number.isFinite(cap) ? Math.round(cap) : null;
}

/** "in size M", "size xl or xxl", "sizes s, m" → the labels the customer named. */
export function extractSizeLabels(text: string): SizeLabel[] {
  const labels = new Set<SizeLabel>();
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const isLabel = (t: string) => SIZE_LABELS.some((s) => s.toLowerCase() === t);
  const connectors = new Set(["in", "of", "and", "or", "to", "a"]);
  let sparked = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "size" || token === "sizes") {
      sparked = true;
      continue;
    }
    if (sparked) {
      if (isLabel(token)) {
        labels.add(token.toUpperCase() as SizeLabel);
        sparked = false;
      } else if (connectors.has(token)) {
        continue;
      } else {
        sparked = false;
      }
      continue;
    }
    if (isLabel(token)) {
      const prev = tokens[i - 1];
      if (prev && (connectors.has(prev) || isLabel(prev))) {
        labels.add(token.toUpperCase() as SizeLabel);
      }
    }
  }
  return [...labels];
}

function availabilityFacet(text: string): Availability | null {
  if (/\bin stock\b|available now|available today|currently available|ready to pick/i.test(text)) {
    return "in-stock";
  }
  return null;
}

function wordBoundary(name: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
}

function detectUnsupportedColour(text: string, known: string[]): string | null {
  const knownLower = new Set(known.map((c) => c.toLowerCase()));
  for (const colour of UNSUPPORTED_COLOURS) {
    if (knownLower.has(colour)) continue;
    if (wordBoundary(colour).test(text)) return colour[0].toUpperCase() + colour.slice(1);
  }
  return null;
}

/**
 * Build structural facets from the latest user message plus prior user turns
 * (so refinements like "actually under 1000 please" keep the earlier
 * category/brand/colour context). Returns a brand-new object every call.
 */
export function buildFacets(
  message: string,
  conversation: readonly { role: string; content: string }[],
  dictionary: StylistCatalogueDictionary
): StylistFacets {
  const userTurns = [
    message,
    ...(conversation ?? [])
      .filter((t) => t.role === "user")
      .map((t) => t.content),
  ];
  const combined = userTurns.join(" \n ");
  const lower = combined.toLowerCase();

  const categorySlugs: string[] = [];
  for (const category of dictionary.categories) {
    if (category.keywords.some((k) => wordBoundary(k).test(lower))) {
      categorySlugs.push(category.slug);
    }
  }

  const brandNames =
    dictionary.brands.filter((b) => brandMentioned(combined, b)) ?? [];

  const colourNames =
    dictionary.colours.filter((c) => wordBoundary(c).test(lower)) ?? [];

  const priceCap = extractPriceCap(lower);
  const sizeLabels = extractSizeLabels(lower);
  const availability = availabilityFacet(lower);
  const unsupportedColour = detectUnsupportedColour(lower, dictionary.colours);

  const query = buildQuery(message, {
    categoryKeywords: dictionary.categories.flatMap((c) => c.keywords),
    brands: dictionary.brands,
    colours: dictionary.colours,
  });

  return {
    query,
    categorySlugs,
    brandNames,
    colourNames,
    priceCap,
    sizeLabels,
    availability,
    unsupportedColour,
  };
}

/** Search terms for the free-text catalogue query — noisy words removed. */
function buildQuery(
  message: string,
  boundary: { categoryKeywords: string[]; brands: string[]; colours: string[] }
): string {
  const banned = new Set<string>(STOP_WORDS);
  for (const k of boundary.categoryKeywords) banned.add(k.toLowerCase());
  for (const b of boundary.brands) banned.add(b.toLowerCase());
  for (const c of boundary.colours) banned.add(c.toLowerCase());

  const tokens =
    message.toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? [];
  const kept = [
    ...new Set(
      tokens.filter(
        (t) => t.length >= 3 && !banned.has(t) && !/^[0-9]/.test(t)
      )
    ),
  ];
  return kept.join(" ").slice(0, 80);
}