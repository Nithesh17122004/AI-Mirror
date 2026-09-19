# FASHN VTON 1.5 — Self-Hosted Deployment Manual

This document describes how to deploy the **real** FASHN VTON 1.5 try-on
pipeline for the AI-Mirror ("I-RIS") repository.

> **VERIFICATION LAW (Phase 15):**
> Nothing in this document may be reported as *verified* unless it was
> actually executed and measured. Model weights are **not installed** on any
> confirmed GPU host yet, CUDA is **not available** on the development host,
> and **no real FASHN inference has been executed**. Any sentence in this
> document that describes running the model is a *recipe*, not a record.
> The only truthful status today is: **REAL VTON = NOT VERIFIED**.

---

## 1. Architecture (unambiguous, no fake inference in Next.js)

```
Browser (customer laptop)
   │  upload / camera capture (person photo)
   ▼
Next.js app  (App A)                       TRY_ON_PROVIDER=self-hosted
   │  POST /api/try-on
   │  lib/try-on/providers/self-hosted.ts
   │  (submit job → poll job → return result)
   ▼
VTON inference service  (App B, GPU host)   FastAPI  (vton-server/)
   │  vendored FASHN VTON 1.5 source: vton-server/fashn-vton-1.5/
   │  entrypoint: TryOnPipeline(weights_dir=…)
   │  POST /try-on → job_id
   │  GET  /try-on/{job_id} → result_image_url
   ▼
REAL generated try-on image
   │  returned to Next.js → displayed in browser
```

**The Next.js server never loads PyTorch or the FASHN model.** The GPU service
does. Do not "fix" this by moving the model into the app.

---

## 2. The two services

### App B — the FASHN GPU inference service

Repository layout (already present):

```
vton-server/
  app.py                       FastAPI app
  requirements.txt
  fashn-vton-1.5/
    src/fashn_vton/
      pipeline.py              TryOnPipeline(weights_dir=...)  ← real entrypoint
      dwpose/                  vendored DwPose
      preprocessing/           person/garment preprocessing
      utils/                   checkpoint, keypoints, sampling, tensor utils
    scripts/
      download_weights.py      official weights download (--weights-dir)
    basic_inference.py         example entrypoint (TryOnPipeline + run)
```

Contract followed by `lib/try-on/providers/self-hosted.ts` (already implemented):

| Endpoint | Request | Response |
|----------|---------|----------|
| `GET /health` | — | `{"status": "loading"\|"ready"\|"failed"}` |
| `POST /try-on` | multipart `person_image`, `garment_image`, `category` | `202 {"job_id": "…"}` / `400` (unsupported-category…) / `503` (not ready) / `502` (inference failed) |
| `GET /try-on/{job_id}` | — | `{"status":"processing"}` / `{"status":"completed","result_image_url":"…"}` / `{"status":"failed","error_message":"…"}` |

### App A — Next.js web service (Render)

No model. Only env vars below.

---

## 3. Environment variables

### App B (GPU service) — server-side only, never `NEXT_PUBLIC_`

| Variable | Purpose |
|----------|---------|
| `VTON_WEIGHTS_DIR` | Absolute directory holding the FASHN weights (e.g. `/opt/vton/weights`). Passed to `TryOnPipeline(weights_dir=…)` at startup. |
| `VTON_SERVER_API_KEY` | Shared secret used as `Authorization: Bearer` between App A and App B. |
| `VTON_MODEL_ID` | Optional override when multiple model configs exist under `weights_dir`. Default: auto-detect from weights dir. |

### App A (Next.js) — server-side only, never `NEXT_PUBLIC_`

| Variable | Purpose |
|----------|---------|
| `TRY_ON_PROVIDER` | `self-hosted` (real). Any unknown value is rejected by env validation, never silently coerced to `mock`. |
| `VTON_SERVER_URL` | Public/private URL of App B (e.g. `https://vton-gpu.onrender.com`). |
| `VTON_SERVER_API_KEY` | Must match App B's key exactly. Used only as server-side Bearer. |
| `DATABASE_URL` | Postgres (Render). |
| `NEXTAUTH_SECRET` | Auth session secret. |
| `NEXTAUTH_URL` | Public URL of App A. |

