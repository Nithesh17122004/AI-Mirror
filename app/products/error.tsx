"use client";

import * as React from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <Card>
        <CardContent className="p-10">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ivory-100 text-brass-700">
            <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl text-espresso-900">
            The catalogue hit a snag
          </h1>
          <p className="mt-2 text-sm leading-6 text-espresso-500">
            Something went wrong while loading this page. You can try again or
            head back home — no data was affected.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}