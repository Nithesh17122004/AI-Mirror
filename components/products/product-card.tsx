import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/products/format";
import type { Availability } from "@/lib/products/format";
import { cn } from "@/lib/utils";

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  const styles: Record<Availability, string> = {
    "in-stock": "bg-emerald-50 text-emerald-800 border-emerald-700/20",
    limited: "bg-brass-100 text-brass-700 border-brass-500/30",
    unavailable: "bg-rosewood-600/10 text-rosewood-700 border-rosewood-600/20",
    unknown: "bg-espresso-900/5 text-espresso-700 border-espresso-900/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
        styles[availability],
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          availability === "in-stock" && "bg-emerald-600",
          availability === "limited" && "bg-brass-600",
          availability === "unavailable" && "bg-rosewood-600",
          availability === "unknown" && "bg-espresso-500"
        )}
      />
      {availability === "in-stock"
        ? "In stock"
        : availability === "limited"
          ? "Limited availability"
          : availability === "unknown"
            ? "Availability unknown"
            : "Currently unavailable"}
    </span>
  );
}

export function ProductCard({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    brandName: string;
    priceInr: number;
    salePriceInr: number | null;
    imageUrl: string | null;
    colours: { name: string }[];
    availableSizes: string[];
    availability: Availability;
  };
}) {
  const hasSale = product.salePriceInr !== null;
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(28,25,23,0.4)]">
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-[3/4] overflow-hidden bg-ivory-100"
        aria-label={`View ${product.name}`}
      >
        {product.imageUrl ? (
          // Demo placeholder SVGs. Swap for real product photography +
          // <Image> with an eager/priority policy once approved assets exist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-brass-600">
            <ShoppingBag className="h-8 w-8" aria-hidden="true" />
          </span>
        )}
        {hasSale && (
          <span className="absolute top-3 left-3 rounded-full bg-rosewood-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory-50">
            Sale
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700">
              {product.brandName}
            </p>
            <h3 className="mt-1 font-display text-lg leading-snug text-espresso-900">
              <Link href={`/products/${product.id}`} className="hover:underline">
                {product.name}
              </Link>
            </h3>
          </div>
          <AvailabilityBadge availability={product.availability} className="shrink-0" />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-espresso-900">
            {formatINR(hasSale ? product.salePriceInr! : product.priceInr)}
          </span>
          {hasSale && (
            <span className="text-sm text-espresso-500 line-through">
              {formatINR(product.priceInr)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-espresso-500">
          <span aria-hidden="true">{product.colours.map((c) => c.name).join(" · ") || "Colours"}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {product.availableSizes.map((size) => (
            <span
              key={size}
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-espresso-900/15 px-1.5 text-[10px] font-semibold text-espresso-700"
            >
              {size}
            </span>
          ))}
          {product.availableSizes.length === 0 && (
            <span className="text-xs italic text-espresso-500">No sizes available</span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-espresso-900/10 pt-4">
          <Link
            href={`/products/${product.id}`}
            className="text-[13px] font-semibold text-espresso-900 underline-offset-4 hover:underline"
          >
            View details
          </Link>
          <Link
            href={`/try-on?product=${product.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-espresso-900 px-3.5 py-1.5 text-[12px] font-semibold text-ivory-50 transition-colors hover:bg-espresso-700"
          >
            Try It On
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}