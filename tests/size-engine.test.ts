// Unit tests for the size engine. Pure: no database, no network, no browser.
// Every fixture is a plain SizeChartInput object, so these run anywhere
// (including CI with no Postgres).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  recommendSize,
  sizeChartUsableCodes,
  isUsableSizeChart,
} from "../lib/size-engine/calculate";
import {
  inToCm,
  cmToIn,
  normaliseMeasurements,
  sizeRequestSchema,
  MEASUREMENT_BOUNDS_CM,
} from "../lib/size-engine/validate";
import type { SizeChartInput, SizeChartRowInput } from "../lib/size-engine/types";

// ---------------------------------------------------------------------------
// Fixtures (DEMO provenance, clearly marked — never presented as brand data).
// ---------------------------------------------------------------------------

function demoChart(rows: SizeChartRowInput[]): SizeChartInput {
  return {
    source: "demo",
    sourceLabel: "Demo size guide (illustrative). Not official brand measurements.",
    rows,
  };
}

const topChart = demoChart([
  { sizeLabel: "S", chestCm: 96, heightCm: 165 },
  { sizeLabel: "M", chestCm: 102, heightCm: 172 },
  { sizeLabel: "L", chestCm: 108, heightCm: 179 },
  { sizeLabel: "XL", chestCm: 114, heightCm: 186 },
]);

// Chest-only chart makes exact-boundary / between-size logic easy to trace.
const teeChart = demoChart([
  { sizeLabel: "S", chestCm: 96 },
  { sizeLabel: "M", chestCm: 102 },
  { sizeLabel: "L", chestCm: 108 },
  { sizeLabel: "XL", chestCm: 114 },
]);

const dressChart = demoChart([
  { sizeLabel: "XS", chestCm: 80, waistCm: 62, hipCm: 88 },
  { sizeLabel: "S", chestCm: 86, waistCm: 66, hipCm: 93 },
  { sizeLabel: "M", chestCm: 92, waistCm: 70, hipCm: 98 },
  { sizeLabel: "L", chestCm: 98, waistCm: 74, hipCm: 103 },
]);

const jeansChart = demoChart([
  { sizeLabel: "S", waistCm: 71, hipCm: 86, inseamCm: 71 },
  { sizeLabel: "M", waistCm: 76, hipCm: 91, inseamCm: 74 },
  { sizeLabel: "L", waistCm: 81, hipCm: 96, inseamCm: 77 },
  { sizeLabel: "XL", waistCm: 86, hipCm: 101, inseamCm: 80 },
]);

const cm = (v: number) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("sizeRequestSchema", () => {
  test("accepts a valid request with cm", () => {
    const parsed = sizeRequestSchema.safeParse({
      productId: "prd_1",
      fit: "regular",
      unit: "cm",
      measurements: { chest: 100, height: 175 },
    });
    assert.equal(parsed.success, true);
  });

  test("accepts inches and defaults fit/unit", () => {
    const parsed = sizeRequestSchema.safeParse({
      productId: "prd_1",
      measurements: { chest: 40 },
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.fit, "regular");
      assert.equal(parsed.data.unit, "cm");
    }
  });

  test("rejects negative, zero, NaN, Infinity and non-finite values", () => {
    for (const value of [-1, 0, NaN, Infinity, -Infinity]) {
      const parsed = sizeRequestSchema.safeParse({
        productId: "prd_1",
        measurements: { chest: value },
      });
      assert.equal(parsed.success, false, `expected rejection for ${value}`);
    }
  });

  test("rejects non-number measurements", () => {
    for (const value of ["100", null, true, {}]) {
      const parsed = sizeRequestSchema.safeParse({
        productId: "prd_1",
        measurements: { chest: value },
      });
      assert.equal(parsed.success, false, `expected rejection for ${JSON.stringify(value)}`);
    }
  });

  test("rejects a request with no measurements at all", () => {
    const parsed = sizeRequestSchema.safeParse({
      productId: "prd_1",
      measurements: {},
    });
    assert.equal(parsed.success, false);
  });

  test("rejects missing or empty productId", () => {
    for (const productId of [undefined, "", "   "]) {
      const parsed = sizeRequestSchema.safeParse({
        productId,
        measurements: { chest: 100 },
      });
      assert.equal(parsed.success, false);
    }
  });

  test("rejects an invalid fit preference", () => {
    const parsed = sizeRequestSchema.safeParse({
      productId: "prd_1",
      fit: "baggy",
      measurements: { chest: 100 },
    });
    assert.equal(parsed.success, false);
  });

  test("physically impossible but finite values are outside sanity bounds", () => {
    assert.equal(MEASUREMENT_BOUNDS_CM.chest.min > 0, true);
    assert.equal(MEASUREMENT_BOUNDS_CM.height.max < 400, true);
  });
});

