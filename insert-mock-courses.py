#!/usr/bin/env python3
"""
Insert mockup data cho teacher@example.com:
  - User (teacher@example.com, role=TEACHER)
  - 3 Category (Vật lý, Toán học, Hoá học)
  - 5 Course (thuộc các môn trên)
  - 3-5 Chapter mỗi khoá

Chạy: python3 insert-mock-courses.py
"""
import sys, random, string, time
from datetime import datetime, timezone, timedelta

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("❌ Thiếu psycopg2. Chạy: pip install psycopg2-binary"); sys.exit(1)

DB_URL = os.environ.get("DATABASE_URL") or sys.exit("❌ Set DATABASE_URL env var (Neon connection string)")

_CHARS = string.ascii_lowercase + string.digits
def cuid():
    ts   = format(int(time.time() * 1000), 'x')
    rand = ''.join(random.choices(_CHARS, k=16))
    return 'c' + ts + rand

now = datetime.now(timezone.utc)
def ago(days=0, hours=0):
    return now - timedelta(days=days, hours=hours)

# ─────────────────────────────────────────────────────────
TEACHER_EMAIL = "teacher@example.com"
TEACHER_NAME  = "Nguyễn Văn Thành"

CATEGORIES = [
    {"id": cuid(), "name": "Vật lý"},
    {"id": cuid(), "name": "Toán học"},
    {"id": cuid(), "name": "Hoá học"},
]

# ── Mock courses ─────────────────────────────────────────
COURSE_DATA = [
    {
        "title":       "Vật lý 12 — Dao động và Sóng cơ",
        "description": "Khoá học toàn diện về dao động điều hoà, sóng cơ, sóng âm dành cho học sinh lớp 12 thi THPT Quốc gia.",
        "imageUrl":    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800",
        "price":       299000.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Dao động điều hoà — Khái niệm và phương trình",                    "isFree": True,  "isPublished": True},
            {"title": "Con lắc lò xo — Năng lượng và chu kỳ",                              "isFree": False, "isPublished": True},
            {"title": "Con lắc đơn — Ứng dụng thực tế",                                    "isFree": False, "isPublished": True},
            {"title": "Sóng cơ — Bản chất và đặc trưng",                                   "isFree": False, "isPublished": True},
            {"title": "Giao thoa sóng & Sóng dừng",                                        "isFree": False, "isPublished": True},
        ],
    },
    {
        "title":       "Vật lý 12 — Điện xoay chiều",
        "description": "Phân tích sâu mạch RLC, công suất điện, máy biến áp và máy phát điện. Bài tập theo cấu trúc đề thi mới.",
        "imageUrl":    "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea1?w=800",
        "price":       349000.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Đại cương dòng điện xoay chiều",         "isFree": True,  "isPublished": True},
            {"title": "Mạch thuần trở, thuần cảm, thuần dung",  "isFree": False, "isPublished": True},
            {"title": "Mạch R-L-C nối tiếp — Cộng hưởng điện", "isFree": False, "isPublished": True},
            {"title": "Công suất và hệ số công suất",           "isFree": False, "isPublished": True},
            {"title": "Máy biến áp — Truyền tải điện năng",     "isFree": False, "isPublished": False},
        ],
    },
    {
        "title":       "Luyện thi THPT — Vật lý Hạt nhân",
        "description": "Chuyên đề hạt nhân nguyên tử: phóng xạ, phản ứng hạt nhân, năng lượng liên kết. Giải chi tiết 200+ bài tập.",
        "imageUrl":    "https://images.unsplash.com/photo-1532094349884-543559450146?w=800",
        "price":       199000.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Cấu tạo hạt nhân — Năng lượng liên kết", "isFree": True,  "isPublished": True},
            {"title": "Phóng xạ — Định luật phân rã",            "isFree": False, "isPublished": True},
            {"title": "Phản ứng phân hạch và nhiệt hạch",        "isFree": False, "isPublished": True},
            {"title": "Bài tập tổng hợp chương hạt nhân",        "isFree": False, "isPublished": True},
        ],
    },
    {
        "title":       "Toán 12 — Giải tích (Đạo hàm & Tích phân)",
        "description": "Hệ thống lý thuyết và bài tập đạo hàm, tích phân, ứng dụng. Phù hợp ôn thi đại học.",
        "imageUrl":    "https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=800",
        "price":       0.0,
        "isPublished": True,
        "cat":         "Toán học",
        "chapters": [
            {"title": "Đạo hàm — Định nghĩa và quy tắc",             "isFree": True,  "isPublished": True},
            {"title": "Ứng dụng đạo hàm — Cực trị, tiếp tuyến",      "isFree": True,  "isPublished": True},
            {"title": "Tích phân — Định nghĩa và bảng nguyên hàm",    "isFree": False, "isPublished": True},
            {"title": "Ứng dụng tích phân — Tính diện tích, thể tích","isFree": False, "isPublished": True},
        ],
    },
    {
        "title":       "Hoá học 12 — Hoá hữu cơ nâng cao",
        "description": "Chinh phục Hoá hữu cơ: ancol, axit, este, amin, protein. Giải thích cơ chế phản ứng và bài tập THPT.",
        "imageUrl":    "https://images.unsplash.com/photo-1628863353691-0071c8c1874c?w=800",
        "price":       249000.0,
        "isPublished": False,  # Draft
        "cat":         "Hoá học",
        "chapters": [
            {"title": "Ancol — Phân loại và tính chất",   "isFree": True,  "isPublished": True},
            {"title": "Anđehit và Axit cacboxylic",        "isFree": False, "isPublished": True},
            {"title": "Este và Lipit",                     "isFree": False, "isPublished": False},
        ],
    },
]

