import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ruler, ScanFace } from "lucide-react";
import { Breadcrumbs } from "@/components/products/breadcrumbs";
import { AvailabilityBadge } from "@/components/products/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecentlyViewedTracker } from "@/components/wishlist/recently-viewed-tracker";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { formatINR } from "@/lib/products/format";
import { getProductById } from "@/lib/products/queries";
import { isValidProductLookup } from "@/lib/products/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isValidProductLookup(id)) return { title: "Product not found" };
  try {
    const product = await getProductById(id);
    if (!product) return { title: "Product not found" };
    return {
      title: product.name,
      description: product.description ?? `Shop ${product.name} at Texvalley I-RIS.`,
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidProductLookup(id)) notFound();

  let product;
  try {
    product = await getProductById(id);
  } catch {
    return <ProductLoadError />;
  }
  if (!product) notFound();

  const hasSale = product.salePriceInr !== null;
  const price = hasSale ? product.salePriceInr! : product.priceInr;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs
        items={[
          { label: "Shop", href: "/products" },
          { label: product.categoryName, href: `/products?category=${product.categorySlug}` },
          { label: product.name, href: undefined },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Image */}
        <div>
          <div className="relative overflow-hidden rounded-[2rem] border border-espresso-900/10 bg-ivory-100">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <span className="flex aspect-[3/4] w-full items-center justify-center text-brass-600">
                Product image coming soon
              </span>
            )}
            {hasSale && (
              <span className="absolute top-4 left-4 rounded-full bg-rosewood-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ivory-50">
                Sale
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-700">
            {product.brandName}
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-espresso-900 sm:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-espresso-900">{formatINR(price)}</span>
            {hasSale && (
              <>
                <span className="text-xl text-espresso-500 line-through">
                  {formatINR(product.priceInr)}
                </span>
                <span className="rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-semibold text-brass-700">
                  Save {formatINR(product.priceInr - product.salePriceInr!)}
                </span>
              </>
            )}
          </div>

          <div className="mt-4">
            <AvailabilityBadge availability={product.availability} />
          </div>

          <p className="mt-6 leading-7 text-espresso-600">
            {product.description ?? "Details for this piece will be added soon."}
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-espresso-900/10 bg-white p-5 text-sm sm:grid-cols-3">
            <Detail label="SKU">{product.sku}</Detail>
            <Detail label="Material">{product.material ?? "—"}</Detail>
            <Detail label="Gender">
              {product.gender === "MEN" ? "Men" : product.gender === "WOMEN" ? "Women" : "Unisex"}
            </Detail>
            <Detail label="Colour">
              {product.colours.map((c) => c.name).join(" · ") || "—"}
            </Detail>
            <Detail label="Category">{product.categoryName}</Detail>
            <Detail label="Currency">{product.currency}</Detail>
          </dl>

          {/* Sizes */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-espresso-700">
              <Ruler className="h-4 w-4 text-brass-600" aria-hidden="true" />
              Available sizes
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes
                .slice()
                .sort((a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label))
                .map((size) => {
                  const stock = product.maxSizeStock[size.id] ?? 0;
                  return (
                    <span
                      key={size.id}
                      className={`inline-flex h-10 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-semibold ${
                        stock === 0
                          ? "border-espresso-900/10 text-espresso-500/60 line-through"
                          : stock <= 2
                            ? "border-brass-500/40 bg-brass-100/60 text-brass-700"
                            : "border-espresso-900/20 text-espresso-900"
                      }`}
                    >
                      {size.label}
                    </span>
                  );
                })}
            </div>
            <p className="mt-2 text-xs text-espresso-500">
              Sizes with limited stock are highlighted. Unavailable sizes are struck through.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={`/try-on?product=${product.id}`}>
                <ScanFace className="h-4 w-4" aria-hidden="true" />
                Try It On
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/size?product=${product.id}`}>
                Find My Size
              </Link>
            </Button>
            <WishlistButton productId={product.id} size="lg" variant="outline" />
          </div>
          <p className="mt-4 rounded-xl bg-ivory-100 px-4 py-3 text-[13px] leading-6 text-espresso-500">
            No account needed. Saving this piece keeps just its reference on
            this device — nothing personal. Try It On runs on a demo provider.
          </p>

          <RecentlyViewedTracker productId={product.id} />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-espresso-900">{children}</dd>
    </div>
  );
}

function ProductLoadError() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <Card>
        <CardContent className="p-10">
          <h1 className="font-display text-3xl text-espresso-900">
            Couldn&apos;t load this product
          </h1>
          <p className="mt-3 text-sm leading-6 text-espresso-500">
            The product database wasn&apos;t reachable. Please try again shortly.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to products
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}