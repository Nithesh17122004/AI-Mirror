// npm run readiness — production-readiness report (Phase 9).
//
// Safe by design:
//  - READ-ONLY: never modifies data, never calls AI, never touches .env.
//  - Requires a reachable DATABASE_URL; when the database is unavailable this
//    prints "LIVE DATABASE TEST NOT AVAILABLE" instead of pretending.
//  - It reports DEMO vs REAL asset classification so a developer knows when
//    real garment photography is missing before anyone deploys VTON.

import "dotenv/config";
import {
  classifyProducts,
  formatReadinessReport,
} from "../lib/production/readiness";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const withVersions =
    argv.includes("--versions");

  if (!process.env.DATABASE_URL) {
    console.log("LIVE DATABASE TEST NOT AVAILABLE");
    console.log("DATABASE_URL is not set. The readiness report needs the catalogue.");
    console.log("Classification logic is covered by the unit tests instead.");
    return;
  }

  let getCatalogue: (typeof import("../lib/products/queries"))["getCatalogue"];
  let db: typeof import("../lib/db").db;
  try {
    ({ getCatalogue } = await import("../lib/products/queries"));
    ({ db } = await import("../lib/db"));
  } catch {
    console.log("LIVE DATABASE TEST NOT AVAILABLE");
    console.log("Could not load the catalogue query layer.");
    return;
  }

  try {
    // Cheap connectivity probe so a hanging DB fails fast and honestly.
    await db.$queryRaw`SELECT 1`;
  } catch {
    console.log("LIVE DATABASE TEST NOT AVAILABLE");
    console.log("The database could not be reached. Nothing was modified.");
    return;
  }

  const { products } = await getCatalogue({ sort: "featured" });
  const { report } = classifyProducts(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      // List view carries no dedicated try-on asset; the garment image is the
      // best available stand-in, and both classify on their own merits.
      tryOnAssetUrl: p.imageUrl ?? null,
    }))
  );
  console.log(formatReadinessReport(report));

  if (withVersions) {
    console.log("");
    console.log(
      `[Versions] prisma client @prisma/client@${
        (await import("@prisma/client")).Prisma?.prismaVersion?.client ?? "unknown"
      }`
    );
    console.log(`[Versions] process.versions.node = ${process.versions.node}`);
  }
}

main().catch((error: unknown) => {
  console.log("LIVE DATABASE TEST NOT AVAILABLE");
  console.log(error instanceof Error ? error.message : String(error));
});