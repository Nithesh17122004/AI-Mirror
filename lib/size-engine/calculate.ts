// Deterministic, explainable size recommendation engine (Phase 6).
// Pure math over centimetres — no DB, no network, no randomness, no AI.
//
// Rules (auditable, tested in tests/size-engine.test.ts):
//   1. A measurement code is usable only when every chart row has a valid,
//      strictly-increasing value for it (charts must be internally consistent).
//   2. Every usable measurement must be provided by the customer; anything
//      missing returns "insufficient-measurements" — the engine never
//      fabricates a size from partial data.
//   3. Boundary between sizes = midpoint of their chart values. A size
//      "covers" a measurement when it falls inside that size's band.
//   4. Fit preference only applies when the customer sits exactly between two
//      adjacent sizes: slim -> smaller, relaxed -> larger, regular -> closest
//      by total distance (ties -> smaller).
//   5. Confidence: HIGH = every measurement comfortably inside one band;
//      MEDIUM = one measurement close to a boundary or between sizes;
//      LOW = measurements conflict (point to different sizes).

import {
  BOUNDARY_MARGIN_CM,
  MEASUREMENT_CODES,
  MEASUREMENT_LABELS,
  type FitPreference,
  type MeasurementCode,
  type MeasurementComparison,
  type MeasurementValuesCm,
  type SizeChartInput,
  type SizeRecommendation,
} from "./types";
import { isProvided } from "./validate";

/** Extract a measurement column from chart rows (null when absent). */
function column(
  chart: SizeChartInput,
  code: MeasurementCode
): (number | null)[] {
  const key = `${code}Cm` as keyof (typeof chart.rows)[number];
  return chart.rows.map((row) => {
    const value = row[key];
    return typeof value === "number" ? value : null;
  });
}

function isStrictlyIncreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (!(values[i] > values[i - 1])) return false;
  }
  return true;
}

/** Measurement codes the chart supports: valid + strictly increasing + present in every row. */
export function sizeChartUsableCodes(chart: SizeChartInput): MeasurementCode[] {
  const n = chart.rows.length;
  if (n === 0) return [];
  return MEASUREMENT_CODES.filter((code) => {
    const col = column(chart, code);
    return (
      col.length === n &&
      col.every((v) => v !== null && Number.isFinite(v) && v > 0) &&
      isStrictlyIncreasing(col as number[])
    );
  });
}

/** Whether a chart is usable for the engine at all. */
export function isUsableSizeChart(chart: SizeChartInput): boolean {
  return sizeChartUsableCodes(chart).length > 0;
}

/** The "between sizes" band edges for a chart column. Edges are extrapolated
 * half the adjacent step outside the smallest/largest row so "below-range"
 * and "above-range" stay meaningful (instead of ±Infinity). */
function bandEdges(values: number[], index: number): { low: number; high: number } {
  const low =
    index === 0
      ? values.length >= 2
        ? values[0] - (values[1] - values[0]) / 2
        : values[0]
      : (values[index - 1] + values[index]) / 2;
  const high =
    index === values.length - 1
      ? values.length >= 2
        ? values[values.length - 1] +
          (values[values.length - 1] - values[values.length - 2]) / 2
        : values[values.length - 1]
      : (values[index] + values[index + 1]) / 2;
  return { low, high };
}

/** Distance (cm) from x to the nearest edge of a size's band; 0 when inside. */
function outDistance(values: number[], index: number, x: number): number {
  const { low, high } = bandEdges(values, index);
  if (x >= low && x <= high) return 0;
  if (x < low) return low - x;
  return x - high;
}

/** Per-code "preferred" size indices: those minimising |x - chart value|. */
function preferredIndices(values: number[], x: number): number[] {
  const distances = values.map((v) => Math.abs(x - v));
  let best = Infinity;
  for (const d of distances) if (d < best) best = d;
  return distances
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d <= best + 1e-9)
    .map(({ i }) => i);
}

