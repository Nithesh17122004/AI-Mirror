import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "My I-RIS" };

export default function MyIrisPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brass-600">
          Guest experience
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-espresso-900">
          My I-RIS
        </h1>
        <p className="mt-3 text-sm leading-6 text-espresso-500">
          Customer accounts are not required for the current I-RIS retail
          experience. Everything you do here — browsing, stylist, sizing,
          trying-on, wishlist — works as a guest, with no sign-in.
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <Card>
          <CardContent className="p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-espresso-700">
              <Heart className="h-4 w-4 text-brass-600" aria-hidden="true" />
              This device&apos;s wishlist
            </h2>
            <p className="mt-3 text-sm leading-6 text-espresso-600">
              Your wishlist is saved on this device as a list of product
              references only, so it comes back on this browser. No photos,
              measurements or personal data are stored with it.
            </p>
            <div className="mt-5">
              <Button asChild variant="outline">
                <Link href="/wishlist">Open my wishlist</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-espresso-700">
              <ShieldCheck className="h-4 w-4 text-brass-600" aria-hidden="true" />
              What stays private
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-espresso-600">
              <li>Photos and camera captures stay in this session only and are never stored.</li>
              <li>Body measurements are request-only — never stored, never in the URL.</li>
              <li>AI Stylist conversation stays in this session and is not permanently stored.</li>
              <li>Nothing about you is logged or profiled server-side.</li>
            </ul>
            <p className="mt-4 rounded-xl bg-ivory-100 px-4 py-3 text-[13px] leading-6 text-espresso-500">
              Extra walk-throughs live on their own pages:
              {" "}
              <Link href="/size" className="underline underline-offset-4 hover:text-espresso-900">
                Find My Size
              </Link>
              ,{" "}
              <Link href="/try-on" className="underline underline-offset-4 hover:text-espresso-900">
                Virtual Try-On
              </Link>
              , and{" "}
              <Link href="/stylist" className="underline underline-offset-4 hover:text-espresso-900">
                AI Stylist
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-espresso-700">
              <Info className="h-4 w-4 text-brass-600" aria-hidden="true" />
              No account, no sign-in
            </h2>
            <p className="mt-3 text-sm leading-6 text-espresso-600">
              There is no login, registration, OTP or password here. A future
              release may add optional accounts for cross-device wishlists — and
              it would only ever be optional.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/products">Start shopping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/stylist">Ask the AI Stylist</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}