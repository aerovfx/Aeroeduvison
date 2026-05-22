# AeroEdu Embedding Service — Cloud Run image
# Build:  gcloud builds submit --tag asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aero/embed:latest
# Deploy: gcloud run deploy aero-embed --image ... --region asia-southeast1 --memory 4Gi --cpu 2 --min-instances 1
#
# Note: lần đầu load model ~5s. min-instances=1 để tránh cold start phá UX.
# Index persist trong /data — mount Cloud Storage volume (FUSE) hoặc Persistent
# Volume nếu cần shared state đa instance.

FROM python:3.11-slim

WORKDIR /app

# System deps for faiss-cpu + sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
  && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download model vào image để cold-start không cần network
# (Đổi MODEL_NAME để pre-download model khác)
ARG MODEL_NAME=keepitreal/vietnamese-sbert
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('${MODEL_NAME}')"

# App code
COPY main.py .
COPY batch_embed.py .

# Mount point cho FAISS index persistence
RUN mkdir -p /data

ENV PORT=8080
ENV MODEL_NAME=${MODEL_NAME}
ENV INDEX_DIR=/data

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
