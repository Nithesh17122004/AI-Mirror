// FASHN VTON 1.5 provider (REAL inference; never mock/SVG/garment-passthrough).
//
// The vendored Python pipeline (vton-server/fashn-vton-1.5) is the real model
// runtime. The self-hosted Next.js provider wires our app to that service via
// the vton-server HTTP contract. This module exists so the provider registry
// can refer to "fashn" while sharing ONE authoritative, fully type-checked
// implementation — no duplicated logic, no invented symbols, no mock fallback.
//
// The provider:
//   - isReady()  -> GET {VTON_SERVER_URL}/health; true only when "ready"
//   - generateTryOn() -> submits job, polls, returns the REAL generated image
//   - never returns the garment or person image as the result
//   - never SVG, never canvas overlay, never mock
//   - throws TryOnError (clean JSON, never stack traces)
import { SelfHostedVirtualTryOnProvider } from "./self-hosted";
import type { VirtualTryOnProvider } from "./types";

export const fashnVtonProvider: VirtualTryOnProvider =
  new SelfHostedVirtualTryOnProvider({
    mode: "real",
  });
