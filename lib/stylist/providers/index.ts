// Provider registry. The app asks this module for the configured provider and
// never touches a vendor directly, so `STYLIST_PROVIDER` can move from "mock"
// to "real" later without changing the service, API route, or frontend.

import { getServerEnv } from "@/lib/env";
import type { StylistProvider } from "./types";
import { MockStylistProvider } from "./mock";
import { RealStylistProvider } from "./real";

export type { StylistProvider } from "./types";

type ProviderId = "mock" | "real";

const providers: Record<ProviderId, () => StylistProvider> = {
  mock: () => new MockStylistProvider(),
  real: () => new RealStylistProvider(),
};

/** Map the configured string to a registered provider id (default: mock). */
function resolveProviderId(value: string): ProviderId {
  return value === "mock" || value === "real" ? value : "mock";
}

/** Returns the provider selected by `STYLIST_PROVIDER` (default: mock). */
export function getStylistProvider(): StylistProvider {
  const configured = getServerEnv().STYLIST_PROVIDER;
  return providers[resolveProviderId(configured)]();
}