function comparisonFor(
  values: number[],
  index: number,
  x: number,
  code: MeasurementCode,
  customerCm: number
): MeasurementComparison {
  const { low, high } = bandEdges(values, index);
  const chartCm = values[index];
  let boundary: MeasurementComparison["boundary"];
  if (x < low) boundary = "below-range";
  else if (x > high) boundary = "above-range";
  else if (
    (Number.isFinite(low) && x - low <= BOUNDARY_MARGIN_CM) ||
    (Number.isFinite(high) && high - x <= BOUNDARY_MARGIN_CM)
  ) {
    boundary = "near-boundary";
  } else boundary = "inside";

  const note =
    boundary === "inside"
      ? `${MEASUREMENT_LABELS[code]} ${customerCm.toFixed(1)} cm vs ${chartCm.toFixed(1)} cm — comfortably within ${chartCm.toFixed(0)} range.`
      : boundary === "near-boundary"
        ? `${MEASUREMENT_LABELS[code]} ${customerCm.toFixed(1)} cm sits close to the ${chartCm.toFixed(0)} size edge (within ${BOUNDARY_MARGIN_CM} cm).`
        : boundary === "below-range"
          ? `Your ${MEASUREMENT_LABELS[code].toLowerCase()} (${customerCm.toFixed(1)} cm) is below this chart's smallest size (${chartCm.toFixed(1)} cm).`
          : `Your ${MEASUREMENT_LABELS[code].toLowerCase()} (${customerCm.toFixed(1)} cm) is above this chart's largest size (${chartCm.toFixed(1)} cm).`;

  return {
    measurement: code,
    label: MEASUREMENT_LABELS[code],
    customerCm,
    chartCm,
    boundary,
    note,
  };
}

function buildComparisons(
  chart: SizeChartInput,
  codes: MeasurementCode[],
  values: Record<string, number[]>,
  measurements: MeasurementValuesCm,
  chosenIndex: number
): MeasurementComparison[] {
  return codes.map((code) =>
    comparisonFor(
      values[code],
      chosenIndex,
      measurements[code]!,
      code,
      measurements[code]!
    )
  );
}

function noSuitable(
  chart: SizeChartInput,
  codes: MeasurementCode[],
  values: Record<string, number[]>,
  measurements: MeasurementValuesCm,
  closestIndex: number
): SizeRecommendation {
  return {
    status: "no-suitable-size",
    closestSize: chart.rows[closestIndex].sizeLabel,
    comparisons: buildComparisons(chart, codes, values, measurements, closestIndex),
  };
}

/**
 * Recommend a size for the given chart + customer measurements (cm).
 * Row order in the chart must be size-ascending (store sorts by sortOrder).
 */
