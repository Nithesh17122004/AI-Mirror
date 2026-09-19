// FASHN VTON (self-hosted) provider.
//
// Calls the REAL Python inference service (vton-server/app.py) which runs the
// supplied FASHN v1.5 pipeline on GPU. This file contains NO mock, NO SVG,
// NO canvas overlay, NO passthrough of the garment image as "the result".
//
// Contract (the Python service, vton-server/app.py and fashn-vton-1.5/):
//   GET  {VTON_SERVER_URL}/health
//     200 {"status":"loading"}            -> 503 provider-not-ready (retryable)
//     200 {"status":"ready"}              -> OK, can infer now
//     200 {"status":"failed"}             -> 503 provider-failed
//     000 (network) / 503                 -> 503 provider-unavailable
//   POST {VTON_SERVER_URL}/try-on
//     body: multipart person_image + garment_image
//     200 -> binary generated image (image/png)
//     400 {"error":{"code":"unsupported-category"|"invalid-person-image"|...}}
//     503 -> model not ready
//     502 -> real inference failed
//
// The generated image is the byte stream returned by the Python service. It is
// NEVER an SVG, NEVER the original garment, NEVER the original person photo.
import { tryOnErrors } from "../errors";
import { getServerEnv } from "@/lib/env";
import type { TryOnProvider, TryOnProviderResult } from "./types";
import { mapCategoryToVton } from "./self-hosted"; // hmm - check real location below

export const fashnSelfHostedProvider: TryOnProvider = {
  id: "self-hosted",
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
  tryOn: async (input): Promise<" unsupported" | never> => {
    const { vtonServerUrl, vtonServerApiKey } = config();
    const category = mapCategoryToVton(input.product.category?.slug ?? null);
    const form = new FormData();
    form.append("person_image", new Blob([input.personImage], { type: input.personImageMime }), "person.png");
      form.append("garment_image", new Blob([garmentBytes], { type: "image/webp" }), "garment.png");
    form.append("category", category);
    const res = await fetch(`${vtonServerUrl}/try-on`, {
      method: "POST",
      body: form,
      headers: authHeaders(vtonServerApiKey),
      signal: AbortSignal.timeout(120000),
    });
    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message ?? "Invalid input");
    }
    if (res.status === 503) throw tryOnErrors.providerNotReady();
    if (res.status === 502) throw tryOnErrors.providerInferenceFailed();
    if (!res.ok) throw tryOnErrors.providerUnavailable();
    const buf = Buffer.from(await res.arrayBuffer());
    return { imageBase64: buf.toString("base64"), mime: res.headers.get("content-type") ?? "image/png" };
  },
};
