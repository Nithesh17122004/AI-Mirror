// Human-readable explanations for size-engine outcomes.
// Every string is generated from computed facts (no invented confidence).

import { MEASUREMENT_LABELS } from "./types";
import type {
  Confidence,
  FitPreference,
  SizeChartInput,
  SizeRecommendation,
} from "./types";

export function confidenceMeaning(confidence: Confidence): string {
  switch (confidence) {
    case "high":
      return "High: every measurement you entered falls comfortably inside this size's range. This is a confident match, not a guarantee of fit.";
    case "medium":
      return "Medium: one of your measurements sits close to a size boundary or exactly between two sizes. The match is reasonable but the adjacent size may also work.";
    case "low":
      return "Low: your measurements conflict or missing information limits this result. Use it as a starting point only — the adjacent size may fit better.";
  }
}

export function fitLabel(fit: FitPreference): string {
  switch (fit) {
    case "slim":
      return "slim (smaller side)";
    case "regular":
      return "regular (closest match)";
    case "relaxed":
      return "relaxed (larger side)";
  }
}

export function explanationForRecommendation(
  outcome: Extract<SizeRecommendation, { status: "recommended" }>,
  productName: string
): string {
  const fitNote = outcome.fitApplied
    ? ` Because you chose a ${outcome.fit} fit, we favoured ${outcome.fit === "slim" ? "the smaller" : outcome.fit === "relaxed" ? "the larger" : "the closest"} size.`
    : "";
  return `Based on your measurements, ${outcome.recommendedSize} fits you best for ${productName}.${fitNote}`;
}

export function explanationForInsufficient(
  outcome: Extract<SizeRecommendation, { status: "insufficient-measurements" }>
): string {
  if (outcome.missing.length === 0) {
    return "We don't have enough sizing information to recommend a size for this product.";
  }
  const names = outcome.missing.map((code) => MEASUREMENT_LABELS[code].toLowerCase()).join(", ");
  return `To find your size we still need your ${names}. We won't guess without it.`;
}

export function explanationForNoSuitable(
  outcome: Extract<SizeRecommendation, { status: "no-suitable-size" }>,
  productName: string
): string {
  return `Your measurements fall outside the full range of sizes available for ${productName}. The closest size is ${outcome.closestSize}, but we can't confirm how it will fit — we won't speculate.`;
}

export function explanationForOutcome(
  outcome: SizeRecommendation,
  chart: SizeChartInput,
  productName: string
): string {
  switch (outcome.status) {
    case "recommended":
      return explanationForRecommendation(outcome, productName);
    case "insufficient-measurements":
      return explanationForInsufficient(outcome);
    case "no-suitable-size":
      // clamp outcome union; chart not needed for this branch today but kept
      // in signature for future disclaimer texts.
      void chart;
      return explanationForNoSuitable(outcome, productName);
  }
}

export function demoDisclaimer(sourceLabel: string): string {
  return `This size guide is ${sourceLabel}. It is illustrative demo data and not official brand or manufacturer measurements.`;
}