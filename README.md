# Texvalley I-RIS — Production Readiness (Phase 9)

**I-RIS — Immersive Retail Intelligence System**

> "See it. Try it. Style it."

An AI-powered fashion discovery experience designed for the next generation of retail.

Phase 9 is the **production AI + end-to-end integration** phase: it audits and
hardens every subsystem from Phases 2–8 for real deployment — inventory states,
rate limiting, non-sensitive analytics, provider readiness, an acceptance
`npm run verify`, and honest DEMO / MOCK / REAL surface labels. No real AI or
GPU is ever activated or faked: `TRY_ON_PROVIDER=mock` and
`STYLIST_PROVIDER=mock` remain the defaults, zero AI requests happen during
tests/builds, and every claim that cannot be verified in this sandbox is
reported as `NOT VERIFIED` in `docs/PRODUCTION_CHECKLIST.md`.

Phase 2 adds the **real, Prisma-backed product catalogue**: search, filters, sorting,
product detail pages, availability display, and a demo store inventory seeded via
`prisma seed`. The `/products` route is no longer a placeholder — it queries a
PostgreSQL database. No AI, camera, or real try-on yet.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS 4** + shadcn-style `ui/` primitives (`button`, `card`, `badge`)
- **Lucide icons**
- **Prisma ORM 6** + PostgreSQL — schema, migrations, seed (21 demo products)
- **Zod 4** — server searchParams validation
- **tsx** — runs seed script in CI/local dev
- **React Hook Form** + resolvers (ready for Phase 3 forms)

## Project structure

```text
/app
  /                     Homepage (static)
  /api/try-on           POST endpoint — generates a try-on via the service layer
  /api/analytics        POST endpoint — non-sensitive allowlisted analytics (Phase 9)
  /products             Product catalogue (dynamic, DB-backed)
  /products/[id]        Product detail (dynamic, DB-backed)
  /try-on               Virtual try-on (dynamic, reads ?product param)
  /size                 Find My Size (dynamic, reads ?product param)
  /live, /stylist, /wishlist, /profile — placeholders (static)
/components
  /products             ProductCard, AvailabilityBadge, CatalogueFilters, Breadcrumbs
  /size                 size-finder.tsx (client form), size-result.tsx,
                        measurement-guide.tsx, types.ts (client-safe API shapes)
  /try-on               photo-input.tsx, camera-capture.tsx, photo-preview.tsx,
                        photo-guidelines.tsx, try-on-generator.tsx,
                        use-customer-photo.ts, photo-file.ts, photo-types.ts
  /ui                   shadcn-style primitives
/lib
  /size-engine          types.ts, validate.ts, calculate.ts, explain.ts
                        (pure, DB-free engine) + store.ts (server-only Prisma)
  /products             validation.ts, format.ts, queries.ts (server-only data layer;
                        format.ts owns the 4-state Availability model, Phase 9)
  /try-on               types.ts, service.ts, errors.ts, session-store.ts,
                        validation.ts; providers/ (types.ts, mock.ts, real.ts,
                        self-hosted.ts, index.ts)
  /stylist              types.ts, service.ts, catalogue.ts, intent.ts,
                        verification.ts, errors.ts; providers/ (mock.ts, real.ts,
                        index.ts)
  /wishlist             storage.ts (localStorage, IDs only), validation.ts,
                        catalogue.ts (server-only resolution)
  /personalization      engine.ts (deterministic category/brand/colour scoring)
  /rate-limit           types.ts, token-bucket.ts, store.ts, request.ts
                        (Phase 9: in-memory token bucket, no accounts)
  /analytics            events.ts, record.ts, client.ts
                        (Phase 9: allowlist, non-sensitive, never throws)
  /production           readiness.ts (Phase 9: asset/DEMO/REAL classification)
  cn()                  clsx + tailwind-merge
  db.ts                 Prisma singleton
  site.ts               Brand colours, nav config
  env.ts                Server env validation (Zod, incl. TRY_ON_PROVIDER +
                        FASHN + self-hosted VTON server vars)
/vton-server            Standalone FastAPI inference server for the self-hosted
                        provider (FASHN VTON v1.5 adapter, Dockerfile, contract,
                        retention janitor). Runs on a GPU machine — never in Next.js.
/prisma
  schema.prisma         User, Product, Category, Brand, Colour, Size, Store,
                        Inventory, Wishlist, TryOnSession (Phase 4 provider
                        metadata), Recommendation, AnalyticsEvent + enums
  seed-data.ts          21 products, 6 categories, 3 brands, 10 colours, 6 sizes, 1 store
  seed.ts               Idempotent seed (upserts on every re-run)
  prisma.config.ts      Prisma 6 seed config (ts loader)
  migrations/           Phase 2 schema + Phase 4 TryOnSession + Phase 6 size charts
/tests
  size-engine.test.ts, try-on-providers.test.ts,
  try-on-self-hosted-provider.test.ts, try-on-service.test.ts,
  try-on-validation.test.ts, stylist.test.ts, wishlist.test.ts,
  personalization.test.ts, rate-limit.test.ts, analytics.test.ts,
  readiness.test.ts, integration.test.ts (Phase 9)
/scripts
  generate-product-images.mjs  Generates 42 SVG placeholder product images
  readiness.ts                 Prints the production readiness report (Phase 9)
```

## Getting started

### Prerequisites

- **Node 20+** and npm
- **PostgreSQL** (via Docker, local install, or remote host)

### Install & configure

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string, e.g.:
# DATABASE_URL="postgresql://iris:iris@localhost:5432/iris?schema=public"
```

### Database setup

TEXVALLEY I-RIS runs on **PostgreSQL via Prisma**. Render PostgreSQL (and any
other managed Postgres) is supported — the DATABASE_URL in `.env` simply points
at the remote host.

> **Never** put the real DATABASE_URL, username, or password into README.md,
> source code, tests, logs, screenshots, or reports. `.env` is gitignored and
> is the only place credentials belong.

```bash
# Validate the Prisma schema
npx prisma validate

# Generate the Prisma client
npm run db:generate   # alias for npx prisma generate

