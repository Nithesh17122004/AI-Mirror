# VTON inference service image.
#
# The FASHN VTON 1.5 model source is VENDORED in-repo (vton-server/fashn-vton-1.5),
# so this image does NOT need git and does NOT clone anything at build time.
# Weights are NEVER committed and NEVER downloaded during the build.

FROM python:3.11-slim

WORKDIR /srv/vton

# 1. Copy and install the NON-model runtime deps only (no git line).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy the vendored FASHN VTON 1.5 source and make it importable.
#    src/ layout -> `from fashn_vton import TryOnPipeline`.
COPY fashn-vton-1.5/ ./fashn-vton-1.5/
ENV PYTHONPATH=/srv/vton/fashn-vton-1.5/src

# 3. Copy the FastAPI app + inference glue.
COPY app.py .
COPY inference/ ./inference/
COPY scripts/download_weights.py ./scripts/download_weights.py

# 4. Configuration (server-side only; never exposed via the browser).
#    Weights are placed on the host at runtime by the operator (see
#    docs/FASHN_VTON_DEPLOYMENT.md) and mounted in; never committed.
ENV VTON_WEIGHTS_DIR=/srv/vton/weights
ENV VTON_DATA_DIR=/srv/vton/data
ENV VTON_SERVER_API_KEY=
ENV RETENTION_MINUTES=15
ENV PRECACHE_MODEL=0

EXPOSE 8060

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8060"]
