"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav, siteConfig } from "@/lib/site";
import { WishlistLink } from "@/components/wishlist/wishlist-link";

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-baseline gap-2"
      aria-label="Texvalley I-RIS home"
    >
      <span className="text-sm font-bold tracking-[0.22em] text-espresso-900">
        {siteConfig.brand}
      </span>
      <span className="font-display text-2xl font-semibold tracking-tight text-espresso-900">
        {siteConfig.product}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-espresso-900/10 bg-ivory-50/90 backdrop-blur">
      {/* Announcement bar */}
      <div className="bg-espresso-900 text-ivory-50">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-[11px] font-medium tracking-[0.18em] uppercase sm:px-6">
          Guest-first &mdash; no account required
        </p>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {primaryNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-espresso-900/[0.07] text-espresso-900"
                    : "text-espresso-500 hover:bg-espresso-900/[0.05] hover:text-espresso-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <span
            className="hidden items-center rounded-full border border-espresso-900/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-espresso-500 sm:inline-flex"
            title="No sign-in. Save and find favourites on this device."
          >
            No account needed
          </span>
          <Link
            href="/products"
            aria-label="Search products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-espresso-900 transition-colors hover:bg-espresso-900/[0.06]"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <WishlistLink />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-espresso-900 transition-colors hover:bg-espresso-900/[0.06] lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-espresso-900/10 bg-ivory-50 px-4 pt-2 pb-5 lg:hidden"
        >
          <ul className="flex flex-col">
            {primaryNav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium",
                      active
                        ? "bg-espresso-900/[0.07] text-espresso-900"
                        : "text-espresso-500 hover:bg-espresso-900/[0.04]"
                    )}
                  >
                    {item.label}
                    <span aria-hidden="true" className="text-brass-600">
                      &rarr;
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-espresso-900/10 pt-3">
              <p className="px-4 text-xs leading-5 text-espresso-500">
                Guest shopping &mdash; no account, no sign-in. Your wishlist
                lives on this device.
              </p>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}