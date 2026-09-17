// POST /api/stylist — one AI-stylist turn.
//
// The handler only parses + validates the request (Zod), delegates to the
// StylistService, and shapes the JSON response. It never touches a provider
// directly and never exposes secrets or stack traces.
//
// Status codes:
//   400 invalid-request          — message/conversation fail Zod.
//   503 catalogue-unavailable    — database unreachable (retryable).
//   503 provider-failed          — provider/endpoint error (retryable).
//   503 provider-not-configured  — real provider selected but not configured.
//   500 invalid-provider-output  — provider returned something unusable.
//   500 unexpected               — anything else.
//
// Conversation is session-only: the browser owns the history, sends it back,
// and nothing is stored server-side.

import { NextRequest, NextResponse } from "next/server";
import { StylistService } from "@/lib/stylist/service";
import { StylistError } from "@/lib/stylist/errors";
import { stylistRequestSchema } from "@/lib/stylist/types";
import type {
  StylistApiResponse,
  StylistErrorCode,
  StylistErrorInfo,
} from "@/lib/stylist/types";
import { makeRateLimiter, perMinute } from "@/lib/rate-limit/store";
import { clientKey } from "@/lib/rate-limit/request";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

// Abuse + cost control for the (potentially paid) stylist endpoint.
// In-memory by default; swap in a shared (Redis) store for multi-instance.
const stylistLimiter = makeRateLimiter({
  scope: "stylist",
  capacity: 6,
  refillPerSecond: perMinute(6),
});

const ERROR_STATUS: Record<StylistErrorCode, number> = {
  "invalid-request": 400,
  "catalogue-unavailable": 503,
  "provider-not-configured": 503,
  "provider-failed": 503,
  "invalid-provider-output": 500,
  unexpected: 500,
};

function buildError(
  code: StylistErrorCode,
  message: string,
  retryable: boolean
): StylistApiResponse {
  return { success: false, error: { code, message, retryable } };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit first: refuse a burst before doing any expensive work.
  const limit = stylistLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      buildError(
        "provider-failed",
        "You've sent too many styling requests. Please wait a moment and try again.",
        true
      ),
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, limit.retryAfterSeconds)),
          "X-RateLimit-Limit": "6",
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      buildError("invalid-request", "The request body was not valid JSON.", false),
      { status: 400 }
    );
  }

  const parsed = stylistRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      buildError(
        "invalid-request",
        "Please tell me what you're looking for (a short message is enough).",
        false
      ),
      { status: 400 }
    );
  }

  try {
    // Best-effort, non-sensitive flow analytics (never blocks the turn).
    await recordAnalyticsEvent("stylist_request");
    const service = new StylistService();
    const result = await service.recommend(parsed.data);
    const response: StylistApiResponse = { success: true, result };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof StylistError) {
      const status = ERROR_STATUS[error.code] ?? 500;
      const info: StylistErrorInfo = error.toInfo();
      return NextResponse.json(
        { success: false, error: info } as StylistApiResponse,
        { status }
      );
    }
    return NextResponse.json(
      buildError("unexpected", "Something went wrong. Please try again.", true),
      { status: 500 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}