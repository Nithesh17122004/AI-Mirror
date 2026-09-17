// Self-hosted virtual try-on provider (Phase 5B).
//
// Implements the VirtualTryOnProvider interface against an INTERNAL VTON
// inference server (see vton-server/), which runs an open-source model
// (FASHN VTON v1.5 by default) on a suitable GPU machine. The Next.js
// app only knows:
//
//   POST {VTON_SERVER_URL}/try-on      person + garment image -> { job_id }
//   GET  {VTON_SERVER_URL}/try-on/{id} -> { status, result_image_url? }
//
// This is OUR documented internal contract, not the model's interface.
// The model adapter on the server can be swapped (Model A -> Model B)
// without rebuilding the I-RIS frontend.
//
// CRITICAL:
// - All external HTTP calls are performed server-side only.
// - Customer image data is carried as a data URL in memory for the single
//   request and is never logged, persisted, or placed in URLs.
// - The provider throws TryOnError (mapped to clean JSON by the API route).
// - Mock mode (TRY_ON_PROVIDER=mock) is completely unaffected.
// - Automated tests MUST mock global.fetch — never call a real server.

import { getServerEnv } from "@/lib/env";
import type { TryOnImageAccess } from "../types";
import type {
  VirtualTryOnInput,
  VirtualTryOnProvider,
  VirtualTryOnProviderResult,
} from "./types";
import { TryOnError, errors } from "../errors";

// ------------------------------------------------------------
// Internal I-RIS <-> VTON inference server contract (Phase 5B).
//
//   POST /try-on
//     Authorization: Bearer ${VTON_SERVER_API_KEY}
//     { "person_image": <data URL>, "garment_image": <URL or data URL>,
//       "category": "tops" | "bottoms" | "one-pieces" (optional) }
//     202 -> { "job_id": "..." }
//
//   GET /try-on/{job_id}
//     Authorization: Bearer ${VTON_SERVER_API_KEY}
//     200 -> { "status": "processing" }
//          | { "status": "completed", "result_image_url": "..." }
//          | { "status": "failed",    "error_message": "..." }
//
// When VTON_SERVER_API_KEY is empty the server is expected to run without
// auth (private/VPN only). The header is simply omitted in that case.
// ------------------------------------------------------------

const CREATE_PATH = "/try-on";

/** Map a Texvalley catalogue category slug to a FASHN VTON garment category. */
export function mapCategoryToVton(
  category: string | null | undefined
): "tops" | "bottoms" | "one-pieces" {
  switch (category) {
    case "mens-shirts":
    case "mens-tshirts":
    case "womens-kurtas":
    case "polos":
      return "tops";
    case "jeans":
    case "mens-pants":
    case "womens-pants":
    case "bottoms":
      return "bottoms";
    case "womens-dresses":
    case "sarees":
    case "one-pieces":
      return "one-pieces";
    default:
      // Conservative default for items the catalogue does not yet classify.
      return "one-pieces";
  }
}

function isEmbeddedImageAccess(
  access: TryOnImageAccess
): access is { kind: "embedded"; dataUrl: string } {
  return access.kind === "embedded";
}

function requireConfig(): { serverUrl: string; apiKey: string } {
  const env = getServerEnv();
  const serverUrl = env.VTON_SERVER_URL;
  const apiKey = env.VTON_SERVER_API_KEY;

  if (!serverUrl) {
    throw errors.providerNotConfigured(
      "The self-hosted VTON server is not configured. Set VTON_SERVER_URL in your .env."
    );
  }

  return { serverUrl, apiKey };
}

/**
 * Submits a try-on job to the self-hosted inference server and returns
 * the job ID. Throws TryOnError on any documented failure.
 */