# ─────────────────────────────────────────────────────────
def run():
    print("🔌 Kết nối Neon DB...")
    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    # ── 1. Teacher user ───────────────────────────────────
    cur.execute('SELECT id FROM "User" WHERE email = %s LIMIT 1', (TEACHER_EMAIL,))
    row = cur.fetchone()
    if row:
        teacher_id = row[0]
        print(f"  ✅ Teacher user exists: {teacher_id}")
    else:
        teacher_id = cuid()
        cur.execute(
            """INSERT INTO "User"
                 (id, email, name, role, "emailVerified", "twoFactorEnabled",
                  "failedLoginAttempts", "createdAt", "updatedAt")
               VALUES (%s,%s,%s,'TEACHER',NOW(),false,0,NOW(),NOW())""",
            (teacher_id, TEACHER_EMAIL, TEACHER_NAME)
        )
        conn.commit()
        print(f"  ✅ Created teacher: {TEACHER_EMAIL} → {teacher_id}")

    # ── 2. Categories ─────────────────────────────────────
    cat_map = {}  # name → id
    for cat in CATEGORIES:
        cur.execute('SELECT id FROM "Category" WHERE name = %s LIMIT 1', (cat["name"],))
        existing = cur.fetchone()
        if existing:
            cat_map[cat["name"]] = existing[0]
            print(f"  ↑ Category exists: {cat['name']}")
        else:
            cur.execute('INSERT INTO "Category" (id, name) VALUES (%s,%s)', (cat["id"], cat["name"]))
            cat_map[cat["name"]] = cat["id"]
            print(f"  ✅ Created category: {cat['name']}")
    conn.commit()

    # ── 3. Courses + Chapters ─────────────────────────────
    total_courses  = 0
    total_chapters = 0
    for i, c in enumerate(COURSE_DATA):
        course_id = cuid()
        cat_id    = cat_map[c["cat"]]
        created   = ago(days=30 - i * 5)
        updated   = ago(days=1 + i)

        cur.execute(
            """INSERT INTO "Course"
                 (id, "userId", title, description, "imageUrl", price,
                  "isPublished", "categoryId", "createdAt", "updatedAt")
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (id) DO NOTHING""",
            (course_id, teacher_id, c["title"], c["description"],
             c["imageUrl"], c["price"], c["isPublished"], cat_id,
             created, updated)
        )

        for pos, ch in enumerate(c["chapters"], start=1):
            ch_id = cuid()
            cur.execute(
                """INSERT INTO "Chapter"
                     (id, title, "position", "isPublished", "isFree",
                      "courseId", "createdAt", "updatedAt")
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO NOTHING""",
                (ch_id, ch["title"], pos, ch["isPublished"], ch["isFree"],
                 course_id, created + timedelta(hours=pos), updated)
            )
            total_chapters += 1

        total_courses += 1
        pub = "✅ Published" if c["isPublished"] else "📝 Draft"
        print(f"  {pub} [{c['cat']}] {c['title']} ({len(c['chapters'])} chapters)")

    conn.commit()
    cur.close()
    conn.close()

    print()
    print("=" * 55)
    print(f"✅ Mock data insert xong!")
    print(f"   Teacher : {TEACHER_EMAIL}")
    print(f"   Khoá học: {total_courses} (4 published, 1 draft)")
    print(f"   Chapters: {total_chapters}")
    print("=" * 55)

if __name__ == "__main__":
    run()
