// POST /api/try-on — generate a virtual try-on.
//
// Business logic lives in the TryOnService; this handler only parses the
// request, validates it with Zod, and shapes the JSON response. It never
// touches a provider directly and never exposes secrets or stack traces.
//
// The customer photo travels as a base64 data URL inside the request body
// (memory only) — never in URLs, storage, or logs. Phase 5 may switch to a
// temporary server-side image reference without changing this contract shape.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_PHOTO_SIZE_BYTES } from "@/lib/try-on/validation";
import { TryOnService } from "@/lib/try-on/service";
import { TryOnError } from "@/lib/try-on/errors";
import type { TryOnErrorCode, TryOnApiResponse } from "@/lib/try-on/types";
import { makeRateLimiter, perMinute } from "@/lib/rate-limit/store";
import { clientKey } from "@/lib/rate-limit/request";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

const dataUrlPattern = /^data:image\/(jpeg|png|webp);base64,/;

// Abuse + cost control for the expensive VTON endpoint. In-memory by default;
// swap in a shared (Redis) store for multi-instance deployments.
const tryOnLimiter = makeRateLimiter({
  scope: "try-on",
  capacity: 3,
  refillPerSecond: perMinute(2),
});

export const tryOnRequestSchema = z.object({
  productId: z.string().trim().min(1, "productId is required").max(100),
  image: z.object({
    name: z.string().trim().min(1).max(255),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(MAX_PHOTO_SIZE_BYTES),
    source: z.enum(["upload", "camera"]),
    dataUrl: z
      .string()
      .regex(dataUrlPattern, "dataUrl must be a base64 data URL")
      .max(MAX_PHOTO_SIZE_BYTES * 2, "dataUrl is too large"),
  }),
});

export type TryOnRequestSchema = z.infer<typeof tryOnRequestSchema>;

const ERROR_STATUS: Record<TryOnErrorCode, number> = {
  "invalid-request": 400,
  "missing-product": 400,
  "invalid-product": 400,
  "missing-photo": 400,
  "invalid-photo": 400,
  "provider-failed": 500,
  "provider-not-configured": 503,
  "session-unavailable": 503,
  unexpected: 500,
};

function buildError(code: TryOnErrorCode, message: string): TryOnApiResponse {
  return { success: false, error: { code, message, retryable: true } };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit first: refuse a burst before doing any expensive work.
  const limit = tryOnLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      buildError(
        "provider-failed",
        "You've sent too many try-on requests. Please wait a moment and try again."
      ),
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, limit.retryAfterSeconds)),
          "X-RateLimit-Limit": "3",
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      buildError("invalid-request", "The request body was not valid JSON."),
      { status: 400 }
    );
  }

  const parsed = tryOnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      buildError("invalid-request", "The try-on request was not valid."),
      { status: 400 }
    );
  }

  const { productId, image } = parsed.data;

  // Non-sensitive flow analytics (best effort, never blocks the request).
  await recordAnalyticsEvent("try_on_started", { productId });

  try {
    const service = new TryOnService();
    const result = await service.generate({
      productId,
      image: {
        name: image.name,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        source: image.source,
        access: { kind: "embedded", dataUrl: image.dataUrl },
      },
    });
    const response: TryOnApiResponse = { success: true, result };
    await recordAnalyticsEvent("try_on_completed", { productId });
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    await recordAnalyticsEvent("try_on_failed", { productId });
    if (error instanceof TryOnError) {
      const status = ERROR_STATUS[error.code] ?? 500;
      const response: TryOnApiResponse = {
        success: false,
        error: error.toInfo(),
      };
      return NextResponse.json(response, { status });
    }
    return NextResponse.json(
      buildError("unexpected", "Something went wrong. Please try again."),
      { status: 500 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}