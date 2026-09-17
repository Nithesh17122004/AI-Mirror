# I-RIS Production Readiness Checklist (Phase 9)

Every item below is the **verification record** for the Phase 9 audit. Rules:
an item is checked **only** when it was actually verified in this sprint; anything
that needs hardware, credentials, a live database, external AI, or a network
it does not have is recorded explicitly as **NOT VERIFIED** (never "PASS" by
inference). Run `npm run verify` (typecheck, lint, tests, `prisma validate`,
build) after any change.

> Status legend: ✅ VERIFIED · ⛔ **NOT VERIFIED** (blocked by environment) ·
> ⏭ NOT APPLICABLE / by design.

---

## 1. Product catalogue & inventory

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1.1 | Catalogue is real DB data (`/products`, `/products/[id]`), never fixtures | ✅ | `lib/products/queries.ts`; graceful-db-down UI verified |
| 1.2 | Search/filter/sort are Zod-validated server-side | ✅ | `lib/products/validation.ts` |
| 1.3 | Availability is honest 4-state: in-stock / limited / unavailable / **unknown** | ✅ | `lib/products/format.ts` `availabilityFromInventory(total, hasInventoryRows)`; `tests/integration.test.ts` |
| 1.4 | "unknown" is displayed, not silently guessed, and not a bogus filter | ✅ | `components/products/product-card.tsx` badge; filters stay 3 concrete states |
| 1.5 | Only sellable products (in-stock/limited) recommended by rails/stylist/mock | ✅ | `isSellableAvailability`; `lib/wishlist/catalogue.ts`; `lib/stylist/providers/mock.ts`; tested |
| 1.6 | Garment photography is REAL (photos, not demo SVG) | ⛔ **NOT VERIFIED** | All 21 seed products use `/products/*.svg` → readiness = demo-artwork (`npm run readiness`) |
| 1.7 | VTON garment assets are REAL and GPU-quality | ⛔ **NOT VERIFIED** | All `tryOnAssetUrl` are `/products/try-on/*.svg` demo assets |

## 2. Virtual Try-On

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 2.1 | Guest-first: no account, no login, photo never persisted | ✅ | Photo is session-memory only; `use-customer-photo.ts`; Phase 3/4 docs |
| 2.2 | Photo validated (type, size ≤ 10 MB, decodes, data-URL guard) | ✅ | `lib/try-on/validation.ts` + 20 tests |
| 2.3 | `TRY_ON_PROVIDER=mock` default; mock labelled "Demo Preview" | ✅ | `lib/try-on/providers/`; UI badge; registry tests |
| 2.4 | Rate-limited `/api/try-on` (3 burst, 2/min) with 429 + Retry-After | ✅ | `lib/rate-limit/`; `app/api/try-on/route.ts`; `tests/rate-limit.test.ts` |
| 2.5 | Honest clear loading states ("Preparing your virtual try-on…", "Creating your look…") | ✅ | `components/try-on/try-on-generator.tsx` |
| 2.6 | FASHN provider implements the documented API | ✅ | `lib/try-on/providers/real.ts` (code-verified; **not executed**) |
| 2.7 | Self-hosted server contract documented and auth-guarded | ✅ | `vton-server/app.py` Bearer auth, `/health`, retention janitor |
| 2.8 | Self-hosted `/results/{filename}` reachable from the browser | ⛔ **NOT VERIFIED** | `next.config.ts` empty — no proxy/rewrite; result + garment URLs are server-relative |
| 2.9 | REAL VTON inference executed and verified | ⛔ **NOT VERIFIED** | No GPU in sandbox; operator must run on GPU host + generate a real result |
| 2.10 | FFH: person/garment bytes kept out of logs/storage | ✅ | In-memory data URL only; `session-store.ts` stores metadata only |

## 3. AI Stylist

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 3.1 | `STYLIST_PROVIDER=mock` default; simulated label obvious | ✅ | `lib/stylist/providers/mock.ts`; UI badge |
| 3.2 | Grounded, bounded catalogue context (≤ 24 items), never raw DB | ✅ | `lib/stylist/catalogue.ts` `buildCatalogueContext` |
| 3.3 | Every suggestion re-verified against real ACTIVE products + all facets | ✅ | `verifySuggestions`; injected failure test drops invented ids |
| 3.4 | Deterministic intent → facets (categories/brands/colours/price/size) | ✅ | `lib/stylist/intent.ts`; ~40 tests |
| 3.5 | Honest answers: unsupported colour, no-match, price-cap violations | ✅ | tests in `tests/stylist.test.ts` + `tests/integration.test.ts` |
| 3.6 | Prompt-injection guardrails; secrets never in a prompt | ✅ | `lib/stylist/providers/real.ts`; injection test |
| 3.7 | Rate-limited `/api/stylist` (6 burst, 6/min) | ✅ | `lib/rate-limit/`; `app/api/stylist/route.ts` |
| 3.8 | "Styling your look…" visible loading state | ✅ | `components/stylist/chat.tsx` |
| 3.9 | REAL LLM call executed and verified | ⛔ **NOT VERIFIED** | Requires operator-set `STYLIST_PROVIDER=real` + endpoint; never auto-selected |