describe("unit conversion + normalisation", () => {
  test("toFu and froFu round-trips", () => {
    assert.equal(cm(inToCm(40)), 101.6);
    assert.equal(cm(cmToIn(101.6)), 40);
  });

  test("normaliseMeasurements converts inches to centimetres", () => {
    const out = normaliseMeasurements({ chest: 40, height: 68 }, "in");
    assert.equal(cm(out.chest!), 101.6);
    assert.equal(cm(out.height!), 172.7);
  });

  test("normaliseMeasurements keeps centimetres untouched", () => {
    const out = normaliseMeasurements({ chest: 100 }, "cm");
    assert.deepEqual(out, { chest: 100 });
  });

  test("normaliseMeasurements drops values outside sanity bounds (never fabricated)", () => {
    const out = normaliseMeasurements(
      { chest: 300, waist: 20, height: 175 },
      "cm"
    );
    assert.deepEqual(out, { height: 175 });
  });
});

// ---------------------------------------------------------------------------
// Engine basics: usable codes
// ---------------------------------------------------------------------------

describe("sizeChartUsableCodes / isUsableSizeChart", () => {
  test("returns every code present in all rows", () => {
    assert.deepEqual(sizeChartUsableCodes(teeChart), ["chest"]);
    assert.deepEqual(sizeChartUsableCodes(dressChart), ["chest", "waist", "hip"]);
    assert.deepEqual(sizeChartUsableCodes(jeansChart), ["waist", "hip", "inseam"]);
  });

  test("ignores charts with no rows (the no-chart case)", () => {
    assert.equal(isUsableSizeChart(demoChart([])), false);
    assert.deepEqual(sizeChartUsableCodes(demoChart([])), []);
  });

  test("ignores charts whose columns are not strictly increasing", () => {
    const bad = demoChart([
      { sizeLabel: "S", chestCm: 96 },
      { sizeLabel: "M", chestCm: 96 },
    ]);
    assert.equal(isUsableSizeChart(bad), false);
  });

  test("a chart with a missing measurement on one row excludes that code", () => {
    const partial = demoChart([
      { sizeLabel: "S", chestCm: 96, heightCm: 165 },
      { sizeLabel: "M", chestCm: 102, heightCm: null },
    ]);
    assert.deepEqual(sizeChartUsableCodes(partial), ["chest"]);
  });
});

// ---------------------------------------------------------------------------
// Engine: recommendations
// ---------------------------------------------------------------------------

describe("recommendSize — clean agreement", () => {
  test("returns HIGH when every measurement sits inside one size", () => {
    const out = recommendSize(teeChart, { chest: 103 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "M");
      assert.equal(out.confidence, "high");
      assert.equal(out.fitApplied, false);
      assert.equal(out.alternativeSize, null);
    }
  });

  test("rounds measurement match to the nearest size", () => {
    const out = recommendSize(teeChart, { chest: 99 }, "regular");
    // 99 is exactly the boundary between S (96) and M (102): |99-96| == |99-102|.
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "S"); // regular resolves ties to the smaller size
      assert.equal(out.fitApplied, true);
    }
  });
});

describe("recommendSize — exact boundary / between sizes", () => {
  test("fit=slim picks the smaller size at a boundary", () => {
    const out = recommendSize(teeChart, { chest: 99 }, "slim");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "S");
      assert.equal(out.alternativeSize, "M");
      assert.equal(out.fitApplied, true);
      assert.equal(out.confidence, "medium");
    }
  });

  test("fit=relaxed picks the larger size at a boundary", () => {
    const out = recommendSize(teeChart, { chest: 99 }, "relaxed");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "M");
      assert.equal(out.alternativeSize, "S");
      assert.equal(out.fitApplied, true);
    }
  });

  test("fit=regular prefers the numerically closer size", () => {
    const out = recommendSize(teeChart, { chest: 100 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "M"); // |100-102| < |100-96|
      assert.equal(out.fitApplied, false);
    }
  });

  test("a measurement near a boundary counts as MEDIUM with an alternative", () => {
    const out = recommendSize(teeChart, { chest: 99.5 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "M");
      assert.equal(out.confidence, "medium"); // 0.5 cm from the S/M edge (99)
      assert.equal(out.fitApplied, false);
      assert.equal(out.alternativeSize, "S");
    }
  });
});

