// Tests for the virtual try-on provider layer (mock provider).
// Run with: npm test

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MockVirtualTryOnProvider } from "../lib/try-on/providers/mock";
import type { VirtualTryOnInput } from "../lib/try-on/providers/types";

const minimalInput: VirtualTryOnInput = {
  customerImage: {
    name: "me.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    source: "upload",
    access: { kind: "embedded", dataUrl: "data:image/jpeg;base64,AAAA" },
  },
  product: {
    id: "prd_1",
    name: "Blue Linen Shirt",
    imageUrl: "/products/blue-linen-formal-shirt.svg",
    tryOnAssetUrl: "/products/try-on/blue-linen-formal-shirt.svg",
  },
  requestId: "req_1",
};

describe("MockVirtualTryOnProvider", () => {
  test("reports name, mode=demo, and returns the product's try-on asset", async () => {
    const provider = new MockVirtualTryOnProvider({
      prepareDelayMs: 1,
      generateDelayMs: 1,
    });

    assert.equal(provider.name, "mock");
    assert.equal(provider.mode, "demo");

    const result = await provider.generateTryOn(minimalInput);
    assert.equal(result.status, "success");
    if (result.status === "success") {
      assert.equal(result.resultImageUrl, minimalInput.product.tryOnAssetUrl);
      assert.ok(result.providerRequestId.length > 0);
      assert.equal(result.processingMs, 2); // both delays applied
    }
  });

  test("falls back to the product image when no tryOn asset exists", async () => {
    const provider = new MockVirtualTryOnProvider({
      prepareDelayMs: 0,
      generateDelayMs: 0,
    });
    const input: VirtualTryOnInput = {
      ...minimalInput,
      product: {
        id: "p2",
        name: "Tee",
        imageUrl: "/products/tee.svg",
        tryOnAssetUrl: null,
      },
    };
    const result = await provider.generateTryOn(input);
    assert.equal(result.status, "success");
    if (result.status === "success") {
      assert.equal(result.resultImageUrl, input.product.imageUrl);
    }
  });

  test("honours the fail flag for simulating provider failure", async () => {
    const provider = new MockVirtualTryOnProvider({
      prepareDelayMs: 0,
      generateDelayMs: 0,
      fail: true,
    });
    const result = await provider.generateTryOn(minimalInput);
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.retryable, true);
      assert.ok(result.message.length > 0);
    }
  });

  test("throws when there is no image to show", async () => {
    const provider = new MockVirtualTryOnProvider({
      prepareDelayMs: 0,
      generateDelayMs: 0,
    });
    const input: VirtualTryOnInput = {
      ...minimalInput,
      product: { id: "p3", name: "X", imageUrl: null, tryOnAssetUrl: null },
    };
    await assert.rejects(
      () => provider.generateTryOn(input),
      (error: unknown) =>
        error instanceof Error && error.message.includes("no image")
    );
  });
});