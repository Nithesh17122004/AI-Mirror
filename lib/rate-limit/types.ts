// Rate limiting (Phase 9) — provider abstraction.
//
// The goal is cheap abuse protection + AI cost control for expensive
// endpoints, WITHOUT accounts and WITHOUT storing personal information.
// Keys are derived from request headers (X-Forwarded-For / X-Real-IP) and
// held only in memory, then pruned — never written to a database.
//
// PRODUCTION NOTE: this repository ships an in-memory store which is correct
// for a single-instance deployment. In a multi-instance/serverless deployment
// each instance would hold its own counters, so a shared backend (Redis, or
// an Upstash/Cloudflare KV token-bucket) MUST be plugged in at the
// `RateLimitStore` boundary. Nothing else in the app knows how the store is
// implemented.

export type RateLimitResult = {
  allowed: boolean;
  /** Tokens left in the bucket after the check (clamped to >= 0). */
  remaining: number;
  /** Seconds the caller must wait before retrying (0 when allowed). */
  retryAfterSeconds: number;
};

/** The store contract a limiter talks to. Swap for a Redis-backed impl. */
export interface RateLimitStore {
  get(key: string): TokenBucketState | undefined;
  set(key: string, bucket: TokenBucketState): void;
  delete(key: string): void;
}

/** Serialisable token-bucket state persisted by a store. */
export type TokenBucketState = {
  capacity: number;
  tokens: number;
  refillPerSecond: number;
  lastRefillMs: number;
};