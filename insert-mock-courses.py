#!/usr/bin/env python3
"""
Insert mock courses cho teacher@example.com với nội dung phong phú.

Tạo / cập nhật:
  - 1 User: teacher@example.com (role=TEACHER)
  - 3 Category: Vật lý, Toán học, Hoá học
  - 6 Course với ID ổn định c1-c6 (URL clean: /courses/c1 .. /courses/c6)
  - 5-6 Chapter/Course có description, duration, isFree, videoUrl

Script chạy idempotent — re-run không tạo trùng (ON CONFLICT UPDATE).

Chạy: python3 insert-mock-courses.py
"""
import sys, random, string, time
from datetime import datetime, timezone, timedelta

try:
    import psycopg2
except ImportError:
    print("❌ Thiếu psycopg2. Chạy: pip install psycopg2-binary"); sys.exit(1)

DB_URL = "postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

_CHARS = string.ascii_lowercase + string.digits
def cuid():
    ts   = format(int(time.time() * 1000), 'x')
    rand = ''.join(random.choices(_CHARS, k=16))
    return 'c' + ts + rand

now = datetime.now(timezone.utc)
def ago(days=0, hours=0):
    return now - timedelta(days=days, hours=hours)

TEACHER_EMAIL = "teacher@example.com"
TEACHER_NAME  = "Nguyễn Văn Thành"

CATEGORIES = [
    {"name": "Vật lý",    "slug": "vat-ly"},
    {"name": "Toán học",  "slug": "toan-hoc"},
    {"name": "Hoá học",   "slug": "hoa-hoc"},
]

# ── Mock courses với ID ổn định c1..c6 ───────────────────
# Mỗi chapter có: title, description, duration (phút), isFree, isPublished, videoUrl
DEMO_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

