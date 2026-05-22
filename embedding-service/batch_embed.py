"""
Batch embedding job — chạy cron mỗi đêm để embed mọi exam mới.

Usage:
  # Local dev
  DATABASE_URL=postgres://... EMBED_URL=http://localhost:8080 python batch_embed.py

  # Cloud Run Job (scheduled)
  gcloud run jobs create aero-embed-batch \\
    --image asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aero/embed:latest \\
    --command python --args batch_embed.py \\
    --set-env-vars DATABASE_URL=...,EMBED_URL=http://aero-embed:8080 \\
    --schedule "0 2 * * *"  # 2am every day

Logic:
  1. Query Postgres lấy mọi Exam tạo trong 24h qua (cùng matrix/question)
  2. Build text = title + description + topic + sample questions (max 500 chars)
  3. POST /index/upsert vào embedding service batch 100 items/lần
  4. Log số rows processed
"""

from __future__ import annotations

import os
import sys
import time
from typing import Any

import requests
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ["DATABASE_URL"]
EMBED_URL = os.environ.get("EMBED_URL", "http://localhost:8080")
HOURS_BACK = int(os.environ.get("HOURS_BACK", "168"))  # default 7 ngày
BATCH = int(os.environ.get("BATCH", "100"))


def fetch_recent_exams() -> list[dict[str, Any]]:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT e.id, e.title, e.description, e.subject, e.grade, e."examType",
                       e."createdAt"
                  FROM "Exam" e
                 WHERE e."createdAt" > NOW() - INTERVAL '%s hours'
                   AND e.status <> 'Nháp'
                 ORDER BY e."createdAt" DESC
                """,
                (HOURS_BACK,),
            )
            return list(cur.fetchall())
    finally:
        conn.close()


def build_text(row: dict[str, Any]) -> str:
    parts = [
        row.get("title") or "",
        row.get("description") or "",
        f"môn {row.get('subject', '')}",
        f"lớp {row.get('grade', '')}",
        row.get("examType") or "",
    ]
    text = " · ".join(p for p in parts if p).strip()
    return text[:1000]  # cap to avoid huge encode time


def upsert_batch(items: list[dict[str, Any]]) -> None:
    payload = {
        "items": [
            {
                "id": r["id"],
                "text": build_text(r),
                "metadata": {
                    "subject": r.get("subject"),
                    "grade": r.get("grade"),
                    "examType": r.get("examType"),
                    "createdAt": str(r.get("createdAt", "")),
                },
            }
            for r in items
        ]
    }
    resp = requests.post(f"{EMBED_URL}/index/upsert", json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    print(f"  ✅ upserted {data['upserted']}, total index = {data['total']}")


def main() -> int:
    print(f"[batch_embed] Fetching exams from last {HOURS_BACK}h...")
    rows = fetch_recent_exams()
    print(f"[batch_embed] {len(rows)} rows to embed")
    if not rows:
        return 0

    t0 = time.time()
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        print(f"[batch_embed] Batch {i//BATCH + 1}/{(len(rows) + BATCH - 1)//BATCH}")
        try:
            upsert_batch(chunk)
        except Exception as e:
            print(f"  ❌ batch failed: {e}", file=sys.stderr)
    print(f"[batch_embed] Done in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
