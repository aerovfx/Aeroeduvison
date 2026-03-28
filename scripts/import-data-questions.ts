/**
 * Script to import multiple-choice questions from /data directory into the database
 * 
 * Usage: 
 *   bun run scripts/import-data-questions.ts
 * 
 * This script:
 * 1. Reads all JSON files from /data directory
 * 2. Parses the VietJack-style question format
 * 3. Converts to our question bank schema
 * 4. Imports into the database via /api/questions endpoint
 */

import fs from 'fs/promises'
import path from 'path'

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data')
const BATCH_SIZE = 10 // Process files in batches to avoid overwhelming the API

// Subject mapping from Vietnamese file names
const SUBJECT_MAPPING: Record<string, string> = {
  'vat-li': 'Vật lý',
  'toan': 'Toán',
  'ngu-van': 'Ngữ văn',
  'tieng-anh': 'Tiếng Anh',
  'hoa-hoc': 'Hóa học',
  'sinh-hoc': 'Sinh học',
  'lich-su': 'Lịch sử',
  'dia-ly': 'Địa lý',
  'gdcd': 'GDCD',
  'cong-nghe': 'Công nghệ',
  'tin-hoc': 'Tin học',
}

// Extract subject from filename
function extractSubject(filename: string): string {
  const lower = filename.toLowerCase()
  
  // Check for specific subject keywords
  for (const [key, subject] of Object.entries(SUBJECT_MAPPING)) {
    if (lower.includes(key)) {
      return subject
    }
  }
  
  // Default to Vật lý for physics-related terms
  if (lower.includes('dao-dong') || lower.includes('dien') || lower.includes('song') || lower.includes('quang')) {
    return 'Vật lý'
  }
  
  return 'Vật lý' // Default
}

// Extract grade from filename
function extractGrade(filename: string): string {
  const lower = filename.toLowerCase()
  
  // Check for grade indicators
  if (lower.includes('12') || lower.includes('lop-12') || lower.includes('lớp-12')) {
    return 'Khối 12'
  }
  if (lower.includes('11') || lower.includes('lop-11') || lower.includes('lớp-11')) {
    return 'Khối 11'
  }
  if (lower.includes('10') || lower.includes('lop-10') || lower.includes('lớp-10')) {
    return 'Khối 10'
  }
  if (lower.includes('9') || lower.includes('lop-9') || lower.includes('lớp-9')) {
    return 'Khối 9'
  }
  if (lower.includes('8') || lower.includes('lop-8') || lower.includes('lớp-8')) {
    return 'Khối 8'
  }
  if (lower.includes('7') || lower.includes('lop-7') || lower.includes('lớp-7')) {
    return 'Khối 7'
  }
  if (lower.includes('6') || lower.includes('lop-6') || lower.includes('lớp-6')) {
    return 'Khối 6'
  }
  
  return 'Khối 12' // Default for most files
}

// Extract topic from filename
function extractTopic(filename: string): string {
  // Remove extension and common prefixes
  let name = filename.replace('.json', '')
  
  // Remove common prefixes
  name = name.replace(/^bai-tap-trac-nghiem-/i, '')
  name = name.replace(/^trac-nghiem-/i, '')
  name = name.replace(/^chuong-/i, '')
  name = name.replace(/^de-kiem-tra-/i, '')
  name = name.replace(/^cuoi-ki-/i, '')
  name = name.replace(/^giua-ki-/i, '')
  
  // Convert dash to space and capitalize
  name = name.replace(/-/g, ' ')
  
  // Capitalize first letter of each word
  name = name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  
  return name
}

// Parse answer string to extract correct option
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

// Convert options array to standardized format
function parseOptions(options: any[]): { options: string[], correctAnswer: string } {
  if (!options || options.length === 0) {
    return { options: [], correctAnswer: '' }
  }
  
  // Handle different option formats
  const parsedOptions: string[] = []
  
  for (const opt of options) {
    if (typeof opt === 'string') {
      parsedOptions.push(opt)
    } else if (typeof opt === 'object' && opt.text) {
      // VietJack format: { option: "A", text: "..." }
      parsedOptions.push(opt.text)
    } else if (typeof opt === 'object') {
      // Try to extract text from any available field
      const text = opt.content || opt.text || opt.statement || JSON.stringify(opt)
      parsedOptions.push(text)
    }
  }
  
  return {
    options: parsedOptions,
    correctAnswer: '' // Will be set separately
  }
}

