import type { Gender, ProductStatus } from "@prisma/client";

export type SeedCategory = { name: string; slug: string; description: string };
export type SeedBrand = { name: string; slug: string; description: string };
export type SeedColour = { name: string; hex: string };
export type SeedSize = { label: string; sortOrder: number };
export type SeedStore = { code: string; name: string; city: string; address: string };

// Phase 6 — DEMO size charts (illustrative, never official).
// `sizeCharts` is keyed by category slug; each product in that category gets
// rows for the sizes it actually carries. All values are centimetres (cm).
export type SeedSizeChartRow = {
  sizeSlug: string;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  heightCm?: number;
  inseamCm?: number;
};

export type SeedSizeChart = {
  sourceLabel: string;
  rows: SeedSizeChartRow[];
};

export const DEMO_SIZE_CHART_LABEL =
  "Demo size guide (illustrative). Not official brand or TEXVALLEY measurements.";

export const sizeCharts: Record<string, SeedSizeChart> = {
  "mens-shirts": {
    sourceLabel: DEMO_SIZE_CHART_LABEL,
    rows: [
      { sizeSlug: "S", chestCm: 96, heightCm: 170 },
      { sizeSlug: "M", chestCm: 100, heightCm: 175 },
      { sizeSlug: "L", chestCm: 104, heightCm: 180 },
      { sizeSlug: "XL", chestCm: 108, heightCm: 184 },
      { sizeSlug: "XXL", chestCm: 112, heightCm: 188 },
    ],
  },
  "mens-tshirts": {
    sourceLabel: DEMO_SIZE_CHART_LABEL,
    rows: [
      { sizeSlug: "S", chestCm: 98 },
      { sizeSlug: "M", chestCm: 102 },
      { sizeSlug: "L", chestCm: 106 },
      { sizeSlug: "XL", chestCm: 110 },
      { sizeSlug: "XXL", chestCm: 114 },
    ],
  },
  "womens-dresses": {
    sourceLabel: DEMO_SIZE_CHART_LABEL,
    rows: [
      { sizeSlug: "XS", chestCm: 84, waistCm: 64, hipCm: 90 },
      { sizeSlug: "S", chestCm: 88, waistCm: 68, hipCm: 94 },
      { sizeSlug: "M", chestCm: 92, waistCm: 72, hipCm: 98 },
      { sizeSlug: "L", chestCm: 96, waistCm: 78, hipCm: 103 },
      { sizeSlug: "XL", chestCm: 100, waistCm: 84, hipCm: 108 },
    ],
  },
  "womens-kurtas": {
    sourceLabel: DEMO_SIZE_CHART_LABEL,
    rows: [
      { sizeSlug: "XS", chestCm: 85, waistCm: 65, hipCm: 92 },
      { sizeSlug: "S", chestCm: 89, waistCm: 69, hipCm: 96 },
      { sizeSlug: "M", chestCm: 93, waistCm: 73, hipCm: 100 },
      { sizeSlug: "L", chestCm: 97, waistCm: 78, hipCm: 106 },
      { sizeSlug: "XL", chestCm: 101, waistCm: 83, hipCm: 112 },
    ],
  },
  jeans: {
    sourceLabel: DEMO_SIZE_CHART_LABEL,
    rows: [
      { sizeSlug: "S", waistCm: 76, hipCm: 92, inseamCm: 78 },
      { sizeSlug: "M", waistCm: 82, hipCm: 98, inseamCm: 79 },
      { sizeSlug: "L", waistCm: 88, hipCm: 104, inseamCm: 80 },
      { sizeSlug: "XL", waistCm: 94, hipCm: 110, inseamCm: 81 },
      { sizeSlug: "XXL", waistCm: 100, hipCm: 116, inseamCm: 82 },
    ],
  },
};

export type SeedProduct = {
  sku: string;
  slug: string;
  name: string;
  description: string;
  priceInr: number;
  salePriceInr: number | null;
  gender: Gender;
  material: string;
  status: ProductStatus;
  imageUrl: string;
  tryOnAssetUrl: string;
  brandSlug: string;
  categorySlug: string;
  colourSlugs: string[];
  sizeSlugs: string[];
  inventory: { sizeSlug: string; quantity: number }[];
};

