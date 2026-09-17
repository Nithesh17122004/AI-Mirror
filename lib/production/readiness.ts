// Production-readiness classification (Phase 9), pure and DB-free.
//
// The honest triage the Phase-2 demo catalogue needs: SVG placeholder artwork
// is DEMO — it can never be a production VTON garment or real product
// photography. This module classifies asset URLs and aggregates a readable
// readiness report. It never invents or fabricates assets.

export type AssetKind =
  | "missing"
  | "demo-artwork"
  | "photo"
  | "external";

const PHOTO_EXTENSION = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i;

const SVG_HOSTED = /\.svg(\?|#|$)/i;

/**
 * Classify a single product image/garment URL.
 *  - null/""                        -> missing
 *  - *.svg or data:image/svg+xml    -> demo-artwork
 *  - http(s) URL with photo ext     -> photO (assumed real; presence only)
 *  - data:image/(jpeg|png|webp)     -> photo
 *  - any other http(s) URL          -> external (unverifiable here)
 *  - any other relative path        -> photo if photo ext, else external
 */
export function classifyAssetUrl(url: string | null | undefined): AssetKind {
  if (!url || typeof url !== "string" || url.trim() === "") return "missing";
  const value = url.trim();

  if (SVG_HOSTED.test(value) || value.startsWith("data:image/svg")) {
    return "demo-artwork";
  }
  if (value.startsWith("data:image/")) {
    return /^data:image\/(jpe?g|png|webp)/i.test(value) ? "photo" : "external";
  }
  if (/^https?:\/\//i.test(value)) {
    return PHOTO_EXTENSION.test(value) ? "photo" : "external";
  }
  // Relative path (e.g. /products/...).svg already handled above.
  return PHOTO_EXTENSION.test(value) ? "photo" : "external";
}

export type ReadinessProductInput = {
  id: string;
  name: string;
  imageUrl: string | null;
  tryOnAssetUrl: string | null;
};

export type ProductReadiness = {
  id: string;
  name: string;
  imageKind: AssetKind;
  garmentKind: AssetKind;
  /** Ready for production VTON = real garment photo exists. */
  vtonReady: boolean;
  /** Ready for a production storefront = real product photo exists. */
  catalogueReady: boolean;
};

export type ReadinessReport = {
  total: number;
  catalogueReady: number;
  catalogueNotReady: string[];
  vtonReady: number;
  vtonNotReady: string[];
  demoArtworkCount: number;
  garmentphotoCount: number;
  garmentMissingCount: number;
  garmentExternalCount: number;
};

const VTON_READY_KINDS: ReadonlySet<AssetKind> = new Set(["photo", "external"]);
const CATALOGUE_READY_KINDS: ReadonlySet<AssetKind> = new Set(["photo", "external"]);

/**
 * Classify every product and aggregate counts. Exported as pure data so it is
 * unit-testable and safe to run anywhere.
 */
export function classifyProducts(
  products: readonly ReadinessProductInput[]
): { products: ProductReadiness[]; report: ReadinessReport } {
  const classified: ProductReadiness[] = products.map((p) => {
    const imageKind = classifyAssetUrl(p.imageUrl);
    const garmentKind = classifyAssetUrl(p.tryOnAssetUrl);
    return {
      id: p.id,
      name: p.name,
      imageKind,
      garmentKind,
      vtonReady: VTON_READY_KINDS.has(garmentKind),
      catalogueReady: CATALOGUE_READY_KINDS.has(imageKind),
    };
  });

  const cataloguesNotReady = classified
    .filter((p) => !p.catalogueReady)
    .map((p) => p.name);
  const vtonNotReady = classified.filter((p) => !p.vtonReady).map((p) => p.name);

  const report: ReadinessReport = {
    total: classified.length,
    catalogueReady: classified.filter((p) => p.catalogueReady).length,
    catalogueNotReady: cataloguesNotReady,
    vtonReady: classified.filter((p) => p.vtonReady).length,
    vtonNotReady,
    demoArtworkCount: classified.filter((p) => p.garmentKind === "demo-artwork").length,
    garmentphotoCount: classified.filter((p) => p.garmentKind === "photo").length,
    garmentMissingCount: classified.filter((p) => p.garmentKind === "missing").length,
    garmentExternalCount: classified.filter((p) => p.garmentKind === "external").length,
  };

  return { products: classified, report };
}

/** Format a human-readable readiness summary for a CLI/report. */
export function formatReadinessReport(report: ReadinessReport): string {
  const line = (label: string, value: string) => `  ${label.padEnd(28)} ${value}`;
  const rows: string[] = [
    "I-RIS PRODUCTION READINESS (asset classification)",
    "",
    line("Active products", String(report.total)),
    line("Catalogue-ready (real photo)", `${report.catalogueReady}/${report.total}`),
    line("VTON-ready (real garment photo)", `${report.vtonReady}/${report.total}`),
    "",
    "Try-on garment assets:",
    line("Demo SVG artwork", String(report.demoArtworkCount)),
    line("Real garment photos", String(report.garmentphotoCount)),
    line("Missing", String(report.garmentMissingCount)),
    line("External/unverifiable", String(report.garmentExternalCount)),
  ];

  if (report.vtonReady < report.total) {
    rows.push("", "NOT READY FOR PRODUCTION VTON:");
    rows.push(
      "  The remaining products use SVG/demo artwork (or have no garment asset).",
      "  They CANNOT be used as production VTON garments. Photography of the",
      "  actual garments is required before real inference is meaningful."
    );
  } else {
    rows.push("", "All products have a real garment photo (classification only).");
  }

  rows.push("", "This report classifies EXISTING assets. It does not verify GPU");
  rows.push("inference, model weights, or connectivity. Those are covered by the");
  rows.push("'REAL INFRASTRUCTURE STILL REQUIRED' items in the Phase 9 report.");

  return rows.join("\n");
}