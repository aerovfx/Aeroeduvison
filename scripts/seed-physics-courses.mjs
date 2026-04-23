/**
 * Seed 4 Physics Courses — Mockup Data
 * Chạy: node scripts/seed-physics-courses.mjs
 *
 * Requires: DATABASE_URL in .env (Neon PostgreSQL)
 * Install:  npm install postgres dotenv   (nếu chưa có)
 */
import { readFileSync } from 'fs'
import { createRequire } from 'module'

// ── Load env ──────────────────────────────────────────────────────────────────
const envFile = new URL('../.env', import.meta.url)
const envVars = readFileSync(envFile, 'utf8')
  .split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, l) => {
    const [k, ...v] = l.split('=')
    acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
    return acc
  }, {})

const DATABASE_URL = envVars.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL not found in .env')

// ── Connect ───────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url)
let sql
try {
  const postgres = (await import('postgres')).default
  sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })
} catch {
  // Fallback: pg
  const { Pool } = require('pg')
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  sql = { query: (q, p) => pool.query(q, p), end: () => pool.end() }
}

// ── Teacher user ──────────────────────────────────────────────────────────────
const TEACHER_ID = 'cmnn66ky20000s602tl7vgseu'  // admin account hiện tại
const SCHOOL_ID  = 'default-school'

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 11) +
         Math.random().toString(36).slice(2, 11)
}

// ── Course data ───────────────────────────────────────────────────────────────
const courses = [
  {
    title: 'Cơ học Newton – Nền tảng Vật lí đại cương',
    description: `<p>Khoá học cung cấp nền tảng vững chắc về cơ học cổ điển theo các định luật Newton. Học viên sẽ hiểu sâu về chuyển động, lực, năng lượng và hệ quy chiếu quán tính.</p>
<p>Nội dung bao gồm:</p>
<ul>
  <li>3 định luật Newton và ứng dụng thực tế</li>
  <li>Động học: vận tốc, gia tốc, phương trình chuyển động</li>
  <li>Công, năng lượng, định lý động năng</li>
  <li>Va chạm đàn hồi và không đàn hồi</li>
  <li>Chuyển động tròn và lực hướng tâm</li>
</ul>`,
    price: 299000,
    category: 'Vật lí',
    image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    chapters: [
      { title: 'Giới thiệu: Vật lí cơ học là gì?', position: 1, is_free: true },
      { title: 'Định luật 1 Newton – Quán tính', position: 2, is_free: true },
      { title: 'Định luật 2 Newton – F = ma', position: 3 },
      { title: 'Định luật 3 Newton – Phản lực', position: 4 },
      { title: 'Lực ma sát và ứng dụng', position: 5 },
      { title: 'Động năng và thế năng', position: 6 },
      { title: 'Bảo toàn năng lượng', position: 7 },
      { title: 'Va chạm và bảo toàn động lượng', position: 8 },
    ],
  },
  {
    title: 'Điện từ học – Điện trường, Từ trường & Cảm ứng điện từ',
    description: `<p>Khoá học toàn diện về điện từ học, từ điện tích cơ bản đến sóng điện từ Maxwell. Phù hợp cho học sinh lớp 11 và sinh viên năm nhất đại học.</p>
<p>Nội dung bao gồm:</p>
<ul>
  <li>Điện tích, định luật Coulomb, điện trường</li>
  <li>Điện thế, tụ điện, năng lượng điện trường</li>
  <li>Dòng điện không đổi, định luật Ohm, mạch điện</li>
  <li>Từ trường, lực Lorentz, cảm ứng điện từ</li>
  <li>Máy biến áp và dòng điện xoay chiều</li>
</ul>`,
    price: 349000,
    category: 'Vật lí',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    chapters: [
      { title: 'Điện tích và Định luật Coulomb', position: 1, is_free: true },
      { title: 'Điện trường – Khái niệm và tính toán', position: 2, is_free: true },
      { title: 'Điện thế và Hiệu điện thế', position: 3 },
      { title: 'Tụ điện – Cấu tạo và ứng dụng', position: 4 },
      { title: 'Dòng điện không đổi và Định luật Ohm', position: 5 },
      { title: 'Mạch điện: nối tiếp, song song, hỗn hợp', position: 6 },
      { title: 'Từ trường và Lực từ', position: 7 },
      { title: 'Cảm ứng điện từ – Định luật Faraday', position: 8 },
      { title: 'Dòng điện xoay chiều và Máy biến áp', position: 9 },
    ],
  },
  {
    title: 'Quang học & Sóng – Ánh sáng, Giao thoa và Khúc xạ',
    description: `<p>Khám phá thế giới của sóng ánh sáng — từ gương phẳng, thấu kính đến hiện tượng giao thoa và tán sắc. Khoá học kết hợp lý thuyết với thực nghiệm trực quan.</p>
<p>Nội dung bao gồm:</p>
<ul>
  <li>Bản chất sóng của ánh sáng, phổ điện từ</li>
  <li>Phản xạ, khúc xạ, định luật Snell</li>
  <li>Thấu kính hội tụ và phân kỳ – dựng ảnh</li>
  <li>Giao thoa ánh sáng – thí nghiệm Young</li>
  <li>Nhiễu xạ, tán sắc và ứng dụng quang học</li>
  <li>Sóng âm và đặc tính âm thanh</li>
</ul>`,
    price: 279000,
    category: 'Vật lí',
    image_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80',
    chapters: [
      { title: 'Ánh sáng là gì? Tốc độ ánh sáng', position: 1, is_free: true },
      { title: 'Phản xạ ánh sáng và Gương phẳng', position: 2, is_free: true },
      { title: 'Khúc xạ ánh sáng – Định luật Snell', position: 3 },
      { title: 'Thấu kính hội tụ – Dựng ảnh và tính toán', position: 4 },
      { title: 'Thấu kính phân kỳ và Hệ thấu kính', position: 5 },
      { title: 'Giao thoa ánh sáng – Thí nghiệm Young', position: 6 },
      { title: 'Tán sắc ánh sáng và Màu sắc', position: 7 },
      { title: 'Sóng âm, Cộng hưởng và Doppler', position: 8 },
    ],
  },
  {
    title: 'Vật lí Hiện đại – Lượng tử, Hạt nhân & Thuyết tương đối',
    description: `<p>Hành trình vào thế giới vi mô: từ hiệu ứng quang điện của Einstein đến cơ học lượng tử, phóng xạ hạt nhân và E=mc². Khoá học dành cho học sinh lớp 12 và người yêu thích Vật lí lý thuyết.</p>
<p>Nội dung bao gồm:</p>
<ul>
  <li>Thuyết tương đối hẹp Einstein: E=mc², giãn nở thời gian</li>
  <li>Bức xạ vật đen, giả thuyết Planck</li>
  <li>Hiệu ứng quang điện và lưỡng tính sóng–hạt</li>
  <li>Mô hình nguyên tử Bohr, phổ vạch hydro</li>
  <li>Phóng xạ alpha, beta, gamma và chu kỳ bán rã</li>
  <li>Phản ứng hạt nhân, năng lượng liên kết và lò phản ứng</li>
</ul>`,
    price: 399000,
    category: 'Vật lí',
    image_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
    chapters: [
      { title: 'Giới thiệu Vật lí hiện đại', position: 1, is_free: true },
      { title: 'Thuyết tương đối hẹp – E=mc²', position: 2, is_free: true },
      { title: 'Giãn nở thời gian và Co rút không gian', position: 3 },
      { title: 'Bức xạ vật đen và Giả thuyết Planck', position: 4 },
      { title: 'Hiệu ứng quang điện – Photon là gì?', position: 5 },
      { title: 'Lưỡng tính sóng–hạt và Nguyên lý bất định', position: 6 },
      { title: 'Mô hình nguyên tử Bohr', position: 7 },
      { title: 'Phóng xạ và Phân rã hạt nhân', position: 8 },
      { title: 'Phản ứng hạt nhân và Năng lượng hạt nhân', position: 9 },
      { title: 'Ứng dụng: Lò phản ứng, PET scan, Carbon dating', position: 10 },
    ],
  },
]

