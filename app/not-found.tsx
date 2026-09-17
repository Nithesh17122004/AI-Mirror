import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <Card>
        <CardContent className="p-10">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ivory-100 text-brass-700">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs font-bold tracking-[0.24em] uppercase text-brass-600">
            Error 404
          </p>
          <h1 className="mt-2 font-display text-3xl">This reflection is missing</h1>
          <p className="mt-2 text-sm leading-6 text-espresso-500">
            The page you&apos;re looking for doesn&apos;t exist or is being
            prepared in a later phase.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">Back home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">Explore products</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
