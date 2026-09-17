// Rate-limit key derivation from an incoming request (Phase 9).
//
// Guests have no accounts, so abuse protection has to key on the client
// network address. We read the standard proxy headers only, never store the
// raw value, and hash it so in-memory keys are bounded and unreadable.
//
// A single IP/link-shared NAT may, in the worst case, throttle neighbours at
// the same moment — acceptable for cost control, and documented in the
// production checklist (a real deployment should front this with a WAF/CDN
// rate limit as well).

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/** Derive a stable, hashed client key for a request. */
export function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return hashKey("ip:" + first);
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return hashKey("ip:" + realIp.trim());

  // Platform-provided remote address is not part of the public NextRequest
  // type in this version; rely on proxy headers (Set + Trusted Proxies in the
  // host). Without them we fall back to a single shared key below.
  // Kiosk/localhost with no proxy headers — a single shared key. This keeps
  // local development and single-kiosk deployments functional while still
  // limiting aggregate abuse.
  return hashKey("shared:default");
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}