export const categories: SeedCategory[] = [
  { name: "Men's Shirts", slug: "mens-shirts", description: "Crisp formal shirts and relaxed linen blends for men." },
  { name: "Men's T-Shirts", slug: "mens-tshirts", description: "Everyday cotton tees and polos in classic fits." },
  { name: "Women's Dresses", slug: "womens-dresses", description: "Contemporary dresses from casual daywear to evening silhouettes." },
  { name: "Women's Kurtas", slug: "womens-kurtas", description: "Artisan-inspired kurtas in cotton, silk and festive weaves." },
  { name: "Sarees", slug: "sarees", description: "Handloom sarees, printed silks and contemporary drapes." },
  { name: "Jeans", slug: "jeans", description: "Reliable denim in relaxed, slim and straight fits for men and women." },
];

export const brands: SeedBrand[] = [
  { name: "I-RIS Studio", slug: "iris-studio", description: "Demo collection curated for the I-RIS mirror experience." },
  { name: "Texvalley Demo Collection", slug: "texvalley-demo", description: "Fictional demonstration pieces shown in the I-RIS catalogue." },
  { name: "I-RIS Essentials", slug: "iris-essentials", description: "Everyday wardrobe essentials designed for the digital try-on demo." },
];

export const colours: SeedColour[] = [
  { name: "Black", hex: "#1c1917" },
  { name: "White", hex: "#f5f5f4" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Beige", hex: "#e7e0d4" },
  { name: "Brown", hex: "#78583a" },
  { name: "Red", hex: "#dc2626" },
  { name: "Green", hex: "#16a34a" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Cream", hex: "#fef3c7" },
];

export const sizes: SeedSize[] = [
  { label: "XS", sortOrder: 1 },
  { label: "S", sortOrder: 2 },
  { label: "M", sortOrder: 3 },
  { label: "L", sortOrder: 4 },
  { label: "XL", sortOrder: 5 },
  { label: "XXL", sortOrder: 6 },
];

export const store: SeedStore = {
  code: "DEMO-STORE-01",
  name: "Texvalley Demo Store",
  city: "Erode",
  address: "123 Fashion Avenue, Demo District, Erode, Tamil Nadu 638001",
};

export const products: SeedProduct[] = [
  {
    sku: "IR-M-SH-001", slug: "blue-linen-formal-shirt", name: "Blue Linen Formal Shirt",
    description: "A breathable linen-blend shirt in deep blue with a tailored fit. Mother-of-pearl buttons, spread collar and a subtle texture that reads expensive without trying.",
    priceInr: 1999, salePriceInr: null, gender: "MEN", material: "Linen blend", status: "ACTIVE",
    imageUrl: "/products/blue-linen-formal-shirt.svg", tryOnAssetUrl: "/products/try-on/blue-linen-formal-shirt.svg",
    brandSlug: "iris-studio", categorySlug: "mens-shirts", colourSlugs: ["Blue"], sizeSlugs: ["S","M","L","XL"],
    inventory: [{ sizeSlug: "S", quantity: 4 }, { sizeSlug: "M", quantity: 5 }, { sizeSlug: "L", quantity: 3 }, { sizeSlug: "XL", quantity: 0 }],
  },
  {
    sku: "IR-M-SH-002", slug: "white-oxford-shirt", name: "White Oxford Shirt",
    description: "A crisp cotton oxford with a relaxed button-down collar. Layered under a blazer or worn untucked with chinos — this is the wardrobe anchor that never stops working.",
    priceInr: 1499, salePriceInr: null, gender: "MEN", material: "Cotton", status: "ACTIVE",
    imageUrl: "/products/white-oxford-shirt.svg", tryOnAssetUrl: "/products/try-on/white-oxford-shirt.svg",
    brandSlug: "iris-essentials", categorySlug: "mens-shirts", colourSlugs: ["White"], sizeSlugs: ["S","M","L","XL","XXL"],
    inventory: [{ sizeSlug: "S", quantity: 6 }, { sizeSlug: "M", quantity: 8 }, { sizeSlug: "L", quantity: 5 }, { sizeSlug: "XL", quantity: 3 }, { sizeSlug: "XXL", quantity: 1 }],
  },
  {
    sku: "IR-M-SH-003", slug: "navy-checkered-shirt", name: "Navy Checkered Shirt",
    description: "A subtle windowpane check on navy cotton. Slim-fit cut with a tapered waist, perfect for smart-casual Friday dressing or weekend brunch.",
    priceInr: 1299, salePriceInr: 999, gender: "MEN", material: "Cotton", status: "ACTIVE",
    imageUrl: "/products/navy-checkered-shirt.svg", tryOnAssetUrl: "/products/try-on/navy-checkered-shirt.svg",
    brandSlug: "texvalley-demo", categorySlug: "mens-shirts", colourSlugs: ["Navy"], sizeSlugs: ["M","L","XL"],
    inventory: [{ sizeSlug: "M", quantity: 2 }, { sizeSlug: "L", quantity: 1 }, { sizeSlug: "XL", quantity: 0 }],
  },
  {
    sku: "IR-M-SH-004", slug: "black-slim-shirt", name: "Black Slim Shirt",
    description: "All-black, no compromise. A fitted poplin shirt with hidden placket details that transition seamlessly from boardroom to evening.",
    priceInr: 1799, salePriceInr: null, gender: "MEN", material: "Poplin cotton", status: "ACTIVE",
    imageUrl: "/products/black-slim-shirt.svg", tryOnAssetUrl: "/products/try-on/black-slim-shirt.svg",
    brandSlug: "iris-studio", categorySlug: "mens-shirts", colourSlugs: ["Black"], sizeSlugs: ["S","M","L","XL"],
    inventory: [{ sizeSlug: "S", quantity: 3 }, { sizeSlug: "M", quantity: 4 }, { sizeSlug: "L", quantity: 2 }, { sizeSlug: "XL", quantity: 1 }],
  },
  {
    sku: "IR-M-TE-001", slug: "grey-polo-tshirt", name: "Grey Classic Polo",
    description: "Piqué cotton polo in heather grey with a ribbed collar and two-button placket. Preppy enough for the office, casual enough for Saturday.",
    priceInr: 999, salePriceInr: null, gender: "MEN", material: "Piqué cotton", status: "ACTIVE",
    imageUrl: "/products/grey-polo-tshirt.svg", tryOnAssetUrl: "/products/try-on/grey-polo-tshirt.svg",
    brandSlug: "iris-essentials", categorySlug: "mens-tshirts", colourSlugs: ["Black"], sizeSlugs: ["S","M","L","XL","XXL"],
    inventory: [{ sizeSlug: "S", quantity: 5 }, { sizeSlug: "M", quantity: 7 }, { sizeSlug: "L", quantity: 6 }, { sizeSlug: "XL", quantity: 4 }, { sizeSlug: "XXL", quantity: 2 }],
  },
  {
    sku: "IR-M-TE-002", slug: "navy-crew-neck-tee", name: "Navy Crew Neck Tee",
    description: "Heavyweight 220 gsm cotton in deep navy. A clean crew-neck with pre-shrunk fabric that keeps its shape wash after wash.",
    priceInr: 799, salePriceInr: null, gender: "MEN", material: "Cotton", status: "ACTIVE",
    imageUrl: "/products/navy-crew-neck-tee.svg", tryOnAssetUrl: "/products/try-on/navy-crew-neck-tee.svg",
    brandSlug: "texvalley-demo", categorySlug: "mens-tshirts", colourSlugs: ["Navy"], sizeSlugs: ["M","L","XL"],
    inventory: [{ sizeSlug: "M", quantity: 3 }, { sizeSlug: "L", quantity: 5 }, { sizeSlug: "XL", quantity: 2 }],
  },
  {
    sku: "IR-M-TE-003", slug: "white-v-neck-tee", name: "White V-Neck Tee",
    description: "A clean V-neck in soft combed cotton. Lightweight enough for layering under a kurta or wearing solo in the heat.",
    priceInr: 799, salePriceInr: 599, gender: "MEN", material: "Combed cotton", status: "ACTIVE",
    imageUrl: "/products/white-v-neck-tee.svg", tryOnAssetUrl: "/products/try-on/white-v-neck-tee.svg",
    brandSlug: "iris-essentials", categorySlug: "mens-tshirts", colourSlugs: ["White"], sizeSlugs: ["S","M","L","XL"],
    inventory: [{ sizeSlug: "S", quantity: 2 }, { sizeSlug: "M", quantity: 1 }, { sizeSlug: "L", quantity: 4 }, { sizeSlug: "XL", quantity: 3 }],
  },
  {
    sku: "IR-M-TE-004", slug: "olive-cotton-tee", name: "Olive Cotton Tee",
    description: "Earth-toned olive cotton with a relaxed fit. Garment-dyed for a slightly worn-in look from day one.",
    priceInr: 899, salePriceInr: null, gender: "MEN", material: "Cotton", status: "ACTIVE",
    imageUrl: "/products/olive-cotton-tee.svg", tryOnAssetUrl: "/products/try-on/olive-cotton-tee.svg",
    brandSlug: "iris-studio", categorySlug: "mens-tshirts", colourSlugs: ["Green"], sizeSlugs: ["M","L","XL"],
    inventory: [{ sizeSlug: "M", quantity: 0 }, { sizeSlug: "L", quantity: 2 }, { sizeSlug: "XL", quantity: 3 }],
  },
  {
    sku: "IR-W-DR-001", slug: "black-wrap-dress", name: "Black Wrap Dress",
    description: "A clean V-neck wrap dress in crepe with a subtle drape. Falls just above the knee — easy enough for the office, polished enough for dinner.",
    priceInr: 2499, salePriceInr: null, gender: "WOMEN", material: "Crepe", status: "ACTIVE",
    imageUrl: "/products/black-wrap-dress.svg", tryOnAssetUrl: "/products/try-on/black-wrap-dress.svg",
    brandSlug: "iris-studio", categorySlug: "womens-dresses", colourSlugs: ["Black"], sizeSlugs: ["XS","S","M","L"],
    inventory: [{ sizeSlug: "XS", quantity: 3 }, { sizeSlug: "S", quantity: 5 }, { sizeSlug: "M", quantity: 4 }, { sizeSlug: "L", quantity: 2 }],
  },
  {
    sku: "IR-W-DR-002", slug: "red-midi-dress", name: "Red Midi Dress",
    description: "A statement red midi in georgette with a fitted bodice and flowing skirt. For the moments when you want to be remembered.",
    priceInr: 2999, salePriceInr: 2499, gender: "WOMEN", material: "Georgette", status: "ACTIVE",
    imageUrl: "/products/red-midi-dress.svg", tryOnAssetUrl: "/products/try-on/red-midi-dress.svg",
    brandSlug: "texvalley-demo", categorySlug: "womens-dresses", colourSlugs: ["Red"], sizeSlugs: ["XS","S","M","L"],
    inventory: [{ sizeSlug: "XS", quantity: 2 }, { sizeSlug: "S", quantity: 1 }, { sizeSlug: "M", quantity: 3 }, { sizeSlug: "L", quantity: 0 }],
  },
  {
    sku: "IR-W-DR-003", slug: "cream-cotton-day-dress", name: "Cream Cotton Day Dress",
    description: "Easy cotton day dress in warm cream with a gathered waist and pockets. For weekends, errands and doing absolutely nothing in style.",
    priceInr: 1499, salePriceInr: null, gender: "WOMEN", material: "Cotton", status: "ACTIVE",
    imageUrl: "/products/cream-cotton-day-dress.svg", tryOnAssetUrl: "/products/try-on/cream-cotton-day-dress.svg",
    brandSlug: "iris-essentials", categorySlug: "womens-dresses", colourSlugs: ["Cream"], sizeSlugs: ["S","M","L","XL"],
    inventory: [{ sizeSlug: "S", quantity: 4 }, { sizeSlug: "M", quantity: 6 }, { sizeSlug: "L", quantity: 3 }, { sizeSlug: "XL", quantity: 1 }],
  },
  {
    sku: "IR-W-KT-001", slug: "navy-chanderi-kurta", name: "Navy Chanderi Kurta",
    description: "Handwoven chanderi silk in deep navy with tonal threadwork. A kurta that works for temple visits, office ethnic days and everything between.",
    priceInr: 2499, salePriceInr: null, gender: "WOMEN", material: "Chanderi silk", status: "ACTIVE",
    imageUrl: "/products/navy-chanderi-kurta.svg", tryOnAssetUrl: "/products/try-on/navy-chanderi-kurta.svg",
    brandSlug: "iris-studio", categorySlug: "womens-kurtas", colourSlugs: ["Navy"], sizeSlugs: ["XS","S","M","L","XL"],
    inventory: [{ sizeSlug: "XS", quantity: 3 }, { sizeSlug: "S", quantity: 5 }, { sizeSlug: "M", quantity: 4 }, { sizeSlug: "L", quantity: 2 }, { sizeSlug: "XL", quantity: 1 }],
  },
  {
    sku: "IR-W-KT-002", slug: "beige-cotton-kurta", name: "Beige Cotton Kurta",
    description: "Unbleached cotton in warm beige with a relaxed A-line silhouette. Breathable, forgiving and effortlessly elegant for everyday wear.",
    priceInr: 1499, salePriceInr: 1299, gender: "WOMEN", material: "Cotton", status: "ACTIVE",
    imageUrl: "/products/beige-cotton-kurta.svg", tryOnAssetUrl: "/products/try-on/beige-cotton-kurta.svg",
    brandSlug: "texvalley-demo", categorySlug: "womens-kurtas", colourSlugs: ["Beige"], sizeSlugs: ["S","M","L","XL"],
    inventory: [{ sizeSlug: "S", quantity: 2 }, { sizeSlug: "M", quantity: 1 }, { sizeSlug: "L", quantity: 3 }, { sizeSlug: "XL", quantity: 0 }],
  },
  {
    sku: "IR-W-KT-003", slug: "pink-block-print-kurta", name: "Pink Block Print Kurta",
    description: "Jaipur-inspired block prints on mul-cotton in blush pink. Each piece carries the slight irregularity of hand-printed craft.",
    priceInr: 1999, salePriceInr: null, gender: "WOMEN", material: "Mul-cotton", status: "ACTIVE",
    imageUrl: "/products/pink-block-print-kurta.svg", tryOnAssetUrl: "/products/try-on/pink-block-print-kurta.svg",
    brandSlug: "iris-studio", categorySlug: "womens-kurtas", colourSlugs: ["Pink"], sizeSlugs: ["XS","S","M","L"],
    inventory: [{ sizeSlug: "XS", quantity: 4 }, { sizeSlug: "S", quantity: 6 }, { sizeSlug: "M", quantity: 5 }, { sizeSlug: "L", quantity: 3 }],
  },
  {
    sku: "IR-W-KT-004", slug: "green-silk-kurta", name: "Green Silk Kurta",
    description: "A rich emerald silk kurta with gold zari piping. Designed for festive dinners and celebrations that call for a touch of opulence.",
    priceInr: 2999, salePriceInr: null, gender: "WOMEN", material: "Silk", status: "ACTIVE",
    imageUrl: "/products/green-silk-kurta.svg", tryOnAssetUrl: "/products/try-on/green-silk-kurta.svg",
    brandSlug: "iris-essentials", categorySlug: "womens-kurtas", colourSlugs: ["Green"], sizeSlugs: ["XS","S","M","L","XL"],
    inventory: [{ sizeSlug: "XS", quantity: 2 }, { sizeSlug: "S", quantity: 3 }, { sizeSlug: "M", quantity: 4 }, { sizeSlug: "L", quantity: 2 }, { sizeSlug: "XL", quantity: 1 }],
  },
  {
    sku: "IR-W-SR-001", slug: "cream-organza-saree", name: "Cream Organza Saree",
    description: "Sheer organza in warm cream with a subtle self-weave pattern. A lightweight drape that looks far more expensive than it is.",
    priceInr: 2999, salePriceInr: null, gender: "WOMEN", material: "Organza", status: "ACTIVE",
    imageUrl: "/products/cream-organza-saree.svg", tryOnAssetUrl: "/products/try-on/cream-organza-saree.svg",
    brandSlug: "iris-studio", categorySlug: "sarees", colourSlugs: ["Cream"], sizeSlugs: ["M"],
    inventory: [{ sizeSlug: "M", quantity: 6 }],
  },
  {
    sku: "IR-W-SR-002", slug: "navy-georgette-saree", name: "Navy Georgette Saree",
    description: "Flowing georgette in midnight navy with a contrasting gold border. A saree that drapes beautifully and photographs even better.",
    priceInr: 2499, salePriceInr: 1999, gender: "WOMEN", material: "Georgette", status: "ACTIVE",
    imageUrl: "/products/navy-georgette-saree.svg", tryOnAssetUrl: "/products/try-on/navy-georgette-saree.svg",
    brandSlug: "texvalley-demo", categorySlug: "sarees", colourSlugs: ["Navy"], sizeSlugs: ["M"],
    inventory: [{ sizeSlug: "M", quantity: 2 }],
  },
  {
    sku: "IR-W-SR-003", slug: "pink-printed-saree", name: "Pink Printed Saree",
    description: "Contemporary floral print on soft mul-cotton in blush pink. Pre-draped pallu, zero fuss, maximum impact for festive casuals.",
    priceInr: 1999, salePriceInr: null, gender: "WOMEN", material: "Mul-cotton", status: "ACTIVE",
    imageUrl: "/products/pink-printed-saree.svg", tryOnAssetUrl: "/products/try-on/pink-printed-saree.svg",
    brandSlug: "iris-essentials", categorySlug: "sarees", colourSlugs: ["Pink"], sizeSlugs: ["M"],
    inventory: [{ sizeSlug: "M", quantity: 4 }],
  },
  {
    sku: "IR-B-001", slug: "dark-blue-relaxed-jeans", name: "Dark Blue Relaxed Jeans",
    description: "Dark indigo denim in a relaxed fit with a straight leg. Pre-washed for softness, structured enough to hold a cuff.",
    priceInr: 1999, salePriceInr: null, gender: "UNISEX", material: "Denim", status: "ACTIVE",
    imageUrl: "/products/dark-blue-relaxed-jeans.svg", tryOnAssetUrl: "/products/try-on/dark-blue-relaxed-jeans.svg",
    brandSlug: "iris-studio", categorySlug: "jeans", colourSlugs: ["Blue"], sizeSlugs: ["S","M","L","XL","XXL"],
    inventory: [{ sizeSlug: "S", quantity: 3 }, { sizeSlug: "M", quantity: 5 }, { sizeSlug: "L", quantity: 4 }, { sizeSlug: "XL", quantity: 2 }, { sizeSlug: "XXL", quantity: 1 }],
  },
  {
    sku: "IR-B-002", slug: "black-slim-jeans", name: "Black Slim Jeans",
    description: "A clean black slim-fit jean with just enough stretch. Refined enough to pair with a blazer, comfortable enough for all-day wear.",
    priceInr: 1799, salePriceInr: 1499, gender: "UNISEX", material: "Stretch denim", status: "ACTIVE",
    imageUrl: "/products/black-slim-jeans.svg", tryOnAssetUrl: "/products/try-on/black-slim-jeans.svg",
    brandSlug: "iris-essentials", categorySlug: "jeans", colourSlugs: ["Black"], sizeSlugs: ["S","M","L","XL"],
    inventory: [{ sizeSlug: "S", quantity: 1 }, { sizeSlug: "M", quantity: 2 }, { sizeSlug: "L", quantity: 3 }, { sizeSlug: "XL", quantity: 0 }],
  },
  {
    sku: "IR-B-003", slug: "brown-cord-trousers", name: "Brown Cord Trousers",
    description: "Fine-wale corduroy in warm tobacco brown. A trouser-jean hybrid that sits right between casual and refined.",
    priceInr: 1799, salePriceInr: null, gender: "UNISEX", material: "Corduroy", status: "ACTIVE",
    imageUrl: "/products/brown-cord-trousers.svg", tryOnAssetUrl: "/products/try-on/brown-cord-trousers.svg",
    brandSlug: "texvalley-demo", categorySlug: "jeans", colourSlugs: ["Brown"], sizeSlugs: ["M","L","XL"],
    inventory: [{ sizeSlug: "M", quantity: 0 }, { sizeSlug: "L", quantity: 2 }, { sizeSlug: "XL", quantity: 4 }],
  },
];

export const PRODUCTS_PER_PAGE = 60;
