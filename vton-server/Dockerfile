FROM python:3.11-slim

# NVIDIA GPU runtime is expected on the host (NVIDIA Container Toolkit).
# Choose CUDA-enabled base images such as nvidia/cuda:12.x-devel-ubuntu22.04
# if onnxruntime-gpu/torch require matching CUDA libs.

WORKDIR /srv/vton

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY inference/ ./inference/

# Model weights: download to this directory BEFORE building/deploying OR
# mount as a volume. Weights are never committed to git.
ENV VTON_WEIGHTS_DIR=/srv/vton/weights
ENV VTON_DATA_DIR=/srv/vton/data
ENV VTON_SERVER_API_KEY=
ENV RETENTION_MINUTES=15
ENV PRECACHE_MODEL=0

EXPOSE 8060
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8060"]