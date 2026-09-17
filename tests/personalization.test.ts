// Unit tests for deterministic guest personalisation. Pure: no database,
// no network, no LLM. Candidates are fixtures only — the engine can never
// invent a product it wasn't handed.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildPreferenceProfile,
  recommendFromSignals,
  scoreProduct,
  type PersonalisableProduct,
} from "../lib/personalization/engine";

function p(
  id: string,
  category: string,
  brand: string,
  colours: string[],
  name = id
): PersonalisableProduct {
  return { id, categorySlug: category, brandSlug: brand, colourNames: colours, name };
}

const CANDIDATES: PersonalisableProduct[] = [
  p("c1", "womens-dresses", "iris-essentials", ["Red"], "Crimson Dress"),
  p("c2", "womens-dresses", "iris-essentials", ["Red", "Black"], "Evening Dress"),
  p("c3", "womens-dresses", "texvalley", ["Cream"], "Day Dress"),
  p("c4", "sarees", "iris-essentials", ["Emerald"], "Festive Saree"),
  p("c5", "mens-shirts", "iris-studio", ["Blue"], "Blue Shirt"),
  p("c6", "womens-kurtas", "texvalley", ["Red"], "Cotton Kurta"),
];

describe("preference profile", () => {
  test("counts category, brand and colour frequencies", () => {
    const profile = buildPreferenceProfile([
      p("a", "womens-dresses", "iris-essentials", ["Red"]),
      p("b", "womens-dresses", "iris-essentials", ["Red", "Black"]),
    ]);
    assert.equal(profile.itemCount, 2);
    assert.equal(profile.categories["womens-dresses"], 2);
    assert.equal(profile.brands["iris-essentials"], 2);
    assert.equal(profile.colours["Red"], 2);
    assert.equal(profile.colours["Black"], 1);
  });

  test("empty signals → empty profile", () => {
    const profile = buildPreferenceProfile([]);
    assert.equal(profile.itemCount, 0);
    assert.deepEqual(profile.categories, {});
  });
});

describe("scoring", () => {
  test("score sums matched category/brand/colour frequencies", () => {
    const profile = buildPreferenceProfile([
      p("a", "womens-dresses", "iris-essentials", ["Red"]),
    ]);
    assert.equal(
      scoreProduct(profile, p("x", "womens-dresses", "iris-essentials", ["Red"])),
      3
    );
    assert.equal(scoreProduct(profile, p("y", "sarees", "texvalley", ["Blue"])), 0);
  });

  test("overlap weight grows with repeated signals", () => {
    const profile = buildPreferenceProfile([
      p("a", "womens-dresses", "iris-essentials", ["Red"]),
      p("b", "womens-dresses", "iris-essentials", ["Red"]),
    ]);
    assert.equal(
      scoreProduct(profile, p("x", "womens-dresses", "iris-essentials", ["Red"])),
      6
    );
  });
});

describe("recommendations are deterministic and catalogue-bound", () => {
  test("empty signals produce no recommendations", () => {
    assert.deepEqual(recommendFromSignals(CANDIDATES, []), []);
  });

  test("no overlap → honest empty list, never arbitrary picks", () => {
    const signals = [p("s1", "womens-tshirts", "unusual-brand", ["Magenta"])];
    assert.deepEqual(recommendFromSignals(CANDIDATES, signals), []);
  });

  test("recommends only candidates (never invents products)", () => {
    const signals = [p("s1", "sarees", "iris-essentials", ["Red"])];
    const recs = recommendFromSignals(CANDIDATES, signals, { limit: 10 });
    for (const { product } of recs) {
      assert.ok(CANDIDATES.some((c) => c.id === product.id));
    }
  });

  test("excludes the signal products themselves", () => {
    const signals = [
      p("s1", "womens-dresses", "iris-essentials", ["Red"]),
    ];
    const ids = recommendFromSignals(CANDIDATES, signals).map((r) => r.product.id);
    assert.ok(!ids.includes("s1"));
  });

  test("ranks by overlap descending", () => {
    const signals = [
      p("a", "womens-dresses", "iris-essentials", ["Red"]),
      p("b", "womens-dresses", "iris-essentials", ["Red"]),
    ];
    const recs = recommendFromSignals(CANDIDATES, signals);
    // c2 matches dresses + brand + Red/Black (Black unmatched), c1 matches all three.
    assert.equal(recs[0].product.id, "c1");
    assert.ok(recs[0].score >= recs[1].score);
  });

  test("deterministic tie-break by name (no randomness)", () => {
    const signals = [p("a", "womens-dresses", "iris-essentials", ["Red"])];
    const first = recommendFromSignals(CANDIDATES, signals).map((r) => r.product.id);
    const second = recommendFromSignals(CANDIDATES, signals).map(
      (r) => r.product.id
    );
    assert.deepEqual(first, second);
  });

  test("honours the limit", () => {
    const signals = [p("a", "womens-dresses", "iris-essentials", ["Red"])];
    const recs = recommendFromSignals(CANDIDATES, signals, { limit: 2 });
    assert.equal(recs.length, 2);
    assert.equal(recs.length, 2);
  });

  test("custom excludes keep wishlist items out of the rail", () => {
    const signals = [p("a", "womens-dresses", "iris-essentials", ["Red"])];
    const recs = recommendFromSignals(CANDIDATES, signals, {
      excludeIds: new Set(["c1"]),
    });
    assert.ok(!recs.some((r) => r.product.id === "c1"));
  });

  test("colour-only overlap still surfaces items sharing the saved colour", () => {
    const signals = [p("a", "womens-tshirts", "unusual-brand", ["Emerald"])];
    const recs = recommendFromSignals(CANDIDATES, signals);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].product.id, "c4"); // shares only Emerald
  });
});