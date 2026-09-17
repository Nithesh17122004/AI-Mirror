"use client";

// Find My Size — the interactive form. Owns the measurement inputs, unit and
// fit choice, calls POST /api/size, and renders the result via SizeResult.
// No measurements are persisted; the API resolves the product server-side.

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Loader2, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeasurementGuide } from "./measurement-guide";
import { SizeResult, StartAgainButton } from "./size-result";
import type {
  SizeApiResponse,
  SizeApiResult,
  SizeFit,
  SizeProductOption,
  SizeUnit,
} from "./types";

type MeasurementField = {
  code: string;
  label: string;
  placeholder: string;
};

const ALL_FIELDS: MeasurementField[] = [
  { code: "chest", label: "Chest / Bust", placeholder: "e.g. 102" },
  { code: "waist", label: "Waist", placeholder: "e.g. 84" },
  { code: "hip", label: "Hip", placeholder: "e.g. 96" },
  { code: "height", label: "Height", placeholder: "e.g. 175" },
  { code: "inseam", label: "Inseam", placeholder: "e.g. 78" },
];

const FIT_OPTIONS: { value: SizeFit; hint: string }[] = [
  { value: "slim", hint: "Slightly smaller — a closer cut." },
  { value: "regular", hint: "Closest match per the chart." },
  { value: "relaxed", hint: "Slightly larger — more room to move." },
];

export type SizeFinderProps = {
  products: SizeProductOption[];
  initialProductId: string | null;
  initialMeasurements: string[];
  initialSourceLabel: string;
};

