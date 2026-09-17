import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlaceholderFeature } from "@/types";

export function PlaceholderPage({
  icon: Icon,
  feature,
}: {
  icon: LucideIcon;
  feature: PlaceholderFeature;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-espresso-500 hover:text-espresso-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back home
      </Link>
      <Card className="mt-6">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ivory-100 text-brass-700">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <Badge>
              <Hourglass className="h-3 w-3" aria-hidden="true" />
              {feature.badge}
            </Badge>
          </div>
          <h1 className="mt-5 font-display text-3xl font-medium tracking-tight text-espresso-900 sm:text-4xl">
            {feature.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-espresso-500">
            {feature.description}
          </p>
          <h2 className="mt-8 text-xs font-bold tracking-[0.2em] uppercase text-espresso-700">
            What to expect
          </h2>
          <ul className="mt-3 space-y-2.5">
            {feature.expectations.map((e) => (
              <li
                key={e}
                className="flex gap-2.5 text-sm leading-6 text-espresso-500"
              >
                <span
                  aria-hidden="true"
                  className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500"
                />
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-xl bg-ivory-100 px-4 py-3 text-[13px] leading-6 text-espresso-500">
            Phase 1 foundation — this page is an honest placeholder. No demo
            data, no simulated results. The working experience arrives in a
            later phase.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/products">
                Explore Products
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
