// Analytics (Phase 9): allowlist validation, safe payload building, and the
// best-effort recorder that can never throw or break the customer flow.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_EVENT_NAMES,
  analyticsEventSchema,
  buildSafePayload,
  eventTakesProduct,
  isSafeSessionId,
} from "../lib/analytics/events";
import { recordAnalyticsEvent } from "../lib/analytics/record";

describe("analytics event allowlist", () => {
  test("accepts every documented non-sensitive event", () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      assert.equal(analyticsEventSchema.safeParse({ name }).success, true, name);
    }
  });

  test("rejects unknown event names", () => {
    assert.equal(analyticsEventSchema.safeParse({ name: "screen_recording" }).success, false);
    assert.equal(analyticsEventSchema.safeParse({ name: "" }).success, false);
  });

  test("strips PII-shaped extra keys so they are never persisted", () => {
    const parsed = analyticsEventSchema.safeParse({
      name: "product_view",
      payload: { email: "user@example.com" },
      imageData: "data:image/png;base64,AAAA",
      measurements: { waistCm: 76 },
    });
    assert.equal(parsed.success, true);
    // Only the allowlisted fields exist; hostile extras are impossible to
    // read back and can never reach storage.
    assert.deepEqual(parsed.data, { name: "product_view" });
  });

  test("session ids and product ids are validated", () => {
    assert.ok(isSafeSessionId("abc123"));
    assert.equal(isSafeSessionId("a b c"), false);
    assert.equal(
      analyticsEventSchema.safeParse({ name: "wishlist_add", productId: "p/1" }).success,
      false
    );
    assert.equal(
      analyticsEventSchema.safeParse({ name: "wishlist_add", productId: "prod_1" }).success,
      true
    );
  });
});

describe("safe payload building", () => {
  test("only events that take a product persist a product id", () => {
    assert.ok(eventTakesProduct("size_check"));
    assert.equal(eventTakesProduct("stylist_request"), false);
    assert.deepEqual(buildSafePayload("size_check", "p1"), { productId: "p1" });
    assert.equal(buildSafePayload("stylist_request", "p1"), undefined);
    assert.equal(buildSafePayload("size_check", undefined), undefined);
  });
});

describe("record analytics (best-effort)", () => {
  test("never throws when the insert fails", async () => {
    let called = 0;
    const insert = async () => {
      called += 1;
      throw new Error("db down");
    };
    await assert.doesNotReject(
      recordAnalyticsEvent("product_view", { productId: "p1", insert })
    );
    assert.equal(called, 1);
  });

  test("records only a bounded, safe payload", async () => {
    let captured: unknown = null;
    const insert = async (input: { name: string; payload: unknown; sessionId: unknown }) => {
      captured = input;
      return { id: "1" };
    };
    await recordAnalyticsEvent("wishlist_add", {
      productId: "p1",
      sessionId: "sessionAbC123",
      insert,
    });
    assert.deepEqual(captured, {
      name: "wishlist_add",
      sessionId: "sessionAbC123",
      payload: { productId: "p1" },
    });
  });

  test("drops proustian product ids before they reach storage", async () => {
    let captured: unknown = null;
    const insert = async (input: { payload: unknown }) => {
      captured = input.payload;
      return null;
    };
    await recordAnalyticsEvent("product_view", {
      productId: "https://evil.example/../../secret",
      insert,
    });
    assert.equal(captured, null);
  });
});