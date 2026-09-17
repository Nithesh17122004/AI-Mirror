import {
  BarChart3,
  Compass,
  Ruler,
  ScanFace,
  Store,
  WandSparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ScanFace,
    title: "AI Virtual Try-On",
    description:
      "Preview how a garment drapes and fits on you before stepping into a trial room.",
  },
  {
    icon: Ruler,
    title: "Intelligent Size Recommendation",
    description:
      "Size guidance tuned to Indian fits, fabrics and your measurements.",
  },
  {
    icon: WandSparkles,
    title: "AI Styling",
    description:
      "Complete-the-look suggestions across kurtas, sarees, fusion and festive wear.",
  },
  {
    icon: Compass,
    title: "Smart Product Discovery",
    description:
      "Find pieces by occasion, colour, fabric and silhouette — not endless scrolling.",
  },
  {
    icon: Store,
    title: "Live Store Availability",
    description:
      "See what's actually on the Texvalley floor, aisle by aisle, in real time.",
  },
  {
    icon: BarChart3,
    title: "Retail Intelligence",
    description:
      "Demand, fit and trend signals that help stores stock what shoppers love.",
  },
] as const;

export function Features() {
  return (
    <section aria-labelledby="features-heading" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.24em] uppercase text-brass-600">
            The I-RIS experience
          </p>
          <h2
            id="features-heading"
            className="mt-3 font-display text-3xl font-medium tracking-tight text-espresso-900 sm:text-4xl"
          >
            Designed for how India shops fashion
          </h2>
          <p className="mt-3 text-base leading-7 text-espresso-500">
            Six capabilities, one mirror. Phase 1 lays the foundation — each
            card below describes where the experience is headed.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title}>
              <Card className="h-full transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(28,25,23,0.4)]">
                <CardContent>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ivory-100 text-brass-700">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-xl text-espresso-900">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-espresso-500">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
