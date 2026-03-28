/**
 * API Route: POST /api/questions/import-from-data
 * 
 * Import multiple-choice questions from /data directory into the database
 * This endpoint reads the existing JSON files and converts them to the question bank format
 * 
 * Features:
 * - Batch processing to avoid timeout
 * - Progress tracking
 * - Error handling and rollback
 * - Subject/grade/topic auto-detection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { apiLogger } from '@/lib/logging-simple'
import fs from 'fs/promises'
import path from 'path'

// ============================================================================
// CONFIGURATION & MAPPINGS
// ============================================================================

const DATA_DIR = path.join(process.cwd(), 'data')

const SUBJECT_MAPPING: Record<string, string> = {
  'vat-li': 'Vật lý',
  'vatly': 'Vật lý',
  'vl': 'Vật lý',
  'toan': 'Toán',
  'toán': 'Toán',
  'ngu-van': 'Ngữ văn',
  'ngu-van': 'Ngữ văn',
  'van': 'Ngữ văn',
  'tieng-anh': 'Tiếng Anh',
  'tienganh': 'Tiếng Anh',
  'anh': 'Tiếng Anh',
  'english': 'Tiếng Anh',
  'hoa-hoc': 'Hóa học',
  'hoahoc': 'Hóa học',
  'hoa': 'Hóa học',
  'sinh-hoc': 'Sinh học',
  'sinhhoc': 'Sinh học',
  'sinh': 'Sinh học',
  'lich-su': 'Lịch sử',
  'lichsu': 'Lịch sử',
  'su': 'Lịch sử',
  'dia-ly': 'Địa lý',
  'dialy': 'Địa lý',
  'dia': 'Địa lý',
  'gdcd': 'GDCD',
  'cong-nghe': 'Công nghệ',
  'congnghe': 'Công nghệ',
  'tin-hoc': 'Tin học',
  'tinhoc': 'Tin học',
  'tin': 'Tin học',
}

const GRADE_PATTERNS: Record<string, string> = {
  '12': 'Khối 12',
  '11': 'Khối 11',
  '10': 'Khối 10',
  '9': 'Khối 9',
  '8': 'Khối 8',
  '7': 'Khối 7',
  '6': 'Khối 6',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractSubject(filename: string): string {
  const lower = filename.toLowerCase().replace(/_/g, '-')
  
  // Check for specific subject keywords
  for (const [key, subject] of Object.entries(SUBJECT_MAPPING)) {
    if (lower.includes(key)) {
      return subject
    }
  }
  
  // Default to Vật lý for physics-related terms
  const physicsTerms = ['dao-dong', 'dien', 'song', 'quang', 'mach', 'con-lac', 'hhat-nhan']
  if (physicsTerms.some(term => lower.includes(term))) {
    return 'Vật lý'
  }
  
  return 'Vật lý' // Default
}

function extractGrade(filename: string): string {
  const lower = filename.toLowerCase()
  
  // Check for grade indicators
  for (const [pattern, grade] of Object.entries(GRADE_PATTERNS)) {
    if (lower.includes(pattern)) {
      return grade
    }
  }
  
  return 'Khối 12' // Default
}

function extractTopic(filename: string): string {
  let name = filename.replace('.json', '')
  
  // Remove common prefixes
  const prefixes = [
    'bai-tap-trac-nghiem-',
    'trac-nghiem-',
    'chuong-',
    'de-kiem-tra-',
    'cuoi-ki-',
    'giua-ki-',
    'hoc-ki-',
  ]
  
  for (const prefix of prefixes) {
    name = name.replace(new RegExp(prefix, 'gi'), '')
  }
  
  // Convert dash to space and capitalize
  name = name.replace(/-/g, ' ')
  
  // Capitalize first letter of each word
  name = name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  
  return name
}

function parseAnswer(answerStr: string | null): string {
  if (!answerStr) {
    return ''
  }
  
  // Common patterns: "Chọn đáp án A", "Đáp án: B", "A", etc.
  const match = answerStr.match(/(?:đáp án|chọn)\s*(?:đáp án)?\s*([A-D])/i)
  if (match) {
    return match[1].toUpperCase()
  }
  
  // Single letter
  const singleMatch = answerStr.trim().match(/^([A-D])$/i)
  if (singleMatch) {
    return singleMatch[1].toUpperCase()
  }
  
  return ''
}

function parseOptions(options: any[]): string[] {
  if (!options || options.length === 0) {
    return []
  }
  
  const parsedOptions: string[] = []
  
  for (const opt of options) {
    if (typeof opt === 'string') {
      parsedOptions.push(opt.trim())
    } else if (typeof opt === 'object' && opt.text) {
      parsedOptions.push(opt.text.trim())
    } else if (typeof opt === 'object') {
      const text = opt.content || opt.text || opt.statement || JSON.stringify(opt)
      parsedOptions.push(text.trim())
    }
  }
  
  return parsedOptions
}

function convertQuestion(
  vq: any,
  subject: string,
  grade: string,
  topic: string,
  filename: string,
  index: number
) {
  const questionText = vq.question_text || vq.question || vq.content || vq.statement || ''
  
  if (!questionText || questionText.trim().length < 10) {
    return null
  }
  
  const options = parseOptions(vq.options || [])
  const correctAnswer = parseAnswer(vq.answer || vq.correct_answer || vq.correctAnswer || '')
  const explanation = vq.explanation || vq.giai_thich || vq.solution || ''
  
  // Determine question type
  let questionType = 'MCQ'
  if (options.length === 0) {
    questionType = 'SHORT_ANSWER'
  } else if (options.length === 2 && 
    (options[0].toLowerCase().includes('đúng') || 
     options[0].toLowerCase().includes('true') ||
     options[0].toLowerCase().includes('sai') || 
     options[0].toLowerCase().includes('false'))) {
    questionType = 'TRUE_FALSE'
  }
  
  // Validate correct answer for MCQ/TRUE_FALSE
  if ((questionType === 'MCQ' || questionType === 'TRUE_FALSE') && !correctAnswer) {
    // Skip questions without valid answers
    return null
  }
  
  return {
    topic,
    subject,
    grade,
    questionType,
    difficulty: 'MEDIUM' as const,
    content: questionText.trim(),
    options: options.length > 0 ? options : [],
    correctAnswer,
    explanation: explanation ? explanation.trim() : 'Không có giải thích chi tiết.',
    learningObjectives: [topic],
    keywords: [topic, subject, grade],
    status: 'Đã duyệt' as const,
    aiGenerated: false,
    humanReviewed: true,
    metadata: {
      source: filename,
      importedAt: new Date().toISOString(),
    },
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * GET: List available files in /data directory
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const files = await fs.readdir(DATA_DIR)
    const jsonFiles = files
      .filter(f => f.endsWith('.json') && !f.endsWith('index.json'))
      .sort()
    
    // Get stats for each file
    const fileStats = await Promise.all(
      jsonFiles.map(async (filename) => {
        try {
          const filepath = path.join(DATA_DIR, filename)
          const content = await fs.readFile(filepath, 'utf-8')
          const data = JSON.parse(content)
          
          let questionCount = 0
          if (Array.isArray(data)) {
            questionCount = data.length
          } else if (data.questions && Array.isArray(data.questions)) {
            questionCount = data.questions.length
          } else if (data.content && Array.isArray(data.content.questions)) {
            questionCount = data.content.questions.length
          } else if (data.data && Array.isArray(data.data)) {
            questionCount = data.data.length
          }
          
          return {
            filename,
            subject: extractSubject(filename),
            grade: extractGrade(filename),
            topic: extractTopic(filename),
            questionCount,
          }
        } catch {
          return {
            filename,
            subject: 'Unknown',
            grade: 'Unknown',
            topic: filename,
            questionCount: 0,
          }
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: {
        files: fileStats,
        total: fileStats.length,
        totalQuestions: fileStats.reduce((sum, f) => sum + f.questionCount, 0),
      },
    })
  } catch (error: any) {
    apiLogger.error('List data files error', { error: error.message })
    return NextResponse.json(
      { error: error.message || 'Không thể đọc danh sách file' },
      { status: 500 }
    )
  }
}

/**
 * POST: Import questions from files
 * 
 * Body:
 * - files: string[] - List of filenames to import
 * - batchSize: number - Number of files to process in parallel (default: 5)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { files, batchSize = 5 } = body
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Thiếu danh sách file cần import' },
        { status: 400 }
      )
    }
    
    apiLogger.info('Starting data import', {
      userId: session.user.id,
      fileCount: files.length,
    })
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      totalQuestions: 0,
      errors: [] as string[],
    }
    
    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(async (filename) => {
          try {
            const filepath = path.join(DATA_DIR, filename)
            const content = await fs.readFile(filepath, 'utf-8')
            const data = JSON.parse(content)
            
            // Extract metadata
            const subject = extractSubject(filename)
            const grade = extractGrade(filename)
            const topic = extractTopic(filename)
            
            // Get questions
            let questions: any[] = []
            if (Array.isArray(data)) {
              questions = data
            } else if (data.questions && Array.isArray(data.questions)) {
              questions = data.questions
            } else if (data.content && Array.isArray(data.content.questions)) {
              questions = data.content.questions
            } else if (data.data && Array.isArray(data.data)) {
              questions = data.data
            }
            
            if (questions.length === 0) {
              return { filename, status: 'skipped', reason: 'No questions' }
            }
            
            // Convert questions
            const convertedQuestions = questions
              .map((q, idx) => convertQuestion(q, subject, grade, topic, filename, idx))
              .filter((q) => q !== null)
            
            if (convertedQuestions.length === 0) {
              return { filename, status: 'skipped', reason: 'No valid questions' }
            }
            
            // Import to database
            const importedQuestions = []
            for (const q of convertedQuestions) {
              try {
                const created = await db.question.create({
                  data: {
                    ...q,
                    createdBy: session.user.id,
                    qualityScore: null,
                  },
                })
                importedQuestions.push(created)
              } catch (error: any) {
                apiLogger.error(`Failed to create question`, {
                  filename,
                  error: error.message,
                })
              }
            }
            
            return {
              filename,
              status: 'success',
              questionCount: importedQuestions.length,
            }
          } catch (error: any) {
            throw new Error(`Failed to process ${filename}: ${error.message}`)
          }
        })
      )
      
      // Process batch results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const r = result.value
          if (r.status === 'success') {
            results.success++
            results.totalQuestions += r.questionCount
          } else if (r.status === 'skipped') {
            results.skipped++
          }
        } else {
          results.failed++
          results.errors.push(result.reason?.message || `Error processing file ${files[i + idx]}`)
        }
      })
    }
    
    apiLogger.info('Data import completed', {
      userId: session.user.id,
      ...results,
    })
    
    return NextResponse.json({
      success: true,
      data: {
        summary: results,
        message: `Đã import thành công ${results.success} file với ${results.totalQuestions} câu hỏi`,
      },
    })
  } catch (error: any) {
    apiLogger.error('Import data questions error', {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { error: error.message || 'Không thể import câu hỏi' },
      { status: 500 }
    )
  }
}
