"""
AeroEdu Embedding Service — FastAPI + sentence-transformers + FAISS.

Cung cấp 3 endpoint cho aeroedu recommendation pipeline:

  POST /embed
       body: { texts: ["văn bản 1", "văn bản 2", ...] }
       resp: { embeddings: [[0.1, -0.3, ...], ...], dim: 384 }

  POST /similar
       body: { query: "đề thi hàm bậc 2 lớp 10", k: 20, filter?: {...} }
       resp: { results: [{ id, score, metadata }, ...] }

  POST /index/upsert
       body: { items: [{ id, text, metadata }, ...] }
       resp: { upserted: 100, total: 12345 }

Model: keepitreal/vietnamese-sbert (110M params, 400MB) — fine-tuned
trên ngữ liệu tiếng Việt, dim 768. Có thể đổi sang model nhỏ hơn
(paraphrase-multilingual-MiniLM-L12-v2, dim 384) để giảm RAM.

Storage: FAISS IndexFlatIP (Inner Product) cho dataset < 1M items.
Persist xuống /data/faiss.index để giữ qua restart Cloud Run.

Deployment: Cloud Run với 2 CPU + 4GB RAM, min instance = 1 để tránh
cold start (model load ~5s).

Local dev:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8080
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

import faiss  # type: ignore
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

# ── Config ──────────────────────────────────────────────
MODEL_NAME = os.getenv("MODEL_NAME", "keepitreal/vietnamese-sbert")
INDEX_DIR = Path(os.getenv("INDEX_DIR", "/data"))
INDEX_DIR.mkdir(parents=True, exist_ok=True)
INDEX_FILE = INDEX_DIR / "faiss.index"
META_FILE = INDEX_DIR / "metadata.json"

# ── Globals (lazy init) ────────────────────────────────
_model: SentenceTransformer | None = None
_index: faiss.Index | None = None
_metadata: dict[int, dict[str, Any]] = {}  # internal_id → {id, metadata}
_id_to_internal: dict[str, int] = {}       # id → internal_id (FAISS row index)
_dim: int = 0
_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    """Lazy load model on first request."""
    global _model, _dim
    if _model is None:
        print(f"[startup] Loading model {MODEL_NAME}...")
        _model = SentenceTransformer(MODEL_NAME)
        _dim = int(_model.get_sentence_embedding_dimension() or 768)
        print(f"[startup] Model loaded, dim={_dim}")
    return _model


def load_index() -> None:
    """Load existing FAISS index + metadata from disk."""
    global _index, _metadata, _id_to_internal
    get_model()  # ensures _dim is set
    if INDEX_FILE.exists():
        _index = faiss.read_index(str(INDEX_FILE))
        print(f"[startup] Loaded FAISS index, ntotal={_index.ntotal}")
    else:
        _index = faiss.IndexFlatIP(_dim)
        print(f"[startup] Created new FAISS index, dim={_dim}")
    if META_FILE.exists():
        with open(META_FILE) as f:
            data = json.load(f)
        _metadata = {int(k): v for k, v in data.get("metadata", {}).items()}
        _id_to_internal = data.get("id_to_internal", {})
        print(f"[startup] Loaded {len(_metadata)} metadata entries")


def save_index() -> None:
    """Persist index + metadata atomically."""
    if _index is None:
        return
    tmp_idx = INDEX_FILE.with_suffix(".tmp")
    tmp_meta = META_FILE.with_suffix(".tmp")
    faiss.write_index(_index, str(tmp_idx))
    with open(tmp_meta, "w") as f:
        json.dump(
            {"metadata": {str(k): v for k, v in _metadata.items()},
             "id_to_internal": _id_to_internal},
            f,
        )
    os.replace(tmp_idx, INDEX_FILE)
    os.replace(tmp_meta, META_FILE)


# ── FastAPI ─────────────────────────────────────────────
app = FastAPI(title="AeroEdu Embedding Service", version="0.1.0")


@app.on_event("startup")
def _startup() -> None:
    load_index()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dim": _dim,
        "index_size": _index.ntotal if _index else 0,
    }


# ── Schemas ─────────────────────────────────────────────
class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=128)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dim: int


class IndexItem(BaseModel):
    id: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpsertRequest(BaseModel):
    items: list[IndexItem] = Field(..., min_length=1, max_length=1000)


class UpsertResponse(BaseModel):
    upserted: int
    total: int


class SimilarRequest(BaseModel):
    query: str
    k: int = Field(20, ge=1, le=200)
    filter_subject: str | None = None
    filter_grade: str | None = None


class SimilarResult(BaseModel):
    id: str
    score: float
    metadata: dict[str, Any]


class SimilarResponse(BaseModel):
    results: list[SimilarResult]


# ── Endpoints ───────────────────────────────────────────
@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    model = get_model()
    vecs = model.encode(req.texts, normalize_embeddings=True).tolist()
    return EmbedResponse(embeddings=vecs, dim=_dim)


@app.post("/index/upsert", response_model=UpsertResponse)
def upsert(req: UpsertRequest) -> UpsertResponse:
    if _index is None:
        raise HTTPException(503, "Index not ready")
    model = get_model()
    texts = [it.text for it in req.items]
    vecs = np.array(model.encode(texts, normalize_embeddings=True), dtype=np.float32)
    with _lock:
        # Naive: append new rows. For true upsert (replace existing), would need
        # IndexIDMap + remove_ids. Phase 1 chấp nhận duplicates → dedupe ở query side.
        start = _index.ntotal
        _index.add(vecs)
        for offset, it in enumerate(req.items):
            internal = start + offset
            _metadata[internal] = {"id": it.id, "metadata": it.metadata}
            _id_to_internal[it.id] = internal
        save_index()
    return UpsertResponse(upserted=len(req.items), total=_index.ntotal)


@app.post("/similar", response_model=SimilarResponse)
def similar(req: SimilarRequest) -> SimilarResponse:
    if _index is None or _index.ntotal == 0:
        return SimilarResponse(results=[])
    model = get_model()
    qvec = np.array(model.encode([req.query], normalize_embeddings=True), dtype=np.float32)
    # Over-fetch để có chỗ filter
    fetch_k = min(req.k * 3, _index.ntotal)
    scores, indices = _index.search(qvec, fetch_k)
    out: list[SimilarResult] = []
    for score, idx in zip(scores[0].tolist(), indices[0].tolist()):
        if idx < 0:
            continue
        meta = _metadata.get(idx)
        if not meta:
            continue
        m = meta.get("metadata", {})
        if req.filter_subject and m.get("subject") != req.filter_subject:
            continue
        if req.filter_grade and m.get("grade") != req.filter_grade:
            continue
        out.append(SimilarResult(id=meta["id"], score=float(score), metadata=m))
        if len(out) >= req.k:
            break
    return SimilarResponse(results=out)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
