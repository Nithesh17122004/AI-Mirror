// POST /api/size — Find My Size.
//
// Deterministic, explainable size recommendation. This handler only parses +
// validates the request (Zod), resolves the product + size chart from the
// database (the product id from the client is never trusted), runs the pure
// engine, and shapes the JSON response. No AI, no randomness, no persisted
// measurements.
//
// Status codes:
//   400 invalid-request   — malformed JSON or measurements that fail Zod.
//   404 missing-product   — productId does not exist.
//   200 no-chart          — product exists but has no usable size guide.
//   503 service-unavailable
//                         — database unreachable; request can be retried.
//
// The engine result only ever reflects data the store actually provides;
// when a chart is missing or measurements are insufficient the API says so
// instead of fabricating a size.

import { NextRequest, NextResponse } from "next/server";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import {
  normaliseMeasurements,
  sizeRequestSchema,
} from "@/lib/size-engine/validate";
import {
  isUsableSizeChart,
  recommendSize,
  sizeChartUsableCodes,
} from "@/lib/size-engine/calculate";
import {
  demoDisclaimer,
  explanationForOutcome,
  confidenceMeaning,
} from "@/lib/size-engine/explain";
import type { SizeChartInput } from "@/lib/size-engine/types";
import { getSizeChartForProduct } from "@/lib/size-engine/store";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

type SizeErrorCode = "invalid-request" | "missing-product" | "service-unavailable" | "unexpected";

export type SizeApiError = {
  code: SizeErrorCode;
  message: string;
  retryable: boolean;
};

type SizeChartSummary = {
  source: "demo" | "brand";
  sourceLabel: string;
  measurements: string[];
  sizes: string[];
};

export type SizeApiResult =
  | {
      status: "recommended" | "insufficient-measurements" | "no-suitable-size";
      product: { id: string; name: string };
      chart: SizeChartSummary;
      unit: "cm" | "in";
      outcome: object;
      explanation: string;
      confidenceMeaning: string | null;
      disclaimer: string;
    }
  | {
      status: "no-chart";
      product: { id: string; name: string };
      chart: null;
      unit: "cm" | "in";
      outcome: null;
      explanation: string;
      confidenceMeaning: null;
      disclaimer: string;
    };

export type SizeApiResponse =
  | { success: true; result: SizeApiResult }
  | { success: false; error: SizeApiError };

function buildError(code: SizeErrorCode, message: string, retryable: boolean): SizeApiResponse {
  return { success: false, error: { code, message, retryable } };
}

function chartSummary(chart: SizeChartInput): SizeChartSummary {
  return {
    source: chart.source,
    sourceLabel: chart.sourceLabel,
    measurements: sizeChartUsableCodes(chart),
    sizes: chart.rows.map((r) => r.sizeLabel),
  };
}

function isDbUnavailable(error: unknown): boolean {
  if (error instanceof PrismaClientInitializationError) return true;
  if (error instanceof PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1008", "P1017"].includes(error.code);
  }
  return false;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      buildError("invalid-request", "The request body was not valid JSON.", false),
      { status: 400 }
    );
  }

  const parsed = sizeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      buildError(
        "invalid-request",
        "Check your measurements: values must be finite, positive and within plausible ranges.",
        false
      ),
      { status: 400 }
    );
  }

  const { productId, fit, unit, measurements } = parsed.data;

  // Best-effort, non-sensitive flow analytics (never blocks the request).
  await recordAnalyticsEvent("size_check", { productId });

  let storeResult;
  try {
    storeResult = await getSizeChartForProduct(productId);
  } catch (error) {
    if (isDbUnavailable(error)) {
      return NextResponse.json(
        buildError(
          "service-unavailable",
          "The size database is temporarily unavailable. Please try again.",
          true
        ),
        { status: 503 }
      );
    }
    return NextResponse.json(
      buildError("unexpected", "Something went wrong. Please try again.", true),
      { status: 500 }
    );
  }

  if (storeResult === null) {
    return NextResponse.json(
      buildError("missing-product", "This product was not found.", false),
      { status: 404 }
    );
  }

  const { productName, chart } = storeResult;

  if (!chart || !isUsableSizeChart(chart)) {
    const explanation = `${productName} does not have a size guide yet, so we can't suggest a size for it.`;
    const result: SizeApiResult = {
      status: "no-chart",
      product: { id: productId, name: productName },
      chart: null,
      unit,
      outcome: null,
      explanation,
      confidenceMeaning: null,
      disclaimer: "",
    };
    return NextResponse.json({ success: true, result }, { status: 200 });
  }

  const centimetres = normaliseMeasurements(measurements, unit);
  const outcome = recommendSize(chart, centimetres, fit);
  const explanation = explanationForOutcome(outcome, chart, productName);

  const result: SizeApiResult = {
    status: outcome.status,
    product: { id: productId, name: productName },
    chart: chartSummary(chart),
    unit,
    outcome,
    explanation,
    confidenceMeaning:
      outcome.status === "recommended" ? confidenceMeaning(outcome.confidence) : null,
    disclaimer: chart.source === "demo" ? demoDisclaimer(chart.sourceLabel) : "",
  };

  return NextResponse.json({ success: true, result }, { status: 200 });
}