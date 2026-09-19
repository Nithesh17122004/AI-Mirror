# FASHN VTON 1.5 — Self-Hosted Deployment (Phase 14)

## Architecture (honest — two REAL services; Render is NOT the GPU host)
```
Browser (Next.js on Render)
   │ TRY_ON_PROVIDER=self-hosted   (app/lib/try-on/providers/fashn.ts)
   │ POST /api/try-on  →  server-side fetch  →  lib/try-on/providers/self-hosted.ts
   ▼
curl {VTON_SERVER_URL}/try-on   (Authorization: Bearer {VTON_SERVER_API_KEY})
   ▼
FASHN GPU inference service  (vton-server/app.py, FastAPI, REAL model)
   ▼
REAL generated try-on PNG  →  browser
```

## The Next.js side — NO mock fallback
- TRY_ON_PROVIDER=self-hosted selects the REAL provider (fashn.ts). It posts the
  REAL person photo + REAL product.tryOnAssetUrl to {VTON_SERVER_URL}.
- If the VTON service is not ready → bundled, clean HTTP 503 (retryable), never
  a fake image, never the garment, never the original photo.
- TRY_ON_PROVIDER=mock exists ONLY for automated unit tests. Inspect tests/ for
  how it is gated — the provider files are real; mock is a test fixture.

## Environment (server-only; NEVER NEXT_PUBLIC_, NEVER committed)
```

TRY_ON_PROVIDER=self-hosted
VTON_SERVER_URL=http://127.0.0.1:8000   # or Render/GPU-host URL
VTON_SERVER_API_KEY=                     # set; used as Bearer; never defaulted

```

## The GPU host (NOT Render) — weights + CUDA
Model is FASHN VTON 1.5 (official fashn-vton-1.5/, Apache-2.0, weights on HF).
Required at deploy time on the GPU machine (≥ CUDA 11.8 / 12.x, torch>=2.0):
1. torch (CUDA build)  → torch.cuda.is_available() must be True
2. onnxruntime-gpu
3. fashn-human-parser
4. model weights via the official FASHN download script:
   python scripts/download_weights.py --weights-dir weights
   → Holds dress/tops/bottoms pipelines (loaded once at startup; never per request)
Place weights in vton-server/weights/ — gitignored, never committed.

## Health contract (vton-server/app.py)
| state | GET /health |
|---|---|
| loading | {"status":"loading","model":"fashn-vton-1.5"} → HTTP 200 |
| ready   | {"status":"ready"}                             → HTTP 200 |
| failed  | {"status":"failed","error":"..."}               → HTTP 200 (explicit) |

/try-on returns 503 while not ready; 400 on invalid image/category; 502 real inference failure.
Errors are honest: { "error": { "code": "...", "message": "...", "retryable": true|false } }.

## Start commands
```
# GPU host:
cd vton-server
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python scripts/download_weights.py --weights-dir weights   # official source
uvicorn app:app --host 0.0.0.0 --port 8000
curl http://127.0.0.1:8000/health   # wait for "ready" (NOT "loading"|"failed")

# App:
npm run dev   (or prod build) — TRY_ON_PROVIDER=self-hosted reads VTON_SERVER_URL/API_KEY
```

## Verification rule (do not fake)
REAL VTON is verified ONLY when a real person photo + real garment produce a
REAL generated image via {VTON_SERVER_URL}/try-on and the browser shows it.
Until that happens the deployment doc reports NOT VERIFIED.
