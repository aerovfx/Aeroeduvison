"use client"

import { useState, useRef } from "react"
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Edit2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import * as XLSX from "xlsx"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (count: number) => void
}

interface QuestionRow {
  content?: string
  question?: string
  nội_dung?: string
  câu_hỏi?: string
  options?: string[]
  phương_án?: string[]
  A?: string
  B?: string
  C?: string
  D?: string
  correctAnswer?: string
  đáp_án?: string
  answer?: string
  answers?: string  // For multiple true/false: "AB" means A and B are correct
  true_false?: string  // For multiple true/false: "TFTF" means A=true, B=false, C=true, D=false
  explanation?: string
  giải_thích?: string
  subject?: string
  môn?: string
  grade?: string
  khối?: string
  topic?: string
  chủ_đề?: string
  difficulty?: string
  độ_khó?: string
  questionType?: string
  type?: string
}

interface ParsedQuestion {
  id: string
  content: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject: string
  grade: string
  topic: string
  difficulty: string
  questionType: string
  selected: boolean
  editMode: boolean
}

const SUBJECT_MAPPING: Record<string, string> = {
  "toán": "Toán học",
  "toán học": "Toán học",
  "đại số": "Toán học",
  "hình học": "Toán học",
  "vật": "Vật lý",
  "vật lý": "Vật lý",
  "lí": "Vật lý",
  "hóa": "Hóa học",
  "hóa học": "Hóa học",
  "sinh": "Sinh học",
  "sinh học": "Sinh học",
  "văn": "Ngữ văn",
  "ngữ văn": "Ngữ văn",
  "anh": "Tiếng Anh",
  "tiếng anh": "Tiếng Anh",
  "lịch sử": "Lịch sử",
  "sử": "Lịch sử",
  "địa": "Địa lý",
  "địa lý": "Địa lý",
  "gdcd": "GDCD",
  "công dân": "GDCD",
  "công nghệ": "Công nghệ",
  "tin": "Tin học",
  "tin học": "Tin học",
}

const GRADE_MAPPING: Record<string, string> = {
  "6": "Khối 6",
  "7": "Khối 7",
  "8": "Khối 8",
  "9": "Khối 9",
  "10": "Khối 10",
  "11": "Khối 11",
  "12": "Khối 12",
  "khối 6": "Khối 6",
  "khối 7": "Khối 7",
  "khối 8": "Khối 8",
  "khối 9": "Khối 9",
  "khối 10": "Khối 10",
  "khối 11": "Khối 11",
  "khối 12": "Khối 12",
}