COURSE_DATA = [
    {
        "id":          "c1",
        "title":       "Vật lý 12 — Dao động và Sóng cơ",
        "description": "Khoá học toàn diện về dao động điều hoà, con lắc lò xo / con lắc đơn, sóng cơ và sóng âm. Đầy đủ lý thuyết + 200+ bài tập có lời giải chi tiết. Dành cho học sinh lớp 12 ôn thi THPT Quốc gia môn Vật lý.",
        "imageUrl":    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80",
        "price":       299000.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Dao động điều hoà — Khái niệm và phương trình",
             "description": "Định nghĩa dao động điều hoà, phương trình x = A·cos(ωt + φ), biên độ — tần số góc — pha ban đầu. Có thí nghiệm 3D minh hoạ chuyển động.",
             "duration": 45, "isFree": True,  "isPublished": True},
            {"title": "Con lắc lò xo — Năng lượng và chu kỳ",
             "description": "Phương trình con lắc lò xo, định luật bảo toàn năng lượng cơ học, chu kỳ T = 2π√(m/k). 30 bài tập chọn lọc.",
             "duration": 60, "isFree": False, "isPublished": True},
            {"title": "Con lắc đơn — Ứng dụng thực tế",
             "description": "Dao động của con lắc đơn, chu kỳ T = 2π√(l/g), ảnh hưởng nhiệt độ — vĩ độ — độ cao. Bài toán đồng hồ con lắc.",
             "duration": 55, "isFree": False, "isPublished": True},
            {"title": "Sóng cơ — Bản chất và đặc trưng",
             "description": "Sóng cơ, sóng ngang/sóng dọc, các đại lượng đặc trưng (chu kỳ, tần số, bước sóng, vận tốc). Phương trình sóng.",
             "duration": 50, "isFree": False, "isPublished": True},
            {"title": "Giao thoa sóng & Sóng dừng",
             "description": "Điều kiện giao thoa, vị trí cực đại — cực tiểu, sóng dừng trên sợi dây (2 đầu cố định / 1 đầu tự do).",
             "duration": 65, "isFree": False, "isPublished": True},
            {"title": "Sóng âm — Đặc trưng vật lý và sinh lý",
             "description": "Cường độ âm, mức cường độ âm L = 10·log(I/I₀), âm cơ bản — hoạ âm, hiệu ứng Doppler.",
             "duration": 40, "isFree": False, "isPublished": True},
        ],
    },
    {
        "id":          "c2",
        "title":       "Vật lý 12 — Điện xoay chiều",
        "description": "Phân tích sâu mạch RLC nối tiếp, công suất tiêu thụ, hệ số công suất, máy biến áp và truyền tải điện năng. Phương pháp giản đồ Fresnel + số phức để giải nhanh bài tập.",
        "imageUrl":    "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea1?w=1200&q=80",
        "price":       349000.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Đại cương dòng điện xoay chiều",
             "description": "Suất điện động xoay chiều, giá trị hiệu dụng, biểu thức i(t) — u(t), pha của các đại lượng.",
             "duration": 50, "isFree": True,  "isPublished": True},
            {"title": "Mạch thuần trở, thuần cảm, thuần dung",
             "description": "Quan hệ pha u — i trong từng loại mạch, cảm kháng Z_L = ωL, dung kháng Z_C = 1/(ωC).",
             "duration": 55, "isFree": False, "isPublished": True},
            {"title": "Mạch R-L-C nối tiếp — Cộng hưởng điện",
             "description": "Tổng trở Z, độ lệch pha φ, điều kiện cộng hưởng ω² = 1/(LC), bài tập biện luận theo R, L, C, ω.",
             "duration": 70, "isFree": False, "isPublished": True},
            {"title": "Công suất và hệ số công suất",
             "description": "P = UI·cosφ, ý nghĩa hệ số công suất, biện pháp nâng cao cosφ trong thực tế.",
             "duration": 45, "isFree": False, "isPublished": True},
            {"title": "Máy biến áp — Truyền tải điện năng",
             "description": "Nguyên lý máy biến áp, công thức U₁/U₂ = N₁/N₂, hao phí trên đường dây ΔP = P²R/(U·cosφ)².",
             "duration": 50, "isFree": False, "isPublished": True},
        ],
    },
    {
        "id":          "c3",
        "title":       "Luyện thi THPT — Vật lý Hạt nhân",
        "description": "Chuyên đề hạt nhân nguyên tử: cấu tạo, năng lượng liên kết, phóng xạ, phản ứng hạt nhân (phân hạch — nhiệt hạch). Giải chi tiết 200+ bài tập theo cấu trúc đề thi mới.",
        "imageUrl":    "https://images.unsplash.com/photo-1532094349884-543559450146?w=1200&q=80",
        "price":       199000.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Cấu tạo hạt nhân — Năng lượng liên kết",
             "description": "Số khối A, số proton Z, đồng vị, năng lượng liên kết ΔE = Δm·c², độ hụt khối.",
             "duration": 45, "isFree": True,  "isPublished": True},
            {"title": "Phóng xạ — Định luật phân rã",
             "description": "α, β⁻, β⁺, γ, định luật phân rã N(t) = N₀·e^(-λt), chu kỳ bán rã T.",
             "duration": 50, "isFree": False, "isPublished": True},
            {"title": "Phản ứng phân hạch và nhiệt hạch",
             "description": "Phản ứng phân hạch dây chuyền, hệ số nhân nơtron, năng lượng phản ứng, nhiệt hạch trong Mặt Trời.",
             "duration": 55, "isFree": False, "isPublished": True},
            {"title": "Bài tập tổng hợp chương hạt nhân",
             "description": "Tổng hợp 50+ bài tập tự luyện kèm lời giải, phân loại theo dạng & mức độ.",
             "duration": 90, "isFree": False, "isPublished": True},
        ],
    },
    {
        "id":          "c4",
        "title":       "Toán 12 — Giải tích (Đạo hàm & Tích phân)",
        "description": "Hệ thống lý thuyết và bài tập đạo hàm, tích phân, ứng dụng thực tế. Mỗi chương có 30+ bài luyện kèm video chữa chi tiết. Khoá học MIỄN PHÍ — chỉ cần đăng ký để học.",
        "imageUrl":    "https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=1200&q=80",
        "price":       0.0,
        "isPublished": True,
        "cat":         "Toán học",
        "chapters": [
            {"title": "Đạo hàm — Định nghĩa và quy tắc",
             "description": "Định nghĩa đạo hàm, đạo hàm các hàm sơ cấp, quy tắc đạo hàm tổng/hiệu/tích/thương/hợp.",
             "duration": 50, "isFree": True,  "isPublished": True},
            {"title": "Ứng dụng đạo hàm — Cực trị, tiếp tuyến",
             "description": "Tìm cực trị, viết PT tiếp tuyến, khảo sát hàm số, bài toán tối ưu thực tế.",
             "duration": 60, "isFree": True,  "isPublished": True},
            {"title": "Tích phân — Định nghĩa và bảng nguyên hàm",
             "description": "Nguyên hàm, tích phân xác định, công thức Newton-Leibniz, các phương pháp đổi biến — từng phần.",
             "duration": 70, "isFree": False, "isPublished": True},
            {"title": "Ứng dụng tích phân — Tính diện tích, thể tích",
             "description": "Diện tích hình phẳng, thể tích vật thể tròn xoay, ứng dụng vật lý (quãng đường — công).",
             "duration": 65, "isFree": False, "isPublished": True},
            {"title": "Đề thi thử THPT — Giải chi tiết",
             "description": "5 đề thi thử full, mỗi đề 50 câu trắc nghiệm có video chữa.",
             "duration": 120, "isFree": False, "isPublished": True},
        ],
    },
    {
        "id":          "c5",
        "title":       "Hoá học 12 — Hoá hữu cơ nâng cao",
        "description": "Chinh phục Hoá hữu cơ: ancol, anđehit, axit, este, amin, amino axit, protein, polime. Giải thích cơ chế phản ứng + 150+ bài tập chuyên đề THPT.",
        "imageUrl":    "https://images.unsplash.com/photo-1628863353691-0071c8c1874c?w=1200&q=80",
        "price":       249000.0,
        "isPublished": True,
        "cat":         "Hoá học",
        "chapters": [
            {"title": "Ancol — Phân loại và tính chất",
             "description": "Cấu tạo, đồng phân, danh pháp, tính chất hoá học (tác dụng Na, axit, oxi hoá).",
             "duration": 50, "isFree": True,  "isPublished": True},
            {"title": "Anđehit và Axit cacboxylic",
             "description": "Phản ứng tráng bạc, phản ứng với Cu(OH)₂, axit cacboxylic và tính chất chung.",
             "duration": 55, "isFree": False, "isPublished": True},
            {"title": "Este và Lipit",
             "description": "Phản ứng este hoá, xà phòng hoá, chất béo và phản ứng hidro hoá dầu thực vật.",
             "duration": 60, "isFree": False, "isPublished": True},
            {"title": "Amin — Amino axit — Protein",
             "description": "Tính bazơ của amin, tính lưỡng tính của amino axit, peptit và phản ứng màu biure.",
             "duration": 55, "isFree": False, "isPublished": True},
            {"title": "Polime — Vật liệu polime",
             "description": "Phân loại, điều chế (trùng hợp/trùng ngưng), ứng dụng polime tổng hợp & thiên nhiên.",
             "duration": 45, "isFree": False, "isPublished": True},
        ],
    },
    {
        "id":          "c6",
        "title":       "Vật lý Cơ học Nâng cao — Lab 3D Tương tác",
        "description": "Khám phá cơ học Newton bằng thí nghiệm 3D tương tác và phỏng vấn vật lý chuyên sâu. Phù hợp học sinh giỏi và sinh viên năm 1 vật lý đại cương.",
        "imageUrl":    "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1200&q=80",
        "price":       0.0,
        "isPublished": True,
        "cat":         "Vật lý",
        "chapters": [
            {"title": "Giới thiệu về Cơ học Newtonian",
             "description": "Ba định luật Newton, lực — gia tốc — khối lượng, hệ quy chiếu quán tính.",
             "duration": 45, "isFree": True,  "isPublished": True},
            {"title": "Động lực học chuyển động thẳng",
             "description": "Vận tốc, gia tốc, quãng đường, đồ thị chuyển động.",
             "duration": 60, "isFree": True,  "isPublished": True},
            {"title": "Chuyển động tròn và lực hướng tâm",
             "description": "Phân tích chuyển động tròn đều và không đều, lực hướng tâm F = mv²/r.",
             "duration": 55, "isFree": False, "isPublished": True},
            {"title": "Định luật bảo toàn năng lượng",
             "description": "Cơ năng, thế năng trọng trường, động năng, định luật bảo toàn cơ năng.",
             "duration": 70, "isFree": False, "isPublished": True},
            {"title": "Va chạm và xung lượng",
             "description": "Va chạm đàn hồi, va chạm không đàn hồi, định luật bảo toàn động lượng.",
             "duration": 50, "isFree": False, "isPublished": True},
            {"title": "Dao động và sóng cơ — Phòng lab 3D",
             "description": "Con lắc đơn, con lắc lò xo, sóng cơ trong phòng lab ảo 3D tương tác.",
             "duration": 65, "isFree": False, "isPublished": True},
        ],
    },
]

