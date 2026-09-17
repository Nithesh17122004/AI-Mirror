// Static how-to-measure guide. Pure UI, no state. Rendered inside a <details>
// so everything stays keyboard-accessible with native disclosure behaviour.

import { Ruler } from "lucide-react";

export type MeasurePart = {
  code: string;
  title: string;
  steps: string[];
};

export const MEASURE_PARTS: MeasurePart[] = [
  {
    code: "chest",
    title: "Chest / Bust",
    steps: [
      "Wrap the tape around the fullest part of your chest, keeping it level under your arms.",
      "Stand naturally with your arms relaxed — don't puff out or suck in.",
    ],
  },
  {
    code: "waist",
    title: "Waist",
    steps: [
      "Measure around your natural waist, just above the belly button.",
      "Keep one finger between the tape and your body so it isn't too tight.",
    ],
  },
  {
    code: "hip",
    title: "Hip",
    steps: [
      "Wrap the tape around the widest part of your hips and bottom.",
      "Keep your feet together and the tape parallel to the floor.",
    ],
  },
  {
    code: "height",
    title: "Height",
    steps: [
      "Stand barefoot with your back flat against a wall.",
      "Measure from the floor to the top of your head.",
    ],
  },
  {
    code: "inseam",
    title: "Inseam",
    steps: [
      "Measure from the top of the inner thigh to the bottom of the ankle, along the inner leg.",
      "Check it against a pair of trousers that already fit you well.",
    ],
  },
];

export function MeasurementGuide({
  measurements,
}: {
  measurements: string[];
}) {
  return (
    <details
      className="group rounded-2xl border border-espresso-900/10 bg-ivory-50 open:pb-4"
      aria-label="How to measure yourself"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-espresso-700">
        <span className="inline-flex items-center gap-2.5">
          <Ruler className="h-4 w-4 text-brass-600" aria-hidden="true" />
          How to measure yourself
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brass-600 group-open:hidden">
          Show
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brass-600 hidden group-open:inline">
          Hide
        </span>
      </summary>
      <div className="px-5 pt-1">
        <p className="max-w-prose text-[13px] leading-6 text-espresso-500">
          Take measurements over light clothing with a soft tape measure, at
          your own pace. Rounded values are fine — the comparison tolerates a
          little variation.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {MEASURE_PARTS.map((part) => (
            <div
              key={part.code}
              className="rounded-xl border border-espresso-900/10 bg-white p-4"
            >
              <dt className="font-display text-[15px] text-espresso-900">
                {part.title}
                <span
                  className={`ml-2 align-middle text-[10px] font-bold uppercase tracking-[0.14em] ${
                    measurements.includes(part.code)
                      ? "text-brass-700"
                      : "text-espresso-900/30"
                  }`}
                >
                  {measurements.includes(part.code) ? "Needed" : "Optional"}
                </span>
              </dt>
              <dd className="mt-1.5 space-y-1 text-[13px] leading-5 text-espresso-500">
                {part.steps.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-espresso-500">
          Your measurements are only used inside this page for the current
          request. Nothing is stored, and they never appear in the address bar.
        </p>
      </div>
    </details>
  );
}