"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-ivory-50 px-4 font-sans text-espresso-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ivory-100 text-brass-700">
              <TriangleAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-2xl">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-espresso-500">
              The mirror flickered for a moment. Please try again — none of
              your data was affected.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={reset}>Try again</Button>
              <Button asChild variant="outline">
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </body>
    </html>
  );
}
