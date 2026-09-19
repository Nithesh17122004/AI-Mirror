// FASHN VTON 1.5 self-hosted provider (REAL inference; never mock/SVG/garment-passthrough).
//
// Contract with the Python inference service (vton-server/app.py):
//   GET  {VTON_SERVER_URL}/health  -> {"status":"loading"|"ready"|"failed"}
//   POST {VTON_SERVER_URL}/try-on  (multipart person_image + garment_image + category)
//        200 -> REAL generated PNG bytes
//        400 -> {"error":{"code":"unsupported-category"|"invalid-person-image"|...}}
//        503 -> provider not ready (retryable)
//        502 -> real inference failed
//
// The API key travels ONLY as a server-side Bearer header via VTON_SERVER_API_KEY.
// It is never NEXT_PUBLIC_, never in the browser, never in source.
import { TryOnError, tryOnErrors } from "../errors";
import type { TryOnProvider, TryOnProviderResult } from "../types";
import { mapCategoryToVton } from "./category-mapping";

interface FashnVtonConfig {
  vtonServerUrl: string;
  vtonServerApiKey: string | undefined;
}

function config(): FashnVtonConfig {
  const url = process.env.VTON_SERVER_URL;
  const key = process.env.VTON_SERVER_API_KEY;
  if (!url) throw tryOnErrors.providerNotConfigured("VTON_SERVER_URL is not set.");
  return { vtonServerUrl: url, vtonServerApiKey: key };
}

function authHeaders(apiKey: string | undefined): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export const fashnVtonProvider: TryOnProvider = {
  id: "fashn",
  isReady: async () => {
    const { vtonServerUrl, vtonServerApiKey } = config();
    const res = await fetch(`${vtonServerUrl}/health`, {
      headers: authHeaders(vtonServerApiKey),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "ready";
  },
  tryOn: async (input): Promise<TryOnProviderResult> => {
    const { vtonServerUrl, vtonServerApiKey } = config();
    const garmentRes = await fetch(input.garment.imageUrl);
    if (!garmentRes.ok) throw tryOnErrors.providerUnavailable();
    const garmentBytes = new Uint8Array(await garmentRes.arrayBuffer());
    const form = new FormData();
    form.append("person_image", new Blob([input.personImage], { type: input.personImageMime }), "person.png");
    form.append("garment_image", new Blob([garmentBytes], { type: "image/webp" }), "garment.webp");
    form.append("category", mapCategoryToVton(input.product.category));
    const res = await fetch(`${vtonServerUrl}/try-on`, {
      method: "POST",
      body: form,
      headers: authHeaders(vtonServerApiKey),
      signal: AbortSignal.timeout(120000),
    });
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } };
      throw new TryOnError(body?.error?.code === "unsupported-category" ? "unsupported-category" : "invalid-input", 400, "try-on", undefined Triggers retry);
    }
    if (res.status === 503) throw tryOnErrors.providerNotReady();
    if (res.status === 502) throw tryOnErrors.providerInferenceFailed();
    if (!res.ok) throw tryOnErrors.providerUnavailable();
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: "success", imageBase64: buf.toString("base64"), mime: res.headers.get("content-type") ?? "image/png" };
  },
};
