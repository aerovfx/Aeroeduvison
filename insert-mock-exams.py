#!/usr/bin/env python3
"""
insert-mock-exams.py
--------------------
Inserts mockup Exam records for teacher@example.com into Neon DB.
Uses description field to carry subject info (not in Exam schema natively).

Usage:
    python3 -m venv .venv && source .venv/bin/activate
    pip install psycopg2-binary
    python3 insert-mock-exams.py
"""

import psycopg2
import time, random, string, json
from datetime import datetime, timezone, timedelta

# ── Neon DB connection ─────────────────────────────────────────────────────────
DATABASE_URL = (
    "postgresql://neondb_owner:npg_ADdhqO90fnVb"
    "@ep-young-hat-a15kp33z-pooler.ap-southeast-1.aws.neon.tech"
    "/neondb?sslmode=require&channel_binding=require"
)

# ── cuid-style ID generator ───────────────────────────────────────────────────
def cuid():
    ts = format(int(time.time() * 1000), 'x')
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    return 'c' + ts + rand

# ── Mock exam data ─────────────────────────────────────────────────────────────
#  description stores JSON so the API handler can read subject back out
MOCK_EXAMS = [
    {
        "title": "Kiểm tra 15 phút — Dao động điều hoà",
        "subject": "Vật lý",
        "examType": "Kiểm tra thường xuyên",
        "duration": 15,
        "totalScore": 10.0,
        "totalQuestions": 10,
        "status": "Hoàn tất",
    },
    {
        "title": "Đề thi giữa kỳ — Điện xoay chiều",
        "subject": "Vật lý",
        "examType": "Giữa kỳ",
        "duration": 45,
        "totalScore": 10.0,
        "totalQuestions": 30,
        "status": "Hoàn tất",
    },
    {
        "title": "Đề thi cuối kỳ — Vật lý 12 (HK1)",
        "subject": "Vật lý",
        "examType": "Cuối kỳ",
        "duration": 90,
        "totalScore": 10.0,
        "totalQuestions": 40,
        "status": "Kết thúc",
    },
    {
        "title": "Luyện thi THPT — Sóng ánh sáng & Lượng tử",
        "subject": "Vật lý",
        "examType": "Luyện thi",
        "duration": 50,
        "totalScore": 10.0,
        "totalQuestions": 40,
        "status": "Hoàn tất",
    },
    {
        "title": "Đề minh hoạ THPT Quốc gia 2025",
        "subject": "Vật lý",
        "examType": "THPT Quốc gia",
        "duration": 50,
        "totalScore": 10.0,
        "totalQuestions": 40,
        "status": "Đang thi",
    },
    {
        "title": "Kiểm tra 45 phút — Hạt nhân nguyên tử",
        "subject": "Vật lý",
        "examType": "Kiểm tra định kỳ",
        "duration": 45,
        "totalScore": 10.0,
        "totalQuestions": 30,
        "status": "Hoàn tất",
    },
    {
        "title": "Bài kiểm tra nhanh — Quang hình học",
        "subject": "Vật lý",
        "examType": "Kiểm tra thường xuyên",
        "duration": 15,
        "totalScore": 10.0,
        "totalQuestions": 10,
        "status": "Nháp",
    },
    {
        "title": "Đề thi thử THPT — Toán 12 (lần 1)",
        "subject": "Toán học",
        "examType": "Luyện thi",
        "duration": 90,
        "totalScore": 10.0,
        "totalQuestions": 50,
        "status": "Hoàn tất",
    },
    {
        "title": "Kiểm tra 1 tiết — Giải tích hàm số",
        "subject": "Toán học",
        "examType": "Kiểm tra định kỳ",
        "duration": 45,
        "totalScore": 10.0,
        "totalQuestions": 25,
        "status": "Kết thúc",
    },
    {
        "title": "Đề ôn — Hoá hữu cơ nâng cao",
        "subject": "Hoá học",
        "examType": "Ôn tập",
        "duration": 60,
        "totalScore": 10.0,
        "totalQuestions": 35,
        "status": "Nháp",
    },
]

def run():
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()

    # ── Find teacher user ──────────────────────────────────────────────────────
    cur.execute('SELECT id FROM "User" WHERE LOWER(email) = %s LIMIT 1', ('teacher@example.com',))
    row = cur.fetchone()
    if not row:
        print("❌  teacher@example.com not found — run insert-mock-courses.py first")
        conn.close()
        return
    teacher_id = row[0]
    print(f"✅  Found teacher: {teacher_id}")

    # ── Insert exams ───────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    inserted = 0

    for i, ex in enumerate(MOCK_EXAMS):
        exam_id   = cuid()
        # Encode subject into description so the API handler can expose it
        desc_json = json.dumps({"subject": ex["subject"]}, ensure_ascii=False)
        created   = now - timedelta(days=len(MOCK_EXAMS) - i)  # spread across recent days
        updated   = created + timedelta(hours=random.randint(1, 48))

        cur.execute(
            """
            INSERT INTO "Exam"
              (id, title, description, "examType", duration, "totalScore",
               "totalQuestions", status, "userId", "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (
                exam_id,
                ex["title"],
                desc_json,
                ex["examType"],
                ex["duration"],
                ex["totalScore"],
                ex["totalQuestions"],
                ex["status"],
                teacher_id,
                created,
                updated,
            )
        )
        print(f"  [{i+1:02d}] {ex['title'][:55]:<55} ({ex['status']})")
        inserted += 1

    conn.commit()
    print(f"\n✅  Inserted {inserted} exams for teacher@example.com")
    cur.close()
    conn.close()

if __name__ == "__main__":
    run()