const DIFFICULTY_MAPPING: Record<string, string> = {
  "dễ": "EASY",
  "easy": "EASY",
  "trung bình": "MEDIUM",
  "trungbinh": "MEDIUM",
  "medium": "MEDIUM",
  "khó": "HARD",
  "kho": "HARD",
  "hard": "HARD",
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [subject, setSubject] = useState("Vật lý")
  const [grade, setGrade] = useState("Khối 10")
  const [importMode, setImportMode] = useState<"auto" | "manual">("auto")
  const [importStep, setImportStep] = useState<"upload" | "review" | "complete">("upload")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/json",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|json|docx|doc)$/)) {
      toast.error("Chỉ hỗ trợ file Excel (.xlsx, .xls), CSV, JSON hoặc Word (.docx, .doc)")
      return
    }

    setFile(file)
    parseFile(file)
  }

  const parseFile = async (file: File) => {
    try {
      const isJson = file.name.match(/\.(json)$/)
      const isWord = file.name.match(/\.(docx|doc)$/)
      
      if (isJson) {
        // JSON file parsing
        const text = await file.text()
        const jsonData = JSON.parse(text)
        
        let questions: any[] = []
        
        // Handle multiple JSON structures
        if (Array.isArray(jsonData)) {
          // Direct array of questions
          questions = jsonData
        } else if (jsonData.questions && Array.isArray(jsonData.questions)) {
          // Object with questions array
          questions = jsonData.questions
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          // Object with data array
          questions = jsonData.data
        } else if (jsonData.quiz_info && Array.isArray(jsonData.questions)) {
          // Object with quiz_info and questions array (VietJack format)
          questions = jsonData.questions
        } else if (jsonData.sections && Array.isArray(jsonData.sections)) {
          // Nested structure with sections (VietJack full format)
          for (const section of jsonData.sections) {
            if (section.type === 'multiple_choice' && Array.isArray(section.questions)) {
              // Multiple choice questions
              questions.push(...section.questions.map((q: any) => ({
                ...q,
                questionType: 'MCQ'
              })))
            } else if (section.type === 'true_false' && Array.isArray(section.statements)) {
              // True/False questions with multiple statements
              const correctAnswer = section.statements
                .map((s: any) => s.answer === 'Đ' || s.answer === 'T' || s.answer === true ? 'T' : 'F')
                .join('')
              
              questions.push({
                content: `${section.title || 'Câu hỏi Đúng/Sai'}\n\n${section.statements.map((s: any, i: number) => `${String.fromCharCode(97 + i)}. ${s.statement}`).join('\n')}`,
                options: section.statements.map((s: any, i: number) => `${String.fromCharCode(97 + i)}. ${s.statement}`),
                correct_answer: correctAnswer,
                questionType: 'MULTIPLE_TF',
                explanation: section.explanations ? JSON.stringify(section.explanations) : ''
              })
            } else if (section.type === 'short_answer' && section.question) {
              // Short answer questions
              questions.push({
                content: section.question,
                correct_answer: section.answer || section.solution,
                explanation: section.solution || '',
                questionType: 'SHORT_ANSWER'
              })
            }
          }
        } else {
          // Try to find any array in the object
          const arrayKey = Object.keys(jsonData).find(key => Array.isArray(jsonData[key]))
          if (arrayKey) {
            questions = jsonData[arrayKey]
          }
        }
        
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("File JSON không hợp lệ. Phải chứa mảng các câu hỏi trong trường 'questions', 'data', 'sections', hoặc là một mảng trực tiếp")
        }
        
        const parsed = convertToParsedQuestions(questions)
        setParsedQuestions(parsed)
        setImportStep("review")
        toast.success(`Đã đọc ${parsed.length} câu hỏi từ file JSON`)
      } else if (isWord) {
        // Word file parsing (simplified - extract text)
        const text = await file.text()
        const questions = parseWordContent(text)
        setPreview(questions)
        const parsed = convertToParsedQuestions(questions)
        setParsedQuestions(parsed)
        setImportStep("review")
        toast.success(`Đã phân tích ${parsed.length} câu hỏi từ file Word`)
      } else {
        // Excel/CSV parsing
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" })
        
        setPreview(jsonData)
        const parsed = convertToParsedQuestions(jsonData)
        setParsedQuestions(parsed)
        setImportStep("review")
        toast.success(`Đã đọc ${parsed.length} câu hỏi từ file Excel`)
      }
    } catch (error: any) {
      console.error("Error parsing file:", error)
      toast.error(`Không thể đọc file: ${error.message}`)
    }
  }

  const convertToParsedQuestions = (rows: any[]): ParsedQuestion[] => {
    return rows.map((row: any, index: number) => {
      const q: QuestionRow = row

      // Extract content from various possible field names
      const content = q.content || q.question || q.nội_dung || q.câu_hỏi || q.question_text || q.questionText || q.statement || ""

      // Extract options from various possible field names
      let options: string[] = []
      if (q.options || q.phương_án) {
        // Handle both array and object formats for options
        if (Array.isArray(q.options)) {
          options = q.options
        } else if (typeof q.options === 'object') {
          // Object format: { "A": "text", "B": "text", ... }
          options = [
            q.options.A || "",
            q.options.B || "",
            q.options.C || "",
            q.options.D || ""
          ].filter(Boolean)
        } else if (Array.isArray(q.phương_án)) {
          options = q.phương_án
        }
      } else if (q.A && q.B) {
        options = [q.A, q.B, q.C || "", q.D || ""].filter(Boolean)
      }

      // Extract correct answer - handle multiple true/false format
      let correctAnswer = ""
      let questionType = q.questionType || q.type || "MCQ"

      // Check for multiple true/false format (TFTF, true_false, answers)
      const trueFalseStr = q.true_false || q.answers || q.correct_answer_multiple || q.correct_answer || ""
      if (trueFalseStr && typeof trueFalseStr === "string" && trueFalseStr.length >= 4 && /^[TFĐS]+$/.test(trueFalseStr)) {
        // Format: "TFTF" or "TFFT" - each position is T/F for A/B/C/D
        questionType = "MULTIPLE_TF"
        correctAnswer = trueFalseStr.toUpperCase()
      } else if (q.answer) {
        // Handle answer field - could be string "A" or object
        if (typeof q.answer === "string" && q.answer.length === 1) {
          correctAnswer = q.answer.toUpperCase()
        } else if (typeof q.answer === "object" && q.answer.label) {
          correctAnswer = String(q.answer.label).toUpperCase()
        } else {
          correctAnswer = String(q.answer).toUpperCase()
        }
        questionType = "MCQ"
      } else if (q.correct_answer && typeof q.correct_answer === "string") {
        correctAnswer = q.correct_answer.toUpperCase()
        questionType = "MCQ"
      } else if (q.correctAnswer && typeof q.correctAnswer === "string") {
        correctAnswer = q.correctAnswer.toUpperCase()
        questionType = "MCQ"
      } else {
        // Fallback
        correctAnswer = q.correctAnswer || q.đáp_án || q.answer || q.correct_answer || ""
        if (!questionType || questionType === "MCQ") {
          questionType = options.length >= 4 ? "MCQ" : options.length === 2 ? "TRUE_FALSE" : "SHORT_ANSWER"
        }
      }

      // Extract other fields from various possible field names with defaults
      const questionSubject = normalizeSubject(q.subject || q.môn || "") || "Vật lý"
      const questionGrade = normalizeGrade(q.grade || q.khối || "") || "Khối 10"
      const topic = q.topic || q.chủ_đề || q.subject || questionSubject
      const difficulty = normalizeDifficulty(q.difficulty || q.độ_khó || q.difficultyLevel || "") || "MEDIUM"

      // Override questionType if explicitly provided
      if (q.questionType || q.type) {
        const typeMap: { [key: string]: string } = {
          "MCQ": "MCQ",
          "MULTIPLE_TF": "MULTIPLE_TF",
          "MULTIPLE_TRUE_FALSE": "MULTIPLE_TF",
          "TRUE_FALSE": "TRUE_FALSE",
          "SHORT_ANSWER": "SHORT_ANSWER",
          "ESSAY": "ESSAY"
        }
        const explicitType = q.questionType || q.type
        questionType = typeMap[explicitType] || questionType
      }

      return {
        id: `temp-${index}`,
        content,
        options,
        correctAnswer,
        explanation: q.explanation || q.giải_thích || q.explanationText || q.solution || "",
        subject: questionSubject,
        grade: questionGrade,
        topic: topic || questionSubject,
        difficulty,
        questionType,
        selected: true,
        editMode: false,
      }
    }).filter(q => q.content && q.content.length > 10)
  }

  const parseWordContent = (text: string) => {
    const questions: any[] = []
    const lines = text.split("\n").filter(line => line.trim())
    
    let currentQuestion: any = null
    let currentOptions: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Detect question start (Câu 1, Câu 2, etc. or 1., 2., etc.)
      const questionMatch = line.match(/^(?:Câu\s*)?(\d+)[\.\:]\s*(.+)$/i)
      
      if (questionMatch) {
        // Save previous question
        if (currentQuestion) {
          currentQuestion.options = currentOptions
          questions.push(currentQuestion)
        }
        
        currentQuestion = {
          question: questionMatch[2],
          content: questionMatch[2],
        }
        currentOptions = []
      } else if (currentQuestion) {
        // Check if it's an option (A., B., C., D. or A), B), etc.)
        const optionMatch = line.match(/^([A-D])[\.\/\)]\s*(.+)$/)
        if (optionMatch) {
          currentOptions.push(optionMatch[2])
        } else if (line.toLowerCase().includes("đáp án") || line.toLowerCase().includes("answer")) {
          // Extract answer
          const answerMatch = line.match(/(?:đáp án|answer)[\s\:]*([A-D])/i)
          if (answerMatch) {
            currentQuestion.correctAnswer = answerMatch[1].toUpperCase()
          }
        } else if (line.toLowerCase().includes("giải thích") || line.toLowerCase().includes("explanation")) {
          // Extract explanation
          currentQuestion.explanation = line
        } else if (!currentQuestion.correctAnswer && line.match(/^[A-D]$/)) {
          // Single letter answer
          currentQuestion.correctAnswer = line.toUpperCase()
        }
      }
    }
    
    // Don't forget the last question
    if (currentQuestion) {
      currentQuestion.options = currentOptions
      questions.push(currentQuestion)
    }
    
    return questions
  }

  const normalizeSubject = (value: string): string => {
    if (!value) return subject
    const normalized = value.toLowerCase().trim()
    return SUBJECT_MAPPING[normalized] || subject
  }

  const normalizeGrade = (value: string): string => {
    if (!value) return grade
    const normalized = value.toLowerCase().trim()
    return GRADE_MAPPING[normalized] || grade
  }

  const normalizeDifficulty = (value: string): string => {
    if (!value) return "MEDIUM"
    const normalized = value.toLowerCase().trim()
    return DIFFICULTY_MAPPING[normalized] || "MEDIUM"
  }

  const processQuestions = async () => {
    const selectedQuestions = parsedQuestions.filter(q => q.selected)
    
    if (selectedQuestions.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 câu hỏi để import")
      return
    }

    setProcessing(true)
    
    try {
      let successCount = 0
      let errorCount = 0

      for (const question of selectedQuestions) {
        try {
          const payload = {
            topic: question.topic || question.subject,
            subject: question.subject,
            grade: question.grade,
            questionType: question.questionType,
            difficulty: question.difficulty,
            content: question.content,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            learningObjectives: [question.topic || question.subject],
            keywords: [question.topic || question.subject, question.subject],
            status: "Đã duyệt",
            aiGenerated: false,
            humanReviewed: true,
          }

          const response = await fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            errorCount++
            console.error(`Failed to import question "${question.content.substring(0, 50)}...":`, errorData.error || response.statusText)
            toast.error(`Câu hỏi bị lỗi: ${errorData.error || response.statusText}`)
          } else {
            successCount++
          }
        } catch (error: any) {
          errorCount++
          console.error("Error importing question:", error)
          toast.error(`Lỗi: ${error.message}`)
        }
      }

      toast.success(`Đã import ${successCount} câu hỏi thành công${errorCount > 0 ? `, ${errorCount} lỗi` : ""}`)
      onSuccess(successCount)
      handleClose()
      
    } catch (error: any) {
      console.error("Import error:", error)
      toast.error(`Lỗi khi import: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setParsedQuestions([])
    setProcessing(false)
    setImportStep("upload")
    onClose()
  }

  const handleToggleSelect = (id: string) => {
    setParsedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, selected: !q.selected } : q)
    )
  }

  const handleToggleEditMode = (id: string) => {
    setParsedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, editMode: !q.editMode } : q)
    )
  }

  const handleUpdateQuestion = (id: string, updates: Partial<ParsedQuestion>) => {
    setParsedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, ...updates } : q)
    )
  }

  const handleDeleteQuestion = (id: string) => {
    setParsedQuestions(prev => prev.filter(q => q.id !== id))
    toast.success("Đã xóa câu hỏi khỏi danh sách import")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="w-6 h-6 text-purple-600" />
            {importStep === "upload" && "Import câu hỏi từ file"}
            {importStep === "review" && "Biên tập và duyệt câu hỏi trước khi import"}
            {importStep === "complete" && "Hoàn tất import"}
          </DialogTitle>
          <DialogDescription>
            {importStep === "upload" && "Hỗ trợ file Excel (.xlsx, .xls), CSV, JSON, hoặc Word (.docx, .doc)"}
            {importStep === "review" && `Chỉnh sửa nội dung, phương án, đáp án trước khi lưu vào ngân hàng đề (${parsedQuestions.length} câu hỏi)`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {importStep === "upload" && (
            <div className="space-y-4">
              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragActive
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Kéo thả file vào đây hoặc click để chọn
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Định dạng hỗ trợ: Excel, CSV, JSON, Word
                  </p>
                  <Button
                    onClick={() => inputRef.current?.click()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Chọn file
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json,.docx,.doc"
                    onChange={handleChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB • {preview.length} dòng
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null)
                        setPreview([])
                      }}
                      disabled={processing}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Import Settings */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Môn học mặc định
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled={processing}
                      >
                        <option value="Toán học">Toán học</option>
                        <option value="Vật lý">Vật lý</option>
                        <option value="Hóa học">Hóa học</option>
                        <option value="Sinh học">Sinh học</option>
                        <option value="Ngữ văn">Ngữ văn</option>
                        <option value="Tiếng Anh">Tiếng Anh</option>
                        <option value="Lịch sử">Lịch sử</option>
                        <option value="Địa lý">Địa lý</option>
                        <option value="GDCD">GDCD</option>
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="Tin học">Tin học</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Khối lớp mặc định
                      </label>
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled={processing}
                      >
                        <option value="Khối 6">Khối 6</option>
                        <option value="Khối 7">Khối 7</option>
                        <option value="Khối 8">Khối 8</option>
                        <option value="Khối 9">Khối 9</option>
                        <option value="Khối 10">Khối 10</option>
                        <option value="Khối 11">Khối 11</option>
                        <option value="Khối 12">Khối 12</option>
                      </select>
                    </div>
                  </div>

                  {/* Preview */}
                  {preview.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-white max-h-60 overflow-y-auto">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Preview ({preview.length} câu hỏi)
                      </p>
                      <div className="space-y-2">
                        {preview.slice(0, 5).map((row: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                            <span className="font-medium">#{idx + 1}:</span>{" "}
                            {(row.content || row.question || row.nội_dung || row.câu_hỏi || "").toString().substring(0, 80)}
                            {preview.length > 5 && idx === 4 && (
                              <span className="text-gray-400">...</span>
                            )}
                          </div>
                        ))}
                        {preview.length > 5 && (
                          <p className="text-xs text-gray-500 text-center">
                            + {preview.length - 5} câu hỏi khác
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Hướng dẫn định dạng file:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>Excel/CSV:</strong> Cột nội dung (content/question), cột đáp án (A, B, C, D), cột đáp án đúng (correctAnswer/đáp_án)</li>
                      <li><strong>Word:</strong> Mỗi câu bắt đầu bằng "Câu 1:", "1.", các phương án A., B., C., D.</li>
                      <li><strong>Tự động nhận diện:</strong> Môn học, khối lớp, độ khó từ tên cột</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {importStep === "review" && (
            <div className="space-y-4">
              {/* Bulk Actions */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parsedQuestions.every(q => q.selected)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setParsedQuestions(prev => prev.map(q => ({ ...q, selected: checked })))
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-purple-900">
                      Chọn tất cả ({parsedQuestions.filter(q => q.selected).length}/{parsedQuestions.length})
                    </span>
                  </label>
                </div>
                <div className="text-sm text-purple-700">
                  <span className="font-medium">Đã chọn:</span> {parsedQuestions.filter(q => q.selected).length} câu hỏi
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {parsedQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className={`border rounded-xl p-4 transition-all ${
                      question.editMode
                        ? "border-purple-300 bg-purple-50 shadow-md"
                        : question.selected
                        ? "border-gray-200 bg-white"
                        : "border-gray-200 bg-gray-50 opacity-60"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={question.selected}
                          onChange={() => handleToggleSelect(question.id)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-600">Câu {index + 1}</span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {question.questionType === "MCQ" ? "Nhiều lựa chọn" : question.questionType === "TRUE_FALSE" ? "Đúng/Sai" : "Tự luận"}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {question.subject} - {question.grade}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleEditMode(question.id)}
                          className="h-8 w-8"
                        >
                          {question.editMode ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    {question.editMode ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Nội dung</label>
                          <textarea
                            value={question.content}
                            onChange={(e) => handleUpdateQuestion(question.id, { content: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            rows={3}
                          />
                        </div>
                        {question.options.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Phương án</label>
                            {question.options.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs font-bold">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <input
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...question.options]
                                    newOptions[idx] = e.target.value
                                    handleUpdateQuestion(question.id, { options: newOptions })
                                  }}
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">Đáp án đúng</label>
                            <select
                              value={question.correctAnswer}
                              onChange={(e) => handleUpdateQuestion(question.id, { correctAnswer: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              {question.options.map((opt, idx) => (
                                <option key={idx} value={String.fromCharCode(65 + idx)}>
                                  {String.fromCharCode(65 + idx)}. {opt || `Phương án ${String.fromCharCode(65 + idx)}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">Độ khó</label>
                            <select
                              value={question.difficulty}
                              onChange={(e) => handleUpdateQuestion(question.id, { difficulty: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="EASY">Dễ</option>
                              <option value="MEDIUM">Trung bình</option>
                              <option value="HARD">Khó</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Giải thích</label>
                          <textarea
                            value={question.explanation}
                            onChange={(e) => handleUpdateQuestion(question.id, { explanation: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={2}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-900 font-medium">{question.content}</p>
                        {question.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {question.options.map((opt, idx) => (
                              <div
                                key={idx}
                                className={`px-3 py-2 rounded-lg text-sm border ${
                                  String.fromCharCode(65 + idx) === question.correctAnswer
                                    ? "bg-green-50 border-green-200 text-green-700 font-medium"
                                    : "bg-gray-50 border-gray-200 text-gray-700"
                                }`}
                              >
                                <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {question.explanation && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-medium text-blue-700 mb-1">Giải thích:</p>
                            <p className="text-sm text-blue-900">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
          {importStep === "upload" ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </Button>
              <Button
                onClick={() => setImportStep("review")}
                disabled={!file || processing || parsedQuestions.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Tiếp tục →
              </Button>
            </>
          ) : (
            <>
              {importStep === "review" && (
                <Button
                  variant="outline"
                  onClick={() => setImportStep("upload")}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ← Quay lại
                </Button>
              )}
              <Button
                onClick={processQuestions}
                disabled={processing || parsedQuestions.filter(q => q.selected).length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Import {parsedQuestions.filter(q => q.selected).length} câu hỏi
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
