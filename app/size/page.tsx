import type { Metadata } from "next";
import Link from "next/link";
import { Ruler, ShieldCheck } from "lucide-react";
import { SizeFinder } from "@/components/size/size-finder";
import { Badge } from "@/components/ui/badge";
import { isValidProductLookup } from "@/lib/products/validation";
import { listSizeProducts, getSizeChartForProduct } from "@/lib/size-engine/store";
import type { SizeProductOption } from "@/components/size/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find My Size" };

const PRIVACY_NOTES = [
  "Your measurements are used for this request only — nothing is stored.",
  "Measurements never appear in the address bar or any link.",
  "Size recommendation is deterministic and rule-based. No AI is involved.",
];

export default async function SizePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: productId } = await searchParams;

  let options: SizeProductOption[] = [];
  let initialProductId: string | null = null;
  let initialMeasurements: string[] = [];
  let initialSourceLabel = "";
  let loadError = false;

  try {
    const list = await listSizeProducts();
    options = list.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brandName,
      categoryName: p.categoryName,
      chartMeasurements: p.chartMeasurements,
      hasChart: p.hasChart,
    }));

    if (productId && isValidProductLookup(productId)) {
      const match = list.find((p) => p.id === productId);
      if (match) {
        initialProductId = match.id;
        initialMeasurements = match.chartMeasurements;
        initialSourceLabel = match.sourceLabel;
      } else {
        // Id that passed the shape check but isn't an ACTIVE product: ask the
        // store directly so we can tell the difference between "unknown id"
        // (stale link) and a product that simply has no chart.
        const resolved = await getSizeChartForProduct(productId);
        if (resolved) {
          initialProductId = productId;
          initialSourceLabel = resolved.chart?.sourceLabel ?? "";
        }
      }
    }
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ivory-100 text-brass-700">
          <Ruler className="h-5 w-5" aria-hidden="true" />
        </span>
        <Badge>Size guide</Badge>
      </div>
      <h1 className="mt-4 font-display text-3xl text-espresso-900 sm:text-4xl">
        Find My Size
      </h1>
      <p className="mt-2 max-w-prose text-[15px] leading-7 text-espresso-500">
        Tell I-RIS a few body measurements and it will match you against a
        product&apos;s size chart using simple, transparent rules — no AI, no
        guesswork, no body scans.
      </p>

      {loadError ? (
        <div
          role="alert"
          className="mt-8 overflow-hidden rounded-2xl border border-rosewood-600/25 bg-ivory-50"
        >
          <div className="px-6 py-10 text-center">
            <p className="font-display text-xl text-espresso-900">
              We couldn&apos;t load the size guides.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-espresso-500">
              The size database is temporarily unavailable.
            </p>
            <Link
              href="/size"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-espresso-900 px-6 text-sm font-medium text-ivory-50 transition-colors hover:bg-espresso-700"
            >
              Try again
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <SizeFinder
              products={options}
              initialProductId={initialProductId}
              initialMeasurements={initialMeasurements}
              initialSourceLabel={initialSourceLabel}
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-espresso-900/10 bg-ivory-50">
            <div className="px-5 py-5 sm:px-6">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Privacy, always
              </p>
              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-espresso-500">
                {PRIVACY_NOTES.map((note) => (
                  <li key={note} className="flex gap-2.5">
                    <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brass-500" aria-hidden="true" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}