FROM python:3.11-slim

WORKDIR /srv/vton

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Vendored FASHN VTON 1.5
COPY fashn-vton-1.5/ ./fashn-vton-1.5/

# Install the actual FASHN Python package
RUN pip install --no-cache-dir ./fashn-vton-1.5

COPY app.py ./app.py
COPY inference/ ./inference/

ENV VTON_WEIGHTS_DIR=/srv/vton/weights
ENV VTON_DATA_DIR=/srv/vton/data
ENV RETENTION_MINUTES=15
ENV PRECACHE_MODEL=0

# Render provides PORT
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}"]
