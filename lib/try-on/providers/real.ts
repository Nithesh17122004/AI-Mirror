// Real virtual try-on provider — FASHN AI API (Phase 5).
//
// Implements the VirtualTryOnProvider interface using the documented
// FASHN AI API.  Reads configuration from server-side environment
// variables and performs a real VTON inference request, polls for
// completion, and normalizes the result to the existing
// VirtualTryOnProviderResult type.
//
// CRITICAL:
// - All external HTTP calls are performed server-side only.
// - Customer image data never leaves browser memory and is never
//   logged or persisted to Prisma.
// - The provider throws TryOnError (which the API route maps to
//   clean JSON) instead of raw errors.
// - Mock mode (TRY_ON_PROVIDER=mock) is completely unaffected:
//   zero external requests are made.
//
// The FASHN API contract (endpoint, fields, auth, polling) is taken
// from the official FASHN documentation.  If the documented contract
// changes, update this file to match.
//
// Do NOT call an external AI image API from automated tests — all
// such calls must be mocked.

import { getServerEnv } from "@/lib/env";
import type { TryOnImageAccess } from "../types";
import type {
  VirtualTryOnInput,
  VirtualTryOnProvider,
  VirtualTryOnProviderResult,
} from "./types";
import { TryOnError, errors } from "../errors";

// ------------------------------------------------------------
// FASHN API configuration (source: official FASHN documentation).
// These values are read from the server environment and must not
// be exposed to the browser.
//
// Base endpoint:          https://api.fashn.ai/v1/run
// Authentication:         Authorization: Bearer ${TRY_ON_API_KEY}
// Model name:             tryon-v1.6
// Required inputs:        model_image, garment_image
// Polling:                prediction ID → status endpoint
// ------------------------------------------------------------

const FASHN_RUN_ENDPOINT = "/run";
const FASHN_STATUS_ENDPOINT = "/status";

function isEmbeddedImageAccess(
  access: TryOnImageAccess
): access is { kind: "embedded"; dataUrl: string } {
  return access.kind === "embedded";
}

function requireConfig(): { apiUrl: string; apiKey: string } {
  const env = getServerEnv();
  const apiUrl = env.TRY_ON_API_URL;
  const apiKey = env.TRY_ON_API_KEY;

  if (!apiUrl) {
    throw errors.providerNotConfigured(
      "FASHN API URL is not configured. Set TRY_ON_API_URL in your .env."
    );
  }
  if (!apiKey) {
    throw errors.providerNotConfigured(
      "FASHN API key is not configured. Set TRY_ON_API_KEY in your .env."
    );
  }

  return { apiUrl, apiKey };
}

/**
 * Submits a VTON request to the FASHN API and returns the prediction ID.
 * Throws TryOnError on any failure (400, 401, 403, 404, 429, 500, etc.).
 */
