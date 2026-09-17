// Production readiness classification (Phase 9): pure asset triage.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyAssetUrl,
  classifyProducts,
  formatReadinessReport,
} from "../lib/production/readiness";

describe("asset URL classification", () => {
  test("classifies demo SVG artwork", () => {
    assert.equal(classifyAssetUrl("/products/blue-linen-formal-shirt.svg"), "demo-artwork");
    assert.equal(classifyAssetUrl("/products/try-on/blue-linen-formal-shirt.svg"), "demo-artwork");
    assert.equal(classifyAssetUrl("data:image/svg+xml;base64,PD94"), "demo-artwork");
  });

  test("classifies real photo extensions", () => {
    assert.equal(classifyAssetUrl("/products/blue-linen-formal-shirt.jpg"), "photo");
    assert.equal(classifyAssetUrl("https://cdn.example/garment.png?size=800"), "photo");
    assert.equal(classifyAssetUrl("https://cdn.example/garment.webp"), "photo");
    assert.equal(classifyAssetUrl("data:image/jpeg;base64,AAAA"), "photo");
  });

  test("classifies missing and external", () => {
    assert.equal(classifyAssetUrl(null), "missing");
    assert.equal(classifyAssetUrl(""), "missing");
    assert.equal(classifyAssetUrl(undefined), "missing");
    assert.equal(classifyAssetUrl("https://cdn.example/garment"), "external");
  });
});

describe("readiness report", () => {
  const demoOnly = [
    {
      id: "a",
      name: "Blue linen shirt",
      imageUrl: "/products/blue-linen-formal-shirt.svg",
      tryOnAssetUrl: "/products/try-on/blue-linen-formal-shirt.svg",
    },
  ];

  const mixed = [
    ...demoOnly,
    {
      id: "b",
      name: "Red midi dress (real)",
      imageUrl: "https://cdn.example/red-midi-dress.jpg",
      tryOnAssetUrl: "https://cdn.example/try-on/red-midi-dress.png",
    },
    {
      id: "c",
      name: "No asset dress",
      imageUrl: null,
      tryOnAssetUrl: null,
    },
  ];

  test("aggregates demo vs real counts", () => {
    const { report } = classifyProducts(mixed);
    assert.equal(report.total, 3);
    assert.equal(report.demoArtworkCount, 1);
    assert.equal(report.garmentphotoCount, 1);
    assert.equal(report.garmentMissingCount, 1);
    assert.equal(report.vtonReady, 1);
    assert.deepEqual(report.vtonNotReady, ["Blue linen shirt", "No asset dress"]);
  });

  test("flags catalogue with no real photography", () => {
    const { report } = classifyProducts(demoOnly);
    assert.equal(report.catalogueReady, 0);
    assert.equal(report.vtonReady, 0);
    assert.equal(report.catalogueNotReady[0], "Blue linen shirt");
    assert.match(formatReadinessReport(report), /NOT READY FOR PRODUCTION VTON/);
  });

  test("report is one line per product-level set", () => {
    const { report } = classifyProducts([]);
    assert.equal(report.total, 0);
    assert.match(formatReadinessReport(report), /Active products\s+0/);
  });
});