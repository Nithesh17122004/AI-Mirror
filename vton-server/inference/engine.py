"""Model adapter for FASHN VTON v1.5 (self-hosted VTON server).

This module is the ONLY part of the server that knows about the concrete
open-source model. Everything else works against the generic contract
(job -> status -> result image). Swap in a different model by replacing
`load_engine` / `run_tryon` implementations; the HTTP API and the I-RIS
provider stay unchanged.

The adapter never fabricates results: if the model (or its weights) is not
available it raises and the API layer reports a clear 503.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("vton.engine")


class ModelNotAvailableError(RuntimeError):
    """Raised when the FASHN VTON model or DWPose runtime cannot be loaded."""


def load_engine(weights_dir: str | Path) -> Any:
    """Load the FASHN VTON TryOnPipeline (bf16 on Ampere+ GPUs).

    Returns the pipeline object. Raises ModelNotAvailableError when the
    `fashn_vton` package is missing or the weights cannot be loaded, so the
    API never silently serves fake output.
    """
    try:
        from fashn_vton import TryOnPipeline  # type: ignore[import-not-found]
    except Exception as exc:  # pragma: no cover - env-dependent
        raise ModelNotAvailableError(
            "fashn_vton package is not installed. "
            "See vton-server/README.md for installation."
        ) from exc

    weights = Path(weights_dir)
    if not (weights / "model.safetensors").exists():
        raise ModelNotAvailableError(
            f"Model weights not found in {weights}. Run the download script: "
            "python -m fashn_vton.scripts.download_weights --weights-dir "
            f"{weights}"
        )

    try:
        logger.info("Loading FASHN VTON v1.5 pipeline from %s ...", weights)
        pipeline = TryOnPipeline(weights_dir=str(weights))
        logger.info("Model loaded.")
        return pipeline
    except Exception as exc:  # pragma: no cover - env-dependent
        raise ModelNotAvailableError(
            f"Failed to load the model: {exc}"
        ) from exc


def run_tryon(
    pipeline: Any,
    person_image: Any,
    garment_image: Any,
    category: str,
) -> Any:
    """Run one inference. Returns a PIL Image.

    * person_image / garment_image: PIL.Image (RGB) already decoded by the API layer.
    * category: "tops" | "bottoms" | "one-pieces".
    """
    result = pipeline(
        person_image=person_image,
        garment_image=garment_image,
        category=category,
    )
    if result is None or not getattr(result, "images", None):
        raise RuntimeError("Model produced no output image.")
    return result.images[0]