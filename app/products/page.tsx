import type { Metadata } from "next";
import Link from "next/link";
import { PackageX, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogueFilters } from "@/components/products/catalogue-filters";
import { ProductCard } from "@/components/products/product-card";
import { getCatalogue, getFilterOptions } from "@/lib/products/queries";
import { catalogueParamsSchema } from "@/lib/products/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop the Catalogue" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = catalogueParamsSchema.parse({
    search: raw.search,
    category: raw.category,
    gender: raw.gender,
    colour: raw.colour,
    size: raw.size,
    minPrice: raw.minPrice,
    maxPrice: raw.maxPrice,
    availability: raw.availability,
    sort: raw.sort,
  });

  let data;
  try {
    const [catalogueResult, options] = await Promise.all([
      getCatalogue(params),
      getFilterOptions(),
    ]);
    data = { ...catalogueResult, options };
  } catch {
    return <CatalogueUnavailable />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brass-600">
          Shop · Demo catalogue
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-espresso-900">
          Shop the I-RIS catalogue
        </h1>
        <p className="mt-2 text-sm leading-6 text-espresso-500">
          Demo products seeded for Phase 2. Filters, search and sorting run
          against real database data.
        </p>
      </header>

      <div className="mt-8">
        <CatalogueFilters
          params={data.params}
          options={data.options}
          total={data.total}
        />

        <div className="mt-8 lg:pl-[240px] lg:mt-6">
          {data.products.length === 0 ? (
            <EmptyResults search={params.search} />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyResults({ search }: { search?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-espresso-900/15 bg-white px-6 py-16 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ivory-100 text-brass-700">
        <PackageX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl text-espresso-900">No products found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-espresso-500">
        {search
          ? `Nothing matches “${search}”. Try a different name, SKU or brand.`
          : "No products match the current filters. Try widening your search."}
      </p>
      <div className="mt-6">
        <Button asChild variant="outline">
          <Link href="/products">Clear search &amp; filters</Link>
        </Button>
      </div>
    </div>
  );
}

function CatalogueUnavailable() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brass-600">
          Shop · Demo catalogue
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-espresso-900">
          Shop the I-RIS catalogue
        </h1>
      </header>
      <div className="mt-8 rounded-3xl border border-espresso-900/10 bg-white px-6 py-16 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ivory-100 text-brass-700">
          <ServerOff className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-2xl text-espresso-900">
          The catalogue is temporarily unavailable
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-espresso-500">
          We couldn&apos;t reach the product database. Please check that
          <code className="rounded bg-ivory-100 px-1.5 py-0.5 font-mono text-xs">
            DATABASE_URL
          </code>
          is set and the store is running, then try again.
        </p>
      </div>
    </div>
  );
}