# ─────────────────────────────────────────────────────────
def ensure_chapter_columns(cur):
    """Thêm cột description, duration, videoUrl vào Chapter nếu chưa có."""
    for col, kind in [
        ('description', 'TEXT'),
        ('duration',    'INTEGER'),
        ('videoUrl',    'TEXT'),
    ]:
        try:
            cur.execute(f'ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "{col}" {kind}')
        except Exception as e:
            print(f"  ⚠ alter Chapter.{col}: {e}")

def ensure_tables(cur):
    """CREATE TABLE IF NOT EXISTS cho User / Category / Course / Chapter — phòng khi DB sạch."""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS "User" (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'STUDENT',
            "emailVerified" TIMESTAMPTZ,
            "twoFactorEnabled" BOOLEAN DEFAULT false,
            "failedLoginAttempts" INTEGER DEFAULT 0,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS "Category" (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS "Course" (
            id TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            "imageUrl" TEXT,
            price NUMERIC,
            "categoryId" TEXT,
            "isPublished" BOOLEAN DEFAULT false,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS "Chapter" (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            duration INTEGER,
            "videoUrl" TEXT,
            position INTEGER NOT NULL DEFAULT 1,
            "isPublished" BOOLEAN DEFAULT false,
            "isFree" BOOLEAN DEFAULT false,
            "courseId" TEXT NOT NULL,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        )
    """)

def run():
    print("🔌 Kết nối Neon DB...")
    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    ensure_tables(cur)
    ensure_chapter_columns(cur)
    conn.commit()

    # ── 1. Teacher user ───────────────────────────────────
    cur.execute('SELECT id FROM "User" WHERE email = %s LIMIT 1', (TEACHER_EMAIL,))
    row = cur.fetchone()
    if row:
        teacher_id = row[0]
        print(f"  ✅ Teacher user exists: {teacher_id}")
        # đảm bảo role là TEACHER
        cur.execute('UPDATE "User" SET role=\'TEACHER\', name=%s WHERE id=%s', (TEACHER_NAME, teacher_id))
    else:
        teacher_id = cuid()
        cur.execute(
            """INSERT INTO "User"
                 (id, email, name, role, "emailVerified", "twoFactorEnabled",
                  "failedLoginAttempts", "createdAt", "updatedAt")
               VALUES (%s,%s,%s,'TEACHER',NOW(),false,0,NOW(),NOW())""",
            (teacher_id, TEACHER_EMAIL, TEACHER_NAME)
        )
        print(f"  ✅ Created teacher: {TEACHER_EMAIL} → {teacher_id}")
    conn.commit()

    # ── 2. Categories ─────────────────────────────────────
    cat_map = {}
    for cat in CATEGORIES:
        cur.execute('SELECT id FROM "Category" WHERE name = %s LIMIT 1', (cat["name"],))
        existing = cur.fetchone()
        if existing:
            cat_map[cat["name"]] = existing[0]
            print(f"  ↑ Category exists: {cat['name']}")
        else:
            cid = cuid()
            cur.execute('INSERT INTO "Category" (id, name) VALUES (%s,%s)', (cid, cat["name"]))
            cat_map[cat["name"]] = cid
            print(f"  ✅ Created category: {cat['name']}")
    conn.commit()

    # ── 3. Courses + Chapters (UPSERT) ────────────────────
    total_courses  = 0
    total_chapters = 0
    for i, c in enumerate(COURSE_DATA):
        course_id = c["id"]            # stable id (c1, c2, ...)
        cat_id    = cat_map[c["cat"]]
        created   = ago(days=30 - i * 5)
        updated   = ago(days=1 + i)

        # UPSERT Course
        cur.execute(
            """INSERT INTO "Course"
                 (id, "userId", title, description, "imageUrl", price,
                  "isPublished", "categoryId", "createdAt", "updatedAt")
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (id) DO UPDATE SET
                 "userId" = EXCLUDED."userId",
                 title = EXCLUDED.title,
                 description = EXCLUDED.description,
                 "imageUrl" = EXCLUDED."imageUrl",
                 price = EXCLUDED.price,
                 "isPublished" = EXCLUDED."isPublished",
                 "categoryId" = EXCLUDED."categoryId",
                 "updatedAt" = EXCLUDED."updatedAt"
            """,
            (course_id, teacher_id, c["title"], c["description"],
             c["imageUrl"], c["price"], c["isPublished"], cat_id,
             created, updated)
        )

        # Xoá chapter cũ rồi insert lại (đơn giản hơn UPSERT từng row)
        cur.execute('DELETE FROM "Chapter" WHERE "courseId" = %s', (course_id,))

        for pos, ch in enumerate(c["chapters"], start=1):
            ch_id = f"{course_id}-ch{pos}"
            cur.execute(
                """INSERT INTO "Chapter"
                     (id, title, description, duration, "videoUrl",
                      position, "isPublished", "isFree",
                      "courseId", "createdAt", "updatedAt")
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (ch_id, ch["title"], ch["description"], ch["duration"],
                 DEMO_VIDEO if ch["isFree"] or pos == 1 else None,
                 pos, ch["isPublished"], ch["isFree"],
                 course_id, created + timedelta(hours=pos), updated)
            )
            total_chapters += 1

        total_courses += 1
        pub = "✅ Published" if c["isPublished"] else "📝 Draft"
        print(f"  {pub} [{c['cat']}] /courses/{course_id} — {c['title']} ({len(c['chapters'])} chapters)")

    conn.commit()
    cur.close()
    conn.close()

    print()
    print("=" * 60)
    print(f"✅ Mock data insert xong!")
    print(f"   Teacher : {TEACHER_EMAIL}")
    print(f"   Khoá học: {total_courses} (ID: c1, c2, c3, c4, c5, c6)")
    print(f"   Chapters: {total_chapters}")
    print(f"   URL    : https://inphysic.com/courses/c1 ... /c6")
    print("=" * 60)

if __name__ == "__main__":
    run()