async function submitFashnRequest(
  apiUrl: string,
  apiKey: string,
  modelImage: string,
  garmentImage: string
): Promise<{ predictionId: string; requestId: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s request timeout

  try {
    const response = await fetch(`${apiUrl}${FASHN_RUN_ENDPOINT}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_name: "tryon-v1.6",
        inputs: {
          model_image: modelImage,
          garment_image: garmentImage,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `FASHN API responded ${response.status}: ${errorText}`
      );
    }

    const data = (await response.json()) as FashnRunResponse;
    if (!data?.predictionId) {
      throw errors.providerFailed("FASHN response missing prediction ID.");
    }

    return {
      predictionId: data.predictionId,
      requestId: data.requestId ?? "",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Polls the FASHN status endpoint until the prediction completes
 * or fails, or until the maximum polling duration is exceeded.
 */
async function pollFashnStatus(
  apiUrl: string,
  apiKey: string,
  predictionId: string,
  maxDurationMs: number = 180_000, // 3 minutes max
  pollIntervalMs: number = 3_000 // 3 seconds between polls
): Promise<FashnStatusResponse> {
  const deadline = Date.now() + maxDurationMs;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const currentInterval = Math.min(pollIntervalMs, remaining);

    const subController = new AbortController();
    const pollTimeoutId = setTimeout(
      () => subController.abort(),
      currentInterval
    );

    try {
      const response = await fetch(
        `${apiUrl}${FASHN_STATUS_ENDPOINT}?predictionId=${predictionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: subController.signal,
        }
      );

      clearTimeout(pollTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(
          `FASHN status ${response.status}: ${errorText}`
        );
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      const data = (await response.json()) as FashnStatusResponse;
      if (data.status === "completed" || data.status === "failed") {
        return data;
      }

      // Still processing — wait and poll again.
      await new Promise((r) => setTimeout(r, currentInterval));
    } catch (error) {
      clearTimeout(pollTimeoutId);
      lastError =
        error instanceof Error ? error : new Error("Unknown polling error");
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error(
    `FASHN polling exceeded maximum duration (${maxDurationMs}ms). Last error: ${lastError?.message}`
  );
}

// ------------------------------------------------------------
// FASHN API response types (mirror the documented contract).
// Only the fields we actually use are included.
// ------------------------------------------------------------

interface FashnRunResponse {
  predictionId: string;
  requestId?: string;
}

interface FashnStatusResponse {
  status: "processing" | "completed" | "failed";
  resultImageUrl?: string;
  errorMessage?: string;
}

// ------------------------------------------------------------
// RealVirtualTryOnProvider implementation.
//
// All provider‑specific behaviour (HTTP, auth, polling, error mapping)
// is contained here.  The UI and service only depend on the
// VirtualTryOnProvider interface, so swapping mock → real never
// touches the frontend.
// ------------------------------------------------------------

export class RealVirtualTryOnProvider implements VirtualTryOnProvider {
  readonly name = "real";
  readonly mode = "real" as const;

  async generateTryOn(
    input: VirtualTryOnInput
  ): Promise<VirtualTryOnProviderResult> {
    // 1. Validate configuration.
    const { apiUrl, apiKey } = requireConfig();
    const startedAt = Date.now();

    // 2. Prepare person image (from Phase 3 — browser/session memory).
    const modelImage = isEmbeddedImageAccess(input.customerImage.access)
      ? input.customerImage.access.dataUrl
      : "";

    if (!modelImage) {
      throw errors.invalidPhoto(
        "The customer photo is not available in a format suitable for virtual try-on. Please upload a new photo."
      );
    }

    // 3. Prepare garment image (from the selected Texvalley product).
    //    Prefer tryOnAssetUrl when it is specifically prepared for try-on;
    //    otherwise fall back to imageUrl.
    const garmentImage =
      input.product.tryOnAssetUrl ?? input.product.imageUrl;

    if (!garmentImage) {
      throw errors.providerFailed(
        "The selected product has no garment image available for virtual try-on."
      );
    }

    // 4. Submit request to FASHN API.
    let predictionId: string;
    try {
      const submitResult = await submitFashnRequest(
        apiUrl,
        apiKey,
        modelImage,
        garmentImage
      );
      predictionId = submitResult.predictionId;
    } catch (error) {
      if (error instanceof TryOnError) throw error;
      if (error instanceof Error) {
        const message = error.message;
        if (
          message.includes("Failed to fetch") ||
          message.includes("network") ||
          message.includes("fetch")
        ) {
          throw errors.sessionUnavailable(
            "We couldn't reach the virtual try-on service. Please try again."
          );
        }
        if (message.includes("400")) {
          throw errors.invalidProduct(
            "The request to the virtual try-on service was malformed. Please try a different photo."
          );
        }
        if (message.includes("401") || message.includes("403")) {
          throw errors.providerNotConfigured(
            "The virtual try-on service is not properly configured. Please contact support."
          );
        }
        if (message.includes("404")) {
          throw errors.invalidProduct(
            "The selected product could not be found in the virtual try-on system."
          );
        }
        if (message.includes("429")) {
          throw errors.providerFailed(
            "The virtual try-on service is temporarily rate‑limited. Please try again later."
          );
        }
        if (
          message.includes("timed out") ||
          message.includes("aborted") ||
          message.includes("timeout")
        ) {
          throw errors.providerFailed(
            "The virtual try-on request timed out. Please try again."
          );
        }
        throw errors.unexpected(
          "Something went wrong with the virtual try-on service. Please try again."
        );
      }
      throw errors.unexpected(
        "Unexpected error contacting the virtual try-on service."
      );
    }

    // 5. Poll FASHN for completion.
    let statusResponse: FashnStatusResponse;
    try {
      statusResponse = await pollFashnStatus(apiUrl, apiKey, predictionId);
    } catch (error) {
      if (error instanceof TryOnError) throw error;
      if (error instanceof Error) {
        if (error.message.includes("exceeded maximum duration")) {
          throw errors.providerFailed(
            "The virtual try-on is taking longer than expected. Please try again."
          );
        }
        throw errors.providerFailed(
          "The virtual try-on service did not complete in time. Please try again."
        );
      }
      throw errors.unexpected("Unexpected error while polling the try-on service.");
    }

    // 6. Handle result.
    if (statusResponse.status === "failed") {
      throw errors.providerFailed(
        statusResponse.errorMessage ??
          "The virtual try-on failed. Please try a different photo."
      );
    }

    if (statusResponse.status !== "completed") {
      throw errors.providerFailed(
        "The virtual try-on service returned an unexpected status. Please try again."
      );
    }

    const resultImageUrl = statusResponse.resultImageUrl;
    if (!resultImageUrl) {
      throw errors.providerFailed(
        "The virtual try-on service did not return a result image."
      );
    }

    // Approximate processing wall-clock time: from when the request started
    // until completion was reported.
    const processingMs = Date.now() - startedAt;

    return {
      status: "success",
      resultImageUrl,
      providerRequestId: predictionId,
      processingMs,
    };
  }
}