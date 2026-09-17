// Server-only data access for the product catalogue.
// Never import these functions from client components.

import { db } from "@/lib/db";
import {
  STORE_CODE,
  type Availability,
  availabilityFromInventory,
  availabilityFromTotal,
} from "@/lib/products/format";
import {
  catalogueParamsSchema,
  type CatalogueParams,
  type SortValue,
} from "@/lib/products/validation";
import type { Gender, Prisma } from "@prisma/client";

export type CatalogueProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  priceInr: number;
  salePriceInr: number | null;
  currency: string;
  gender: Gender;
  material: string | null;
  imageUrl: string | null;
  brandName: string;
  brandSlug: string;
  categorySlug: string;
  categoryName: string;
  colours: { id: string; name: string; hex: string | null }[];
  sizes: { id: string; label: string; sortOrder: number }[];
  totalStock: number;
  maxSizeStock: Record<string, number>;
  availability: Availability;
  availableSizes: string[];
  createdAt: Date;
};

export type ProductDetail = CatalogueProduct & {
  description: string | null;
  tryOnAssetUrl: string | null;
};

const productSelect = {
  id: true,
  sku: true,
  slug: true,
  name: true,
  priceInr: true,
  salePriceInr: true,
  currency: true,
  gender: true,
  material: true,
  imageUrl: true,
  createdAt: true,
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  colours: { select: { id: true, name: true, hex: true } },
  sizes: { select: { id: true, label: true, sortOrder: true } },
  inventories: { select: { id: true, sizeId: true, quantity: true } },
} as const;

const detailSelect = {
  ...productSelect,
  description: true,
  tryOnAssetUrl: true,
} as const;

type CatalogueRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
type DetailRow = Prisma.ProductGetPayload<{ select: typeof detailSelect }>;

const toCatalogueProduct = (p: CatalogueRow): CatalogueProduct => {
  const totalStock = p.inventories.reduce((sum, i) => sum + i.quantity, 0);
  const maxSizeStock: Record<string, number> = {};
  for (const i of p.inventories) {
    maxSizeStock[i.sizeId] = (maxSizeStock[i.sizeId] ?? 0) + i.quantity;
  }
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    priceInr: p.priceInr,
    salePriceInr: p.salePriceInr,
    currency: p.currency,
    gender: p.gender,
    material: p.material,
    imageUrl: p.imageUrl,
    brandName: p.brand.name,
    brandSlug: p.brand.slug,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    colours: p.colours,
    sizes: p.sizes,
    totalStock,
    maxSizeStock,
    availability: availabilityFromInventory(totalStock, p.inventories.length > 0),
    availableSizes: p.sizes
      .filter((s) => (maxSizeStock[s.id] ?? 0) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => s.label),
    createdAt: p.createdAt,
  };
};

const ORDER_BY: Record<SortValue, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ createdAt: "desc" }],
  "price-asc": [{ priceInr: "asc" }, { name: "asc" }],
  "price-desc": [{ priceInr: "desc" }, { name: "asc" }],
  "name-asc": [{ name: "asc" }],
  newest: [{ createdAt: "desc" }],
};

type WhereInput = Record<string, unknown>;

/** Build the Prisma where clause from validated catalogue params. */
function buildWhere(
  params: CatalogueParams,
  availabilityIds: string[] | null
): WhereInput {
  const where: WhereInput = { status: "ACTIVE" };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
      { brand: { is: { name: { contains: params.search, mode: "insensitive" } } } },
      { category: { is: { name: { contains: params.search, mode: "insensitive" } } } },
    ];
  }

  if (params.category) where.category = { is: { slug: params.category } };
  if (params.gender) where.gender = params.gender;
  if (params.colour) where.colours = { some: { name: params.colour } };
  if (params.size) where.sizes = { some: { label: params.size } };

  const price: Record<string, number> = {};
  if (params.minPrice !== undefined) price.gte = params.minPrice;
  if (params.maxPrice !== undefined) price.lte = params.maxPrice;
  if (Object.keys(price).length > 0) where.priceInr = price;

  if (availabilityIds !== null) where.id = { in: availabilityIds };

  return where;
}

/** Product ids that match an availability bucket, or `null` when unfiltered. */
async function availabilityIds(
  availability: Availability
): Promise<string[] | null> {
  if (!availability) return null;
  const groups = await db.inventory.groupBy({
    by: ["productId"],
    where: { store: { code: STORE_CODE } },
    _sum: { quantity: true },
  });
  return groups
    .filter((g) => availabilityFromTotal(g._sum.quantity ?? 0) === availability)
    .map((g) => g.productId);
}

/**
 * Query the catalogue with search + filters + sort. Returns plain,
 * serialisable catalogue products plus facet options for the UI.
 */
export async function getCatalogue(rawParams: CatalogueParams) {
  const params = catalogueParamsSchema.parse(rawParams);
  const ids = params.availability
    ? await availabilityIds(params.availability)
    : null;

  const where = buildWhere(params, ids);
  const sort = params.sort ?? "featured";
  let products = await db.product.findMany({
    where,
    select: productSelect,
    orderBy: ORDER_BY[sort],
    take: 100,
  });

  // Featured: in-stock first, then newest. Uses real inventory data.
  if (sort === "featured") {
    const totals = (p: CatalogueRow) =>
      p.inventories.reduce((s, i) => s + i.quantity, 0);
    products = [...products].sort((a, b) => {
      if ((totals(a) > 0) !== (totals(b) > 0)) return totals(a) > 0 ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  return {
    products: products.map(toCatalogueProduct),
    total: products.length,
    params,
  };
}

/** Detail fetch by id. Returns null when missing. */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  if (!id) return null;
  const row: DetailRow | null = await db.product.findFirst({
    where: { id },
    select: detailSelect,
  });
  if (!row) return null;
  return {
    ...toCatalogueProduct(row),
    description: row.description,
    tryOnAssetUrl: row.tryOnAssetUrl,
  };
}

/** Facet options for the filter UI (must not require a row match to appear). */
export async function getFilterOptions() {
  const [categories, colours, sizes] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    db.colour.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hex: true },
    }),
    db.size.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
  ]);
  return { categories, colours, sizes };
}

export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>;

/** True when the demo catalogue is empty. */
export async function getCatalogueCount(): Promise<number> {
  return db.product.count({ where: { status: "ACTIVE" } });
}