## 4. Size engine

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 4.1 | Deterministic, explainable, no AI | ✅ | `lib/size-engine/*` pure functions; 35+ tests |
| 4.2 | No fabrication from missing / conflicting / out-of-range data | ✅ | `insufficient-measurements`, `no-suitable-size` paths tested |
| 4.3 | Measurements never stored, never in URL/cookies/logs | ✅ | Request/session-only; code review |
| 4.4 | Demo charts labelled; sarees honestly "no size guide yet" | ✅ | `sourceLabel` + UI disclaimer |
| 4.5 | Real brand chart data loaded | ⛔ **NOT VERIFIED** | Seed is DEMO only; operator must supply `SizeChartSource = BRAND` data |
| 4.6 | `/api/size` anonymous + rate-safe | ✅ | No accounts; light endpoint; OPTIONS 204; analytics `size_check` |

## 5. Wishlist / personalisation / analytics

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 5.1 | Guest wishlist stores product IDs only | ✅ | `lib/wishlist/storage.ts`; privacy tests |
| 5.2 | Server resolves IDs to ACTIVE fresh products; stale IDs pruned | ✅ | `/api/wishlist`; `splitResolved` tests |
| 5.3 | Storage unavailable → in-memory fallback, no crash | ✅ | tests: blocked storage |
| 5.4 | Personalisation deterministic, explicit-signal only, catalogue-bound | ✅ | `lib/personalization/engine.ts` |
| 5.5 | Analytics allowlist-only; payload ≤ 1 product id; no PII | ✅ | `lib/analytics/events.ts`; Zod strips extras; tests |
| 5.6 | Analytics is non-blocking (never throws; 204 when DB down) | ✅ | `lib/analytics/record.ts`; `/api/analytics` |
| 5.7 | No cookies/localStorage for analytics; ephemeral session id | ✅ | `lib/analytics/client.ts` |

## 6. API security / privacy

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 6.1 | Every route Zod-validates and is method-safe (OPTIONS 204) | ✅ | routes: wishlist, size, stylist, try-on, analytics |
| 6.2 | No secrets, stack traces, or NEXT_PUBLIC_ anywhere | ✅ | env audit: 0 `NEXT_PUBLIC_*`; `lib/env.ts` server-only |
| 6.3 | Structured error codes → correct HTTP statuses | ✅ | route error mappers + tests |
| 6.4 | Guest protection without accounts (bounded rate keys, hashed) | ✅ | `lib/rate-limit/request.ts` |
| 6.5 | No personal data logged by any feature | ✅ | code review + analytics design |

## 7. Database / end-to-end

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 7.1 | Schema valid + migrations present | ✅ | `npx prisma validate` clean |
| 7.2 | Live migrations + seed executed against PostgreSQL | ⛔ **NOT VERIFIED** | No Postgres in sandbox; operator: `npm run db:migrate && npm run db:seed` |
| 7.3 | Guest journey works end-to-end against live DB | ⛔ **NOT VERIFIED** | DB-free integration suite passes (185/185); live run needs host DB |
| 7.4 | `npm run readiness` on a seeded host prints a real report | ⛔ **NOT VERIFIED** | Script prints `LIVE DATABASE TEST NOT AVAILABLE` here |

## 8. Verification gates (this sprint)

| Gate | Result |
|------|--------|
| `npm run typecheck` | ✅ clean |
| `npm run lint` | ✅ 0 warnings, 0 errors |
| `npm test` | ✅ 185/185 |
| `npx prisma validate` | ✅ clean |
| `npm run build` | ✅ 14 routes (5 API routes dynamic) |
| **Real AI requests during tests/build/build-page-loads** | **0** (providers both resolve to `mock`) |
| `npm run verify` | ✅ (TypeScript → ESLint → 185 tests → Prisma → build) |

---

## REAL INFRASTRUCTURE STILL REQUIRED (before launch)

1. **GPU inference host** for self-hosted VTON (FASHN VTON v1.5, bfloat16,
   Ampere+) OR a funded FASHN API account with `TRY_ON_API_URL/KEY`.
2. **Real garment photography** (photo assets + matching try-on assets) replacing
   all `/products/*.svg` demo artwork.
3. **Real brand size charts** (`SizeChartSource = BRAND`) supplied by the brands.
4. **PostgreSQL** with live `db:migrate` + `db:seed`; verify routes 7.2–7.4.
5. **Browser-reachable `VTON_SERVER_URL`** or a Next.js proxy/rewrite for
   self-hosted `/results` and garment URLs (currently `NOT VERIFIED`).
6. **Shared rate-limit store** (Redis) + WAF/CDN rate limiting for
   multi-instance deployments (Phase 9 backend is in-memory, single-instance by
   design).
7. **Staff-approved analytics** review before enabling data collection on real
   shoppers (MVP allowlist is deliberately minimal).