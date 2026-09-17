"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogueParams } from "@/lib/products/validation";
import type { FilterOptions } from "@/lib/products/queries";

const GENDERS = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "UNISEX", label: "Unisex" },
] as const;

const PRICE_RANGES = [
  { label: "Under ₹1,000", min: 0, max: 999 },
  { label: "₹1,000 – ₹1,999", min: 1000, max: 1999 },
  { label: "₹2,000 – ₹2,999", min: 2000, max: 2999 },
  { label: "₹3,000 and above", min: 3000, max: undefined },
] as const;

const AVAILABILITY = [
  { value: "in-stock" as const, label: "In stock" },
  { value: "limited" as const, label: "Limited availability" },
  { value: "unavailable" as const, label: "Currently unavailable" },
];

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
] as const;

export function CatalogueFilters({
  params,
  options,
  total,
}: {
  params: CatalogueParams;
  options: FilterOptions;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const buildUrl = React.useCallback(
    (changes: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  const apply = React.useCallback(
    (changes: Record<string, string | undefined>) => {
      router.replace(buildUrl(changes), { scroll: false });
    },
    [router, buildUrl]
  );

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    apply({ search: searchDraft.trim() || undefined });
  };

  const clearAll = () => {
    setSearchDraft("");
    router.replace(pathname, { scroll: false });
  };

  const hasActiveFilters =
    !!params.search ||
    !!params.category ||
    !!params.gender ||
    !!params.colour ||
    !!params.size ||
    params.minPrice !== undefined ||
    params.availability !== undefined;

  const controls = (
    <div className="space-y-7">
      {/* Search */}
      <form role="search" onSubmit={submitSearch}>
        <label htmlFor="catalogue-search" className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Search
        </label>
        <div className="mt-2.5 flex items-center gap-1 rounded-full border border-espresso-900/15 bg-white px-3 py-1.5 transition-colors focus-within:border-espresso-900/40">
          <Search className="h-4 w-4 text-espresso-500" aria-hidden="true" />
          <input
            id="catalogue-search"
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Name, SKU, brand…"
            className="w-full bg-transparent text-sm text-espresso-900 outline-none placeholder:text-espresso-500/70"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft("");
                apply({ search: undefined });
              }}
              aria-label="Clear search"
              className="rounded-full p-1 text-espresso-500 hover:bg-espresso-900/5"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="mt-2 text-[12px] font-semibold text-brass-700 hover:underline"
        >
          Apply search
        </button>
      </form>

      {/* Category */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Category
        </legend>
        <div className="mt-2.5 space-y-1">
          {options.categories.map((c) => {
            const active = params.category === c.slug;
            return (
              <FilterCheck
                key={c.slug}
                label={c.name}
                active={active}
                onChange={() => apply({ category: active ? undefined : c.slug })}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Gender */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Gender
        </legend>
        <div className="mt-2.5 space-y-1">
          {GENDERS.map((g) => {
            const active = params.gender === g.value;
            return (
              <FilterCheck
                key={g.value}
                label={g.label}
                active={active}
                onChange={() => apply({ gender: active ? undefined : g.value })}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Colour */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Colour
        </legend>
        <div className="mt-2.5 space-y-1">
          {options.colours.map((c) => {
            const active = params.colour === c.name;
            return (
              <FilterCheck
                key={c.id}
                label={c.name}
                active={active}
                swatch={c.hex ?? undefined}
                onChange={() => apply({ colour: active ? undefined : c.name })}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Size */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Size
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {options.sizes.map((s) => {
            const active = params.size === s.label;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => apply({ size: active ? undefined : s.label })}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-espresso-900 bg-espresso-900 text-ivory-50"
                    : "border-espresso-900/15 bg-white text-espresso-700 hover:border-espresso-900/40"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Price */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Price
        </legend>
        <div className="mt-2.5 space-y-1">
          {PRICE_RANGES.map((range) => {
            const active =
              params.minPrice === range.min && params.maxPrice === range.max;
            return (
              <FilterCheck
                key={range.label}
                label={range.label}
                active={active}
                onChange={() =>
                  apply({
                    minPrice: active ? undefined : String(range.min),
                    maxPrice: active || range.max === undefined ? undefined : String(range.max),
                  })
                }
              />
            );
          })}
        </div>
      </fieldset>

      {/* Availability */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700">
          Availability
        </legend>
        <div className="mt-2.5 space-y-1">
          {AVAILABILITY.map((a) => {
            const active = params.availability === a.value;
            return (
              <FilterCheck
                key={a.value}
                label={a.label}
                active={active}
                onChange={() => apply({ availability: active ? undefined : a.value })}
              />
            );
          })}
        </div>
      </fieldset>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-rosewood-700 hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-espresso-500" aria-live="polite">
          {total === 0
            ? "No products found"
            : `${total} ${total === 1 ? "product" : "products"}`}
          {params.search && total > 0 && (
            <>
              {" "}
              matching “{params.search}”
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <label
            htmlFor="catalogue-sort"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-700 sr-only sm:not-sr-only"
          >
            Sort
          </label>
          <div className="relative flex-1 sm:flex-none">
            <select
              id="catalogue-sort"
              value={params.sort ?? "featured"}
              onChange={(e) => apply({ sort: e.target.value })}
              className="w-full appearance-none rounded-full border border-espresso-900/15 bg-white py-2 pr-9 pl-4 text-sm font-medium text-espresso-900 outline-none transition-colors focus:border-espresso-900/40 sm:w-auto"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-500"
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-espresso-900/15 bg-white px-4 py-2 text-sm font-semibold text-espresso-900 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rosewood-600 text-[10px] font-bold text-ivory-50">
                {[
                  params.category,
                  params.gender,
                  params.colour,
                  params.size,
                  params.minPrice,
                  params.availability,
                ].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {params.search && (
            <ActiveChip label={`“${params.search}”`} onClear={() => apply({ search: undefined })} />
          )}
          {options.categories.find((c) => c.slug === params.category) && (
            <ActiveChip
              label={options.categories.find((c) => c.slug === params.category)!.name}
              onClear={() => apply({ category: undefined })}
            />
          )}
          {GENDERS.find((g) => g.value === params.gender) && (
            <ActiveChip
              label={GENDERS.find((g) => g.value === params.gender)!.label}
              onClear={() => apply({ gender: undefined })}
            />
          )}
          {options.colours.find((c) => c.name === params.colour) && (
            <ActiveChip label={params.colour!} onClear={() => apply({ colour: undefined })} />
          )}
          {params.size && <ActiveChip label={`Size ${params.size}`} onClear={() => apply({ size: undefined })} />}
          {PRICE_RANGES.find((r) => r.min === params.minPrice && r.max === params.maxPrice) && (
            <ActiveChip
              label={PRICE_RANGES.find((r) => r.min === params.minPrice && r.max === params.maxPrice)!.label}
              onClear={() => apply({ minPrice: undefined, maxPrice: undefined })}
            />
          )}
          {AVAILABILITY.find((a) => a.value === params.availability) && (
            <ActiveChip
              label={AVAILABILITY.find((a) => a.value === params.availability)!.label}
              onClear={() => apply({ availability: undefined })}
            />
          )}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside aria-label="Catalogue filters" className="hidden lg:block">
          <div className="sticky top-28">{controls}</div>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-espresso-900/40 backdrop-blur-sm"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-ivory-50 p-6 pb-8 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl text-espresso-900">Filters</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-espresso-900 hover:bg-espresso-900/5"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {controls}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-7 w-full rounded-full bg-espresso-900 py-3 text-sm font-semibold text-ivory-50"
              >
                Show {total} {total === 1 ? "result" : "results"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FilterCheck({
  label,
  active,
  onChange,
  swatch,
}: {
  label: string;
  active: boolean;
  onChange: () => void;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onChange}
      className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm text-espresso-700 transition-colors hover:bg-espresso-900/[0.04]"
    >
      <span
        className={cn(
          "inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors",
          active ? "border-espresso-900 bg-espresso-900" : "border-espresso-900/25 bg-white"
        )}
      >
        {active && <Check className="h-3 w-3 text-ivory-50" aria-hidden="true" />}
      </span>
      {swatch && (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded-full border border-espresso-900/15"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span className="flex-1">{label}</span>
    </button>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-espresso-900/15 bg-white px-3 py-1 text-xs font-medium text-espresso-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="text-espresso-500 hover:text-rosewood-700"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}