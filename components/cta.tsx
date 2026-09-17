import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section aria-labelledby="cta-heading" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-espresso-900 px-6 py-14 text-center sm:px-12 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 90% at 50% 0%, rgba(232,213,168,0.22), transparent 70%)",
            }}
          />
          <p className="relative text-xs font-bold tracking-[0.28em] uppercase text-brass-200">
            Texvalley I-RIS
          </p>
          <h2
            id="cta-heading"
            className="relative mx-auto mt-4 max-w-2xl font-display text-4xl font-medium tracking-tight text-ivory-50 sm:text-5xl"
          >
            Experience I-RIS
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base leading-7 text-ivory-50/75">
            Step up to the mirror and discover fashion that fits your body,
            your occasion and your style.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Button asChild size="lg" variant="gold">
              <Link href="/try-on">
                Start Your Virtual Try-On
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
