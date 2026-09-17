// Generates local demo product imagery (public/products/*.svg) for Phase 2.
// These are legally-clean, self-made placeholders. Replace with Texvalley-
// approved photography by dropping real files into public/products/ and
// updating the imageUrl / tryOnAssetUrl values in prisma/seed-data.ts.
//
// Usage: node scripts/generate-product-images.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const hex = {
  Blue: "#2f5f9e",
  White: "#f2f0ea",
  Navy: "#1e3a5f",
  Black: "#1c1917",
  Beige: "#d8cdbb",
  Brown: "#78583a",
  Red: "#b4433c",
  Green: "#3f6b45",
  Pink: "#c97a8a",
  Cream: "#f0e3c6",
};

const items = [
  ["blue-linen-formal-shirt", "Blue", "mens-shirts"],
  ["white-oxford-shirt", "White", "mens-shirts"],
  ["navy-checkered-shirt", "Navy", "mens-shirts"],
  ["black-slim-shirt", "Black", "mens-shirts"],
  ["grey-polo-tshirt", "Black", "mens-tshirts"],
  ["navy-crew-neck-tee", "Navy", "mens-tshirts"],
  ["white-v-neck-tee", "White", "mens-tshirts"],
  ["olive-cotton-tee", "Green", "mens-tshirts"],
  ["black-wrap-dress", "Black", "womens-dresses"],
  ["red-midi-dress", "Red", "womens-dresses"],
  ["cream-cotton-day-dress", "Cream", "womens-dresses"],
  ["navy-chanderi-kurta", "Navy", "womens-kurtas"],
  ["beige-cotton-kurta", "Beige", "womens-kurtas"],
  ["pink-block-print-kurta", "Pink", "womens-kurtas"],
  ["green-silk-kurta", "Green", "womens-kurtas"],
  ["cream-organza-saree", "Cream", "sarees"],
  ["navy-georgette-saree", "Navy", "sarees"],
  ["pink-printed-saree", "Pink", "sarees"],
  ["dark-blue-relaxed-jeans", "Blue", "jeans"],
  ["black-slim-jeans", "Black", "jeans"],
  ["brown-cord-trousers", "Brown", "jeans"],
];

function body(c) {
  return `<rect x="225" y="200" width="450" height="620" rx="36" fill="${c}" opacity="0.9"/>
<rect x="225" y="200" width="450" height="620" rx="36" fill="none" stroke="#1c1917" stroke-opacity="0.14"/>`;
}

function mensShirt(c) {
  return body(c);
}

function tee(c) {
  return body(c);
}

function dress(c) {
  return body(c);
}

function kurta(c) {
  return body(c);
}

function saree(c) {
  return body(c);
}

function jeans(c) {
  return body(c);
}

function base({ title, colour, category }) {
  const c = hex[colour] ?? "#1c1917";
  const name = title
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  const shapes = new Map([
    ["mens-shirts", mensShirt],
    ["mens-tshirts", tee],
    ["womens-dresses", dress],
    ["womens-kurtas", kurta],
    ["sarees", saree],
    ["jeans", jeans],
  ]);
  const shape = (shapes.get(category) ?? body)(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="#fdfbf6"/>
  <circle cx="660" cy="150" r="360" fill="${c}" opacity="0.06"/>
  <circle cx="160" cy="1120" r="330" fill="${c}" opacity="0.05"/>
  <path d="M42 110 C 180 20, 300 8, 448 86 L 428 118 C 300 48, 184 44, 64 128 Z" fill="#1c1917" opacity="0.6"/>
  ${shape}
  <text x="60" y="900" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="#1c1917">${name}</text>
  <text x="60" y="948" font-family="Arial, sans-serif" font-size="26" fill="#8a6d2b">TEXVALLEY I-RIS</text>
  <text x="60" y="1120" font-family="Arial, sans-serif" font-size="20" letter-spacing="6" fill="#4a4239">DEMO CATALOGUE PLACEHOLDER</text>
  <text x="60" y="1150" font-family="Arial, sans-serif" font-size="16" fill="#4a4239">Replace with approved product photography.</text>
</svg>`;
}

mkdirSync(join(root, "public", "products", "try-on"), { recursive: true });

let count = 0;
for (const [slug, colour, category] of items) {
  const title = slug;
  const svg = base({ title, colour, category });
  const main = join(root, "public", "products", `${slug}.svg`);
  writeFileSync(main, svg);
  writeFileSync(join(root, "public", "products", "try-on", `${slug}.svg`), svg);
  count += 2;
}

console.log(`Generated ${count} SVG demo assets into public/products/ (product + try-on each).`);