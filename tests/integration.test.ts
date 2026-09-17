// DB-free, account-free guest journey integrated across real modules (Phase 9).
// Every database or network touch is injected so this suite runs with no
// PostgreSQL, no GPU and no AI. The REAL code paths (service orchestration,
// validation, determinism, verification, grounding) are exercised end-to-end.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  addId,
  parseStoredIds,
  splitResolved,
  WISHLIST_MAX_IDS,
} from "../lib/wishlist/storage";
import { recommendFromSignals } from "../lib/personalization/engine";
import { availabilityFromInventory, isSellableAvailability } from "../lib/products/format";

import { sizeRequestSchema, normaliseMeasurements } from "../lib/size-engine/validate";
import {
  sizeChartUsableCodes,
  recommendSize,
} from "../lib/size-engine/calculate";
import { explanationForOutcome } from "../lib/size-engine/explain";
import type { SizeChartInput } from "../lib/size-engine/types";

import { TryOnService } from "../lib/try-on/service";
import { noopTryOnSessionStore } from "../lib/try-on/session-store";
import { MockVirtualTryOnProvider } from "../lib/try-on/providers/mock";
import type { TryOnImageInput, TryOnProductInfo } from "../lib/try-on/types";

import { StylistService } from "../lib/stylist/service";
import { MockStylistProvider } from "../lib/stylist/providers/mock";
import { buildFacets, type StylistCatalogueDictionary } from "../lib/stylist/intent";
import type { StylistCandidateProduct } from "../lib/stylist/types";

// ---------------------------------------------------------------------------
// Fixtures (the "real" catalogue for this journey)
// ---------------------------------------------------------------------------

const CHART: SizeChartInput = {
  source: "demo" as const,
  sourceLabel: "Demo size guide",
  rows: [
    { sizeLabel: "S", waistCm: 60, chestCm: 80 },
    { sizeLabel: "M", waistCm: 70, chestCm: 90 },
    { sizeLabel: "L", waistCm: 80, chestCm: 100 },
    { sizeLabel: "XL", waistCm: 90, chestCm: 110 },
  ],
};

function product(
  id: string,
  name: string,
  brandName: string,
  categorySlug: string,
  colourNames: string[],
  priceInr: number,
  totalStock: number,
  hasInventoryRows: boolean
): StylistCandidateProduct {
  return {
    id,
    slug: id.replace(/_/g, "-"),
    name,
    brandName,
    categorySlug,
    categoryName: categorySlug,
    priceInr,
    salePriceInr: null,
    imageUrl: `/products/${id}.jpg`,
    colours: colourNames.map((name) => ({ name })),
    availableSizes: ["S", "M", "L"],
    availability: availabilityFromInventory(totalStock, hasInventoryRows),
    gender: "MEN",
  };
}

const CATALOGUE: StylistCandidateProduct[] = [
  product("prod-shirt", "Pearl Oxford Shirt", "Iris Essentials", "mens-shirts", ["White", "Blue"], 1299, 8, true),
  product("prod-chinos", "Slate Chinos", "Iris Essentials", "mens-pants", ["Grey"], 1799, 2, true),
  product("prod-dress", "Ruby Wrap Dress", "Texvalley Studio", "womens-dresses", ["Red"], 2499, 0, true),
];

const DICTIONARY: StylistCatalogueDictionary = {
  categories: [
    { slug: "mens-shirts", name: "Men's Shirts", keywords: ["shirt", "shirts"] },
    { slug: "mens-pants", name: "Men's Pants", keywords: ["chinos", "pants", "trousers"] },
    { slug: "womens-dresses", name: "Women's Dresses", keywords: ["dress", "dresses"] },
  ],
  brands: ["Iris Essentials", "Texvalley Studio"],
  colours: ["White", "Blue", "Grey", "Red"],
};

function tryOnProduct(id: string): TryOnProductInfo {
  const c = CATALOGUE.find((p) => p.id === id)!;
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    tryOnAssetUrl: `/products/try-on/${c.id}.svg`,
  };
}