# Apply migrations (creates all tables)
#   Local dev (Postgres with shadow-DB + SUPERUSER rights):
npm run db:migrate    # alias for prisma migrate dev
#
#   Managed / hosted Postgres (Render): shadow DBs are unavailable, so use the
#   production deploy command — same migrations, no shadow DB, no reset:
npx prisma migrate deploy

# Seed demo data (21 products, 6 categories, 3 brands, DEMO size charts)
# DEMO charts stay DEMO forever — they are never relabelled as BRAND data.
npm run db:seed       # alias for prisma db seed (tsx prisma/seed.ts)
```

### Run the dev server

```bash
npm run dev   # http://localhost:3000
```

### Other commands

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run build           # production build (DB routes marked force-dynamic)
npm test                # node:test + tsx (185 cases, all DB-free / AI-free)
npm run verify          # typecheck + lint + test + prisma validate + build (Phase 9 acceptance)
npm run readiness       # production readiness report — loads the REAL catalogue from
                        # PostgreSQL (needs a live, seeded DATABASE_URL) and classifies
                        # DEMO vs REAL assets (Phase 9 / Phase 10 DB-backed)
npm start               # serve production build
npm run db:studio       # open Prisma Studio to inspect data
node scripts/generate-product-images.mjs   # regenerate SVG product placeholders
```

## Environment

See `.env.example` (Phase 9 categorises every variable). **There are no
`NEXT_PUBLIC_` variables and no PUBLIC category — everything is server-only
and can never reach the client bundle.** The frontend only ever receives a
provider's public `mode`/`name` for honest DEMO / MOCK / REAL labelling.

```text
DATABASE_URL=           PostgreSQL connection string (SERVER-ONLY, REQUIRED for production)
TRY_ON_PROVIDER=mock    "mock" (default) | "fashn" | "self-hosted" ("real" = legacy alias)  — SERVER-ONLY, OPTIONAL
TRY_ON_API_URL=         FASHN API base URL (SERVER-ONLY, required for fashn only)
TRY_ON_API_KEY=         FASHN API key (SERVER-ONLY, required for fashn only)
VTON_SERVER_URL=        Self-hosted inference server base URL (SERVER-ONLY, required for self-hosted)
VTON_SERVER_API_KEY=    Shared secret to the inference server (SERVER-ONLY, required for self-hosted)
STYLIST_PROVIDER=mock   "mock" (default) | "real" (SERVER-ONLY, OPTIONAL)
STYLIST_API_URL=        OpenAI-compatible chat-completions endpoint (SERVER-ONLY, real only)
STYLIST_API_KEY=        Real stylist API key (SERVER-ONLY, real only)
STYLIST_MODEL=          Model name for the real stylist provider (SERVER-ONLY, OPTIONAL)
NEXTAUTH_SECRET=        Reserved; unused — I-RIS is guest-first (SERVER-ONLY, OPTIONAL, currently unused)
AI_*                    Unused by Phase 9 code paths (SERVER-ONLY, OPTIONAL, reserved)
```

`lib/env.ts` validates these with Zod on the server. Never import it from
client components. The `TRY_ON_PROVIDER` / `STYLIST_PROVIDER` values are read
by the server-side provider registries; the frontend only ever receives the
provider's public mode/name for honest labelling.

## Phase 2 scope

### Implemented

- **Real product catalogue** — `/products` queries PostgreSQL via Prisma
- **Search** — by product name, SKU, brand name, category name (case-insensitive)
- **Filters** — category, gender, colour, size, price range (min/max INR), availability
- **Sorting** — Featured (in-stock first, newest), Newest, Price low→high, Price high→low, Name A→Z
- **Product detail page** — `/products/[id]` with brand, category, gender, colours, sizes, stock display
- **Availability buckets** — 0 = "Currently unavailable", 1–2 = "Limited availability", ≥3 = "In stock"
- **URL-state filters** — all filter/sort/search params live in query string (shareable, back-button works)
- **Responsive filter drawer** — full sidebar on desktop, slide-out drawer on mobile
- **21 demo products** across 6 fashion categories (men's shirts, men's t-shirts, women's dresses, women's kurtas, sarees, jeans)
- **3 demo brands** (I-RIS Studio, Texvalley Demo Collection, I-RIS Essentials)
- **1 demo store** (Texvalley Demo Store, Erode — fictional address, "DEMO-STORE-01")
- **Idempotent seed** — safe to run multiple times (upserts on all fixtures)
- **Graceful DB-unavailable UI** — pages render friendly messages when PostgreSQL is unreachable (no stack traces)
- **Zod validation** on server searchParams — bad/missing values fall back to safe defaults
- **Generate metadata** — dynamic `<title>` and OpenGraph tags on product detail
- **Empty results state** — clear filter button when no products match

### Not implemented (later phases)

- AI try-on, virtual mirror (photo input is ready; no AI processing yet)
- Size engine, body measurements
- Stylist / recommendations
- User accounts, wishlist persistence, checkout
- Inventory business logic (rack locations, restocking, vendor allocation)
- Analytics events
- Favourites, reviews, ratings

## Phase 3 scope — customer photo input

Phase 3 adds the production-quality photo input experience for the future
I-RIS Virtual Try-On. **Phase 3 does not perform AI try-on** — no image
generation, no diffusion models, no AI provider APIs, no segmentation, pose,
face, sizing, or stylist AI. It only collects and previews the photo.

### Implemented

- **Try-on entry flow preserved** — product pages link to
  `/try-on?product=<id>`; the page validates the id, loads the product, keeps
  the selected product visible, and shows a 3-step progress strip
  (Product → Your photo → Try-on preview)
- **File upload** — JPG/JPEG, PNG, WEBP up to 10 MB; validates MIME type
  *and* extension (never one alone), then verifies the bytes actually decode
  as an image. Friendly messages, never raw browser errors:
  "Please upload a JPG, PNG, or WEBP image." /
  "Your image is larger than 10 MB. Please choose a smaller image." /
  "That image could not be loaded. Please try another photo."
- **Full-body guidance** — tips card before upload (face camera, whole body
  visible, good lighting, unobstructed clothing, clear background) with no
  promise of a perfect AI result
