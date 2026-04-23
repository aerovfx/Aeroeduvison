/**
 * Script import câu hỏi từ JSON files vào ngân hàng đề (Question table)
 *
 * Cách chạy:
 *   npx tsx scripts/import-questions.ts
 *
 * Options:
 *   --dry-run     Chỉ phân tích, không ghi DB
 *   --limit=N     Chỉ import N file đầu tiên (test)
 *   --user=ID     Gán createdBy cho user ID cụ thể
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ============ TYPES ============
interface JsonMeta {
  title: string
  provider: string
  subject: string
  grade: string
  chapter: string
  topic: string
}

interface JsonQuestion {
  question_number: number
  question: string
  options: string[]
  correctAnswer: string // "A", "B", "C", "D"
}

interface JsonExam {
  meta: JsonMeta
  description: string
  questions: JsonQuestion[]
}

// ============ HELPERS ============

/** Strip HTML tags from option text */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')  // remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/** Remove leading letter prefix like "A. ", "B. ", "C. ", "D. " from option */
function stripLetterPrefix(text: string): string {
  return text.replace(/^[A-Da-d]\.\s*/, '').trim()
}

/** Clean an option: strip HTML, strip letter prefix */
function cleanOption(text: string): string {
  let cleaned = stripHtml(text)
  cleaned = stripLetterPrefix(cleaned)
  return cleaned
}

/** Map letter answer (A/B/C/D) to the actual option text */
function mapCorrectAnswer(correctAnswer: string, options: string[]): string {
  const idx = correctAnswer.toUpperCase().charCodeAt(0) - 65 // A=0, B=1, C=2, D=3
  if (idx >= 0 && idx < options.length) {
    return correctAnswer.toUpperCase() // Keep as letter for consistency
  }
  return correctAnswer
}

/** Extract grade from filename when meta.grade is missing */
function extractGradeFromFilename(filename: string): string {
  // Match patterns like: "vl12", "toan-9", "cong-dan-6", "am-nhac-5", "tin-hoc-10"
  const patterns = [
    /(?:vl|hh|sh|toan|cn|dl|ls|gdcd|nn|mt|tn|th|kh)(\d{1,2})/, // subject abbreviation + grade
    /(?:lop|lớp)[- ]?(\d{1,2})/i,  // "lop 9", "lớp-10"
    /[-_ ](\d{1,2})[-_ ](?:canh|chan|ket|p\d|hoc|bai|chu|b\d)/,  // "-9-canh", "-10-ket"
    /[-_ ](\d{1,2})[-_ ]/,  // generic number between dashes
  ]
  for (const p of patterns) {
    const m = filename.match(p)
    if (m) {
      const g = parseInt(m[1])
      if (g >= 1 && g <= 12) return String(g)
    }
  }
  return ''
}

/** Extract subject from filename when meta.subject is missing */
function extractSubjectFromFilename(filename: string): string {
  const map: Record<string, string> = {
    'vl': 'Vật lý', 'hh': 'Hóa học', 'sh': 'Sinh học', 'toan': 'Toán',
    'cn': 'Công nghệ', 'dl': 'Địa lý', 'ls': 'Lịch sử', 'gdcd': 'GDCD',
    'nn': 'Ngoại ngữ', 'mt': 'Mĩ thuật', 'tn': 'Tự nhiên', 'th': 'Tin học',
    'am-nhac': 'Âm nhạc', 'ngu-van': 'Ngữ văn', 'cong-dan': 'GDCD',
    'tin-hoc': 'Tin học', 'cong-nghe': 'Công nghệ', 'dia-ly': 'Địa lý',
    'lich-su': 'Lịch sử', 'khtn': 'KHTN', 'vat-ly': 'Vật lý',
    'hoa-hoc': 'Hóa học', 'sinh-hoc': 'Sinh học', 'mi-thuat': 'Mĩ thuật',
    'kinh-te': 'Kinh tế pháp luật',
  }
  const lower = filename.toLowerCase()
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val
  }
  return ''
}

/** Generate keywords from question content and meta */
function generateKeywords(meta: JsonMeta, questionText: string): string[] {
  const keywords: string[] = []
  if (meta.subject) keywords.push(meta.subject)
  if (meta.chapter) keywords.push(`Chương ${meta.chapter}`)
  if (meta.topic) keywords.push(meta.topic)
  return keywords
}

/** Generate tags from meta */
function generateTags(meta: JsonMeta): string[] {
  const tags: string[] = []
  if (meta.subject) tags.push(meta.subject)
  if (meta.grade) tags.push(`Lớp ${meta.grade}`)
  if (meta.chapter) tags.push(`Chương ${meta.chapter}`)
  if (meta.provider) tags.push(meta.provider)
  return tags
}

// ============ MAIN IMPORT ============

