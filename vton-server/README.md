# Self-hosted VTON inference server (Phase 5B)

This is the **internal inference server** that the TEXVALLEY I-RIS Next.js
app talks to when `TRY_ON_PROVIDER=self-hosted`. It runs an open-source
virtual try-on model on a machine with a suitable GPU and exposes a small,
documented HTTP contract. It does **not** pretend to be the model's own API.

The next.js app sends a person image + a garment image, receives a `job_id`,
polls status, and downloads the generated result. Swapping the underlying
model (Model A -> Model B) means changing the adapter in `inference/` — the
Next.js app and this HTTP contract stay unchanged.

---

## Selected model

- **Model:** FASHN VTON v1.5 (`tryon-v1.5` weights)
- **Hugging Face repository:** https://huggingface.co/fashn-ai/fashn-vton-1.5
- **Inference code:** https://github.com/fashn-AI/fashn-vton-1.5
- **License:** Apache-2.0 (verified on the model card and the GitHub LICENSE)
- **Commercial use:** Permitted (Apache-2.0, no non-commercial clause).
  Third-party components shipped by the model card: DWPose (Apache-2.0),
  YOLOX (Apache-2.0), fashn-human-parser (see its own license link).
  **This is the OPEN-SOURCE MODEL license. It is not "free hosted
  inference"** — self-hosting costs are your own GPU/time/electricity.

### Why this model