async function submitJob(
  serverUrl: string,
  apiKey: string,
  modelImage: string,
  garmentImage: string,
  category: "tops" | "bottoms" | "one-pieces"
): Promise<{ jobId: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s request timeout

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  try {
    const response = await fetch(`${serverUrl}${CREATE_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        person_image: modelImage,
        garment_image: garmentImage,
        category,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `VTON server responded ${response.status}: ${errorText}`
      );
    }

    const data = (await response.json()) as { job_id?: string };
    if (!data?.job_id) {
      throw errors.providerFailed("VTON server response missing job ID.");
    }

    return { jobId: data.job_id };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Polls the inference server until the job completes, fails, or the
 * maximum polling duration is exceeded.
 */
async function pollJob(
  serverUrl: string,
  apiKey: string,
  jobId: string,
  maxDurationMs: number = 180_000, // 3 minutes max
  pollIntervalMs: number = 3_000 // 3 seconds between polls
): Promise<{ status: string; resultImageUrl?: string; errorMessage?: string }> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

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
        `${serverUrl}${CREATE_PATH}/${encodeURIComponent(jobId)}`,
        {
          method: "GET",
          headers,
          signal: subController.signal,
        }
      );

      clearTimeout(pollTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(
          `VTON status ${response.status}: ${errorText}`
        );
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      const data = (await response.json()) as {
        status?: string;
        result_image_url?: string;
        error_message?: string;
      };

      if (data.status === "completed" || data.status === "failed") {
        return {
          status: data.status,
          resultImageUrl: data.result_image_url,
          errorMessage: data.error_message,
        };
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
    `VTON polling exceeded maximum duration (${maxDurationMs}ms). Last error: ${lastError?.message}`
  );
}

// ------------------------------------------------------------
// SelfHostedVirtualTryOnProvider implementation.
// ------------------------------------------------------------

export class SelfHostedVirtualTryOnProvider implements VirtualTryOnProvider {
  readonly name = "self-hosted";
  readonly mode = "real" as const;

  async generateTryOn(
    input: VirtualTryOnInput
  ): Promise<VirtualTryOnProviderResult> {
    // 1. Validate configuration.
    const { serverUrl, apiKey } = requireConfig();
    const startedAt = Date.now();

    // 2. Prepare person image (in-memory data URL from Phase 3).
    const modelImage = isEmbeddedImageAccess(input.customerImage.access)
      ? input.customerImage.access.dataUrl
      : "";

    if (!modelImage) {
      throw errors.invalidPhoto(
        "The customer photo is not available in a format suitable for virtual try-on. Please upload a new photo."
      );
    }

    // 3. Prepare garment image (from the selected Texvalley product).
    const garmentImage =
      input.product.tryOnAssetUrl ?? input.product.imageUrl;

    if (!garmentImage) {
      throw errors.providerFailed(
        "The selected product has no garment image available for virtual try-on."
      );
    }

    const category = mapCategoryToVton(input.product.category);

    // 4. Submit the job to the inference server.
    let jobId: string;
    try {
      const submitResult = await submitJob(
        serverUrl,
        apiKey,
        modelImage,
        garmentImage,
        category
      );
      jobId = submitResult.jobId;
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
            "The selected product could not be found in the virtual try-on service."
          );
        }
        if (message.includes("429")) {
          throw errors.providerFailed(
            "The virtual try-on service is busy. Please try again later."
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

    // 5. Poll the inference server for completion.
    let job: { status: string; resultImageUrl?: string; errorMessage?: string };
    try {
      job = await pollJob(serverUrl, apiKey, jobId);
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
    if (job.status === "failed") {
      throw errors.providerFailed(
        job.errorMessage ??
          "The virtual try-on failed. Please try a different photo."
      );
    }

    if (job.status !== "completed") {
      throw errors.providerFailed(
        "The virtual try-on service returned an unexpected status. Please try again."
      );
    }

    const resultImageUrl = job.resultImageUrl;
    if (!resultImageUrl) {
      throw errors.providerFailed(
        "The virtual try-on service did not return a result image."
      );
    }

    // 7. Normalize to the existing VirtualTryOnProviderResult.
    return {
      status: "success",
      resultImageUrl,
      providerRequestId: jobId,
      processingMs: Date.now() - startedAt,
    };
  }
}