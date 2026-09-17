// Rate limiter + in-memory store (Phase 9).
//
// Lightweight, dependency-free protection for expensive endpoints. Keys are
// short-lived and pruned when idle, so memory stays bounded and no personal
// information is retained. Replace `InMemoryRateLimitStore` with a shared
// (e.g. Redis) implementation for multi-instance deployments — the interface
// and the `RateLimiter.check` caller never change.

import {
  consumeToken,
  createBucket,
  isBucketIdle,
} from "./token-bucket";
import type {
  RateLimitResult,
  RateLimitStore,
  TokenBucketState,
} from "./types";

export const PER_MINUTE_REFILL = 60;

/** Convert a per-minute refill rate to per-second (used by config). */
export function perMinute(ratePerMinute: number): number {
  return ratePerMinute / 60;
}

export type RateLimiterConfig = {
  /** Name of the bucket namespace (e.g. "try-on"). */
  scope: string;
  /** Max tokens a key can hold (burst allowed). */
  capacity: number;
  /** Tokens refilled per second. */
  refillPerSecond: number;
};

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, TokenBucketState>();

  get(key: string): TokenBucketState | undefined {
    return this.buckets.get(key);
  }

  set(key: string, bucket: TokenBucketState): void {
    if (this.buckets.size > MAX_KEYS) this.prune();
    this.buckets.set(key, bucket);
  }

  delete(key: string): void {
    this.buckets.delete(key);
  }

  /** Drop idle (full) buckets so memory stays bounded. */
  prune(): void {
    for (const [key, bucket] of this.buckets) {
      if (isBucketIdle(bucket)) this.buckets.delete(key);
    }
  }

  get size(): number {
    return this.buckets.size;
  }

  get raw(): Map<string, TokenBucketState> {
    return this.buckets;
  }
}

/** Safety cap on distinct keys held in memory at once. */
const MAX_KEYS = 10_000;

export class RateLimiter {
  readonly scope: string;
  readonly capacity: number;
  readonly refillPerSecond: number;
  private readonly store: RateLimitStore;

  constructor(config: RateLimiterConfig, store: RateLimitStore) {
    this.scope = config.scope;
    this.capacity = config.capacity;
    this.refillPerSecond = config.refillPerSecond;
    this.store = store;
  }

  /**
   * Check whether `key` may proceed. Consumes 1 token when allowed.
   * Never throws — limits must never break the customer flow.
   */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const fullKey = `${this.scope}:${key}`;
    const existing = this.store.get(fullKey);
    const current = existing ?? createBucket(this.capacity, this.refillPerSecond, now);
    const { state, result } = consumeToken(current, 1, now);

    if (result.allowed) {
      this.store.set(fullKey, state);
    } else {
      // Remember the exhausted bucket so the refill clock keeps ticking.
      this.store.set(fullKey, current);
    }
    return result;
  }
}

/**
 * Construct a limiter for a config using the in-memory store.
 * A single store instance is shared so identical scopes across routes agree.
 */
export function makeRateLimiter(
  config: RateLimiterConfig
): RateLimiter {
  return new RateLimiter(config, sharedStore);
}

const sharedStore = new InMemoryRateLimitStore();

/** Sentry limit: when the store is unavailable we fail OPEN (never block). */
export const FALLBACK_ALLOWED: RateLimitResult = {
  allowed: true,
  remaining: Number.POSITIVE_INFINITY,
  retryAfterSeconds: 0,
};