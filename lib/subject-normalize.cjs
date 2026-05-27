/**
 * Subject Normalization — chuẩn hoá tên môn học VN
 *
 * Lý do: cùng 1 môn được nhập với nhiều biến thể (vd "Vật lý" vs "Vật lí")
 * → analytics sai (treat thành 2 môn riêng), filter không match, statistics
 * chia 2 nhóm.
 *
 * Quy tắc dùng từ chuẩn theo:
 *   - SGK Bộ GD&ĐT (CT GDPT 2018): "Vật lí" (không phải "Vật lý")
 *   - SGK GDPT 2018 Hoá: "Hoá học" (không phải "Hóa học")
 *   - SGK GDPT 2018: "Địa lí" (không phải "Địa lý")
 *   - Văn: "Ngữ văn" (chuẩn)
 *   - Sử: "Lịch sử" (chuẩn)
 *
 * Áp dụng:
 *   - normalizeSubject(input) trên mọi write (POST/PATCH)
 *   - Migration backfill DB ở startup (1 lần / boot)
 *
 * NOTE: chuẩn này theo tinh thần "Tiếng Việt phổ thông", không phải
 * "Hán-Việt cổ" — vd "Vật lí" là spelling chuẩn hiện hành 2018, không
 * phải "Vật lý" (cách viết phổ biến trước đây).
 */

'use strict';

/**
 * Map biến thể → tên chuẩn. Khoá là LOWERCASE đã trim, không dấu space dư.
 * Tên chuẩn (value) giữ nguyên chữ hoa.
 */
const SUBJECT_ALIASES = {
  // Vật lí — biến thể chính: "lý" → "lí"
  'vật lý':        'Vật lí',
  'vật lí':        'Vật lí',
  'vat ly':        'Vật lí',
  'vat li':        'Vật lí',
  'physics':       'Vật lí',
  'vatly':         'Vật lí',
  'vat-ly':        'Vật lí',

  // Hoá học — biến thể "Hóa" vs "Hoá"
  'hóa học':       'Hoá học',
  'hoá học':       'Hoá học',
  'hoa hoc':       'Hoá học',
  'hóa':           'Hoá học',
  'hoá':           'Hoá học',
  'chemistry':     'Hoá học',

  // Sinh học
  'sinh học':      'Sinh học',
  'sinh hoc':      'Sinh học',
  'sinh':          'Sinh học',
  'biology':       'Sinh học',

  // Toán — chuẩn là "Toán" (ngắn), không phải "Toán học"
  'toán':          'Toán',
  'toan':          'Toán',
  'toán học':      'Toán',
  'math':          'Toán',
  'mathematics':   'Toán',

  // Tin học
  'tin học':       'Tin học',
  'tin hoc':       'Tin học',
  'tin':           'Tin học',
  'informatics':   'Tin học',
  'cs':            'Tin học',

  // Ngữ văn
  'văn':           'Ngữ văn',
  'van':           'Ngữ văn',
  'ngữ văn':       'Ngữ văn',
  'ngu van':       'Ngữ văn',
  'tiếng việt':    'Ngữ văn',
  'literature':    'Ngữ văn',

  // Lịch sử
  'sử':            'Lịch sử',
  'lịch sử':       'Lịch sử',
  'lich su':       'Lịch sử',
  'history':       'Lịch sử',

  // Địa lí — biến thể "lý" → "lí"
  'địa':           'Địa lí',
  'địa lý':        'Địa lí',
  'địa lí':        'Địa lí',
  'dia ly':        'Địa lí',
  'dia li':        'Địa lí',
  'geography':     'Địa lí',

  // Tiếng Anh
  'anh':           'Tiếng Anh',
  'tiếng anh':     'Tiếng Anh',
  'tieng anh':     'Tiếng Anh',
  'english':       'Tiếng Anh',
  'eng':           'Tiếng Anh',

  // GDCD / Kinh tế PL
  'gdcd':          'GDCD',
  'giáo dục công dân': 'GDCD',
  'ktpl':          'Kinh tế Pháp luật',
  'kinh tế pháp luật': 'Kinh tế Pháp luật',

  // Công nghệ
  'công nghệ':     'Công nghệ',
  'cong nghe':     'Công nghệ',

  // Thể dục
  'thể dục':       'Thể dục',
  'the duc':       'Thể dục',
  'gdtc':          'Thể dục',
  'giáo dục thể chất': 'Thể dục',

  // Âm nhạc
  'âm nhạc':       'Âm nhạc',
  'am nhac':       'Âm nhạc',
  'music':         'Âm nhạc',

  // Mĩ thuật
  'mỹ thuật':      'Mĩ thuật',
  'mĩ thuật':      'Mĩ thuật',
  'my thuat':      'Mĩ thuật',
  'art':           'Mĩ thuật',

  // HĐTN
  'hđtn':          'HĐTN',
  'hoạt động trải nghiệm': 'HĐTN',
};