> The API key must **not** be `NEXT_PUBLIC_*`, must not be committed, must not
> appear in the browser bundleensteinResponsio.

---

## 4. Obtaining the model weights (App B, on the GPU host)

Weights are **not committed** and were **not installed** on any verified host.
Use the vendored official downloader:

```bash
cd vton-server/fashn-vton-1.5
python scripts/download_weights.py --weights-dir /opt/vton/weights
```

This fetches the FASHN VTON 1.5 checkpoints (person-agnostic try-on model,
DwPose, human parser) into `VTON_WEIGHTS_DIR`. **Do not invent filenames.**
The script is the single source of truth for what is required.

Serve readiness only from reality:

```python
# vton-server/app.py (pattern)
pipeline = TryOnPipeline(weights_dir=WEIGHTS_DIR)   # loads ALL checkpoints
@app.get("/health")
def health():
    return {"status": ("ready" if pipeline.loaded else
                       ("failed" if pipeline.error else "loading"))}
```

`/health` reports `"ready"` **only after the weights actually load**. It must
never claim readiness merely because the directory exists or Python imports.

---

## 5. Install & start (App B, GPU host)

```bash
# Python + CUDA torch (match your CUDA version; do NOT guess a mismatch)
python -m venv .venv && . .venv/bin/activate
pip install -r vton-server/requirements.txt
# from the vendored package root
pip install -e vton-server/fashn-vton-1.5
export VTON_WEIGHTS_DIR=/opt/vton/weights
export VTON_SERVER_API_KEY=$(cat /run/secrets/vton_api_key)
uvicorn vton-server.app:app --host 0.0.0.0 --port 8060
```

Verify:

```bash
curl http://127.0.0.1:8060/health       # → loading → ready
```

---

## 6. Render deployment (manual — not performed, documented)

Two separate Render services. **App B must be a GPU/Paid instance** (CUDA +
PyTorch). A free 512 MB CPU web service **cannot** run FASHN — do not attempt,
and do not claim it can.

### App A — Render "Web Service" (Node/Next.js)

- Build: `npm install && npm run build`
- Start: `npm run start -- -p $PORT`
- Env: `TRY_ON_PROVIDER=self-hosted`, `VTON_SERVER_URL`, `VTON_SERVER_API_KEY`,
  `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

### App B — Render GPU service (or equivalent GPU host)

- Runtime: Python 3.10–3.12, CUDA-enabled PyTorch, `uvicorn`
- Start: `uvicorn vton-server.app:app --host 0.0.0.0 --port $PORT`
- Env: `VTON_WEIGHTS_DIR`, `VTON_SERVER_API_KEY`
- Boot the weights BEFORE the service reports ready; a cold-start job that
  has no weights must return `503` on `/try-on`, never mock.

---

## 7. No mock, no passthrough

- `TRY_ON_PROVIDER=self-hosted` must never silently fall back to `mock`.
- The result must be the REAL generated image, not the garment image, not the
  person image, not an SVG/canvas overlay, not a passthrough.
- The vendored pipeline is the only allowed source of the result image.

---

## 8. Current measured status (do not edit this truth)

```
FASHN SOURCE:        PRESENT   (vton-server/fashn-vton-1.5/, vendored)
FASHN ADAPTER:       FASHN-provider wired to self-hosted (real) VTON server
MODEL WEIGHTS:       NOT INSTALLED  (no GPU host configured/verified)
CUDA:                NOT AVAILABLE  (dev host measurement)
MODEL LOADED:        NO
REAL INFERENCE:      NOT EXECUTED   (0 real runs)
GENERATED IMAGE:     NOT PRODUCED
BROWSER RESULT:      NOT VERIFIED
LIVE CAMERA:         NOT VERIFIED
REAL VTON:           NOT VERIFIED
```
