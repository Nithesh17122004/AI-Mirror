// Wire-level validation for the size API and unit conversion helpers.
// Pure — no DB, no network. Numbers must be finite, positive and plausible
// in centimetres; NaN / Infinity / zero / negatives / impossible values are
// rejected before they reach the engine.

import { z } from "zod";
import {
  MEASUREMENT_CODES,
  FIT_PREFERENCES,
  UNITS,
  type MeasurementCode,
  type MeasurementValuesCm,
  type Unit,
} from "./types";

// Inches are converted to cm and vice versa by the API boundary only;
// the engine itself always works in centimetres.
export const CM_PER_INCH = 2.54;

export function cmToIn(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inToCm(value: number): number {
  return value * CM_PER_INCH;
}

// Plausible adult ranges in centimetres. These are sanity bounds for
// "impossible" values — they are deliberately generous so a valid human
// measurement is never wrongly rejected. Out-of-chart values that are still
// physically plausible flow through to the engine, which will report them as
// out of range rather than fabricate a size.
export const MEASUREMENT_BOUNDS_CM: Record<MeasurementCode, { min: number; max: number }> = {
  chest: { min: 40, max: 250 },
  waist: { min: 35, max: 250 },
  hip: { min: 40, max: 260 },
  height: { min: 80, max: 300 },
  inseam: { min: 30, max: 200 },
};

export function isInBoundsCm(code: MeasurementCode, cm: number): boolean {
  const { min, max } = MEASUREMENT_BOUNDS_CM[code];
  return Number.isFinite(cm) && cm > 0 && cm >= min && cm <= max;
}

const measurementEntrySchema = z.object({
  chest: z.number().finite().positive().optional(),
  waist: z.number().finite().positive().optional(),
  hip: z.number().finite().positive().optional(),
  height: z.number().finite().positive().optional(),
  inseam: z.number().finite().positive().optional(),
});

export const sizeRequestSchema = z.object({
  productId: z.string().trim().min(1, "productId is required").max(100),
  fit: z.enum(FIT_PREFERENCES).default("regular"),
  unit: z.enum(UNITS).default("cm"),
  measurements: measurementEntrySchema.refine(
    (m) => MEASUREMENT_CODES.some((code) => m[code] !== undefined),
    "At least one measurement is required."
  ),
});

export type SizeRequest = z.infer<typeof sizeRequestSchema>;

/** True when the code is present and a finite positive number. */
export function isProvided(measurement: MeasurementValuesCm, code: MeasurementCode): boolean {
  const value = measurement[code];
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Convert + validate the client measurements into centimetres.
 * Returns the normalised cm values; values are omitted when they were not
 * provided or could not be converted. Impossible numbers (already rejected
 * by the Zod schema) never reach this helper.
 */
export function normaliseMeasurements(
  measurements: SizeRequest["measurements"],
  unit: Unit
): MeasurementValuesCm {
  const result: MeasurementValuesCm = {};
  for (const code of MEASUREMENT_CODES) {
    const value = measurements[code];
    if (value === undefined) continue;
    const cm = unit === "in" ? inToCm(value) : value;
    if (isInBoundsCm(code, cm)) result[code] = cm;
  }
  return result;
}

/** Map a validated request's unit into the engine display unit. */
export function displayValue(cm: number, unit: Unit): number {
  return unit === "in" ? round1(cmToIn(cm)) : round1(cm);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}