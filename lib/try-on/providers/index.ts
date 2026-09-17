// Provider registry. The app asks this module for the configured provider and
// never touches a vendor directly, so `TRY_ON_PROVIDER` can move from "mock"
// to a real value later without changing the service, API route, or frontend.

import { getServerEnv } from "@/lib/env";
import type { VirtualTryOnProvider } from "./types";
import { MockVirtualTryOnProvider } from "./mock";
import { RealVirtualTryOnProvider } from "./real";
import { SelfHostedVirtualTryOnProvider } from "./self-hosted";

type ProviderId = "mock" | "fashn" | "self-hosted";

const providers: Record<ProviderId, () => VirtualTryOnProvider> = {
  mock: () => new MockVirtualTryOnProvider(),
  fashn: () => new RealVirtualTryOnProvider(),
  "self-hosted": () => new SelfHostedVirtualTryOnProvider(),
};

/** Map the configured string to a registered provider id (default: mock).
 *  "real" is accepted as a legacy alias for "fashn". */
function resolveProviderId(value: string): ProviderId {
  if (value === "mock" || value === "fashn" || value === "self-hosted")
    return value;
  if (value === "real") return "fashn";
  return "mock";
}

/** Returns the provider selected by `TRY_ON_PROVIDER` (default: mock). */
export function getTryOnProvider(): VirtualTryOnProvider {
  const configured = getServerEnv().TRY_ON_PROVIDER;
  return providers[resolveProviderId(configured)]();
}