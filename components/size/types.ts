// Client-safe response shapes mirrored from app/api/size/route.ts.
// These are duplicated (not imported from the route) on purpose: the route
// pulls in the Prisma store, which must never enter a client bundle.

export type SizeUnit = "cm" | "in";
export type SizeFit = "slim" | "regular" | "relaxed";

export type SizeChartSummary = {
  source: "demo" | "brand";
  sourceLabel: string;
  measurements: string[];
  sizes: string[];
};

export type SizeComparison = {
  measurement: string;
  label: string;
  customerCm: number;
  chartCm: number | null;
  boundary: "inside" | "near-boundary" | "outside" | "below-range" | "above-range";
  note: string;
};

export type RecommendedOutcome = {
  status: "recommended";
  recommendedSize: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  fitApplied: boolean;
  fit: SizeFit;
  alternativeSize: string | null;
  comparisons: SizeComparison[];
};

export type InsufficientOutcome = {
  status: "insufficient-measurements";
  missing: string[];
};

export type NoSuitableOutcome = {
  status: "no-suitable-size";
  closestSize: string;
  comparisons: SizeComparison[];
};

export type SizeOutcome = RecommendedOutcome | InsufficientOutcome | NoSuitableOutcome;

type ProductRef = { id: string; name: string };

export type SizeApiResult =
  | {
      status: "recommended";
      product: ProductRef;
      chart: SizeChartSummary;
      unit: SizeUnit;
      outcome: RecommendedOutcome;
      explanation: string;
      confidenceMeaning: string;
      disclaimer: string;
    }
  | {
      status: "insufficient-measurements";
      product: ProductRef;
      chart: SizeChartSummary;
      unit: SizeUnit;
      outcome: InsufficientOutcome;
      explanation: string;
      confidenceMeaning: null;
      disclaimer: string;
    }
  | {
      status: "no-suitable-size";
      product: ProductRef;
      chart: SizeChartSummary;
      unit: SizeUnit;
      outcome: NoSuitableOutcome;
      explanation: string;
      confidenceMeaning: null;
      disclaimer: string;
    }
  | {
      status: "no-chart";
      product: ProductRef;
      chart: null;
      unit: SizeUnit;
      outcome: null;
      explanation: string;
      confidenceMeaning: null;
      disclaimer: string;
    };

export type SizeApiResponse =
  | { success: true; result: SizeApiResult }
  | {
      success: false;
      error: { code: string; message: string; retryable: boolean };
    };

/** Product picker option loaded on the server (id + display name). */
export type SizeProductOption = {
  id: string;
  name: string;
  brandName: string;
  categoryName: string;
  chartMeasurements: string[];
  hasChart: boolean;
};