describe("recommendSize — multi-measurement charts", () => {
  test("agreement across two codes picks the shared size", () => {
    const out = recommendSize(topChart, { chest: 95, height: 166 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "S");
      assert.equal(out.confidence, "high");
    }
  });

  test("one code at a boundary is narrowed by another code", () => {
    // chest 97 is the S/M boundary for the top chart; height 172 favours M.
    const out = recommendSize(topChart, { chest: 97, height: 172 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "M");
      assert.equal(out.fitApplied, false);
    }
  });

  test("measurements pointing at different sizes produce LOW confidence", () => {
    // chest 94 -> S exactly; height 179 -> L exactly. Genuine conflict.
    const out = recommendSize(topChart, { chest: 94, height: 179 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.confidence, "low");
      assert.equal(out.fitApplied, false);
      // S is the least-wrong size; L is the next-best after it.
      assert.equal(out.alternativeSize, "L");
    }
  });

  test("jeans-style chart recommends on waist/hip/inseam", () => {
    const out = recommendSize(jeansChart, { waist: 81, hip: 96, inseam: 77 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.recommendedSize, "L");
      assert.equal(out.confidence, "high");
    }
  });
});

describe("recommendSize — no suitable size", () => {
  test("all measurements below the chart return no-suitable-size", () => {
    const out = recommendSize(teeChart, { chest: 80 }, "regular");
    assert.equal(out.status, "no-suitable-size");
    if (out.status === "no-suitable-size") {
      assert.equal(out.closestSize, "S");
    }
  });

  test("all measurements above the chart return no-suitable-size", () => {
    const out = recommendSize(teeChart, { chest: 130 }, "regular");
    assert.equal(out.status, "no-suitable-size");
    if (out.status === "no-suitable-size") {
      assert.equal(out.closestSize, "XL");
    }
  });

  test("a single-size chart only matches its exact value", () => {
    const oneSize = demoChart([{ sizeLabel: "One Size", chestCm: 100 }]);
    const match = recommendSize(oneSize, { chest: 100 }, "regular");
    assert.equal(match.status, "recommended");
    const miss = recommendSize(oneSize, { chest: 101 }, "regular");
    assert.equal(miss.status, "no-suitable-size");
  });
});

describe("recommendSize — insufficient data", () => {
  test("missing a required measurement returns insufficient-measurements", () => {
    const out = recommendSize(topChart, { chest: 100 }, "regular");
    assert.equal(out.status, "insufficient-measurements");
    if (out.status === "insufficient-measurements") {
      assert.deepEqual(out.missing, ["height"]);
    }
  });

  test("an unusable chart reports every measurement as missing", () => {
    const out = recommendSize(demoChart([]), { chest: 100 }, "regular");
    assert.equal(out.status, "insufficient-measurements");
    if (out.status === "insufficient-measurements") {
      assert.equal(out.missing.includes("chest"), true);
    }
  });
});

describe("recommendSize — comparisons and explanations data", () => {
  test("comparisons are provided for every usable measurement", () => {
    const out = recommendSize(teeChart, { chest: 103 }, "regular");
    assert.equal(out.status, "recommended");
    if (out.status === "recommended") {
      assert.equal(out.comparisons.length, 1);
      const [c] = out.comparisons;
      assert.equal(c.measurement, "chest");
      assert.equal(c.customerCm, 103);
      assert.equal(c.chartCm, 102);
      assert.equal(c.boundary, "inside");
      assert.equal(typeof c.note, "string");
    }
  });

  test("comparisons classify out-of-range measurements honestly", () => {
    const out = recommendSize(teeChart, { chest: 130 }, "regular");
    assert.equal(out.status, "no-suitable-size");
    if (out.status === "no-suitable-size") {
      assert.equal(out.comparisons[0].boundary, "above-range");
    }
  });

  test("a valid input never produces a size when data is missing", () => {
    // Customer provides chest only for a chart that also needs height:
    // the engine must refuse to recommend, never guess.
    const out = recommendSize(topChart, { chest: 105 }, "regular");
    assert.equal(out.status, "insufficient-measurements");
  });
});

describe("recommendSize — determinism", () => {
  test("identical inputs produce identical outputs", () => {
    const a = recommendSize(dressChart, { chest: 92, waist: 70, hip: 98 }, "regular");
    const b = recommendSize(dressChart, { chest: 92, waist: 70, hip: 98 }, "regular");
    assert.deepEqual(a, b);
  });
});