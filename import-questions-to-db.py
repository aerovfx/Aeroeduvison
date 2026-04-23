#!/usr/bin/env python3
"""
Import ngân hàng câu hỏi Vật lý 12 vào Neon PostgreSQL.
Đọc từ data/questions_import.json → INSERT INTO "Question"

Yêu cầu:
  pip install psycopg2-binary

Chạy từ thư mục gốc project:
  python3 import-questions-to-db.py
"""
import json, sys, os, time, random, string
from datetime import datetime, timezone

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("❌ Thiếu psycopg2. Chạy: pip install psycopg2-binary")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────
DB_URL       = "postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JSON_FILE    = os.path.join(os.path.dirname(__file__), "data", "questions_import.json")
CREATED_BY   = "system-import"
BATCH_SIZE   = 200

# cuid-compatible ID generator (same alphabet as cuid2, good enough for Prisma)
_CUID_CHARS = string.ascii_lowercase + string.digits
def cuid() -> str:
    ts = format(int(time.time() * 1000), 'x')               # hex timestamp
    rand = ''.join(random.choices(_CUID_CHARS, k=16))       # random suffix
    return 'c' + ts + rand                                   # ~25 chars, unique

# ── Load ──────────────────────────────────────────────────────
print(f"📂 Đọc {JSON_FILE} ...")
with open(JSON_FILE, encoding="utf-8") as f:
    questions = json.load(f)
print(f"   ✅ {len(questions)} câu hỏi")

# ── Connect ───────────────────────────────────────────────────
print("🔌 Kết nối Neon DB ...")
conn = psycopg2.connect(DB_URL)
cur  = conn.cursor()

cur.execute('SELECT COUNT(*) FROM "Question"')
before = cur.fetchone()[0]
print(f"   📊 DB hiện có: {before} câu hỏi")

# ── Insert ────────────────────────────────────────────────────
now  = datetime.now(timezone.utc)
rows = []
for q in questions:
    rows.append((
        cuid(),                 # id  ← Prisma default is client-side, must supply manually
        q["topic"], q["subject"], q["grade"],
        q["questionType"], q["difficulty"],
        q["content"],
        q["options"],           # TEXT[]
        q.get("correctAnswer",""),
        q.get("explanation",""),
        [],                     # learningObjectives TEXT[]
        q.get("tags", []),      # tags TEXT[]
        False,                  # aiGenerated
        False,                  # humanReviewed
        "Hoạt động",           # status
        CREATED_BY,             # createdBy
        now,                    # createdAt
        now,                    # updatedAt
        0,                      # usageCount
    ))

INSERT_SQL = """
    INSERT INTO "Question"
      (id, topic, subject, grade, "questionType", difficulty,
       content, options, "correctAnswer", explanation,
       "learningObjectives", tags, "aiGenerated",
       "humanReviewed", status, "createdBy", "createdAt", "updatedAt", "usageCount")
    VALUES %s
    ON CONFLICT (id) DO NOTHING
"""

inserted_total = 0
for i in range(0, len(rows), BATCH_SIZE):
    batch = rows[i : i + BATCH_SIZE]
    execute_values(cur, INSERT_SQL, batch, page_size=BATCH_SIZE)
    conn.commit()
    inserted_total += len(batch)
    print(f"   ↑ {inserted_total}/{len(rows)} rows committed ...")

cur.execute('SELECT COUNT(*) FROM "Question"')
after   = cur.fetchone()[0]
new_rows= after - before
cur.close()
conn.close()

print()
print("=" * 50)
print(f"✅ Import xong!")
print(f"   Trước: {before} | Sau: {after} | Mới thêm: {new_rows}")
print("=" * 50)
