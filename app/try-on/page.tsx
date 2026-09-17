import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhotoInput } from "@/components/try-on/photo-input";
import { formatINR } from "@/lib/products/format";
import { getProductById } from "@/lib/products/queries";
import { isValidProductLookup } from "@/lib/products/validation";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Try-On" };

const STEPS = ["Product", "Your photo", "Try-on preview"] as const;

export default async function TryOnPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: productId } = await searchParams;

  let selected = null;
  if (productId && isValidProductLookup(productId)) {
    try {
      selected = await getProductById(productId);
    } catch {
      selected = null;
    }
  }

  // Plain serialisable summary for the client photo flow — the product id
  // lives in the URL, so it survives every photo state change and refresh.
  const productSummary = selected
    ? {
        id: selected.id,
        name: selected.name,
        brandName: selected.brandName,
        priceInr: selected.priceInr,
        salePriceInr: selected.salePriceInr,
        imageUrl: selected.imageUrl,
      }
    : null;

  const activeStep = selected ? 1 : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-espresso-500 hover:text-espresso-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back home
      </Link>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
          AI Virtual Try-On
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-espresso-900 sm:text-4xl">
          {selected ? `Try on ${selected.name}` : "Try it on yourself"}
        </h1>
        {/* Progress through the three customer steps. */}
        <ol
          aria-label="Try-on progress"
          className="mt-5 flex items-center gap-2 text-xs font-semibold"
        >
          {STEPS.map((step, index) => {
            const done = index < activeStep;
            const current = index === activeStep;
            return (
              <li key={step} className="flex min-w-0 items-center gap-2">
                <span
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                    done &&
                      "border-brass-600 bg-brass-600 text-white",
                    current &&
                      "border-espresso-900 bg-espresso-900 text-ivory-50",
                    !done &&
                      !current &&
                      "border-espresso-900/20 text-espresso-500"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "truncate",
                    current ? "text-espresso-900" : "text-espresso-500"
                  )}
                >
                  {step}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    className="mx-1 h-px w-6 bg-espresso-900/15 sm:w-10"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {selected && (
        <Card className="mt-6">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
              Selected product
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-espresso-900/10 bg-ivory-100">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.imageUrl}
                    alt={selected.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-brass-600">
                    <Shirt className="h-7 w-7" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700">
                  {selected.brandName}
                </p>
                <p className="mt-1 font-display text-2xl text-espresso-900">
                  {selected.name}
                </p>
                <p className="mt-1 text-sm text-espresso-500">
                  {formatINR(selected.salePriceInr ?? selected.priceInr)} ·{" "}
                  {selected.colours.map((c) => c.name).join(", ")}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-center">
                <Link href={`/products/${selected.id}`}>
                  View details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardContent className="p-6 sm:p-8">
          {!selected && (
            <div className="mb-6 rounded-xl bg-ivory-100 px-4 py-3 text-[13px] leading-6 text-espresso-500">
              <Badge className="mb-2">No product selected</Badge>
              <p>
                Pick a product from the catalogue to pre-select it here —{" "}
                <Link
                  href="/products"
                  className="font-semibold text-brass-700 underline"
                >
                  browse products
                </Link>
                , then tap &ldquo;Try It On&rdquo;. You can still prepare
                your photo below either way.
              </p>
            </div>
          )}

          <PhotoInput
            productId={productSummary?.id ?? null}
            productName={productSummary?.name ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
