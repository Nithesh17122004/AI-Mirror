# VTON Production Deploy (Phase 13)

This is the operator runbook for taking virtual try-on (VTON) from the
current honest `mock` default to a real provider. It records, line by
line, what has been **VERIFIED on this host** and what is **REQUIRED on a
GPU host** — nothing below is assumed.

> **Phase 13 headline:**
> `REAL VTON STATUS: NOT VERIFIED`
> This host has no GPU runtime, no CUDA toolkit, no torch, no model
> weights, no real garment photographychers, and no customer photo, so
> real inference was **not executed** here and is **not claimed**.

---

## 1. Reality check of THIS host (recorded, not assumed)

| Item | Actual state on this host |
|---|---|
| GPU present | `NVIDIA GeForce RTX 3050 6GB Laptop GPU` (compute 8.6, VRAM 6 GiB) |
| CUDA toolkit | **NOT on PATH** — `nvcc` not found |
| torch + torch_cuda | **NOT installed** (`vton-server/requirements.txt` exists; no Python env, no torch build) |
| VTON model weights | **0 files >100 MB** in `vton-server` (weights intentionally never downloaded into repo) |
| Real garment photos | **none** — 21 products use demo SVG artwork |
| Real customer photo | **not supplied by operator** |
| Real inference run | **never executed** |

Conclusion: the box has a GPU **card** but none of the software stack
that would let I-RIS call it. `TRY_ON_PROVIDER` therefore correctly stays
at its safe default. The gate is NOT gamed.

---

## 2. Provider contract (already implemented; nothing here is new code)

Virtual try-on is reached through a single registry in
`lib/try-on/providers/index.ts`. The Next.js app never talks to a model
directly; it talks to the provider interface, and the provider talks to
the real inference host. Three providers exist:

- `mock` — simulated, demo-labelled output; **no external request, ever.**
- `fashn` — FASHN AI API (real provider; requires `TRY_ON_PROVIDER=fashn`
  plus `TRY_ON_API_URL` + `TRY_ON_API_KEY`). Run path:
  `POST …/run` → `predictionId` → poll `…/status?predictionId=` →
  `resultImageUrl`.
- `self-hosted` — internal inference server (Phase 5B). Run path:
  `POST {VTON_SERVER_URL}/try-on` → `job_id` → poll
  `GET {VTON_SERVER_URL}/try-on/{id}` → `resultImageUrl`. It only needs
  `VTON_SERVER_URL` (+ optional `VTON_SERVER_API_KEY`).

Selection is server-side only via these **exact** environment names (they
are what `lib/env.ts` reads):

```
TRY_ON_PROVIDER          # "mock" (default) | "fashn" | "self-hosted"
TRY_ON_API_URL           # FASHN base, e.g. https://api.fashn.ai
TRY_ON_API_KEY           # FASHN key (server-only)
VTON_SERVER_URL          # self-hosted base, e.g. http://<gpu-host>:8060
VTON_SERVER_API_KEY      # optional shared secret (server-only)
```

None are `NEXT_PUBLIC_` — they can never reach the browser bundle.

---

## 3. GPU host deployment (self-hosted, preferred — no paid per-job fee)

### 3.1 Hardware floor
- NVIDIA GPU with compute capability ≥ 8.0 (Ampere+) and ≥ 8 GiB VRAM.
  The on-box RTX 3050 6 GB would be marginal for `tryon-v1.6` at 768×1024
  (realistic floor is a 12–24 GiB card such as RTX 4080 / 4090 / RTX
  A4000+).
- Linux (Ubuntu 22.04+ recommended), internet access, and a URL the
  I-RIS server can reach.

### 3.2 CUDA + torch (fail-fast if either cannot install)
```bash
nvidia-smi                        # must list the GPU + a driver
nvcc --version                    # CUDA toolkit must be present
python3 -m venv .venv && source .venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
python -c "import torch; assert torch.cuda.is_available(); print('CUDA OK', torch.version.cuda)"
```

### 3.3 Inference server (`D:\iris\vton-server`)
```bash
cd vton-server && source ../.venv/bin/activate
pip install -r requirements.txt          # pulls open-source model package
# Model weights are fetched ONCE into a weights directory / volume on the
# GPU host. They are intentionally NOT part of the Git repo (~2 GB).
python app.py                            # serves on :8060
```

### 3.4 Connect I-RIS to it (server `.env.gz` on the I-RIS host)
```
TRY_ON_PROVIDER=self-hosted
VTON_SERVER_URL=http://<gpu-host-ip>:8060
VTON_SERVER_API_KEY=                   # optional bearer secret
```
No client bundle change; no rebuild of the try-on page.

---

## 4. Health + readiness contract (must be real, not decorative)

The inference server is required to expose:

- `GET /health` → `{"status":"ready"|"loading"|"failed", …}`.
  `POST /try-on` must return **503** while status is not `ready`.
- The I-RIS app surfaces a **readiness verdict** (see `npm run readiness`)
  that reflects the *configured* provider and the *actual* availability of
  product imagery — honest, never scripted-PASS.

---

## 5. Real inference verification (P1B) — the required evidence

When a GPU + weights + **a real garment photo** + **a real customer
photo** become available, execute the actual model (`TRY_ON_PROVIDER=
fashn` or `self-hosted`) and record — do not assume:

```
MODEL:                       (e.g. FASHN VTON v1.5 / tryon-v1.6)
GPU:                         (e.g. RTX 4080)
VRAM:                        (e.g. 8.6/16 GiB used)
CUDA:                        (e.g. 12.4)
MODEL LOAD:                  (ok / err)
INFERENCE START:             (ts)
INFERENCE COMPLETE:          (ts)
INFERENCE TIME:              (ms)
OUTPUT FILE:                 (path)
OUTPUT IMAGE DIMENSIONS:     (w×h)
OUTPUT VALID:                (decode ok / not)
RESULT URL:                  (browser-reachable URL)
RESULT VIEWED IN BROWSER:    (yes/no)
```

Privacy during this step (unchanged from Phase 3/4/5):
- photo bytes in memory for the single request only; never logged.
- no photo in DB / localStorage / cookies / URLs.
- result may be held in memory for delivery, then dropped.
- never log customer identity, image bytes, or API keys.

---

## 6. Honest open items (do not close these silently)

1. **Result URL browser reachability** — self-hosted servers return
   server-relative/private URLs; the current doc notes the next.config.ts
   has no result proxy. Before real use, add a Next.js proxy/rewrite so
   the browser can actually fetch the result image.
2. **Real garment photography** — the catalogue currently ships demo SVG
   art only (0/21 real garment photographs). Real, rightfully-licensed
   garment images are required before any meaningful VTON inference.
3. **Imagery license/provenance** — when real garment photos are added,
   record source + license per product (see the P0 requirements in
   Phase 13); never relabel demo assets as real.
4. **Category→garment mapping** — validate which catalogue categories map
   cleanly to the VTON provider's categories; do not silently coerce
   unknown categories.

---

## 7. What stays guest-first / privacy-safe after this phase

- No accounts, no login, no OTP — everything continues to work without a
  user identity (guest-first architecture preserved).
- Photo never persisted server-side; try-on runs on the in-memory upload.
- Wishlist stores product ids only; analytics only allow-listed fields.
- Mock provider remains the zero-risk default; choosing a real provider
  requires an **explicit operator env change** and real credentials.
