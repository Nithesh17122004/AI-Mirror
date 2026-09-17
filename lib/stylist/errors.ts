// Typed errors for the AI stylist service and providers. Internals throw
// these; the API route maps them to clean JSON. No stack traces are exposed.

import type { StylistErrorCode, StylistErrorInfo } from "./types";

export class StylistError extends Error {
  readonly code: StylistErrorCode;
  readonly retryable: boolean;

  constructor(code: StylistErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "StylistError";
    this.code = code;
    this.retryable = retryable;
  }

  toInfo(): StylistErrorInfo {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

/** Convenience constructors for the common failure modes. */
export const errors = {
  invalidRequest: (message = "The stylist request was not valid. Please try again.") =>
    new StylistError("invalid-request", message, false),
  catalogueUnavailable: (
    message = "The catalogue is temporarily unavailable. Please try again."
  ) => new StylistError("catalogue-unavailable", message, true),
  providerNotConfigured: (
    message = "The AI stylist provider isn't configured yet."
  ) => new StylistError("provider-not-configured", message, false),
  providerFailed: (
    message = "The stylist couldn't prepare a response right now. Please try again."
  ) => new StylistError("provider-failed", message, true),
  invalidProviderOutput: (
    message = "The stylist returned something we couldn't use. Please try again."
  ) => new StylistError("invalid-provider-output", message, false),
  unexpected: (message = "Something went wrong. Please try again.") =>
    new StylistError("unexpected", message, true),
};

/**
 * Normalise anything thrown by a provider or the service into a StylistError,
 * so the API route can return a consistent structure.
 */
export function toStylistError(error: unknown): StylistError {
  if (error instanceof StylistError) return error;
  return errors.unexpected();
}

/** Wraps a possibly-Prisma/DB error into a domain error for the route. */
export function isCatalogueUnavailable(error: unknown): boolean {
  if (error instanceof StylistError) return error.code === "catalogue-unavailable";
  return false;
}