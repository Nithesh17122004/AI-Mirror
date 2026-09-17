import { PrismaClient } from "@prisma/client";
import {
  categories,
  brands,
  colours,
  sizes,
  store,
  products,
  sizeCharts,
} from "./seed-data.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Texvalley I-RIS — Phase 2 seed\n");

  // Categories
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, description: c.description },
      update: { name: c.name, description: c.description },
    });
  }
  console.log(`  ${categories.length} categories upserted`);

  // Brands
  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      create: { name: b.name, slug: b.slug, description: b.description },
      update: { name: b.name, description: b.description },
    });
  }
  console.log(`  ${brands.length} brands upserted`);

  // Colours
  for (const c of colours) {
    await prisma.colour.upsert({
      where: { name: c.name },
      create: { name: c.name, hex: c.hex },
      update: { hex: c.hex },
    });
  }
  console.log(`  ${colours.length} colours upserted`);

  // Sizes
  for (const s of sizes) {
    await prisma.size.upsert({
      where: { label: s.label },
      create: { label: s.label, sortOrder: s.sortOrder },
      update: { sortOrder: s.sortOrder },
    });
  }
  console.log(`  ${sizes.length} sizes upserted`);

  // Store
  await prisma.store.upsert({
    where: { code: store.code },
    create: store,
    update: { name: store.name, city: store.city, address: store.address },
  });
  console.log("  1 demo store upserted");

  // Products
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));
  const brandMap = new Map(brands.map((b) => [b.slug, b]));
  const sizeMap = new Map(sizes.map((s) => [s.label, s]));

  const demoStore = await prisma.store.findUniqueOrThrow({ where: { code: store.code } });

  for (const p of products) {
    const category = categoryMap.get(p.categorySlug);
    const brand = brandMap.get(p.brandSlug);
    if (!category || !brand) throw new Error(`Missing category/brand for ${p.sku}`);

    const catFull = await prisma.category.findUniqueOrThrow({ where: { slug: p.categorySlug } });
    const brandFull = await prisma.brand.findUniqueOrThrow({ where: { slug: p.brandSlug } });

    await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceInr: p.priceInr,
        salePriceInr: p.salePriceInr,
        currency: "INR",
        gender: p.gender,
        material: p.material,
        status: p.status,
        imageUrl: p.imageUrl,
        tryOnAssetUrl: p.tryOnAssetUrl,
        brandId: brandFull.id,
        categoryId: catFull.id,
        colours: { connect: p.colourSlugs.map((name) => ({ name })) },
        sizes: { connect: p.sizeSlugs.map((label) => ({ label })) },
      },
      update: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceInr: p.priceInr,
        salePriceInr: p.salePriceInr,
        gender: p.gender,
        material: p.material,
        status: p.status,
        imageUrl: p.imageUrl,
        tryOnAssetUrl: p.tryOnAssetUrl,
        brandId: brandFull.id,
        categoryId: catFull.id,
        colours: { set: p.colourSlugs.map((name) => ({ name })) },
        sizes: { set: p.sizeSlugs.map((label) => ({ label })) },
      },
    });

    // Upsert inventory rows for this product
    const productFull = await prisma.product.findUniqueOrThrow({ where: { sku: p.sku } });
    for (const inv of p.inventory) {
      const sizeFull = sizeMap.get(inv.sizeSlug);
      if (!sizeFull) throw new Error(`Missing size ${inv.sizeSlug}`);
      const sizeRecord = await prisma.size.findUniqueOrThrow({ where: { label: inv.sizeSlug } });
      await prisma.inventory.upsert({
        where: { productId_storeId_sizeId: { productId: productFull.id, storeId: demoStore.id, sizeId: sizeRecord.id } },
        create: { productId: productFull.id, storeId: demoStore.id, sizeId: sizeRecord.id, quantity: inv.quantity },
        update: { quantity: inv.quantity },
      });
    }

    // Phase 6 — size chart (rows filtered to the sizes this product carries).
    // DEMO charts are upserted under the DEMO source; nothing here claims to
    // be an official brand chart.
    const chartTemplate = sizeCharts[p.categorySlug];
    if (chartTemplate) {
      const chart = await prisma.sizeChart.upsert({
        where: { productId: productFull.id },
        create: {
          productId: productFull.id,
          source: "DEMO",
          sourceLabel: chartTemplate.sourceLabel,
        },
        update: { source: "DEMO", sourceLabel: chartTemplate.sourceLabel },
      });
      const chartRows = chartTemplate.rows
        .filter((row) => p.sizeSlugs.includes(row.sizeSlug))
        .sort((a, b) => a.sizeSlug.length - b.sizeSlug.length || a.sizeSlug.localeCompare(b.sizeSlug));
      for (const row of chartRows) {
        const sizeRecord = await prisma.size.findUniqueOrThrow({ where: { label: row.sizeSlug } });
        await prisma.sizeChartRow.upsert({
          where: { chartId_sizeId: { chartId: chart.id, sizeId: sizeRecord.id } },
          create: {
            chartId: chart.id,
            sizeId: sizeRecord.id,
            sortOrder: chartRows.indexOf(row),
            chestCm: row.chestCm,
            waistCm: row.waistCm,
            hipCm: row.hipCm,
            heightCm: row.heightCm,
            inseamCm: row.inseamCm,
          },
          update: {
            sortOrder: chartRows.indexOf(row),
            chestCm: row.chestCm,
            waistCm: row.waistCm,
            hipCm: row.hipCm,
            heightCm: row.heightCm,
            inseamCm: row.inseamCm,
          },
        });
      }
    }
  }
  console.log(`  ${products.length} products + inventory upserted`);

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