async function importQuestions() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0
  const userArg = args.find(a => a.startsWith('--user='))
  let userId = userArg ? userArg.split('=')[1] : ''

  const DATA_DIR = path.join(__dirname, '..', 'data')

  console.log('🚀 Import Questions from JSON to Database')
  console.log(`   Data dir: ${DATA_DIR}`)
  console.log(`   Dry run: ${dryRun}`)
  console.log(`   Limit: ${limit || 'ALL'}`)

  // Get user ID - default to teacher@example.com
  if (!userId) {
    const teacherUser = await prisma.user.findFirst({
      where: { email: 'teacher@example.com' },
      select: { id: true, name: true, role: true }
    })
    if (teacherUser) {
      userId = teacherUser.id
      console.log(`   Using user: ${teacherUser.name} (${userId}) [${teacherUser.role}]`)
    } else {
      // Fallback to any TEACHER or ADMIN
      const fallbackUser = await prisma.user.findFirst({
        where: { role: { in: ['TEACHER', 'ADMIN'] } },
        select: { id: true, name: true, role: true }
      })
      if (!fallbackUser) {
        console.error('❌ No teacher/admin users found. Please create teacher@example.com first.')
        process.exit(1)
      }
      userId = fallbackUser.id
      console.log(`   Using user: ${fallbackUser.name} (${userId}) [${fallbackUser.role}]`)
    }
  }

  // Read all JSON files
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  const totalFiles = limit > 0 ? Math.min(files.length, limit) : files.length
  console.log(`\n📁 Found ${files.length} JSON files, processing ${totalFiles}...\n`)

  let totalQuestions = 0
  let totalImported = 0
  let totalSkipped = 0
  let totalErrors = 0
  let fileErrors: string[] = []

  // Process in batches for performance
  const BATCH_SIZE = 100
  let questionsBuffer: any[] = []

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i]
    const filePath = path.join(DATA_DIR, file)

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data: JsonExam = JSON.parse(raw)

      if (!data.questions || !Array.isArray(data.questions)) {
        fileErrors.push(`${file}: no questions array`)
        totalErrors++
        continue
      }

      const meta = data.meta || {} as JsonMeta

      for (const q of data.questions) {
        totalQuestions++

        if (!q.question || !q.options || q.options.length === 0) {
          totalSkipped++
          continue
        }

        // Clean options
        const cleanedOptions = q.options.map(cleanOption)

        // Build question record
        const questionData = {
          topic: meta.topic || meta.title || file.replace('.json', ''),
          subject: meta.subject || 'Chưa phân loại',
          grade: meta.grade || '0',
          questionType: 'Trắc nghiệm',
          difficulty: 'Trung bình',
          content: stripHtml(q.question),
          options: cleanedOptions,
          correctAnswer: q.correctAnswer?.toUpperCase() || '',
          explanation: data.description || '',
          learningObjectives: [] as string[],
          keywords: generateKeywords(meta, q.question),
          status: 'Đã duyệt',
          createdBy: userId,
          tags: generateTags(meta),
          aiGenerated: false,
          humanReviewed: true,
          metadata: {
            sourceFile: file,
            questionNumber: q.question_number,
            chapter: meta.chapter,
            provider: meta.provider,
            examTitle: meta.title
          }
        }

        questionsBuffer.push(questionData)

        // Flush batch
        if (questionsBuffer.length >= BATCH_SIZE) {
          if (!dryRun) {
            const result = await prisma.question.createMany({
              data: questionsBuffer,
              skipDuplicates: true
            })
            totalImported += result.count
          } else {
            totalImported += questionsBuffer.length
          }
          questionsBuffer = []
        }
      }
    } catch (err: any) {
      fileErrors.push(`${file}: ${err.message}`)
      totalErrors++
    }

    // Progress log every 500 files
    if ((i + 1) % 500 === 0) {
      console.log(`   📊 Processed ${i + 1}/${totalFiles} files, ${totalQuestions} questions found...`)
    }
  }

  // Flush remaining
  if (questionsBuffer.length > 0) {
    if (!dryRun) {
      const result = await prisma.question.createMany({
        data: questionsBuffer,
        skipDuplicates: true
      })
      totalImported += result.count
    } else {
      totalImported += questionsBuffer.length
    }
  }

  // ============ SUMMARY ============
  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`   Files processed:  ${totalFiles}`)
  console.log(`   Questions found:  ${totalQuestions}`)
  console.log(`   Questions imported: ${totalImported}`)
  console.log(`   Questions skipped:  ${totalSkipped}`)
  console.log(`   File errors:      ${totalErrors}`)

  if (dryRun) {
    console.log('\n   ⚠️  DRY RUN — no data was written to database')
  }

  if (fileErrors.length > 0) {
    console.log(`\n❌ Errors (first 20):`)
    fileErrors.slice(0, 20).forEach(e => console.log(`   - ${e}`))
  }

  // Verify count in DB
  if (!dryRun) {
    const dbCount = await prisma.question.count()
    console.log(`\n✅ Total questions in database: ${dbCount}`)
  }

  console.log('\nDone!')
}

importQuestions()
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
