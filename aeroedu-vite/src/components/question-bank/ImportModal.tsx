import { useState, useRef } from "react"
import {
  Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Trash2,
} from "lucide-react"
import { toast } from "react-hot-toast"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (count: number) => void
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
}

const SUBJECT_MAPPING: Record<string, string> = {
  "toán": "Toán học", "toán học": "Toán học", "math": "Toán học",
  "vật lý": "Vật lý", "vật": "Vật lý", "physics": "Vật lý",
  "hóa": "Hóa học", "hoá": "Hóa học", "hóa học": "Hóa học", "chemistry": "Hóa học",
  "sinh": "Sinh học", "sinh học": "Sinh học", "biology": "Sinh học",
  "văn": "Ngữ văn", "ngữ văn": "Ngữ văn",
  "tiếng anh": "Tiếng Anh", "english": "Tiếng Anh",
  "tiếng việt": "Tiếng Việt",
  "lịch sử": "Lịch sử", "sử": "Lịch sử", "history": "Lịch sử",
  "địa lý": "Địa lý", "địa": "Địa lý", "geography": "Địa lý",
  "gdcd": "GDCD", "công dân": "GDCD",
  "tin học": "Tin học", "tin": "Tin học",
}

const GRADE_MAPPING: Record<string, string> = {
  "1": "Khối 1", "2": "Khối 2", "3": "Khối 3", "4": "Khối 4", "5": "Khối 5",
  "6": "Khối 6", "7": "Khối 7", "8": "Khối 8", "9": "Khối 9",
  "10": "Khối 10", "11": "Khối 11", "12": "Khối 12",
  "khối 1": "Khối 1", "khối 2": "Khối 2", "khối 3": "Khối 3",
  "khối 6": "Khối 6", "khối 7": "Khối 7", "khối 8": "Khối 8", "khối 9": "Khối 9",
  "khối 10": "Khối 10", "khối 11": "Khối 11", "khối 12": "Khối 12",
  "lớp 10": "Khối 10", "lớp 11": "Khối 11", "lớp 12": "Khối 12",
}

const DIFFICULTY_MAPPING: Record<string, string> = {
  "dễ": "EASY", "easy": "EASY",
  "trung bình": "MEDIUM", "medium": "MEDIUM",
  "khó": "HARD", "hard": "HARD",
}

function mapSubject(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  const key = raw.toLowerCase().trim()
  return SUBJECT_MAPPING[key] || raw || fallback
}

function mapGrade(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  const key = raw.toLowerCase().trim()
  return GRADE_MAPPING[key] || raw || fallback
}

function mapDifficulty(raw: string | undefined): string {
  if (!raw) return "MEDIUM"
  const key = raw.toLowerCase().trim()
  return DIFFICULTY_MAPPING[key] || "MEDIUM"
}

async function parseJsonFile(text: string): Promise<any[]> {
  const jsonData = JSON.parse(text)
  if (Array.isArray(jsonData)) return jsonData
  if (jsonData.questions && Array.isArray(jsonData.questions)) return jsonData.questions
  if (jsonData.data && Array.isArray(jsonData.data)) return jsonData.data
  return []
}

async function parseCsvFile(text: string): Promise<any[]> {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || "" })
    return row
  })
}

