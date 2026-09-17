// Shared, framework-free types for the I-RIS size engine (Phase 6).
// These types are intentionally DB/browser/network independent so the
// engine can be unit-tested with plain fixtures.

export const MEASUREMENT_CODES = [
  "chest",
  "waist",
  "hip",
  "height",
  "inseam",
] as const;

export type MeasurementCode = (typeof MEASUREMENT_CODES)[number];

export const MEASUREMENT_LABELS: Record<MeasurementCode, string> = {
  chest: "Chest / Bust",
  waist: "Waist",
  hip: "Hip",
  height: "Height",
  inseam: "Inseam",
};

export const FIT_PREFERENCES = ["slim", "regular", "relaxed"] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

export const FIT_LABELS: Record<FitPreference, string> = {
  slim: "Slim",
  regular: "Regular",
  relaxed: "Relaxed",
};

export const UNITS = ["cm", "in"] as const;
export type Unit = (typeof UNITS)[number];

/** Customer measurements, expressed in centimetres. */
export type MeasurementValuesCm = Partial<Record<MeasurementCode, number>>;

/** A single branded size in a product's chart. */
export type SizeChartRowInput = {
  sizeLabel: string;
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  heightCm?: number | null;
  inseamCm?: number | null;
};

/** The chart the engine consumes. `source` must never be a lie. */
export type SizeChartInput = {
  source: "demo" | "brand";
  sourceLabel: string;
  rows: SizeChartRowInput[];
};

/** Engine tuning constants — exported so rules are auditable + testable. */
export const BOUNDARY_MARGIN_CM = 1;
export const FIT_TOLERANCE_CM = 2;

export type ComparisonBoundary =
  | "inside"
  | "near-boundary"
  | "outside"
  | "below-range"
  | "above-range";

/** One measurement compared against the recommended size's chart value. */
export type MeasurementComparison = {
  measurement: MeasurementCode;
  label: string;
  customerCm: number;
  chartCm: number | null;
  boundary: ComparisonBoundary;
  note: string;
};

export type Confidence = "high" | "medium" | "low";

export type RecommendedOutcome = {
  status: "recommended";
  recommendedSize: string;
  confidence: Confidence;
  confidenceReason: string;
  fitApplied: boolean;
  fit: FitPreference;
  alternativeSize: string | null;
  comparisons: MeasurementComparison[];
};

export type InsufficientOutcome = {
  status: "insufficient-measurements";
  missing: MeasurementCode[];
};

export type NoSuitableOutcome = {
  status: "no-suitable-size";
  closestSize: string;
  comparisons: MeasurementComparison[];
};

export type SizeRecommendation =
  | RecommendedOutcome
  | InsufficientOutcome
  | NoSuitableOutcome;