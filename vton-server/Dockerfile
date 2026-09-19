# FASHN VTON 1.5 inference service
#
# The FASHN VTON 1.5 source is vendored in:
#   vton-server/fashn-vton-1.5/
#
# Model weights are NOT committed to GitHub and are NOT downloaded
# during the Docker build.
#
# They must be supplied separately on the VTON deployment host.

FROM python:3.11-slim

WORKDIR /srv/vton

# ------------------------------------------------------------
# 1. Install Python runtime dependencies
# ------------------------------------------------------------

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt


# ------------------------------------------------------------
# 2. Install vendored FASHN VTON 1.5 source
# ------------------------------------------------------------

COPY fashn-vton-1.5/ ./fashn-vton-1.5/

ENV PYTHONPATH=/srv/vton/fashn-vton-1.5/src


# ------------------------------------------------------------
# 3. Copy VTON API server
# ------------------------------------------------------------

COPY app.py ./app.py

COPY inference/ ./inference/


# ------------------------------------------------------------
# 4. Runtime configuration
# ------------------------------------------------------------

# Directory containing manually installed FASHN model weights.
#
# IMPORTANT:
# Do NOT commit model weights to GitHub.
# Do NOT put them inside the Next.js application.
#
# For a GPU host, this should point to the directory containing
# the real FASHN VTON 1.5 checkpoints.

ENV VTON_WEIGHTS_DIR=/srv/vton/weights

# Temporary data directory.
ENV VTON_DATA_DIR=/srv/vton/data

# API authentication.
# Set the real value in Render Environment Variables.
ENV VTON_SERVER_API_KEY=

# Temporary-file retention.
ENV RETENTION_MINUTES=15

# Keep disabled unless your application explicitly requires
# model preloading behavior.
ENV PRECACHE_MODEL=0


# ------------------------------------------------------------
# 5. Service port
# ------------------------------------------------------------

EXPOSE 8060


# ------------------------------------------------------------
# 6. Start FastAPI VTON service
# ------------------------------------------------------------

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8060"]