const validImage: TryOnImageInput = {
  name: "me.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  source: "upload",
  access: { kind: "embedded", dataUrl: "data:image/jpeg;base64,QUJDRA==" },
};

const stylistService = () =>
  new StylistService({
    provider: new MockStylistProvider(),
    loadDictionary: async () => DICTIONARY,
    queryMatches: async (facets) =>
      CATALOGUE.filter((p) => !facets.categorySlugs.length || facets.categorySlugs.includes(p.categorySlug)),
  });

const tryOnService = () =>
  new TryOnService({
    provider: new MockVirtualTryOnProvider({ prepareDelayMs: 0, generateDelayMs: 0 }),
    sessionStore: noopTryOnSessionStore,
    loadProduct: async (id) => (CATALOGUE.some((p) => p.id === id) ? tryOnProduct(id) : null),
  });

// ---------------------------------------------------------------------------
describe("guest journey: browse -> wishlist -> size -> try-on -> stylist", () => {
  test("wishlist additions are bounded and id-only", () => {
    const storage = parseStoredIds("", WISHLIST_MAX_IDS);
    let ids = storage;
    for (let i = 0; i < WISHLIST_MAX_IDS + 5; i++) {
      ids = addId(ids, `prod-synthetic-${i}`, WISHLIST_MAX_IDS);
    }
    assert.ok(ids.length <= WISHLIST_MAX_IDS);
    assert.ok(ids.every((id) => /^[a-zA-Z0-9_-]{1,100}$/.test(id)));
  });

test("resolve keeps only real products and reports missing", () => {
    const stored = ["prod-shirt", "prod-removed", "prod-chinos"];
    const existing = new Set(CATALOGUE.map((p) => p.id));
    const resolved = splitResolved(stored, existing);
    assert.deepEqual(resolved.found, ["prod-shirt", "prod-chinos"]);
    assert.deepEqual(resolved.missing, ["prod-removed"]);
  });

  test("wishlist recommendations skip unavailable products", () => {
    const toPersonalisable = (p: StylistCandidateProduct) => ({
      id: p.id,
      name: p.name,
      categorySlug: p.categorySlug,
      brandSlug: p.brandName,
      colourNames: p.colours.map((c) => c.name),
    });
    const signals = CATALOGUE.filter((p) => p.id === "prod-shirt").map(toPersonalisable);
    const candidates = CATALOGUE.filter(
      (p) => p.id !== "prod-shirt" && isSellableAvailability(p.availability)
    ).map(toPersonalisable);
    const ranked = recommendFromSignals(candidates, signals, { limit: 2 });
    for (const r of ranked) {
      assert.ok(r.product.id !== "prod-dress", "unavailable must never be recommended");
      assert.equal(r.product.id, "prod-chinos");
    }
  });

test("size check: computes, validates bounds and explains outcome", () => {
    const parsed = sizeRequestSchema.safeParse({
      productId: "prod-shirt",
      fit: "regular",
      measurements: { waist: 72, chest: 94 },
    });
    assert.equal(parsed.success, true);
    const cm = normaliseMeasurements(parsed.data.measurements, parsed.data.unit);
    const usable = sizeChartUsableCodes(CHART);
    assert.ok(usable.includes("waist"));
    const outcome = recommendSize(CHART, cm, parsed.data.fit);
    assert.equal(outcome.status, "recommended");
    assert.equal(outcome.recommendedSize, "M");
    assert.ok(explanationForOutcome(outcome, CHART, "Pearl Oxford Shirt").length > 20);
  });

  test("size check: missing measurements never fabricate a size", () => {
    const parsed = sizeRequestSchema.safeParse({
      productId: "prod-shirt",
      measurements: { waist: 72 },
    });
    assert.equal(parsed.success, true);
    const cm = normaliseMeasurements(parsed.data.measurements, "cm");
    const outcome = recommendSize(CHART, cm, "regular");
    assert.equal(outcome.status, "insufficient-measurements");
  });

  test("size request: impossible measurements are rejected", () => {
    assert.equal(sizeRequestSchema.safeParse({ productId: "p", measurements: { waist: -5 } }).success, false);
    assert.equal(sizeRequestSchema.safeParse({ productId: "p", measurements: {} }).success, false);
  });

  test("try-on: mock provider completes with a labelled demo preview (no AI)", async () => {
    const result = await tryOnService().generate({ productId: "prod-shirt", image: validImage });
    assert.equal(result.status, "completed");
    assert.equal(result.providerName, "mock");
    assert.equal(result.providerMode, "demo");
    assert.equal(result.resultImageUrl, tryOnProduct("prod-shirt").tryOnAssetUrl);
  });

  test("try-on: unknown product is an invalid-product error", async () => {
    await assert.rejects(tryOnService().generate({ productId: "prod-nope", image: validImage }), (e: unknown) => {
      assert.equal((e as { code?: string }).code, "invalid-product");
      return true;
    });
  });

  test("try-on: provider failure surfaces a retryable provider-failed error", async () => {
    const svc = new TryOnService({
      provider: new MockVirtualTryOnProvider({ fail: true, prepareDelayMs: 0, generateDelayMs: 0 }),
      sessionStore: noopTryOnSessionStore,
      loadProduct: async (id) => tryOnProduct(id),
    });
    await assert.rejects(svc.generate({ productId: "prod-shirt", image: validImage }), (e: unknown) => {
      assert.equal((e as { code?: string }).code, "provider-failed");
      assert.equal((e as { retryable?: boolean }).retryable, true);
      return true;
    });
  });

  test("stylist: grounded suggestions only, verified against real catalogue", async () => {
    const result = await stylistService().recommend({
      message: "A formal shirt from Iris Essentials under 1500",
      conversation: [],
    });
    assert.equal(result.provider.mode, "demo");
    assert.ok(result.recommendations.length >= 1);
    for (const r of result.recommendations) {
      const real = CATALOGUE.find((p) => p.id === r.product.id);
      assert.ok(real, "provider must never invent a product id");
      assert.ok(real.priceInr < 1500);
      assert.ok(isSellableAvailability(real.availability));
    }
  });

  test("stylist: a provider that invents ids yields zero recommendations", async () => {
    const evasive = {
      name: "evasive",
      mode: "demo" as const,
      async generate() {
        return {
          message: "Here is what I found.",
          suggestions: [{ productId: "prod-not-real", reason: "trust me" }],
        };
      },
    };
    const svc = new StylistService({
      provider: evasive,
      loadDictionary: async () => DICTIONARY,
      queryMatches: async () => CATALOGUE,
    });
    const result = await svc.recommend({ message: "shirts please", conversation: [] });
    assert.equal(result.recommendations.length, 0);
    assert.match(result.message, /held them back/i);
  });

  test("stylist: database down becomes a catalogue-unavailable error", async () => {
    const down = new StylistService({
      provider: new MockStylistProvider(),
      loadDictionary: async () => DICTIONARY,
      queryMatches: async () => {
        throw new Error("connection refused");
      },
    });
    await assert.rejects(down.recommend({ message: "shirts", conversation: [] }), (e: unknown) => {
      assert.equal((e as { code?: string }).code, "catalogue-unavailable");
      return true;
    });
  });

  test("stylist: unsupported colour answers honestly, never substitutes", async () => {
    const result = await stylistService().recommend({
      message: "I want a purple shirt",
      conversation: [],
    });
    assert.equal(result.recommendations.length, 0);
    assert.match(result.message, /don't currently carry anything in purple/i);
  });

test("stylist: facets build from a natural-language message", () => {
    const facets = buildFacets("formal shirt under 1500 in blue", [], DICTIONARY);
    assert.deepEqual(facets.categorySlugs, ["mens-shirts"]);
    assert.deepEqual(facets.colourNames, ["Blue"]);
    assert.ok(facets.priceCap !== null && facets.priceCap <= 1500);
  });
});
