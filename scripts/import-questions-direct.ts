/**
 * Import questions trực tiếp vào database qua Prisma
 * Bypass API authentication
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const prisma = new PrismaClient()

const DATA_DIR = '/Users/pixibox/Aeroeduvison/data'

const SUBJECT_MAPPING: Record<string, string> = {
  "Toán": "Toán học",
  "Toán học": "Toán học",
  "Đại số": "Toán học",
  "Hình học": "Toán học",
  "Vật lý": "Vật lý",
  "Vật lí": "Vật lý",
  "VL": "Vật lý",
  "Hóa học": "Hóa học",
  "Hoá học": "Hóa học",
  "HH": "Hóa học",
  "Sinh học": "Sinh học",
  "SH": "Sinh học",
  "Ngữ văn": "Ngữ văn",
  "Ngu van": "Ngữ văn",
  "Văn": "Ngữ văn",
  "Tiếng Việt": "Tiếng Việt",
  "Tieng Viet": "Tiếng Việt",
  "TV": "Tiếng Việt",
  "Tiếng Anh": "Tiếng Anh",
  "Tieng Anh": "Tiếng Anh",
  "English": "Tiếng Anh",
  "TA": "Tiếng Anh",
  "Lịch sử": "Lịch sử",
  "Lich su": "Lịch sử",
  "LS": "Lịch sử",
  "Địa lý": "Địa lý",
  "Dia ly": "Địa lý",
  "ĐL": "Địa lý",
  "Lịch sử và Địa lý": "Lịch sử và Địa lý",
  "Lịch sử & Địa lý": "Lịch sử và Địa lý",
  "LS và ĐL": "Lịch sử và Địa lý",
  "GDCD": "GDCD",
  "Giáo dục công dân": "GDCD",
  "GD": "GDCD",
  "Đạo đức": "Đạo đức",
  "Dao duc": "Đạo đức",
  "DD": "Đạo đức",
  "Tin học": "Tin học",
  "Tin hoc": "Tin học",
  "TH": "Tin học",
  "Khoa học máy tính": "Khoa học máy tính",
  "KHMT": "Khoa học máy tính",
  "Computer Science": "Khoa học máy tính",
  "KHTN": "KHTN",
  "Khoa học tự nhiên": "KHTN",
  "Khoa học": "Khoa học",
  "KH": "Khoa học",
  "Tự nhiên và Xã hội": "Tự nhiên và Xã hội",
  "TN&XH": "Tự nhiên và Xã hội",
  "TNXH": "Tự nhiên và Xã hội",
  "Công nghệ": "Công nghệ",
  "Cong nghe": "Công nghệ",
  "CN": "Công nghệ",
  "Kinh tế pháp luật": "Kinh tế pháp luật",
  "KTPL": "Kinh tế pháp luật",
  "Âm nhạc": "Âm nhạc",
  "Am nhac": "Âm nhạc",
  "AN": "Âm nhạc",
  "Mĩ thuật": "Mĩ thuật",
  "Mỹ thuật": "Mĩ thuật",
  "MT": "Mĩ thuật",
  "Thể dục": "Thể dục",
  "The duc": "Thể dục",
  "TD": "Thể dục",
  "Hoạt động trải nghiệm": "Hoạt động trải nghiệm",
  "HĐTN": "Hoạt động trải nghiệm",
  "HĐTNHN": "Hoạt động trải nghiệm",
  "Quốc phòng": "Quốc phòng",
  "QP": "Quốc phòng",
  "QPAN": "Quốc phòng",
}

const GRADE_MAPPING: Record<string, string> = {
  "1": "Khối 1",
  "2": "Khối 2",
  "3": "Khối 3",
  "4": "Khối 4",
  "5": "Khối 5",
  "6": "Khối 6",
  "7": "Khối 7",
  "8": "Khối 8",
  "9": "Khối 9",
  "10": "Khối 10",
  "11": "Khối 11",
  "12": "Khối 12",
}

function normalizeSubject(subject: string): string {
  if (!subject) return "Vật lý"
  return SUBJECT_MAPPING[subject.trim()] || subject.trim()
}

function normalizeGrade(grade: string): string {
  if (!grade) return "Khối 10"
  const trimmed = grade.trim()
  return GRADE_MAPPING[trimmed] || (trimmed.match(/^\d+$/) ? `Khối ${trimmed}` : trimmed)
}

function getQuestionHash(question: any): string {
  const content = question.question || question.content || ''
  const options = JSON.stringify(question.options || [])
  const answer = question.correctAnswer || question.answer || ''
  const hashContent = `${content}|${options}|${answer}`
  return crypto.createHash('md5').update(hashContent).digest('hex')
}

function parseFile(filePath: string) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const filename = path.basename(filePath, '.json').toLowerCase()
    
    let subject = normalizeSubject(data.meta?.subject || '')
    let grade = normalizeGrade(data.meta?.grade || '')
    const topic = data.meta?.topic || data.meta?.chapter || subject

    // Infer from filename
    if (subject === "Vật lý") {
      if (filename.includes('am-nhac') || filename.includes('am nhac')) subject = "Âm nhạc"
      else if (filename.includes('tieng-viet') || filename.includes('tieng viet')) subject = "Tiếng Việt"
      else if (filename.includes('toan')) subject = "Toán học"
      else if (filename.includes('vat')) subject = "Vật lý"
      else if (filename.includes('hoa') && filename.includes('hoa-hoc')) subject = "Hóa học"
      else if (filename.includes('sinh')) subject = "Sinh học"
      else if (filename.includes('van') || filename.includes('ngu-van')) subject = "Ngữ văn"
      else if (filename.includes('anh') || filename.includes('tieng-anh')) subject = "Tiếng Anh"
      else if (filename.includes('lich-su') || filename.includes('ls')) subject = "Lịch sử"
      else if (filename.includes('dia')) subject = "Địa lý"
      else if (filename.includes('gdcd')) subject = "GDCD"
      else if (filename.includes('tin')) subject = "Tin học"
      else if (filename.includes('cong-nghe')) subject = "Công nghệ"
      else if (filename.includes('khtn')) subject = "KHTN"
      else if (filename.includes('khoa-hoc')) subject = "Khoa học"
      else if (filename.includes('tnxh') || filename.includes('tu-nhien')) subject = "Tự nhiên và Xã hội"
      else if (filename.includes('dao-duc')) subject = "Đạo đức"
      else if (filename.includes('lich-su-va-dia-ly')) subject = "Lịch sử và Địa lý"
      else if (filename.includes('ktpl') || filename.includes('kinh-te')) subject = "Kinh tế pháp luật"
      else if (filename.includes('mi-thuat') || filename.includes('mi thuat')) subject = "Mĩ thuật"
      else if (filename.includes('the-duc') || filename.includes('the duc')) subject = "Thể dục"
      else if (filename.includes('hoat-dong') || filename.includes('hdtn')) subject = "Hoạt động trải nghiệm"
      else if (filename.includes('quoc-phong')) subject = "Quốc phòng"
    }

    if (grade === "Khối 10") {
      for (let i = 1; i <= 12; i++) {
        if (filename.includes(`lop-${i}`) || filename.includes(`lop${i}`) || filename.includes(`-${i}_`)) {
          grade = GRADE_MAPPING[String(i)] || `Khối ${i}`
          break
        }
      }
    }

    const questionsData = data.questions || []
    const questions = []

    for (const q of questionsData) {
      const content = (q.question || q.content || '').trim()
      if (!content || content.length < 5) continue

      const answer = (q.correctAnswer || q.answer || '').toString().trim().toUpperCase()
      if (!answer) continue

      let questionType = q.questionType || 'MCQ'
      const options = Array.isArray(q.options) ? q.options : []
      
      if (options.length < 2 && ['MCQ', 'TRUE_FALSE', 'MULTIPLE_TF'].includes(questionType)) continue

      if (questionType === 'TRUE_FALSE') {
        q.correctAnswer = answer === 'ĐÚNG' || answer === 'A' || answer === '1' ? 'Đúng' : 'Sai'
      }

      questions.push({
        content,
        questionType,
        subject,
        grade,
        difficulty: 'MEDIUM',
        topic,
        options: options.map((o: any) => String(o).trim()),
        correctAnswer: answer,
        explanation: (q.explanation || q.giai_thich || '').trim(),
        learningObjectives: [topic],
        keywords: [subject, topic, grade],
        status: 'Đã duyệt',
        aiGenerated: false,
        humanReviewed: true,
        createdBy: 'system', // Default system user
      })
    }

    return { questions, subject, grade }
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error)
    return { questions: [], subject: '', grade: '' }
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('📥 IMPORT TRỰC TIẾP VÀO DATABASE QUA PRISMA')
  console.log('='.repeat(80))

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`📄 Found ${files.length} JSON files`)

  let totalImported = 0
  let totalDuplicates = 0
  let totalErrors = 0
  const seenHashes = new Set<string>()

  const BATCH_SIZE = 1000
  let batch: any[] = []

  console.log('\n⏳ Đang import... (có thể mất 10-20 phút)')

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(DATA_DIR, file)
    const { questions } = parseFile(filePath)

    for (const q of questions) {
      const hash = getQuestionHash(q)
      
      if (seenHashes.has(hash)) {
        totalDuplicates++
        continue
      }
      seenHashes.add(hash)

      batch.push(q)

      if (batch.length >= BATCH_SIZE) {
        try {
          await prisma.question.createMany({
            data: batch,
            skipDuplicates: true,
          })
          totalImported += batch.length
          batch = []
          
          if ((i + 1) % 500 === 0) {
            console.log(`   Đã xử lý ${i + 1}/${files.length} files... Đã import: ${totalImported.toLocaleString()} câu`)
          }
        } catch (error: any) {
          console.error(`Error inserting batch: ${error.message}`)
          totalErrors += batch.length
          batch = []
        }
      }
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    try {
      await prisma.question.createMany({
        data: batch,
        skipDuplicates: true,
      })
      totalImported += batch.length
    } catch (error: any) {
      console.error(`Error inserting final batch: ${error.message}`)
      totalErrors += batch.length
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 KẾT QUẢ')
  console.log('='.repeat(80))
  console.log(`✅ Đã import: ${totalImported.toLocaleString()} câu hỏi`)
  console.log(`⚠️  Trùng lặp (bỏ qua): ${totalDuplicates.toLocaleString()} câu`)
  console.log(`❌ Lỗi: ${totalErrors.toLocaleString()} câu`)
  console.log('='.repeat(80))

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
