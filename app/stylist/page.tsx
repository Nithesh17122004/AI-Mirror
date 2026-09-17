import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, WandSparkles } from "lucide-react";
import { StylistChat } from "@/components/stylist/chat";
import { Badge } from "@/components/ui/badge";
import { getStylistProvider } from "@/lib/stylist/providers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Stylist" };

const PRIVACY_NOTES = [
  "No account needed — the stylist works for guests without sign-in.",
  "Your messages are used for this request only — nothing is stored.",
  "Stories stay in this window and are cleared when you close it; refreshing the page may clear the conversation.",
  "Every recommendation is a real product from today's catalogue — the stylist never invents stock.",
];

export default function StylistPage() {
  const provider = getStylistProvider();
  const isDemo = provider.mode === "demo";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ivory-100 text-brass-700">
          <WandSparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <Badge>
          {isDemo ? "AI stylist · simulated" : "AI stylist · live"}
        </Badge>
      </div>
      <h1 className="mt-4 font-display text-3xl text-espresso-900 sm:text-4xl">
        AI Stylist
      </h1>
      <p className="mt-2 max-w-prose text-[15px] leading-7 text-espresso-500">
        Tell I-RIS the occasion — a wedding, Pongal, office ethnic day — and get
        complete looks styled from the Texvalley floor. {provider.name}.
      </p>

      {isDemo && (
        <p className="mt-3 max-w-prose rounded-xl bg-brass-100 px-4 py-3 text-[13px] leading-6 text-brass-700">
          Currently demonstrating the stylist with deterministic, simulated
          responses. No AI model is involved — but recommendations are always
          built from real catalogue products.
        </p>
      )}

      <div className="mt-6">
        <StylistChat providerMode={provider.mode} providerName={provider.name} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-espresso-900/10 bg-ivory-50">
        <div className="px-5 py-5 sm:px-6">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brass-600">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Privacy, always
          </p>
          <ul className="mt-3 space-y-2 text-[13px] leading-6 text-espresso-500">
            {PRIVACY_NOTES.map((note) => (
              <li key={note} className="flex gap-2.5">
                <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brass-500" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-5 text-espresso-400">
            The stylist works from text and the product catalogue only. It never
            receives camera images, and it can&apos;t change prices, stock, or
            orders. For size help, use{" "}
            <Link href="/size" className="font-semibold text-espresso-600 underline-offset-4 hover:underline">
              Find My Size
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}