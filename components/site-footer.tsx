import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-espresso-900/10 bg-ivory-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="flex items-baseline gap-2">
            <span className="text-xs font-bold tracking-[0.22em] text-espresso-900">
              {siteConfig.brand}
            </span>
            <span className="font-display text-xl font-semibold">
              {siteConfig.product}
            </span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-espresso-500">
            {siteConfig.productFull}. {siteConfig.supporting}
          </p>
        </div>
        <nav aria-label="Shop">
          <h2 className="text-xs font-semibold tracking-[0.18em] uppercase text-espresso-700">
            Shop
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-espresso-500">
            <li>
              <Link className="hover:text-espresso-900" href="/products">
                Explore products
              </Link>
            </li>
            <li>
              <Link className="hover:text-espresso-900" href="/wishlist">
                Wishlist
              </Link>
            </li>
            <li>
              <Link className="hover:text-espresso-900" href="/size">
                Find my size
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Experience">
          <h2 className="text-xs font-semibold tracking-[0.18em] uppercase text-espresso-700">
            Experience
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-espresso-500">
            <li>
              <Link className="hover:text-espresso-900" href="/try-on">
                AI Try-On
              </Link>
            </li>
            <li>
              <Link className="hover:text-espresso-900" href="/live">
                Live Try-On
              </Link>
            </li>
            <li>
              <Link className="hover:text-espresso-900" href="/stylist">
                AI Stylist
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-xs font-semibold tracking-[0.18em] uppercase text-espresso-700">
            Guest first
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-espresso-500">
            <li>
              <Link className="hover:text-espresso-900" href="/profile">
                My I-RIS
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-espresso-500">
            No account, no sign-in. Your wishlist is saved on this device as
            product references only.
          </p>
        </div>
      </div>
      <div className="border-t border-espresso-900/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-espresso-500 sm:px-6">
          &copy; {new Date().getFullYear()} Texvalley I-RIS &mdash; guest-first
          demo. Try-On runs on a demo provider; nothing personal is stored.
        </p>
      </div>
    </footer>
  );
}