| Candidate | License | Commercial | Verdict |
|-----------|---------|-----------|---------|
| FASHN VTON v1.5 | Apache-2.0 | Yes (verified) | **Selected** |
| IDM-VTON | CC-BY-NC-SA-4.0 | No | Rejected — research-only |
| CatVTON | Apache-2.0 code + open commercial-licensing question (GitHub issue #139) | Unclear | Rejected until clarified |

### Model requirements (from official docs)

- **Parameters:** 972M (`model.safetensors`, ~1.94 GB) + DWPose ONNX (~2 GB total)
- **Precision:** bfloat16 — runs on Ampere+ GPUs (RTX 30xx/40xx, A100, H100, L40S);
  falls back to float32 on older hardware / CPU (slow)
- **Output:** photorealistic RGB image at 576x864
- **Inputs:** person RGB image, garment RGB image (model photo or flat-lay),
  category: `tops` | `bottoms` | `one-pieces`
- **Maskless:** no segmentation masks required

> **Development laptop (6 GB GPU) is NOT validated** for FASHN VTON v1.5.
> The model card does not guarantee VRAM usage; bf16 weights + DWPose +
> human parser + pipeline overhead realistically exceed reliable 6 GB
> operation. Use a remote GPU machine (see "GPU environments" below).

---

## Hardware

Run this server on a machine with an NVIDIA GPU (Ampere or newer, e.g.
RTX 3060 12 GB / RTX 4090 / A10G / A100) and working CUDA. The I-RIS laptop
is for **development only** — it should never run the model.

### Realistic free/low-cost GPU options (2026, subject to change)

| Environment | Type | GPU / VRAM | Sessions / quota (2026) | Known limitations |
|-------------|------|-----------|------------------------|-------------------|
| Google Colab (free) | Notebook | T4 16 GB (typical; not guaranteed) | up to 12 h/session, ~90 min idle disconnect, pre-emptible; no fixed weekly quota | GPU model not guaranteed, dynamic limits, ephemeral VM (disk wiped) |
| Google Colab (paid) | Notebook | T4 / L4 / V100 / A100 | 12-24 h/session via compute units | Still ephemeral; exhausted units revert to free-tier policy |
| Kaggle notebooks | Notebook | T4 or P100 16 GB | ~9 h/session, ~30 GPU-h/week | Weekly reset, session limits, no internet-exposed port for serving |
| Hugging Face Spaces (ZeroGPU) | Web service | shared GPU (varies) | free tier tracks CPU/GPU seconds; 2026 free tier is heavily restricted (locked Docker/Gradio SDKs, few requests or minutes/day) | Not permanently free; per-second GPU quotas; reusable Space **must never be depended on** as the only infra |
| Thunder Compute / Vast.ai / RunPod | Paid | RTX A6000, L40, A100, H100 | on-demand, billed by the minute (~$0.35-$3.20/h) | Paid always-on box; cheapest reliable option for an unattended server |

All free-tier GPU notebooks are ephemeral and cannot serve a persistent API.
For a long-running `vton-server` process, a small paid GPU box or any GPU
machine you control is the realistic deployment target.

**None of these are guaranteed, permanently free GPUs.** The architecture
does not depend on a specific notebook session — the server is a normal
FastAPI process you deploy on whichever GPU box you control.

---

## API contract (internal)

Base URL: `VTON_SERVER_URL` (e.g. `http://192.168.1.50:8060`).

Auth: if `VTON_SERVER_API_KEY` is set on the server, every request must
include `Authorization: Bearer <VTON_SERVER_API_KEY>`. If the key is empty,
the server runs unauthenticated (private/VPN networks only).

### `POST /try-on`

Create a try-on job.

```json
{
  "person_image": "data:image/jpeg;base64,....",
  "garment_image": "https://.../garment.jpg",
  "category": "tops"
}
```

- `person_image` — base64 data URL (JPG/PNG/WEBP), required
- `garment_image` — http(s) URL **or** data URL, required
- `category` — optional, one of `tops` | `bottoms` | `one-pieces`
  (the I-RIS provider maps catalogue categories; default `one-pieces`)

Responses:

- `202` → `{ "job_id": "..." }` — accepted, job queued
- `400` → malformed request
- `401` / `403` → missing/invalid API key
- `422` → validation error

### `GET /try-on/{job_id}`

Poll job status.

- `200` → `{ "status": "processing" }`
- `200` → `{ "status": "completed", "result_image_url": "<server>/results/<job_id>.png" }`
- `200` → `{ "status": "failed", "error_message": "..." }`
- `404` → unknown job
- `401` / `403` → missing/invalid API key

### `GET /results/{filename}`

Download a generated result. Files are **temporary** — deleted by the
retention janitor after `RETENTION_MINUTES` (default 15), so always download
result images promptly.

### `GET /health`

Liveness + model state. `200` when the model is warm, `503` when the model
failed to load (and every `/try-on` returns `503` until it does).

---

## Image privacy & retention policy

- Person and garment inputs are decoded **in memory only** — they are never
  written to disk, logs, or the job record.
- No image bytes, base64, data URIs, or API keys are ever logged.
- Only the **synthetic result** is written to `data/results/<job_id>.png` and
  deleted after `RETENTION_MINUTES` (default 15) by a background janitor.
- Job records hold metadata only (`job_id`, `status`, `created_at`, `category`).
- This server performs **virtual clothing try-on only** — no face
  recognition, identity matching, biometrics, or face embeddings.

> If you fork this server and start persisting customer inputs, that breaks
> the privacy contract. Keep inputs ephemeral.

---

## Installation (on the GPU machine)

```bash
# Python 3.10+ recommended
git clone https://github.com/fashn-AI/fashn-vton-1.5.git
# ... or use this repo's Dockerfile (below)

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Download weights (~2 GB): model.safetensors + DWPose ONNX
python -m fashn_vton.scripts.download_weights --weights-dir ./weights
# (human parser weights, ~244 MB, auto-download to HF cache on first use)
```

`requirements.txt` installs `fashn-vton` from the official GitHub repository
and this server's FastAPI dependencies.

## Start

```bash
export VTON_SERVER_API_KEY="change-me"
export RETENTION_MINUTES=15
uvicorn app:app --host 0.0.0.0 --port 8060
```

The model loads lazily on the first `/try-on` call (takes a while the first
time). Set `PRECACHE_MODEL=1` to load it at startup.

## Docker

```bash
docker build -t iris-vton-server .
docker run -d -p 8060:8060 \
  -e VTON_SERVER_API_KEY=change-me \
  -v iris_vton_data:/app/data \
  -v iris_vton_weights:/app/weights \
  iris-vton-server
```

Requires an NVIDIA GPU host + NVIDIA Container Toolkit. The Dockerfile is
GPU-ready but the exact base image should be chosen for your CUDA version.

## Model adapter

`inference/engine.py` is the **only** module that touches `fashn_vton`.
It exposes `load_engine(weights_dir)` and
`run_tryon(pipeline, person, garment, category)`. Replace it to switch to
another model (e.g. CatVTON once licensing is clarified) — the HTTP contract
and the I-RIS provider remain unchanged.

---

## What was / was not executed in this repo

- **Implemented:** the full HTTP contract, job queue, retention janitor, the
  model adapter for FASHN VTON v1.5, Dockerfile, and this documentation.
- **Verified (Phase 5C, contract smoke test, no GPU):** the server boots on
  a stock Python 3.12 environment with only `fastapi/uvicorn/Pillow/requests`
  installed; `GET /health` returns `{"status":"loading","model":"fashn-vton-1.5"}`;
  `POST /try-on` with a valid payload and no model installed returns **503**
  fail-closed with `fashn_vton package is not installed` (no job created, no
  fabricated result); `GET /try-on/<missing>` returns 404; Bearer auth is
  enforced (401 on missing/wrong key, passes through when correct).
- **Not executed:** a real inference run — the model was never loaded and no
  image was generated in Phase 5C. Downloading ~2 GB weights and running the
  model requires a CUDA GPU. To run the real test, deploy this server on a
  GPU machine, `pip install -r requirements.txt`, download weights via
  `python -m fashn_vton.scripts.download_weights --weights-dir ./weights`, and
  set `TRY_ON_PROVIDER=self-hosted` in the I-RIS `.env`. If the model cannot
  load, `POST /try-on`/`/health` report a clean 503 — the server never
  fabricates a result.
- Model weights and `data/` are gitignored — never commit weights or
  customer data.