export function recommendSize(
  chart: SizeChartInput,
  measurements: MeasurementValuesCm,
  fit: FitPreference
): SizeRecommendation {
  const codes = sizeChartUsableCodes(chart);
  if (codes.length === 0) {
    return { status: "insufficient-measurements", missing: [...MEASUREMENT_CODES] };
  }
  const missing = codes.filter((code) => !isProvided(measurements, code));
  if (missing.length > 0) {
    return { status: "insufficient-measurements", missing };
  }

  const n = chart.rows.length;
  const values: Record<string, number[]> = {};
  for (const code of codes) {
    values[code] = chart.rows.map((row) => row[`${code}Cm`] as number);
  }

  // Out-of-range guard: customer below/above the chart on every usable code.
  const lowEdge = (code: string) =>
    n >= 2
      ? values[code][0] - (values[code][1] - values[code][0]) / 2
      : values[code][0];
  const highEdge = (code: string) =>
    n >= 2
      ? values[code][n - 1] + (values[code][n - 1] - values[code][n - 2]) / 2
      : values[code][0];
  const belowAll = codes.every((code) => measurements[code]! < lowEdge(code));
  const aboveAll = codes.every((code) => measurements[code]! > highEdge(code));
  if (belowAll) return noSuitable(chart, codes, values, measurements, 0);
  if (aboveAll) return noSuitable(chart, codes, values, measurements, n - 1);

  // Per-code preferred size indices.
  const preferredByCode: number[][] = codes.map((code) =>
    preferredIndices(values[code], measurements[code]!)
  );

  // Sizes preferred by EVERY code (the clean agreement).
  let intersection = preferredByCode[0];
  for (let i = 1; i < preferredByCode.length; i++) {
    intersection = intersection.filter((idx) => preferredByCode[i].includes(idx));
  }

  const labels = chart.rows.map((row) => row.sizeLabel);

  // --- Agreement (clean, possibly between two adjacent sizes). ------------
  if (intersection.length > 0) {
    const sorted = [...intersection].sort((a, b) => a - b);
    const spread = sorted[sorted.length - 1] - sorted[0];

    if (sorted.length === 1) {
      const i = sorted[0];
      // Boundary proximity for chosen size (only finite edges matter).
      let boundaryNear = 0;
      for (const code of codes) {
        const { low, high } = bandEdges(values[code], i);
        const x = measurements[code]!;
        if (
          (Number.isFinite(low) && x - low <= BOUNDARY_MARGIN_CM) ||
          (Number.isFinite(high) && high - x <= BOUNDARY_MARGIN_CM)
        )
          boundaryNear++;
      }
      const alternative = boundaryNear > 0 ? neighborLabel(chart, values, codes, measurements, i) : null;
      return {
        status: "recommended",
        recommendedSize: labels[i],
        confidence: boundaryNear > 0 ? "medium" : "high",
        confidenceReason:
          boundaryNear > 0
            ? `One of your measurements is within ${BOUNDARY_MARGIN_CM} cm of the ${labels[i]} boundary.`
            : `Every measurement you provided falls comfortably inside the ${labels[i]} range.`,
        fitApplied: false,
        fit,
        alternativeSize: alternative,
        comparisons: buildComparisons(chart, codes, values, measurements, i),
      };
    }

    // Adjacent pair (customer exactly on the boundary). Sorting by spread.
    if (spread === 1) {
      const lowIdx = sorted[0];
      const highIdx = sorted[1];
      let chosen: number;
      if (fit === "slim") chosen = lowIdx;
      else if (fit === "relaxed") chosen = highIdx;
      else {
        // regular: closest by total distance; tie -> smaller.
        const total = (i: number) =>
          codes.reduce((sum, code) => sum + Math.abs(measurements[code]! - values[code][i]), 0);
        chosen = total(lowIdx) <= total(highIdx) ? lowIdx : highIdx;
      }
      const other = chosen === lowIdx ? highIdx : lowIdx;
      return {
        status: "recommended",
        recommendedSize: labels[chosen],
        confidence: "medium",
        confidenceReason: `You sit exactly between ${labels[lowIdx]} and ${labels[highIdx]}; your ${fit} fit preference selects ${labels[chosen]}.`,
        fitApplied: true,
        fit,
        alternativeSize: labels[other],
        comparisons: buildComparisons(chart, codes, values, measurements, chosen),
      };
    }

    // Non-adjacent spread with agreement: treat as conflict (ambiguous).
    // Fall through to the conflict path below.
    return conflictOutcome(chart, codes, values, measurements, sorted, fit, labels);
  }

  // --- Conflict: codes point at different sizes. --------------------------
  const allIndices = [...new Set(preferredByCode.flat())].sort((a, b) => a - b);
  return conflictOutcome(chart, codes, values, measurements, allIndices, fit, labels);
}

/** Adjacent size label at a boundary the customer is close to, if any. */
function neighborLabel(
  chart: SizeChartInput,
  values: Record<string, number[]>,
  codes: MeasurementCode[],
  measurements: MeasurementValuesCm,
  index: number
): string | null {
  for (const code of codes) {
    const { low, high } = bandEdges(values[code], index);
    const x = measurements[code]!;
    if (Number.isFinite(low) && x - low <= BOUNDARY_MARGIN_CM && index > 0) {
      return chart.rows[index - 1].sizeLabel;
    }
    if (Number.isFinite(high) && high - x <= BOUNDARY_MARGIN_CM && index < values[code].length - 1) {
      return chart.rows[index + 1].sizeLabel;
    }
  }
  return null;
}

function conflictOutcome(
  chart: SizeChartInput,
  codes: MeasurementCode[],
  values: Record<string, number[]>,
  measurements: MeasurementValuesCm,
  candidates: number[],
  fit: FitPreference,
  labels: string[]
): SizeRecommendation {
  void fit;
  // Least-wrong size: minimises total deviation outside its bands.
  const deviation = (i: number) =>
    codes.reduce(
      (sum, code) => sum + outDistance(values[code], i, measurements[code]!),
      0
    );
  const ranked = candidates.sort((a, b) => deviation(a) - deviation(b) || a - b);
  const chosen = ranked[0];
  const alternative = ranked.length > 1 ? ranked[1] : undefined;
  return {
    status: "recommended",
    recommendedSize: labels[chosen],
    confidence: "low",
    confidenceReason: `Your measurements point to different sizes (${candidates
      .map((i) => labels[i])
      .join(" vs ")}). ${labels[chosen]} is the closest overall match.`,
    fitApplied: false,
    fit,
    alternativeSize: alternative !== undefined ? labels[alternative] : null,
    comparisons: buildComparisons(chart, codes, values, measurements, chosen),
  };
}