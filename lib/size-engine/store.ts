// Server-only data access for the size engine (Phase 6).
// Maps the Prisma SizeChart/SizeChartRow models into the framework-free
// SizeChartInput the engine consumes. Never import from client components.
//
// Rows are filtered to the sizes the product actually carries and ordered by
// size so the engine can rely on ascending measurements.

import { db } from "@/lib/db";
import { sizeChartUsableCodes } from "./calculate";
import type { MeasurementCode } from "./types";
import type { SizeChartInput, SizeChartRowInput } from "./types";

type ChartRowWithSize = {
  size: { label: string };
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  heightCm: number | null;
  inseamCm: number | null;
};

function toSizeChartInput(
  rows: ChartRowWithSize[],
  carriedLabels: Set<string>,
  source: "demo" | "brand",
  sourceLabel: string
): SizeChartInput {
  const chartRows: SizeChartRowInput[] = rows
    .filter((row) => carriedLabels.has(row.size.label))
    .map((row) => ({
      sizeLabel: row.size.label,
      chestCm: row.chestCm,
      waistCm: row.waistCm,
      hipCm: row.hipCm,
      heightCm: row.heightCm,
      inseamCm: row.inseamCm,
    }));
  return { source, sourceLabel, rows: chartRows };
}

export type SizeChartForProduct = {
  productName: string;
  /** null when the product exists but has no usable size chart at all. */
  chart: SizeChartInput | null;
};

/**
 * Load a product's size chart. Returns null when the product does not exist
 * (caller turns it into a 404). When the product exists but has no chart,
 * returns a result with `chart: null` so the caller can answer "no size
 * guide" honestly instead of inventing one.
 */
export async function getSizeChartForProduct(
  productId: string
): Promise<SizeChartForProduct | null> {
  const row = await db.product.findFirst({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sizes: { select: { label: true } },
      sizeChart: {
        include: {
          rows: {
            include: { size: { select: { label: true } } },
            orderBy: [
              { size: { sortOrder: "asc" } },
              { size: { label: "asc" } },
            ],
          },
        },
      },
    },
  });

  if (!row) return null;

  if (!row.sizeChart || row.sizeChart.rows.length === 0) {
    return { productName: row.name, chart: null };
  }

  const chart = toSizeChartInput(
    row.sizeChart.rows,
    new Set(row.sizes.map((s) => s.label)),
    row.sizeChart.source === "BRAND" ? "brand" : "demo",
    row.sizeChart.sourceLabel
  );
  if (chart.rows.length === 0) return { productName: row.name, chart: null };
  return { productName: row.name, chart };
}

/** Product picker entry for the Find My Size page. */
export type SizeProductListItem = {
  id: string;
  name: string;
  brandName: string;
  categoryName: string;
  hasChart: boolean;
  chartMeasurements: MeasurementCode[];
  sourceLabel: string;
};

/** All ACTIVE products with their usable chart measurements (one query). */
export async function listSizeProducts(): Promise<SizeProductListItem[]> {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      sizes: { select: { label: true } },
      sizeChart: {
        include: {
          rows: {
            include: { size: { select: { label: true } } },
            orderBy: [
              { size: { sortOrder: "asc" } },
              { size: { label: "asc" } },
            ],
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return rows.map((row) => {
    const carried = new Set(row.sizes.map((s) => s.label));
    if (!row.sizeChart || row.sizeChart.rows.length === 0) {
      return {
        id: row.id,
        name: row.name,
        brandName: row.brand.name,
        categoryName: row.category.name,
hasChart: false,
      chartMeasurements: [],
      sourceLabel: "",
    };
  }
  const chart = toSizeChartInput(
    row.sizeChart.rows,
    carried,
    row.sizeChart.source === "BRAND" ? "brand" : "demo",
    row.sizeChart.sourceLabel
  );
  const measurements = sizeChartUsableCodes(chart);
  return {
    id: row.id,
    name: row.name,
    brandName: row.brand.name,
    categoryName: row.category.name,
    hasChart: measurements.length > 0,
    chartMeasurements: measurements,
    sourceLabel: row.sizeChart.sourceLabel,
  };
  });
}