function normalizeQuestion(raw: any, defaultSubject: string, defaultGrade: string): ParsedQuestion {
  const content =
    raw.content || raw.question || raw.nội_dung || raw.câu_hỏi ||
    raw.question_text || raw.questionText || raw.statement || ""

  const options: string[] = []
  if (Array.isArray(raw.options)) {
    options.push(...raw.options)
  } else if (raw.A) {
    ["A", "B", "C", "D"].forEach((letter) => {
      if (raw[letter]) options.push(raw[letter])
    })
  }

  const correctAnswer =
    raw.correctAnswer || raw.correct_answer || raw.đáp_án ||
    raw.answer || ""

  const qType =
    raw.questionType || raw.type
      ? (raw.questionType || raw.type).toUpperCase()
      : options.length > 0
      ? "MCQ"
      : "ESSAY"

  return {
    id: `imported-${Date.now()}-${Math.random()}`,
    content: String(content).trim(),
    options: options.map(String),
    correctAnswer: String(correctAnswer).trim(),
    explanation: String(raw.explanation || raw.giải_thích || raw.explanationText || "").trim(),
    subject: mapSubject(raw.subject || raw.môn, defaultSubject),
    grade: mapGrade(raw.grade || raw.khối, defaultGrade),
    topic: String(raw.topic || raw.chủ_đề || "").trim(),
    difficulty: mapDifficulty(raw.difficulty || raw.độ_khó || raw.difficultyLevel),
    questionType: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"].includes(qType) ? qType : "MCQ",
    selected: true,
  }
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [subject, setSubject] = useState("Vật lý")
  const [grade, setGrade] = useState("Khối 10")
  const [importStep, setImportStep] = useState<"upload" | "review" | "complete">("upload")
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleFile = async (f: File) => {
    const validExt = /\.(xlsx|xls|csv|json|tex)$/i
    if (!validExt.test(f.name)) {
      toast.error("Chỉ hỗ trợ file Excel (.xlsx, .xls), CSV, JSON, LaTeX (.tex)")
      return
    }
    setFile(f)
    setProcessing(true)
    try {
      let rawRows: any[] = []

      if (f.name.endsWith(".tex")) {
        // LaTeX → AI extract via dedicated endpoint
        const text = await f.text()
        const t = toast.loading("AI đang trích xuất câu hỏi từ LaTeX… (~30-60s)")
        try {
          const { api } = await import("@/services/api")
          const res = await api.post<{ success: boolean; data?: { inserted: number; skipped: number; total: number } }>(
            "/teacher/question-bank/import-latex",
            { content: text, subject, grade }
          )
          if (res.data?.success && res.data.data) {
            const { inserted, skipped, total } = res.data.data
            toast.success(`✅ Đã import ${inserted}/${total} câu vào ngân hàng${skipped ? ` (bỏ qua ${skipped})` : ''}`, { id: t, duration: 5000 })
            setSavedCount(inserted)
            onSuccess(inserted)
            setImportStep("complete")
          } else {
            throw new Error("Import thất bại")
          }
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } }; message?: string }
          toast.error(e.response?.data?.error || e.message || "Không trích xuất được câu hỏi", { id: t })
        }
        return
      } else if (f.name.endsWith(".json")) {
        const text = await f.text()
        rawRows = await parseJsonFile(text)
      } else if (f.name.endsWith(".csv")) {
        const text = await f.text()
        rawRows = await parseCsvFile(text)
      } else {
        // Excel: send file directly to API for server-side parsing
        const formData = new FormData()
        formData.append("file", f)
        formData.append("subject", subject)
        formData.append("grade", grade)
        const res = await fetch("/api/questions/import", { method: "POST", body: formData })
        const data = await res.json()
        if (data.success) {
          setSavedCount(data.data?.inserted || 0)
          onSuccess(data.data?.inserted || 0)
          setImportStep("complete")
        } else {
          throw new Error(data.error || "Import thất bại")
        }
        return
      }

      if (rawRows.length === 0) {
        toast.error("Không tìm thấy câu hỏi trong file")
        return
      }

      const questions = rawRows
        .filter((r) => r.content || r.question || r.nội_dung || r.câu_hỏi || r.question_text || r.questionText)
        .map((r) => normalizeQuestion(r, subject, grade))

      if (questions.length === 0) {
        toast.error("Không thể phân tích câu hỏi. Kiểm tra định dạng file.")
        return
      }

      setParsedQuestions(questions)
      setImportStep("review")
      toast.success(`Đã phân tích ${questions.length} câu hỏi`)
    } catch (err: any) {
      toast.error(err.message || "Không thể đọc file")
    } finally {
      setProcessing(false)
    }
  }

  const handleSave = async () => {
    const selected = parsedQuestions.filter((q) => q.selected)
    if (selected.length === 0) { toast.error("Vui lòng chọn ít nhất một câu hỏi"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/questions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import thất bại")
      setSavedCount(selected.length)
      onSuccess(selected.length)
      setImportStep("complete")
      toast.success(`Đã import ${selected.length} câu hỏi!`)
    } catch (err: any) {
      toast.error(err.message || "Không thể import câu hỏi")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedQuestions([])
    setImportStep("upload")
    setSavedCount(0)
    onClose()
  }

  const toggleSelect = (id: string) =>
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" style={{ background: '#10111e', border: '1px solid #1e2033' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2033]">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-100">Import câu hỏi</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-[#1e2033] rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Upload Step ── */}
          {importStep === "upload" && (
            <>
              {/* Default subject/grade selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Môn học mặc định</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {["Toán học","Vật lý","Hóa học","Sinh học","Ngữ văn","Tiếng Anh","Lịch sử","Địa lý","GDCD","Tin học"].map(
                      (s) => <option key={s} value={s}>{s}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Khối mặc định</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {Array.from({ length: 12 }, (_, i) => `Khối ${i + 1}`).map(
                      (g) => <option key={g} value={g}>{g}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-purple-500 bg-purple-950/20"
                    : "border-[#2a2b3d] hover:border-purple-500 hover:bg-[#161728]"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json,.tex"
                  onChange={handleChange}
                  className="hidden"
                />
                {processing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                    <p className="text-sm text-slate-400">Đang xử lý file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-slate-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        Kéo thả file vào đây hoặc <span className="text-purple-600">click để chọn</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ: Excel (.xlsx, .xls), CSV, JSON, LaTeX (.tex)
                        <br />
                        <span className="text-purple-300 font-medium">✨ .tex</span> = upload đề thi LaTeX → AI tự trích xuất câu hỏi vào ngân hàng
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Format hint */}
              <div className="bg-blue-950/20 border border-blue-700/40 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-300 mb-2">Định dạng file Excel / CSV:</p>
                <p className="text-xs text-blue-400 font-mono">
                  content | A | B | C | D | correctAnswer | subject | grade | difficulty | explanation
                </p>
              </div>
            </>
          )}

          {/* ── Review Step ── */}
          {importStep === "review" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Xem trước ({parsedQuestions.filter((q) => q.selected).length}/
                    {parsedQuestions.length} đã chọn)
                  </h3>
                  <p className="text-sm text-slate-500">Bỏ chọn câu hỏi không muốn import</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setParsedQuestions((p) => p.map((q) => ({ ...q, selected: true })))}
                    className="px-3 py-1.5 border border-[#2a2b3d] text-slate-300 rounded-lg text-xs hover:bg-[#161728]"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => setParsedQuestions((p) => p.map((q) => ({ ...q, selected: false })))}
                    className="px-3 py-1.5 border border-[#2a2b3d] text-slate-300 rounded-lg text-xs hover:bg-[#161728]"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {parsedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      q.selected ? "border-purple-600 bg-purple-950/30" : "border-[#1e2033] opacity-60"
                    }`}
                    onClick={() => toggleSelect(q.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          q.selected ? "bg-purple-600 border-purple-600" : "border-[#2a2b3d]"
                        }`}
                      >
                        {q.selected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">
                            {q.questionType}
                          </span>
                          <span className="text-xs bg-[#1e2033] text-slate-400 px-2 py-0.5 rounded-full">
                            {q.subject}
                          </span>
                          <span className="text-xs bg-[#1e2033] text-slate-400 px-2 py-0.5 rounded-full">
                            {q.grade}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            q.difficulty === "EASY" ? "bg-green-900/30 text-green-400" :
                            q.difficulty === "HARD" ? "bg-red-900/30 text-red-400" :
                            "bg-yellow-900/30 text-yellow-400"
                          }`}>
                            {q.difficulty === "EASY" ? "Dễ" : q.difficulty === "HARD" ? "Khó" : "TB"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-100 line-clamp-2">{q.content}</p>
                        {q.options.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {q.options.slice(0, 2).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join(" | ")}
                            {q.options.length > 2 && " ..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1e2033]">
                <button
                  onClick={() => { setImportStep("upload"); setFile(null); setParsedQuestions([]) }}
                  className="px-4 py-2.5 border border-[#2a2b3d] text-slate-300 rounded-xl text-sm hover:bg-[#161728]"
                >
                  Đổi file
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || parsedQuestions.filter((q) => q.selected).length === 0}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang import...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Import {parsedQuestions.filter((q) => q.selected).length} câu hỏi</>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Complete Step ── */}
          {importStep === "complete" && (
            <div className="border border-green-700/40 bg-green-900/10 rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="font-bold text-green-300 text-lg mb-1">Import thành công!</h3>
              <p className="text-green-400 mb-6">
                Đã thêm <strong>{savedCount}</strong> câu hỏi vào ngân hàng
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