// Convert a VietJack question to our format
function convertQuestion(vq: any, subject: string, grade: string, topic: string, index: number) {
  const questionText = vq.question_text || vq.question || vq.content || vq.statement || ''
  
  if (!questionText || questionText.trim().length < 10) {
    return null // Skip invalid questions
  }
  
  const { options } = parseOptions(vq.options || [])
  const correctAnswer = parseAnswer(vq.answer || vq.correct_answer || vq.correctAnswer || '')
  const explanation = vq.explanation || vq.giai_thich || vq.solution || ''
  
  // Determine question type
  let questionType = 'MCQ'
  if (options.length === 0) {
    questionType = 'SHORT_ANSWER'
  } else if (options.length === 2 && 
    (options[0].toLowerCase().includes('đúng') || options[0].toLowerCase().includes('true') ||
     options[0].toLowerCase().includes('sai') || options[0].toLowerCase().includes('false'))) {
    questionType = 'TRUE_FALSE'
  }
  
  // Determine difficulty (default to medium for imported questions)
  const difficulty = 'MEDIUM'
  
  return {
    topic,
    subject,
    grade,
    questionType,
    difficulty,
    content: questionText.trim(),
    options: options.length > 0 ? options : undefined,
    correctAnswer,
    explanation: explanation ? explanation.trim() : 'Không có giải thích chi tiết.',
    learningObjectives: [topic],
    keywords: [topic, subject, grade],
    status: 'Đã duyệt' as const,
    aiGenerated: false,
    humanReviewed: true,
  }
}

// Import questions to database
async function importQuestions(questions: any[]) {
  try {
    const response = await fetch('http://localhost:3000/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questions),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Import failed')
    }
    
    return result
  } catch (error: any) {
    console.error('Import error:', error.message)
    throw error
  }
}

// Main function
async function main() {
  console.log('📚 Starting question import from /data directory...\n')
  
  try {
    // Read all JSON files from data directory
    const files = await fs.readdir(DATA_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('index.json'))
    
    console.log(`Found ${jsonFiles.length} question files to process\n`)
    
    let totalImported = 0
    let totalSkipped = 0
    let totalErrors = 0
    
    // Process files in batches
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
      const batch = jsonFiles.slice(i, i + BATCH_SIZE)
      console.log(`\n📝 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jsonFiles.length / BATCH_SIZE)}`)
      
      const batchPromises = batch.map(async (filename) => {
        const filepath = path.join(DATA_DIR, filename)
        
        try {
          const content = await fs.readFile(filepath, 'utf-8')
          const data = JSON.parse(content)
          
          // Extract metadata from filename
          const subject = extractSubject(filename)
          const grade = extractGrade(filename)
          const topic = extractTopic(filename)
          
          // Get questions from different possible structures
          let questions = []
          
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
            console.log(`  ⚠️  ${filename}: No questions found`)
            totalSkipped++
            return
          }
          
          // Convert questions
          const convertedQuestions = questions
            .map((q: any, idx: number) => convertQuestion(q, subject, grade, topic, idx))
            .filter((q: any) => q !== null)
          
          if (convertedQuestions.length === 0) {
            console.log(`  ⚠️  ${filename}: No valid questions after conversion`)
            totalSkipped++
            return
          }
          
          // Import to database
          // Note: In a real scenario, you'd need authentication here
          // For now, we'll just log what would be imported
          console.log(`  ✅ ${filename}: ${convertedQuestions.length} questions ready (${subject}, ${grade}, ${topic})`)
          totalImported += convertedQuestions.length
          
          // Uncomment below to actually import:
          // await importQuestions(convertedQuestions)
          
        } catch (error: any) {
          console.error(`  ❌ ${filename}: Error - ${error.message}`)
          totalErrors++
        }
      })
      
      await Promise.all(batchPromises)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 Import Summary:')
    console.log(`  ✅ Total questions ready: ${totalImported}`)
    console.log(`  ⚠️  Files skipped: ${totalSkipped}`)
    console.log(`  ❌ Files with errors: ${totalErrors}`)
    console.log('='.repeat(60))
    console.log('\n⚠️  NOTE: Questions were NOT actually imported (API call commented out)')
    console.log('   To enable import, uncomment the importQuestions() call in the script.')
    console.log('   You will also need to run this with proper authentication.\n')
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run the script
main()