// ── Upsert category ───────────────────────────────────────────────────────────
async function getOrCreateCategory(name) {
  if (sql.query) {
    // pg Pool fallback
    let r = await sql.query('SELECT id FROM "Category" WHERE lower(name) = lower($1)', [name])
    if (r.rows.length) return r.rows[0].id
    const id = uid()
    await sql.query('INSERT INTO "Category" (id, name) VALUES ($1, $2)', [id, name])
    return id
  }
  // postgres.js
  const rows = await sql`SELECT id FROM "Category" WHERE lower(name) = lower(${name})`
  if (rows.length) return rows[0].id
  const id = uid()
  await sql`INSERT INTO "Category" (id, name) VALUES (${id}, ${name})`
  return id
}

// ── Insert course + chapters ──────────────────────────────────────────────────
async function insertCourse(course, catId) {
  const courseId = uid()
  const now = new Date().toISOString()

  if (sql.query) {
    await sql.query(
      `INSERT INTO "Course" (id, user_id, school_id, title, description, image_url, price, category_id, is_published, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [courseId, TEACHER_ID, SCHOOL_ID, course.title, course.description,
       course.image_url, course.price, catId, now, now]
    )
    for (const ch of course.chapters) {
      const chId = uid()
      await sql.query(
        `INSERT INTO "Chapter" (id, course_id, title, position, is_published, is_free, created_at, updated_at)
         VALUES ($1,$2,$3,$4,true,$5,$6,$7)`,
        [chId, courseId, ch.title, ch.position, ch.is_free ?? false, now, now]
      )
    }
  } else {
    await sql`
      INSERT INTO "Course" (id, user_id, school_id, title, description, image_url, price, category_id, is_published, created_at, updated_at)
      VALUES (${courseId}, ${TEACHER_ID}, ${SCHOOL_ID}, ${course.title}, ${course.description},
              ${course.image_url}, ${course.price}, ${catId}, true, ${now}, ${now})
      ON CONFLICT (id) DO NOTHING`

    for (const ch of course.chapters) {
      const chId = uid()
      await sql`
        INSERT INTO "Chapter" (id, course_id, title, position, is_published, is_free, created_at, updated_at)
        VALUES (${chId}, ${courseId}, ${ch.title}, ${ch.position}, true, ${ch.is_free ?? false}, ${now}, ${now})`
    }
  }

  return courseId
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('🚀 Seeding 4 physics courses...\n')

const catId = await getOrCreateCategory('Vật lí')
console.log(`📁 Category "Vật lí" → ${catId}`)

for (const course of courses) {
  const id = await insertCourse(course, catId)
  console.log(`✅ ${course.title.substring(0, 50)} → ${id} (${course.chapters.length} chapters)`)
}

if (sql.end) await sql.end()
console.log('\n🎉 Xong! Reload lại trang để xem khoá học.')