export function SizeFinder({
  products,
  initialProductId,
  initialMeasurements,
  initialSourceLabel,
}: SizeFinderProps) {
  const [productId, setProductId] = useState<string>(initialProductId ?? "");
  const [unit, setUnit] = useState<SizeUnit>("cm");
  const [values, setValues] = useState<Record<string, string>>({});
  const [fit, setFit] = useState<SizeFit>("regular");
  const [phase, setPhase] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [result, setResult] = useState<SizeApiResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );
  const requiredCodes = selected
    ? selected.chartMeasurements
    : initialProductId
      ? initialMeasurements
      : [];

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  const changeProduct = useCallback(
    (id: string) => {
      setProductId(id);
      reset();
    },
    [reset]
  );

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(null);
      setResult(null);

      if (!selected) {
        setPhase("failed");
        setErrorMessage("Please choose a product first.");
        return;
      }

      const measurements: Record<string, number> = {};
      for (const field of ALL_FIELDS) {
        const raw = (values[field.code] ?? "").trim();
        if (raw === "") continue;
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          measurements[field.code] = parsed;
        }
      }

      if (Object.keys(measurements).length === 0) {
        setPhase("failed");
        setErrorMessage("Enter at least one measurement to continue.");
        return;
      }

      setPhase("busy");
      try {
        const response = await fetch("/api/size", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: selected.id, fit, unit, measurements }),
        });
        let payload: SizeApiResponse | null = null;
        try {
          payload = (await response.json()) as SizeApiResponse;
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.success) {
          setPhase("failed");
          setErrorMessage(
            payload && !payload.success
              ? payload.error.message
              : "We couldn't find a size for you right now. Please try again."
          );
          return;
        }

        setResult(payload.result);
        setPhase("done");
      } catch {
        setPhase("failed");
        setErrorMessage("We couldn't reach the sizing service. Please try again.");
      }
    },
    [fit, selected, unit, values]
  );

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-brass-500/30 bg-ivory-50">
        <div className="px-5 pt-5 sm:px-6">
          <Badge>Deterministic sizing</Badge>
          <h3 className="mt-3 font-display text-2xl text-espresso-900">
            Tell us a few measurements.
          </h3>
          <p className="mt-2 max-w-prose text-[13px] leading-6 text-espresso-500">
            {selected && !selected.hasChart ? (
              <span className="font-semibold text-rosewood-600">
                {selected.name} doesn&apos;t have a size guide yet, so we
                can&apos;t recommend a size for it.
              </span>
            ) : (
              <>
                I-RIS matches your measurements against the product&apos;s size
                chart using simple, transparent rules — not AI. Nothing you
                type here is stored.
              </>
            )}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 px-5 py-5 sm:px-6" noValidate>
          {/* Product */}
          <div>
            <label
              htmlFor="size-product"
              className="text-xs font-bold uppercase tracking-[0.16em] text-brass-600"
            >
              Product
            </label>
            <select
              id="size-product"
              value={productId}
              onChange={(e) => changeProduct(e.target.value)}
              className="mt-2 w-full rounded-xl border border-espresso-900/15 bg-white px-3.5 py-3 text-[14px] text-espresso-900 outline-none transition-colors focus:border-brass-500 focus:ring-2 focus:ring-brass-500/30"
            >
              <option value="">Choose a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.brandName}
                </option>
              ))}
            </select>
          </div>

          {/* Units */}
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-[0.16em] text-brass-600">
              Units
            </legend>
            <div className="mt-2 inline-flex gap-1 rounded-full border border-espresso-900/15 bg-white p-1">
              {(["cm", "in"] as const).map((u) => (
                <label
                  key={u}
                  className={`cursor-pointer rounded-full px-5 py-2 text-[13px] font-semibold ${
                    unit === u
                      ? "bg-espresso-900 text-ivory-50"
                      : "text-espresso-500 hover:text-espresso-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="units"
                    value={u}
                    checked={unit === u}
                    onChange={() => setUnit(u)}
                    className="sr-only"
                  />
                  {u.toUpperCase()}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Measurements */}
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-[0.16em] text-brass-600">
              Your measurements ({unit})
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {ALL_FIELDS.map((field) => {
                const required = requiredCodes.includes(field.code);
                return (
                  <div key={field.code}>
                    <label
                      htmlFor={`size-${field.code}`}
                      className="text-[13px] font-semibold text-espresso-700"
                    >
                      {field.label}
                      {required && (
                        <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-[0.12em] text-brass-700">
                          Needed
                        </span>
                      )}
                    </label>
                    <input
                      id={`size-${field.code}`}
                      name={field.code}
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.1"
                      placeholder={field.placeholder}
                      value={values[field.code] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.code]: e.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-xl border border-espresso-900/15 bg-white px-3.5 py-3 text-[14px] text-espresso-900 outline-none transition-colors focus:border-brass-500 focus:ring-2 focus:ring-brass-500/30"
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* Fit preference */}
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-[0.16em] text-brass-600">
              Fit preference
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {FIT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition-colors ${
                    fit === option.value
                      ? "border-brass-500 bg-brass-100/70"
                      : "border-espresso-900/10 bg-white hover:border-espresso-900/25"
                  }`}
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold capitalize text-espresso-900">
                    <input
                      type="radio"
                      name="fit"
                      value={option.value}
                      checked={fit === option.value}
                      onChange={() => setFit(option.value)}
                      className="h-4 w-4 accent-brass-600"
                    />
                    {option.value}
                  </span>
                  <span className="mt-1.5 pl-6 text-[12px] leading-5 text-espresso-500">
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-espresso-500">
              Applied only when your measurements sit between two sizes.
            </p>
          </fieldset>

          {phase === "failed" && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rosewood-600/25 bg-rosewood-600/5 px-4 py-3.5"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rosewood-600"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-6 text-espresso-700">
                {errorMessage ?? "Something went wrong. Please try again."}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              disabled={phase === "busy" || !selected}
              className="min-h-13 flex-1 text-base"
              aria-label="Calculate my size"
            >
              {phase === "busy" ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Finding your size…
                </>
              ) : (
                <>
                  <ScanSearch aria-hidden="true" />
                  Find My Size
                </>
              )}
            </Button>
            {!selected && (
              <p className="text-xs text-espresso-500">Choose a product to continue.</p>
            )}
          </div>
        </form>
      </div>

      {/* Result panels live outside the form. */}
      <div className="mt-6">
        {phase === "busy" && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-3 rounded-2xl border border-brass-500/30 bg-ivory-50 px-6 py-8"
          >
            <Loader2
              className="h-5 w-5 animate-spin motion-reduce:animate-none text-brass-600"
              aria-hidden="true"
            />
            <p className="text-[14px] text-espresso-700">
              Comparing your measurements against the size chart…
            </p>
          </div>
        )}

        {phase === "done" && result && (
          <>
            <SizeResult result={result} />
            <div className="mt-4">
              <StartAgainButton onClick={reset} />
            </div>
          </>
        )}
      </div>

      <div className="mt-6">
        <MeasurementGuide measurements={requiredCodes} />
      </div>

      {result?.chart?.source === "demo" && (
        <p
          role="note"
          aria-label="Demo data notice"
          className="mt-4 inline-flex items-center gap-2 text-[12px] leading-6 text-espresso-500"
        >
          <span className="font-semibold text-brass-700">
            {initialSourceLabel}
          </span>
        </p>
      )}
    </div>
  );
}