/**
 * Chuẩn hoá tên môn. Trả về chuỗi đã chuẩn hoá hoặc input gốc (đã trim)
 * nếu không match alias nào.
 *
 * @param {string|null|undefined} input
 * @returns {string} — empty string nếu input rỗng/null
 */
function normalizeSubject(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const key = trimmed.toLowerCase();
  return SUBJECT_ALIASES[key] || trimmed;
}

/**
 * Trả về SQL WHERE clause với mọi alias của 1 subject canonical để hỗ trợ
 * filter "tìm tất cả các biến thể của Vật lí". Dùng khi cần backward-compat.
 *
 * @param {string} canonical — tên chuẩn (vd 'Vật lí')
 * @param {string} column    — tên cột (vd 'subject', 'q.subject')
 * @returns {string} — `(column = ANY($N::text[]))` style
 *                     hoặc null nếu không có alias
 */
function aliasesOf(canonical) {
  const aliases = new Set();
  for (const [k, v] of Object.entries(SUBJECT_ALIASES)) {
    if (v === canonical) aliases.add(k);
  }
  aliases.add(canonical.toLowerCase());
  return Array.from(aliases);
}

/**
 * Migration backfill — chạy 1 lần ở startup. UPDATE mọi bảng có cột subject
 * để chuyển biến thể sang tên chuẩn. Idempotent — chạy nhiều lần OK.
 *
 * Lưu ý: chỉ update khi giá trị cũ thực sự khác → giảm WAL noise.
 *
 * @param {import('pg').Pool} pool — Postgres pool
 * @returns {Promise<{table: string, updated: number}[]>} — log
 */
async function backfillSubjects(pool) {
  const TABLES = [
    'Question',     // Question Bank
    'Exam',         // Đề thi
    'LessonPlan',   // Giáo án
    'ClassSubject', // Subject in class
  ];
  const log = [];

  // Build CASE WHEN clause cho UPDATE
  const cases = Object.entries(SUBJECT_ALIASES)
    .filter(([k, v]) => k !== v.toLowerCase()) // skip self-mapping
    .map(([k, v]) => `WHEN LOWER(TRIM(subject)) = '${k.replace(/'/g, "''")}' THEN '${v.replace(/'/g, "''")}'`)
    .join(' ');

  if (!cases) return log;

  for (const table of TABLES) {
    try {
      const { rowCount } = await pool.query(`
        UPDATE "${table}"
        SET subject = CASE ${cases} ELSE subject END
        WHERE subject IS NOT NULL
          AND LOWER(TRIM(subject)) = ANY($1::text[])
          AND subject != (CASE ${cases} ELSE subject END)
      `, [Object.keys(SUBJECT_ALIASES)]);
      if (rowCount > 0) {
        log.push({ table, updated: rowCount });
        console.log(`[subject-normalize] ${table}: chuẩn hoá ${rowCount} dòng`);
      }
    } catch (e) {
      // Bảng có thể không tồn tại — skip
      if (!/relation .* does not exist/.test(e.message || '')) {
        console.warn(`[subject-normalize] ${table} fail:`, e.message);
      }
    }
  }
  return log;
}

module.exports = {
  SUBJECT_ALIASES,
  normalizeSubject,
  aliasesOf,
  backfillSubjects,
};
