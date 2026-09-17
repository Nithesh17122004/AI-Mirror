// Rate limiting (Phase 9): pure token-bucket math, limiter behaviour against
// an in-memory store, and key derivation. No network, no timers, no accounts.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  refillBucket,
  consumeToken,
  createBucket,
  isBucketIdle,
} from "../lib/rate-limit/token-bucket";
import {
  makeRateLimiter,
  InMemoryRateLimitStore,
  RateLimiter,
  perMinute,
} from "../lib/rate-limit/store";

const NOW = 1_700_000_000_000;

describe("token-bucket math", () => {
  test("a fresh bucket starts full", () => {
    const bucket = createBucket(3, perMinute(2), NOW);
    assert.equal(bucket.tokens, 3);
    assert.equal(bucket.capacity, 3);
  });

  test("consuming takes tokens and reports remaining", () => {
    const bucket = createBucket(3, perMinute(60), NOW); // 1 token / s
    const a = consumeToken(bucket, 1, NOW);
    assert.equal(a.result.allowed, true);
    assert.equal(a.result.remaining, 2);
    const b = consumeToken(a.state, 1, NOW + 1000); // refilled 1
    assert.equal(b.result.remaining, 2);
  });

  test("an exhausted bucket denies and reports retry-after", () => {
    const bucket = createBucket(1, perMinute(60), NOW);
    const a = consumeToken(bucket, 1, NOW);
    assert.equal(a.result.allowed, true);
    const b = consumeToken(a.state, 1, NOW + 100);
    assert.equal(b.result.allowed, false);
    assert.equal(b.result.retryAfterSeconds, 1); // needs >=1s to earn 1 token
  });

  test("refill caps at capacity (idle buckets never grow)", () => {
    const bucket = createBucket(2, perMinute(60), NOW);
    const refilled = refillBucket({ ...bucket, tokens: 1 }, NOW + 10_000);
    assert.equal(refilled.tokens, 2);
    assert.ok(isBucketIdle(refilled));
  });

  test("no refill when elapsed time is zero", () => {
    const bucket = createBucket(2, perMinute(60), NOW);
    const refilled = refillBucket({ ...bucket, tokens: 0 }, NOW);
    assert.equal(refilled.tokens, 0);
  });
});

describe("rate limiter (in-memory store)", () => {
  test("allows up to capacity then blocks", () => {
    const limiter = makeRateLimiter({ scope: "x", capacity: 2, refillPerSecond: 0 });
    assert.equal(limiter.check("k", NOW).allowed, true);
    assert.equal(limiter.check("k", NOW).allowed, true);
    const third = limiter.check("k", NOW);
    assert.equal(third.allowed, false);
    assert.ok(third.retryAfterSeconds > 0);
  });

  test("keys are scoped independently", () => {
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(
      { scope: "s", capacity: 1, refillPerSecond: 0 },
      store
    );
    limiter.check("a", NOW);
    assert.equal(limiter.check("b", NOW).allowed, true);
  });

  test("buckets refill over time and allow again", () => {
    const limiter = makeRateLimiter({ scope: "r", capacity: 1, refillPerSecond: perMinute(60) });
    assert.equal(limiter.check("k", NOW).allowed, true);
    assert.equal(limiter.check("k", NOW).allowed, false);
    assert.equal(limiter.check("k", NOW + 1100).allowed, true);
  });

  test("prune removes idle (full) buckets, keeps busy ones", () => {
    const store = new InMemoryRateLimitStore();
    store.raw.set("a", createBucket(2, perMinute(60), NOW)); // full = idle
    store.raw.set("b", createBucket(2, perMinute(60), NOW)); // full = idle
    const busy = consumeToken(createBucket(2, perMinute(60), NOW), 1, NOW).state;
    store.raw.set("c", busy); // tokens 1 = not idle
    store.prune();
    assert.equal(store.size, 1);
    assert.ok(store.raw.has("c"));
  });

  test("exhausted bucket state is retained for refill timing", () => {
    const limiter = makeRateLimiter({ scope: "e", capacity: 1, refillPerSecond: perMinute(60) });
    limiter.check("k", NOW); // full -> empty
    assert.equal(limiter.check("k", NOW + 500).allowed, false);
    assert.equal(limiter.check("k", NOW + 2000).allowed, true);
  });
});