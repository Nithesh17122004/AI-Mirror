// Pure token-bucket math (Phase 9).
//
// Framework-free and deterministic so the limiting guarantees are
// unit-testable without timers or a database. All functions take `now`
// explicitly; the caller supplies the clock.

import type { RateLimitResult, TokenBucketState } from "./types";

/**
 * Compute the bucket state as of `now`, refilling tokens it earned while
 * idle. Tokens are capped at `capacity` — idle buckets never grow.
 */
export function refillBucket(
  state: TokenBucketState,
  now: number
): TokenBucketState {
  const elapsedSec = Math.max(0, (now - state.lastRefillMs) / 1000);
  if (elapsedSec <= 0) return state;
  const gained = Math.floor(elapsedSec * state.refillPerSecond);
  if (gained <= 0) return state;
  return {
    ...state,
    tokens: Math.min(state.capacity, state.tokens + gained),
    lastRefillMs: now,
  };
}

/** Seconds until the bucket holds at least 1 token again. */
function secondsUntilAvailable(state: TokenBucketState): number {
  if (state.tokens >= 1) return 0;
  if (state.refillPerSecond <= 0) return Number.POSITIVE_INFINITY;
  const needed = 1 - state.tokens;
  // How long to earn `needed` tokens at the refill rate, rounded up.
  return Math.max(1, Math.ceil(needed / state.refillPerSecond));
}

/**
 * Attempt to consume `tokens` from the bucket at time `now`.
 * Returns whether it was allowed, how many tokens remain, and how long the
 * caller must wait before retrying when it was not.
 */
export function consumeToken(
  state: TokenBucketState,
  tokens: number,
  now: number
): { state: TokenBucketState; result: RateLimitResult } {
  const current = refillBucket(state, now);
  if (current.tokens >= tokens) {
    const next: TokenBucketState = {
      ...current,
      tokens: current.tokens - tokens,
    };
    return {
      state: next,
      result: {
        allowed: true,
        remaining: Math.max(0, next.tokens),
        retryAfterSeconds: 0,
      },
    };
  }

  return {
    state: current,
    result: {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: secondsUntilAvailable(current),
    },
  };
}

/** Create a fresh, full bucket. */
export function createBucket(
  capacity: number,
  refillPerSecond: number,
  now: number
): TokenBucketState {
  return {
    capacity,
    tokens: capacity,
    refillPerSecond,
    lastRefillMs: now,
  };
}

/** True when the bucket is idle (full) — safe to remove from a store. */
export function isBucketIdle(state: TokenBucketState): boolean {
  return state.tokens >= state.capacity;
}