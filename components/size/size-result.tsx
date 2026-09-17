// Renders a completed size recommendation (or the honest "can't yet" states).
// Pure display component — all decisions were made by the engine/server.

import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Minus,
  Ruler,
} from "lucide-react";
import type {
  SizeApiResult,
  SizeComparison,
  SizeUnit,
} from "./types";

const CONFIDENCE_STYLES: Record<string, { label: string; className: string }> = {
  high: { label: "High confidence", className: "border-espresso-900/15 bg-white text-espresso-700" },
  medium: {
    label: "Medium confidence",
    className: "border-brass-500/40 bg-brass-100 text-brass-700",
  },
  low: {
    label: "Low confidence",
    className: "border-rosewood-600/30 bg-rosewood-600/10 text-rosewood-600",
  },
};

const BOUNDARY_TONE: Record<SizeComparison["boundary"], string> = {
  inside: "text-espresso-700",
  "near-boundary": "text-brass-700",
  outside: "text-rosewood-600",
  "below-range": "text-rosewood-600",
  "above-range": "text-rosewood-600",
};

function toDisplay(cm: number, unit: SizeUnit): string {
  const value = unit === "in" ? cm / 2.54 : cm;
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function ComparisonRows({
  comparisons,
  unit,
}: {
  comparisons: SizeComparison[];
  unit: SizeUnit;
}) {
  return (
    <ul className="mt-4 space-y-2">
      {comparisons.map((c) => (
        <li
          key={c.measurement}
          className="flex flex-col gap-1 rounded-xl border border-espresso-900/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-espresso-700">
            {c.boundary === "inside" ? (
              <Check className="h-4 w-4 text-brass-600" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rosewood-600" aria-hidden="true" />
            )}
            {c.label}
          </span>
          <span className={`text-[12px] sm:text-right ${BOUNDARY_TONE[c.boundary]}`}>
            You: {toDisplay(c.customerCm, unit)} · Size chart:{" "}
            {c.chartCm === null ? "—" : toDisplay(c.chartCm, unit)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Recommended({ result }: { result: Extract<SizeApiResult, { status: "recommended" }> }) {
  const outcome = result.outcome;
  const tone = CONFIDENCE_STYLES[outcome.confidence] ?? CONFIDENCE_STYLES.medium;
  return (
    <div className="overflow-hidden rounded-2xl border border-brass-500/30 bg-ivory-50">
      <div className="px-5 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
            Your recommended size
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${tone.className}`}
          >
            {tone.label}
          </span>
        </div>
        <p className="mt-3 font-display text-4xl text-espresso-900">
          {outcome.recommendedSize}
        </p>
        {outcome.alternativeSize && (
          <p className="mt-1.5 text-[13px] text-espresso-500">
            Also worth trying:{" "}
            <span className="font-semibold text-espresso-700">
              {outcome.alternativeSize}
            </span>
            {outcome.fitApplied &&
              (outcome.fit === "slim" ? " (smaller side)" : " (larger side)")}
          </p>
        )}
        <p className="mt-3 max-w-prose text-[14px] leading-7 text-espresso-700">
          {result.explanation}
        </p>
        {outcome.fitApplied && (
          <p className="mt-1.5 text-[12px] text-espresso-500">
            Your {outcome.fit} fit preference was applied because your
            measurements sit exactly between two sizes.
          </p>
        )}
        <p className="mt-2 text-[12px] leading-6 text-espresso-500">
          <span className="font-semibold text-espresso-700">Confidence:</span>{" "}
          {outcome.confidenceReason}
        </p>
        <ComparisonRows comparisons={outcome.comparisons} unit={result.unit} />
        <p className="mt-3 inline-flex items-start gap-2 text-[12px] leading-6 text-espresso-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-600" aria-hidden="true" />
          {result.confidenceMeaning}
        </p>
      </div>
      {result.disclaimer && (
        <div className="mt-4 border-t border-espresso-900/10 bg-brass-100/60 px-5 py-3 text-[12px] leading-6 text-espresso-500 sm:px-6">
          {result.disclaimer}
        </div>
      )}
    </div>
  );
}

function Insufficient({ result }: { result: Extract<SizeApiResult, { status: "insufficient-measurements" }> }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-brass-500/30 bg-ivory-50"
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
          <Ruler className="h-4 w-4" aria-hidden="true" />
          One more measurement
        </p>
        <p className="mt-2.5 max-w-prose text-[14px] leading-7 text-espresso-700">
          {result.explanation}
        </p>
        {result.outcome.missing.length > 0 && (
          <p className="mt-2 text-[12px] text-espresso-500">
            Missing: {result.outcome.missing.join(", ")}. We won&apos;t guess a
            size without them.
          </p>
        )}
      </div>
    </div>
  );
}

function NoSuitable({ result }: { result: Extract<SizeApiResult, { status: "no-suitable-size" }> }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-rosewood-600/25 bg-ivory-50"
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rosewood-600">
          <Minus className="h-4 w-4" aria-hidden="true" />
          Outside this range
        </p>
        <p className="mt-2.5 max-w-prose text-[14px] leading-7 text-espresso-700">
          {result.explanation}
        </p>
        <p className="mt-2 text-[12px] text-espresso-500">
          You sit closest to{" "}
          <span className="font-semibold text-espresso-700">
            {result.outcome.closestSize}
          </span>
          , but we won&apos;t pretend we can confirm how it fits.
        </p>
        <ComparisonRows comparisons={result.outcome.comparisons} unit={result.unit} />
      </div>
    </div>
  );
}

function NoChart({ result }: { result: Extract<SizeApiResult, { status: "no-chart" }> }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-espresso-900/10 bg-ivory-50"
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
          <Info className="h-4 w-4" aria-hidden="true" />
          No size guide yet
        </p>
        <p className="mt-2.5 max-w-prose text-[14px] leading-7 text-espresso-700">
          {result.explanation}
        </p>
        <p className="mt-2 text-[12px] text-espresso-500">
          When the brand publishes measurements, you&apos;ll get a proper
          recommendation here.
        </p>
      </div>
    </div>
  );
}

export function SizeResult({ result }: { result: SizeApiResult }) {
  switch (result.status) {
    case "recommended":
      return <Recommended result={result} />;
    case "insufficient-measurements":
      return <Insufficient result={result} />;
    case "no-suitable-size":
      return <NoSuitable result={result} />;
    default:
      return <NoChart result={result} />;
  }
}

export function StartAgainButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-espresso-900/20 px-5 text-sm font-medium text-espresso-700 transition-colors hover:border-espresso-900/50 hover:bg-espresso-900/[0.04]"
    >
      <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
      Start again
    </button>
  );
}