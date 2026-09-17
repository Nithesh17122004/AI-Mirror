export const siteConfig = {
  brand: "TEXVALLEY",
  product: "I-RIS",
  productFull: "Immersive Retail Intelligence System",
  slogan: "See it. Try it. Style it.",
  supporting:
    "An AI-powered fashion discovery experience designed for the next generation of retail.",
} as const;

export type NavItem = {
  label: string;
  href: string;
};

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "AI Try-On", href: "/try-on" },
  { label: "Live Try-On", href: "/live" },
  { label: "AI Stylist", href: "/stylist" },
  { label: "Find My Size", href: "/size" },
  { label: "Wishlist", href: "/wishlist" },
];
