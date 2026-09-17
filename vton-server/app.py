"""Self-hosted VTON inference server (Phase 5B).

Exposes the internal I-RIS <-> VTON contract:

    POST /try-on/{job_id}          create a job (person + garment) -> job_id
    GET  /try-on/{job_id}          -> status / result_image_url
    GET  /results/{filename}       temporary result download
    GET  /health                   liveness + model state

Privacy contract:
- Person/garment inputs are decoded in memory only; never written to disk,
  logs, or job records.
- Only the synthetic result is written to data/results/<job_id>.png and
  deleted by the retention janitor after RETENTION_MINUTES (default 15).
- No image bytes, base64, data URIs, or API keys are logged.

The model is loaded lazily through inference/engine.py. If the model cannot
be loaded the server reports 503 — it never fabricates a result.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import re
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from urllib.request import Request, urlopen

import uvicorn
from fastapi import FastAPI, HTTPException, Request as FastAPIRequest, Response
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel, Field

from inference.engine import ModelNotAvailableError, load_engine, run_tryon

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("vton")

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("VTON_DATA_DIR", APP_DIR / "data"))
RESULTS_DIR = DATA_DIR / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

RETENTION_MINUTES = int(os.getenv("RETENTION_MINUTES", "15"))
WEIGHTS_DIR = os.getenv("VTON_WEIGHTS_DIR", str(APP_DIR / "weights"))
API_KEY = os.getenv("VTON_SERVER_API_KEY", "")
PRECACHE_MODEL = os.getenv("PRECACHE_MODEL", "").lower() in {"1", "true", "yes"}

DATA_URL_RE = re.compile(r"^data:image/(jpeg|png|webp);base64,(.+)$", re.DOTALL)

app = FastAPI(
    title="I-RIS self-hosted VTON server",
    description="Internal virtual try-on inference server (FASHN VTON v1.5).",
    version="1.0.0",
)

# ---------------------------------------------------------------- model state

_lock = threading.Lock()
_model = None
_model_error: str | None = None


def _require_api_key(request: FastAPIRequest) -> None:
    """Enforce Bearer auth only when an API key is configured."""
    if not API_KEY:
        return
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def _get_model():
    global _model, _model_error
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        try:
            _model = load_engine(WEIGHTS_DIR)
            _model_error = None
        except ModelNotAvailableError as exc:
            _model_error = str(exc)
            raise HTTPException(status_code=503, detail=_model_error)
    return _model


# ---------------------------------------------------------------- job queue

class JobStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Job:
    job_id: str
    status: JobStatus = JobStatus.PROCESSING
    created_at: float = field(default_factory=time.time)
    result_path: Path | None = None
    error_message: str | None = None
    category: str | None = None


jobs: dict[str, Job] = {}
jobs_lock = threading.Lock()


def _thread_safe_job_update(job_id: str, **kwargs) -> None:
    with jobs_lock:
        job = jobs.get(job_id)
        if job is not None:
            for key, value in kwargs.items():
                setattr(job, key, value)


def _decode_data_url(data_url: str) -> Image.Image:
    match = DATA_URL_RE.match(data_url)
    if not match:
        raise ValueError("Expected a data URL of the form data:image/jpeg|png|webp;base64,...")
    raw = base64.b64decode(match.group(2))
    return Image.open(io.BytesIO(raw)).convert("RGB")


def _load_garment(garment_image: str) -> Image.Image:
    if garment_image.startswith("data:"):
        return _decode_data_url(garment_image)
    # Remote http(s) URL: fetched in memory only, never stored.
    req = Request(garment_image, headers={"User-Agent": "iris-vton-server"})
    with urlopen(req, timeout=30) as response:
        return Image.open(io.BytesIO(response.read())).convert("RGB")


def _run_job(job_id: str, person_image: str, garment_image: str, category: str) -> None:
    try:
        pipeline = _get_model()
        person_pil = _decode_data_url(person_image)
        garment_pil = _load_garment(garment_image)
        result = run_tryon(pipeline, person_pil, garment_pil, category)

        out_path = RESULTS_DIR / f"{job_id}.png"
        result.save(out_path, "PNG")
        _thread_safe_job_update(job_id, status=JobStatus.COMPLETED, result_path=out_path)
        logger.info("job %s completed", job_id)
    except Exception as exc:  # noqa: BLE001 - report any inference failure cleanly
        logger.error("job %s failed: %s", job_id, exc)
        _thread_safe_job_update(job_id, status=JobStatus.FAILED, error_message=str(exc))


def _retention_janitor() -> None:
    """Delete result files older than RETENTION_MINUTES."""
    cutoff = time.time() - RETENTION_MINUTES * 60
    while True:
        try:
            for job in list(jobs.values()):
                if job.result_path and job.result_path.exists() and job.created_at < cutoff:
                    try:
                        job.result_path.unlink()
                    except OSError:
                        pass
                    with jobs_lock:
                        if job.result_path is not None:
                            job.result_path = None
        except Exception:  # noqa: BLE001
            pass
        time.sleep(60)


threading.Thread(target=_retention_janitor, daemon=True).start()
if PRECACHE_MODEL:
    threading.Thread(target=_get_model, daemon=True).start()


# ---------------------------------------------------------------- API

class CreateJobRequest(BaseModel):
    person_image: str
    garment_image: str
    category: str = "one-pieces"  # tops | bottoms | one-pieces


class CreateJobResponse(BaseModel):
    job_id: str


@app.post("/try-on", response_model=CreateJobResponse, status_code=202)
def create_job(request: FastAPIRequest, body: CreateJobRequest) -> JSONResponse:
    _require_api_key(request)
    if body.category not in {"tops", "bottoms", "one-pieces"}:
        raise HTTPException(status_code=400, detail="category must be tops | bottoms | one-pieces")
    if not DATA_URL_RE.match(body.person_image):
        raise HTTPException(status_code=400, detail="person_image must be a base64 image data URL")
    # Force model check now so misconfiguration fails fast (503) instead of
    # returning a job id that can never complete.
    _get_model()

    job_id = uuid.uuid4().hex
    with jobs_lock:
        jobs[job_id] = Job(job_id=job_id, category=body.category)

    threading.Thread(
        target=_run_job,
        args=(job_id, body.person_image, body.garment_image, body.category),
        daemon=True,
    ).start()
    return JSONResponse(CreateJobResponse(job_id=job_id).model_dump(), status_code=202)


@app.get("/try-on/{job_id}")
def get_job(request: FastAPIRequest, job_id: str) -> JSONResponse:
    _require_api_key(request)
    with jobs_lock:
        job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")

    if job.status == JobStatus.COMPLETED and job.result_path:
        result_url = f"/results/{job.result_path.name}"
        return JSONResponse({"status": "completed", "result_image_url": result_url})
    if job.status == JobStatus.FAILED:
        return JSONResponse({"status": "failed", "error_message": job.error_message})
    return JSONResponse({"status": "processing"})


@app.get("/results/{filename}")
def get_result(request: FastAPIRequest, filename: str) -> Response:
    _require_api_key(request)
    if not re.fullmatch(r"[0-9a-f]{32}\.png", filename):
        raise HTTPException(status_code=400, detail="Invalid result filename")
    path = RESULTS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Result expired or not found")
    return Response(
        content=path.read_bytes(),
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/health")
def health() -> JSONResponse:
    if _model_error:
        return JSONResponse({"status": "error", "detail": _model_error}, status_code=503)
    if _model is not None:
        return JSONResponse({"status": "ok", "model": "fashn-vton-1.5"})
    return JSONResponse({"status": "loading", "model": "fashn-vton-1.5"})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8060)