- **Large local preview** — "Photo ready" badge, source label
  (upload/camera), Retake / Remove / Continue; preview uses an object URL,
  nothing is uploaded to any server
- **Camera capture** — `navigator.mediaDevices.getUserMedia()` with
  `video: true, audio: false` (microphone never requested); mirror-style
  modal with live preview, big Capture Photo button, Switch Camera
  (`facingMode` user/environment, shown only when 2+ video inputs exist),
  Close, and Escape-to-close
- **Camera hygiene** — every `MediaStreamTrack` stopped on capture, close,
  switch, and unmount; object URLs revoked on replace/remove/unmount
- **Camera failure states** — permission denied ("Camera access is required
  to take a photo." + "Upload a Photo Instead"), no camera / unsupported
  browser / insecure context ("Camera isn't available on this device…"),
  busy camera, switch failure, capture failure — the page never crashes
- **Continue gating** — Continue only exists on a valid preview; it moves to
  a clear Phase-4-ready state ("Photo ready for virtual try-on.") with the
  photo kept in memory for the session, never stored
- **Product context kept** — product id lives in the URL so refreshes and
  state changes never lose it; a refresh resets only the photo (by design —
  photos are never persisted)
- **Accessibility** — labelled controls, `role="dialog"` + `aria-modal`
  camera, `role="alert"` errors, visible focus, keyboard-operable controls,
  `prefers-reduced-motion` respected globally
- **Mobile-first** — large touch targets (min 48–56 px), stacked buttons on
  small screens, no horizontal scrolling, undistorted preview
  (`object-cover` 3/4 mirror frame, `object-contain` photo preview)

### Camera requirements

- **Browser permission** — the customer must grant camera access; denial
  falls back to upload with no crash
- **HTTPS in production** — camera APIs require a secure context; serve the
  app over HTTPS. No insecure workarounds are attempted
- **Development** — `localhost` counts as a secure context, so the camera
  works on `http://localhost:3000` in supported browsers

### Privacy behaviour

- Photos stay on the device: no uploads, no external services, no AI APIs
- Nothing is written to `localStorage`, cookies, or URL parameters
- No image data is logged; error codes only
- The UI states: "Your photo is used to provide the virtual try-on
  experience." and "Camera video is not recorded continuously." It does **not**
  claim immediate deletion — the photo simply lives in page memory until
  removed or the page is left
- No facial recognition, identity, face matching, or biometric features exist

## Phase 4 scope — Virtual Try-On AI (Mock Provider)

Phase 4 wires customer photos (Phase 3) into a generate-on-demand try-on flow
using a pluggable provider architecture. No real AI vendor is integrated;
the bundled **mock provider** (labelled "Demo Preview" in the UI) simulates
the contract a real vendor must fulfil.

### Implemented

- **Provider contract** (`lib/try-on/providers/types.ts`): `VirtualTryOnProvider`
  with `name`, `mode: "demo" | "real"` and `generateTryOn(input)` returning a
  `success | failed` result with `providerRequestId`, `processingMs`, and a
  `resultImageUrl`.
- **Mock provider** (`lib/try-on/providers/mock.ts`): simulated staging +
  generate delays (tunable for tests), returns the product's `tryOnAssetUrl`
  (falling back to `imageUrl`) as the "resulting" garment image.
- **Registry** (`lib/try-on/providers/index.ts`): selects a provider from
  `TRY_ON_PROVIDER` (`mock` default; `fashn`/`real` for the FASHN AI API;
  `self-hosted` for the Phase 5B inference server).
- **Service orchestration** (`lib/try-on/service.ts`): validates presence +
  photo metadata (size ≤ 10 MB, image/jpeg|png|webp, data URL guard), resolves
  the product, calls the provider, and persists only metadata —
  **no customer image bytes ever reach storage or logs**.
- **POST /api/try-on** (`app/api/try-on/route.ts`): Zod-validated request,
  typed error union with HTTP status mapping, graceful 503-family responses when
  the database is unavailable (product resolution fails), structured JSON
  suitable for the UI.
- **TryOnGenerator** (`components/try-on/try-on-generator.tsx`): generate
  button, in-flight lock (duplicate-request prevention), staged status labels,
  "Demo Preview" badge on mock results, retry + choose-different-photo, and a
  full error state. Replaces the Phase 3 placeholder ready-state.
- **Schema**: `TryOnSession` gains `provider`, `providerRequestId`,
  `processingMs`, `inputImageName`, `inputImageSource`, `errorCode`,
  `errorMessage` via `20260917000000_phase4_tryon_provider` migration.
- **Tests** (`tests/`): 20 cases covering the mock provider, service
  orchestration/error mapping, and wire-level Zod validation.
  Runs DB-free via injected product loader + no-op session store; `npm test`.

### Out of scope (Phase 6+)

- AI size recommendation and body measurements
- AI stylist / recommendation engine
- Live generative video / smart mirror hardware
- Analytics events
- Authentication, wishlist persistence, checkout
- Extra real providers beyond FASHN AI API and self-hosted FASHN VTON v1.5.
  Swap-in path for any future vendor: implement `VirtualTryOnProvider` and
  register it in `lib/try-on/providers/index.ts`.
- Server-side photo storage or upload of customer images (privacy by design).
- Body segmentation, pose detection, face recognition, persistence of results.

## Phase 5 scope — Real VTON (FASHN AI API)

Phase 5 adds a real provider implemented against the documented FASHN AI API
(`RealVirtualTryOnProvider` in `lib/try-on/providers/real.ts`). It submits the
person + garment images to FASHN, polls for completion, normalizes the result,
and maps every failure mode into `TryOnError`. `TRY_ON_PROVIDER=fashn` selects
it; `mock` remains the default so no external account/credits are required to
run the app. FASHN usage costs API credits and requires a FASHN account. See
`lib/try-on/providers/real.ts` for the exact documented request/response shape.

## Phase 5B scope — Self-hosted open-source VTON (FASHN VTON v1.5)

Phase 5B adds a free/self-hosted path: the Next.js app talks to your own VTON
inference server (`vton-server/`, FastAPI) via a documented internal contract,
and that server runs an open-source model on a GPU machine. The Next.js app
stays lightweight — it never runs the model.

### Selected model

- **Model:** FASHN VTON v1.5 (`tryon-v1.5` weights, pixel-space MMDiT, maskless)
- **Hugging Face repository:** https://huggingface.co/fashn-ai/fashn-vton-1.5
- **Inference code:** https://github.com/fashn-AI/fashn-vton-1.5
- **License:** Apache-2.0 — **commercial use permitted** (verified on the HF
  model card and the GitHub LICENSE file)
- **Rejected candidates:** IDM-VTON (CC-BY-NC-SA-4.0, non-commercial);
  CatVTON (open commercial-licensing question, GitHub issue #139).
- **GPU requirement (per official docs):** bfloat16, Ampere+ GPUs
  (RTX 30xx/40xx, A100, H100). The 6 GB dev laptop is **not** validated to
  run it — deploy on a remote GPU box.

> **OPEN-SOURCE MODEL ≠ FREE HOSTED INFERENCE.** Apache-2.0 means the model
> can be deployed commercially; it does **not** mean Hugging Face or anyone
> hosts it for free. "Free/low-cost" GPU options (Google Colab, Kaggle,
> HF Spaces/ZeroGPU) have session timeouts, quotas, and sleep/limits — the
> architecture must not depend on a temporary notebook session. See
> `vton-server/README.md` for the current options and their limitations.

### Architecture

```text
Customer browser → Next.js (/api/try-on) → TryOnService
  → SelfHostedVirtualTryOnProvider
    → VTON_SERVER_URL (internal FastAPI contract: POST /try-on + GET /try-on/{id})
      → model adapter (inference/engine.py) → FASHN VTON v1.5 → result image
```

### Internal API contract (documented, not the model's API)

- `POST /try-on` — `{ person_image, garment_image, category }` →
  `202 { job_id }`
- `GET /try-on/{job_id}` → `{ status: processing|completed|failed, result_image_url?, error_message? }`
- `GET /results/{filename}` — temporary result download (retention-limited)
- `GET /health` — model liveness
- Auth: `Authorization: Bearer ${VTON_SERVER_API_KEY}` unless the key is empty
  (private network only).

### Deploying the self-hosted server (GPU machine)

```bash
cd vton-server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m fashn_vton.scripts.download_weights --weights-dir ./weights   # ~2 GB
export VTON_SERVER_API_KEY="change-me"
uvicorn app:app --host 0.0.0.0 --port 8060
```

Docker and installation details are in `vton-server/README.md`. Weights are
gitignored and must never be committed.

### Environment (server-side only)

```text
TRY_ON_PROVIDER=self-hosted
VTON_SERVER_URL=http://192.168.1.50:8060
VTON_SERVER_API_KEY=<shared secret, server-side only>
```

### Privacy

Customer photos are carried in memory (data URL, one POST), decoded on the
inference server in RAM, never logged, never written to disk, never stored in
Prisma, localStorage, cookies, or URLs, and never persisted past the request.
Only the synthetic result is written to disk (`RETENTION_MINUTES`, default 15)
and deleted by the server's janitor. No face recognition, identity matching,
biometrics, or face embeddings exist — the system only performs virtual
clothing try-on.

### Provider matrix

| Provider | `TRY_ON_PROVIDER` | Mode | Cost | Labelled in UI |
|----------|-------------------|------|------|----------------|
| Mock | `mock` (default) | demo | Free, no external calls | "Demo Preview" |
| FASHN AI API | `fashn` (or legacy `real`) | real | API credits | "AI Virtual Try-On" |
| Self-hosted server | `self-hosted` | real | Your GPU compute | "AI Virtual Try-On" |

## Phase 6 scope — Find My Size (deterministic size engine)

Phase 6 adds a **deterministic, explainable** "Find My Size" feature. I-RIS
matches a customer's body measurements against a product's size chart using
simple, transparent, rule-based maths — **no AI, no LLM, no body scans, no
persisted measurements**. Sizing data shipped with the seed is **demonstration
only** and is always labelled as such in the UI and API responses.

### Architecture

```text
Customer browser (/size or /size?product=<id>)
  → SizeFinder (client): product + measurements + unit + fit preference
  → POST /api/size (Zod-validated, server-side product resolution)
      → lib/size-engine/store.ts       Prisma → SizeChartInput (cm only)
      → lib/size-engine/validate.ts    unit conversion + sanity bounds
      → lib/size-engine/calculate.ts   pure recommendSize() (rules)
      → lib/size-engine/explain.ts     human-readable explanation
  → SizeResult: recommended size, confidence, comparison table, disclaimer
```

### Inputs

- **Product** — picked by the customer or via `?product=<id>` (never trusted
  from the client; the API resolves the id itself).
- **Measurements** — Chest/Bust, Waist, Hip, Height, Inseam, in **cm or in**
  (auto-converted). Weight is deliberately **not** used (charts key off body
  measurements). The engine only asks for the measurements each product's
  chart actually supports.
- **Fit preference** — Slim / Regular / Relaxed (see rules below).

### Methodology (the rules, in plain English)

Every chart column must be present and strictly increasing in every size row,
else that column is unusable and no recommendation is fabricated from it. If a
usable measurement is missing, the API returns `insufficient-measurements`
listing what is still needed.

1. The boundary between two adjacent sizes is the **midpoint** of their chart
   values. A measurement "fits" a size when it falls inside that size's band.
2. Columns are extrapolated half a step beyond the smallest/largest row, so a
   customer below/above the whole chart gets `no-suitable-size` (closest size
   reported) instead of a guessed size.
3. The recommended size is the one that fits every usable measurement. When
   measurements point at different sizes (conflict), the least-wrong size is
   chosen and confidence is LOW.
4. **Fit preference applies only when the customer sits exactly between two
   sizes**: Slim → smaller, Relaxed → larger, Regular → closest by total
   distance (ties → smaller). Otherwise the preference is ignored and the UI
   says so.

### Confidence (what each level means — not statistical certainty)

| Level | Meaning |
|-------|---------|
| HIGH | Every measurement falls comfortably inside one size's range. |
| MEDIUM | One measurement is within 1 cm (`BOUNDARY_MARGIN_CM`) of a size boundary, or the customer sits between two sizes. |
| LOW | Measurements conflict (point to different sizes) or information is missing. |

### Privacy

- Measurements exist only for the current request — nothing is stored.
- Measurements never appear in the URL, `localStorage`, cookies, or logs.
- No body scans, no face/body recognition, no biometric data.
- `POST /api/size` accepts JSON; the product is resolved server-side.

### Demo data vs production data

- **Demo charts** (`SizeChartSource = DEMO`) are keyed by category
  (`mens-shirts`, `mens-tshirts`, `womens-dresses`, `womens-kurtas`, `jeans`)
  and state on every row/label + UI + API that they are illustrative, not
  official brand or TEXVALLEY measurements. Saree products deliberately have
  **no chart** — the UI answers "no size guide yet" honestly.
- **Production**: real charts must come from TEXVALLEY/brands
  (`SizeChartSource = BRAND`). Until then the feature must never present demo
  values as official, and never fake a recommendation from missing data.

### API

`POST /api/size` — body `{ productId, fit?, unit?, measurements }`.
Returns `200` with `result.status` ∈ `recommended | insufficient-measurements |
no-suitable-size | no-chart`, plus `explanation`, `confidenceMeaning`,
`disclaimer`, and per-measurement `comparisons` (customer vs chart, boundary
classification). Errors: `400 invalid-request`, `404 missing-product`,
`503 service-unavailable` (retryable), `500` otherwise. No measurements are
ever echoed back into the URL.

### Tests (DB-free)

`tests/size-engine.test.ts` (35 cases) covers schema/unit-conversion
validation, exact boundaries, between-size fit resolution (slim/regular/
relaxed), small/large out-of-range inputs, missing/invalid measurements,
conflicting measurements, single-size charts, comparisons, determinism, and
the unusable-chart / no-chart states — all with plain fixture charts.

## Phase 7 scope — AI Stylist (catalogue-grounded chat)

Phase 7 adds an **AI Stylist** that reads natural-language requests
("a formal shirt under ₹1,500 in my size", "a red dress for a dinner") and
recommends **only real products from the catalogue**. The doctrine behind it:

> The **database is the source of truth**. The provider (LLM or mock) only
> *interprets* the request and *ranks* candidates. It can never invent a
> product, SKU, price, size, colour, brand, discount, or availability — every
> suggestion is re-verified server-side against the real catalogue, and every
> price/category/brand/colour constraint is enforced by data before anything
> is shown.

### Architecture

```text
Browser (/stylist chat)
  → POST /api/stylist { message, conversation[] }        (Zod-validated)
      → StylistService.recommend()
          → intent.buildFacets()      deterministic facets, grounded in real
                                      Category/Brand/Colour records
          → catalogue.queryCatalogueMatches(facets)
                                      ACTIVE products from Prisma; multi-facet +
                                      effective-price filters applied here
          → provider.generate({ message, conversation, catalogue: bounded, facets })
          → verification.verifySuggestions()
                                      drop unknown/inactive ids, dedupe, cap 5,
                                      re-apply every facet against real data
      → { provider, message, recommendations[], facets }
  → recommendation cards link to /products/[id], /size?product=<id>, /try-on?product=<id>
```

### Provider abstraction

The service talks to a `StylistProvider` interface
(`lib/stylist/providers/types.ts`) — never to a vendor. Providers:

| Provider | `STYLIST_PROVIDER` | Mode | Behaviour |
|----------|-------------------|------|-----------|
| **Mock** | `mock` (default) | demo | Deterministic scorer over the grounded catalogue subset. No AI, no network. Same input → same output. |
| **Real LLM** | `real` | real | OpenAI-compatible `/chat/completions` call (boundary only; never called by tests/build, only reachable by explicit config). |

```text
STYLIST_PROVIDER=mock     # "mock" (default) | "real"
STYLIST_API_URL=          # OpenAI-compatible endpoint (real only)
STYLIST_API_KEY=          # server-side only; sent as Authorization: Bearer, never in a prompt
STYLIST_MODEL=
```

The UI always shows which mode is active so a demo is never mistaken for real
AI. The mock is deliberately **not** a real LLM and is labelled as such.

### Catalogue grounding & structured output

- The provider only ever receives a **bounded**, serialised slice (≤ 24 items)
  of the ACTIVE catalogue with real fields only (id, name, brand, category,
  colours, effective price, available sizes, availability).
- Structured output is `{ message, recommendations: [{ productId, reason }] }`,
  validated with **Zod** (`max 5`); malformed responses are rejected
  (`invalid-provider-output`).
- **Product verification**: after the provider responds, every `productId` is
  resolved against the real candidates; unknown / inactive / duplicate ids are
  dropped. If nothing survives, the stylist says so honestly — never a
  fabricated card.
- **Price**: caps are taken only from real currency/budget phrases (₹ / rs /
  inr / "under", "below", "less than", "budget of", "up to") and enforced on
  the **effective selling price** (sale price when active).
- **Category / brand / colour / size**: matched via deterministic keywords
  resolved against the real `Category`/`Brand`/`Colour` records; the final
  filter pass uses those same records, so a suggestion that violates a stated
  constraint is dropped. A colour named by the customer that the catalogue does
  **not** carry produces an honest "we don't carry that colour" reply — no
  silent substitution.
- **Inventory**: availability labels ("in stock") come from real inventory
  data when the database is reachable; the stylist never claims live store
  availability it cannot verify.

### Prompt injection & privacy

- Customer messages are treated as **untrusted data**: the system prompt tells
  the model to ignore attempts to extract secrets / system prompts / config /
  private data and to never emit executable content.
- No secrets are ever placed in an LLM prompt (API keys travel only in the
  `Authorization` header). Structured output is Zod-validated and re-verified;
  model text is never executed.
- **Session-only**: conversation lives in the browser and is sent back for
  context on each turn; nothing is stored server-side. No camera images, no
  biometrics/embeddings, no face/body identity — the stylist works from text +
  the catalogue only.
- The real provider is **not auto-selected**: default is mock; a real model is
  only used after an operator explicitly configures `STYLIST_PROVIDER=real`.
  Tests and builds never perform external AI calls.

### Integration

- Every recommendation links to `/products/<id>`, `/size?product=<id>`
  (Find My Size — the Phase 6 engine stays authoritative and is never
  duplicated here), and `/try-on?product=<id>`.
- The stylist can *suggest* the try-on flow but performs no try-on itself, and
  it can never change prices, stock, or orders (`/api/try-on` and the
  inventory are untouched).

### Tests (DB-free)

`tests/stylist.test.ts` (~40 cases) covers request/message validation,
deterministic facet extraction (categories, price caps incl. sale-price
semantics, colours incl. unsupported-colour honesty, brands, sizes,
availability, multi-turn refinement), verification rules (unknown/inactive id
dropping, dedupe, cap 5, DB-enforced price/category/brand/colour/size
filters), the deterministic mock provider, provider registry selection, and
service orchestration (empty message, catalogue-unavailable, provider failure,
malformed provider output, prompt-injection attempts, honest no-match) — all
with injected fixture catalogues. No database or real LLM is ever called.

## Phase 8 scope — Guest-First Experience (no accounts)

Phase 8 removes every barrier between a visitor and the I-RIS experience.
**Customer accounts are not required for the current I-RIS retail
experience.** There is no registration, email, password, login, OTP, social
login or profile. Anyone can immediately browse, style, size, try on, and save
— on a phone, a website, or a store mirror/kiosk.

### Wishlist (browser-local, product IDs only)

- The guest wishlist lives in browser local storage under `iris-wishlist`.
- **Only product identifiers are stored** — never photos, measurements,
  biometrics, conversations or personal data, and never full product objects.
- `localStorage` is **never trusted as the source of truth for product
  details**. `/wishlist` sends the stored IDs to `POST /api/wishlist`, which:
  1. resolves every ID against the real catalogue,
  2. returns only **ACTIVE** products with fresh prices/stock/availability,
  3. reports missing / inactive / malformed IDs back so the client prunes them
     from local storage immediately.
- Single source of truth for display is always the database.
- The heart toggle on `/products/[id]` saves/removes the local ID with no
  login prompt and no round-trip.

### LocalStorage fallback

- Every read/write is guarded. If storage is unavailable (private browsing,
  restricted storage, quota exceeded) the wishlist silently falls back to
  **in-memory session state**: toggles, count and page all work for that tab,
  the UI says "Storage unavailable — saved for this session only", answers
  nothing crashes.

### Personalisation (deterministic, explicit-only)

- Signals come **only** from explicit session/browser actions: wishlist items
  and recently-viewed products (IDs only, newest-first, capped at 12).
- A pure, deterministic engine (`lib/personalization/engine.ts`) scores the
  real catalogue by **category / brand / colour overlap** against those
  signals. No LLM, no hidden profiles, no inferred sensitive characteristics.
- Recommendations can only rank products it is handed from the live catalogue
  (`getCatalogue`) and never invents products; wishlist/recent items are
  excluded from their own rail.
- Output surfaces as "Inspired by your wishlist" and "Recently viewed" on
  `/wishlist`. No personal data leaves the browser; only product IDs travel
  to the API.

### Account-free AI Stylist / Find My Size / Virtual Try-On

- **AI Stylist** works for guests; conversation stays in the session and a
  refresh may clear it (documented on the page). Nothing is stored.
- **Find My Size** stays request/session-only: measurements are never stored,
  never placed in the URL, cookies or local storage.
- **Virtual Try-On / camera** stay permission-based and session-only: the
  photo is never persisted, never uploaded automatically, no microphone, no
  continuous recording, no biometric profile. `TRY_ON_PROVIDER=mock` is
  unchanged.

### Profile route

The old placeholder "Profile" was renamed **My I-RIS**: a plain informational
page that explains the guest-first model, what stays private, and what lives
on the device. Header/user navigation no longer offers Profile or Sign In;
the wishlist count badge is shown instead, and every page states that no
account is needed.

### Error handling

- invalid/stale stored IDs: verified server-side and pruned;
- database unavailable: `503` with a retryable flag → the page offers "Try
  again" while confirming saved items are still on the device;
- wishlist mutation failure / blocked storage: in-memory fallback, no crash;
- client handles both retryable and non-retryable failures with honest copy.

### Privacy audit (this phase)

- Photos/camera images: not stored. Measurements: not stored. Biometrics:
  never created. AI Stylist conversations: not permanently stored. Wishlist:
  product IDs only. Cookies: unchanged (no new ones). Nothing personal is
  logged server-side by these features.

### Tests (DB-free)

`tests/wishlist.test.ts` (~26 cases) covers storage parsing/degradation
(corrupted JSON, non-arrays, invalid entries, caps, blocked storage),
persistence round-trips, add/remove/toggle/dedupe/prepend algebra, catalogue
verification math (`splitResolved`), request validation (abuse guards), and
privacy constraints (only IDs survive parsing/serialisation).
`tests/personalization.test.ts` (~13 cases) covers preference profiles,
scoring, deterministic ordering, exclusions, limits and the guarantee that
recommendation IDs come only from the provided catalogue.

## Phase 9 scope — Production AI & end-to-end integration

Phase 9 audits and hardens the complete prototype for real deployment while
keeping the experience **guest-first and account-free**, keeping real AI
**opt-in only**, and never faking hardware/network results.

### Inventory: the honest "unknown" state

- `Availability` extends to four states — `in-stock`, `limited`, `unavailable`
  and the new `unknown` (no inventory evidence for the store), driven by
  `availabilityFromInventory(totalStock, hasInventoryRows)` in
  `lib/products/format.ts`.
- `unknown` surfaces on product cards and common rails as "Availability
  unknown" and is **not** a selectable filter (the filter set stays the three
  concrete states; the underlying availability widget also reads `unknown`
  honestly).
- Sellability is explicit: `isSellableAvailability()` = in-stock | limited.
  Wishlist recommendations, the stylist pipeline and mock ranking prefer
  sellable products and never recommend an explicitly unavailable one.

### Rate limiting (no accounts required)

- In-memory token-bucket limiter (`lib/rate-limit/`). Keys are the hashed
  client address shadow from `x-forwarded-for`/`x-real-ip`, so guests are
  protected without accounts and nothing personal is retained.
- `/api/try-on`: 3 burst, 2/min refill. `/api/stylist`: 6 burst, 6/min refill.
  429 responses carry `Retry-After` + `X-RateLimit-*`; the limiter **never
  throws** and can fail open.
- Production note: multi-instance deployments must swap the in-memory store for
  a shared one (e.g. Redis) behind the same `RateLimitStore` interface, and a
  WAF/CDN should rate-limit ahead of the app.

### Analytics (non-sensitive, allowlist-only)

- Events are restrictively allowlisted (`product_view`, `wishlist_add`,
  `wishlist_remove`, `try_on_started`, `try_on_completed`, `try_on_failed`,
  `size_check`, `stylist_request`) — see `lib/analytics/events.ts`.
- The payload is at most a single validated `productId`. No email, photo,
  measurements, conversation or biometric data can ever be recorded; extra JSON
  keys are stripped by Zod before storage.
- A session id is ephemeral (in-memory, per page view, never a cookie or
  `localStorage`). `recordAnalyticsEvent` never throws and never blocks the
  customer flow; `/api/analytics` returns 204 even when the database is down.

### Provider readiness & honest surface labels

- `npm run readiness` prints a production-readiness report:
  DEMO vs REAL garment photography, VTON-try-on-ready products, and a
  `LIVE DATABASE TEST NOT AVAILABLE` line when PostgreSQL is unreachable
  (nothing is ever claimed without evidence).
- Loading copy is honest and explicit: "Preparing your virtual try-on…" /
  "Creating your look…" (try-on) and "Styling your look…" (stylist) — a mock
  result is always labelled "Demo Preview", a simulated stylist is always
  labelled "simulated".

### API security audit (this phase)

- Every `/api/*` route re-validated: Zod on the wire, method-safety (OPTIONS
  204), no secrets/stack traces in responses, structured error codes mapped to
  correct HTTP statuses, no `NEXT_PUBLIC_` variables anywhere.
- Secrets live only in `lib/env.ts` (server-only import surface). Real AI
  providers (FASHN, self-hosted VTON, real LLM) are never auto-selected and are
  never called by tests or builds.

### Verification

See "Verification (Phase 9 exit criteria)" below — `npm run verify` are the
Phase 9 acceptance gates.

## Data model (Phase 2 additions)

New to Phase 2 in `prisma/schema.prisma`:

- **Gender** enum: `MEN`, `WOMEN`, `UNISEX`
- **ProductStatus** enum: `ACTIVE`, `INACTIVE`, `COMING_SOON`
- **Product** gains: `sku` (unique), `slug` (unique), `salePriceInr`, `currency`, `gender`,
  `material`, `status`, `imageUrl`, `tryOnAssetUrl`, `images[]`, brand/category FK
  relations (with indexes on `brandId`, `categoryId`, `status`, `gender`)
- **Size** gains: `sortOrder`
- **Inventory** gets: `productId_storeId_sizeId` unique constraint + `storeId` index

## Data model (Phase 6 additions)

New to Phase 6 in `prisma/schema.prisma` (migration
`20260918000000_phase6_size_charts`):

- **SizeChartSource** enum: `DEMO`, `BRAND`
- **SizeChart** — one per product (`productId` unique); `source` +
  `sourceLabel` record whether values are demo or genuine brand data
- **SizeChartRow** — one per carried size with `sortOrder` and nullable
  `chestCm`, `waistCm`, `hipCm`, `heightCm`, `inseamCm` (**always cm**; unique
  `[chartId, sizeId]`)
- **Product.sizeChart** relation + **Size.sizeChartRows** reverse relation

`prisma/seed.ts` upserts DEMO charts (filtered to each product's carried
sizes) for every category except sarees. `npx prisma generate` regenerates the
client after schema changes.

21 seed products (each with 2 image URLs pointing to generated SVGs in `/public/products/`).

## Verification (Phase 9 exit criteria)

The full Phase 9 acceptance gate runs everything in one command:

```bash
npm run verify    # == typecheck + lint + test + prisma validate + build
```

Individual gates (all currently clean):

```bash
npm run typecheck    # clean
npm run lint         # clean
npm test             # 185/185 — size engine, try-on (mock/self-hosted/service/validation),
                     # stylist (facets/verification/mock/service), wishlist, personalisation,
                     # + Phase 9 rate-limit, analytics, readiness, and a DB-free
                     # guest-journey integration suite. Zero real AI/GPU/DB calls.
npx prisma validate  # clean (with .env and prisma.config.ts)
npm run build        # 14 routes listed, all API routes dynamic
```

`npm run readiness` is the **operator** gate (requires a live, seeded
PostgreSQL): run it on a host with the database to see the real DEMO/REAL
artwork report. In this sandbox (no PostgreSQL) it prints
`LIVE DATABASE TEST NOT AVAILABLE` and modifies nothing.

Route behaviour when PostgreSQL is **not** available (this sandbox):

| Route | Status | Behaviour |
|-------|--------|-----------|
| `/` | 200 | Homepage renders (static, no DB) |
| `/products` | 200 | "Catalogue temporarily unavailable" + hint to run seed |
| `/products/<id>` | 200 | "Product Unavailable" + hint to run seed |
| `/try-on?product=<id>` | 200 | Default try-on hero (product lookup fails gracefully) |
| `/size?product=<id>` | 200 | Find My Size (product selector rendered; sizing disabled with clear message) |

Phase 3 adds a client-side photo flow on `/try-on` that works with or
without a database. Manual browser checklist (dev server, photo states are
in-memory so refresh resets them):

1. `/try-on` (no product) → "No product selected" hint + photo entry UI
2. `/try-on?product=<valid-id>` → product card + progress step 2 + photo entry
3. `/try-on?product=<invalid-id>` → same as (1), no crash
4. Upload JPG / PNG / WEBP → "Photo ready" preview + Retake / Remove / Continue
5. Upload `.txt` / renamed `.gif` → "Please upload a JPG, PNG, or WEBP image."
6. Upload >10 MB image → larger-than-10 MB message
7. Upload corrupt image bytes → "could not be loaded" message
8. Camera: grant → live preview → Capture → preview; deny → permission message
   + "Upload a Photo Instead"; unavailable → unavailable message + upload fallback
9. Capture → camera stops (OS indicator off); Escape / Close stops the stream
10. Preview → Retake (camera photo reopens camera; upload reopens picker),
    Remove (back to entry), Continue ("Photo ready for virtual try-on.")
12. Ready → **Generate try-on** → clean designed ease-in state → "Demo Preview"
    badge + result image + Open in New Tab
13. Generate while one is running → in-flight lock shows a subtle "already in
    progress" hint instead of a second request; button disabled during processing
14. Product replaced by a bad ID mid-session → API surfaces an error card, not a crash
15. Mock provider failure (set `fail: true` in `mock.ts`) → "couldn't be generated"
    card with a working Try Again

Phase 6 manual browser checklist (dev server, DB running + seeded):

1. `/size` → product selector + measurement form + fit preference + "How to measure"
2. `/size?product=<mens-shirt-id>` → that product preselected; chest/height marked "Needed"
3. Enter chest=96, height=165, cm, regular → recommended S, HIGH confidence
4. chest=99 exactly (S/M boundary on the tee chart) + slim → S with alternative M (fit note shown)
5. Chest only on a mens-shirt product → "One more measurement — we still need your height" (no guess)
6. chest=40 (below every chart) → "Outside this range", closest size reported
7. Switch unit to in and enter the same values in inches → same size, converted display
8. Saree product → "No size guide yet" honest state (never invite guessing)
9. Bad productId in URL → selector shows; API 404s cleanly on submit
10. "Start again" resets the form; results announce via aria-live; focus rings visible

Route behaviour with a **live database + seeded data**:

Applies only when PostgreSQL is running and seeded. The catalogue renders product
SKUs and names server-side, so you can sanity-check with curl:

```bash
# Expect 21 products, 4 men's shirts
curl http://localhost:3000/products | grep -o "IR-M-SH" | wc -l
curl "http://localhost:3000/products?category=mens-shirts" | grep -o "IR-M-SH" | wc -l
curl "http://localhost:3000/products?sort=price-asc" | grep -o "salePrice" | wc -l
```

## Limitations

- **No live database in this sandbox** — Docker/WSL virtualization not available;
  verified graceful degradation instead of full DB flow
- **No camera hardware in this sandbox** — camera paths verified by code review
  and graceful-failure rendering; exercise on a real device before launch
- **Photos are session-only** — kept in page memory, lost on refresh by design;
  no persistence, no sharing between tabs
- **SVG product images only** — local placeholders (no copyrighted assets);
  replace with Texvalley-approved photography for production
- **Demo inventory** — stock quantities are fixed seed data; no real restocking logic
- **Demo store** — Erode address is fictional; `DEMO-STORE-01` is the only store code
- **Demo size charts** — illustrative values, not official brand or TEXVALLEY measurements;
  every label, result, and API response says so. Production data must come from the brands.
- **No authentication is required (by design)** — the current I-RIS experience is
  **guest-first**; no user context exists for wishlist, stylist, or try-on. Any
  future accounts would be optional only.
- **Wishlist is device-local** — saved IDs stay in that browser; they don't sync
  across devices (no account to sync with). Clearing browser data clears it.
- **Personalisation is minimal and explicit** — wishlist/recently-viewed based
  (category/brand/colour overlap only); no predictive or inferred profiling.
- **AI Stylist is mock by default** — `STYLIST_PROVIDER=mock` is deterministic and
  clearly labelled "simulated" in the UI; a real model requires an operator to set
  `STYLIST_PROVIDER=real` with configured `STYLIST_API_*`. No external AI calls are
  made by tests or builds.
- **Stylist context is session-only** — conversation lives in the browser tab and is
  lost on refresh by design; nothing is stored server-side.
- **100 product limit** — catalogue query caps at 100 products (adequate for demo; add
  pagination in a later phase)
- **"unknown" availability** — Phase 9 adds a fourth Inventory state; products
  with no inventory rows show "Availability unknown" instead of being guessed.
  Real stock data must be enabled per store for the state to be meaningful.
- **Rate limiting is in-memory** — single-instance only. Multi-instance/edge
  deployments must share a store (Redis) and front the app with a WAF/CDN.
- **Analytics is MVP** — allowlisted product-level events recorded best-effort;
  no dashboard, no query UI, no cross-device identity (by design).
- **Self-hosted VTON results are server-relative** — `next.config.ts` has no
  proxy/rewrite yet, so for self-hosted mode the browser must be able to reach
  `VTON_SERVER_URL`/`/results/...` directly, or a proxy must be added in a
  later phase. The result URLs are therefore `NOT VERIFIED` end-to-end.
- **REAL VTON INFERENCE: NOT VERIFIED** (no GPU in this sandbox) — the mock is
  the default; a FASHN or self-hosted deployment requires real credentials +
  hardware (see `docs/PRODUCTION_CHECKLIST.md`).
- **REAL STYLIST LLM: NOT VERIFIED** — `STYLIST_PROVIDER=mock` is the default;
  a real model requires explicit operator configuration and an endpoint.

## Running tests

All suites use Node's built-in `node:test` runner (via `tsx`), DB-free (injected
loader/store/dictionary/fixture catalogues, pure rules). Phase 9 adds
`tests/rate-limit.test.ts`, `tests/analytics.test.ts`, `tests/readiness.test.ts`
and `tests/integration.test.ts` (the account-free guest journey composed from
real modules — wishlist → validation → personalisation → size → try-on →
stylist — with injected seams). The self-hosted try-on and stylist provider
tests never call a real inference server or LLM; wishlist/personalisation and
analytics tests never touch the browser, database, or network:

```bash
npm test            # 185/185
npm run verify      # typecheck + lint + test + prisma validate + build
```
