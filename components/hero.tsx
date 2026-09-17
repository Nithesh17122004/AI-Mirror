import Link from "next/link";
import { ArrowRight, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

/** CSS-only fashion-mirror visual — no stock or brand imagery. */
function MirrorVisual() {
  return (
    <div
      role="img"
      aria-label="Illustration of a Texvalley I-RIS digital fashion mirror with size and availability cues"
      className="relative mx-auto w-full max-w-md animate-rise"
    >
      <div className="relative overflow-hidden rounded-t-[999px] rounded-b-[2rem] border border-espresso-900/15 bg-white shadow-[0_30px_60px_-30px_rgba(28,25,23,0.35)]">
        {/* Mirror backdrop */}
        <div className="relative aspect-[3/4] bg-ivory-100">
          <div
            aria-hidden="true"
            className="absolute inset-x-10 top-8 bottom-0 rounded-t-[999px] bg-gradient-to-b from-ivory-200 via-white to-ivory-100"
          />
          {/* Silhouette */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="mt-10 flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-espresso-900/10" />
              <div className="mt-3 h-44 w-36 rounded-t-[3rem] rounded-b-3xl bg-espresso-900/[0.13]" />
              <div className="mt-3 flex gap-2">
                <span className="h-8 w-8 rounded-full bg-brass-200" />
                <span className="h-8 w-8 rounded-full bg-rosewood-600/70" />
                <span className="h-8 w-8 rounded-full bg-espresso-900/20" />
              </div>
            </div>
          </div>
          {/* Scan line */}
          <div
            aria-hidden="true"
            className="absolute inset-x-6 h-10 animate-scan rounded-full border-y-2 border-brass-500/70 bg-brass-500/10"
          />
          {/* Top chip */}
          <div className="absolute top-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-espresso-900 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-ivory-50">
            <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
            MIRROR PREVIEW
          </div>
          {/* Bottom size card */}
          <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-espresso-900/10 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-espresso-500">
                Recommended size
              </p>
              <Sparkles
                className="h-4 w-4 text-brass-600"
                aria-hidden="true"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              {["XS", "S", "M", "L", "XL"].map((s) => (
                <span
                  key={s}
                  className={
                    s === "M"
                      ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-espresso-900 text-xs font-bold text-ivory-50"
                      : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-espresso-900/15 text-xs font-medium text-espresso-500"
                  }
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating availability card */}
      <div className="absolute -right-3 -bottom-6 hidden rounded-2xl border border-espresso-900/10 bg-white p-4 shadow-xl sm:block">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-espresso-900">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-emerald-600"
          />
          In store — Erode
        </p>
        <p className="mt-1 text-xs text-espresso-500">
          Aisle 4 &middot; 3 pieces in M
        </p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pt-20 lg:pb-24">
        <div className="animate-rise">
          <Badge>
            {siteConfig.brand} &middot; {siteConfig.product}
          </Badge>
          <p className="mt-5 text-xs font-bold tracking-[0.28em] uppercase text-brass-600">
            {siteConfig.productFull}
          </p>
          <h1
            id="hero-heading"
            className="mt-3 font-display text-5xl leading-[1.05] font-medium tracking-tight text-espresso-900 sm:text-6xl"
          >
            {siteConfig.slogan}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-espresso-500">
            {siteConfig.supporting}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/try-on">
                Start Your Virtual Try-On
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/products">Explore Products</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-espresso-900/10 pt-6">
            {[
              ["6", "Intelligent features"],
              ["5", "Guided steps"],
              ["1", "Fashion mirror vision"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl text-espresso-900">
                  {value}
                </dd>
                <dd className="mt-1 text-xs leading-5 text-espresso-500">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 flex items-center gap-2 text-xs text-espresso-500">
            <ShieldCheck
              className="h-4 w-4 text-brass-600"
              aria-hidden="true"
            />
            Phase 1 foundation — your photos stay yours. No AI processing yet.
          </p>
        </div>
        <MirrorVisual />
      </div>
    </section>
  );
}
