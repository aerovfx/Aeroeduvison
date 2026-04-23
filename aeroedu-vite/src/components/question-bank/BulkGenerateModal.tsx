import { useState } from "react"
import {
  Loader2, Sparkles, Plus, Trash2, CheckCircle2,
  Link, FileText, Youtube, Globe, ChevronLeft, X,
} from "lucide-react"
import { toast } from "react-hot-toast"
import {
  SUBJECTS, GRADES, QUESTION_TYPES_DISPLAY, DIFFICULTIES_DISPLAY, COGNITIVE_LEVELS,
} from "@/lib/constants/question-bank"

interface Source {
  id: string
  type: "youtube" | "website" | "text"
  url: string
  content?: string
}

interface GeneratedQuestion {
  content: string
  type: string
  options?: string[]
  correctAnswer?: string
  explanation?: string
  difficulty?: string
  cognitiveLevel?: string
  selected: boolean
}

interface BulkGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
}

type Step = 1 | 2 | 3

export function BulkGenerateModal({ isOpen, onClose, onSuccess }: BulkGenerateModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [subject, setSubject] = useState("Toán")
  const [grade, setGrade] = useState("Khối 6")
  const [questionCount, setQuestionCount] = useState(10)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["TNKQ - Nhiều lựa chọn"])
  const [selectedDifficulty, setSelectedDifficulty] = useState("Trung bình")
  const [selectedCognitive, setSelectedCognitive] = useState<string[]>(["Biết", "Hiểu", "Vận dụng"])

  const [sources, setSources] = useState<Source[]>([])
  const [currentSource, setCurrentSource] = useState<Source | null>(null)
  const [extracting, setExtracting] = useState(false)

  const [previewQuestions, setPreviewQuestions] = useState<GeneratedQuestion[]>([])
  const [savedCount, setSavedCount] = useState(0)

  const toggleType = (type: string) =>
    setSelectedTypes((p) => (p.includes(type) ? p.filter((t) => t !== type) : [...p, type]))

  const toggleCognitive = (level: string) =>
    setSelectedCognitive((p) => (p.includes(level) ? p.filter((l) => l !== level) : [...p, level]))

  const addSource = () => {
    if (!currentSource?.url && !currentSource?.content) {
      toast.error("Vui lòng nhập URL hoặc nội dung")
      return
    }
    setSources([...sources, { ...currentSource, id: `source-${Date.now()}` } as Source])
    setCurrentSource(null)
  }

  const removeSource = (id: string) => setSources(sources.filter((s) => s.id !== id))

  const extractContent = async () => {
    if (!currentSource?.url || !currentSource?.type) {
      toast.error("Vui lòng chọn loại nguồn và nhập URL")
      return
    }
    setExtracting(true)
    try {
      const endpoint =
        currentSource.type === "youtube" ? "/api/extract/youtube" : "/api/extract/website"
      const body =
        currentSource.type === "youtube"
          ? { videoId: currentSource.url }
          : { url: currentSource.url }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (data.success) {
        setCurrentSource({ ...currentSource, content: data.data.transcript || data.data.content })
        toast.success("Đã trích xuất nội dung!")
      } else throw new Error(data.error)
    } catch (error: any) {
      toast.error(error.message || "Không thể trích xuất")
    } finally {
      setExtracting(false)
    }
  }

  const handleGeneratePreview = async () => {
    if (sources.length === 0) { toast.error("Vui lòng thêm ít nhất một nguồn"); return }
    if (selectedTypes.length === 0) { toast.error("Vui lòng chọn ít nhất một loại câu hỏi"); return }

    setLoading(true)
    try {
      const response = await fetch("/api/questions/bulk-generate?preview=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, grade,
          count: questionCount,
          questionTypes: selectedTypes,
          difficulty: selectedDifficulty,
          cognitiveLevels: selectedCognitive,
          sources: sources.map((s) => ({ type: s.type, content: s.content || s.url })),
          useAI: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Không thể sinh câu hỏi")

      const questions: GeneratedQuestion[] = (
        data.data?.questions || data.questions || []
      ).map((q: any) => ({ ...q, selected: true }))

      if (questions.length === 0) {
        setSavedCount(data.data?.inserted || 0)
        onSuccess?.(data.data?.totalInBank || 0)
        setStep(3)
      } else {
        setPreviewQuestions(questions)
        setStep(2)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể sinh câu hỏi")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSelected = async () => {
    const selected = previewQuestions.filter((q) => q.selected)
    if (selected.length === 0) { toast.error("Vui lòng chọn ít nhất một câu hỏi"); return }

    setSaving(true)
    try {
      const response = await fetch("/api/questions/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, grade, questions: selected }),
      })

      if (!response.ok) {
        const fallbackResp = await fetch("/api/questions/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject, grade,
            sources: sources.map((s) => ({ type: s.type, content: s.content || s.url })),
            useAI: true,
          }),
        })
        const fallbackData = await fallbackResp.json()
        setSavedCount(fallbackData.data?.inserted || selected.length)
        onSuccess?.(fallbackData.data?.totalInBank || 0)
      } else {
        const data = await response.json()
        setSavedCount(data.inserted || selected.length)
        onSuccess?.(data.totalInBank || 0)
      }
      setStep(3)
    } catch (error: any) {
      toast.error(error.message || "Không thể lưu câu hỏi")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSources([])
    setCurrentSource(null)
    setPreviewQuestions([])
    setSavedCount(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" style={{ background: '#10111e', border: '1px solid #1e2033' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2033]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-100">Sinh câu hỏi từ nhiều nguồn</h2>
            {step > 1 && (
              <span className="text-xs text-slate-500 ml-2">Bước {step}/3</span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#1e2033] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── STEP 1: Config + Sources ── */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Môn học</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Khối lớp</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Số câu hỏi</label>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => setQuestionCount(Math.max(5, questionCount - 5))}
                      className="px-3 py-1.5 border border-[#2a2b3d] rounded-lg text-sm hover:bg-[#161728] text-slate-300"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-bold text-sm text-slate-200">{questionCount}</span>
                    <button
                      onClick={() => setQuestionCount(Math.min(50, questionCount + 5))}
                      className="px-3 py-1.5 border border-[#2a2b3d] rounded-lg text-sm hover:bg-[#161728] text-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Độ khó</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2b3d] px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200"
                  >
                    {DIFFICULTIES_DISPLAY.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Question types */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Loại câu hỏi</label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES_DISPLAY.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedTypes.includes(type)
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-[#161728] border-[#2a2b3d] text-slate-400 hover:border-purple-600"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cognitive levels */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cấp độ nhận thức (Bloom)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COGNITIVE_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => toggleCognitive(level)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedCognitive.includes(level)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-[#10111e] border-[#2a2b3d] text-slate-400 hover:border-blue-300"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source type selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nguồn nội dung</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["youtube", "website", "text"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setCurrentSource({ type, url: "", content: "" } as any)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        currentSource?.type === type
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-[#10111e] border-[#2a2b3d] text-slate-400 hover:bg-[#161728]"
                      }`}
                    >
                      {type === "youtube" && <><Youtube className="w-4 h-4" /> YouTube</>}
                      {type === "website" && <><Globe className="w-4 h-4" /> Website</>}
                      {type === "text" && <><FileText className="w-4 h-4" /> Văn bản</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source input */}
              {currentSource && (
                <div className="border border-[#1e2033] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      {currentSource.type === "youtube" && "YouTube URL"}
                      {currentSource.type === "website" && "Website URL"}
                      {currentSource.type === "text" && "Nội dung văn bản"}
                    </label>
                    <button
                      onClick={() => setCurrentSource(null)}
                      className="text-sm text-slate-500 hover:text-slate-300"
                    >
                      Hủy
                    </button>
                  </div>
                  {currentSource.type === "text" ? (
                    <textarea
                      placeholder="Nhập hoặc dán nội dung..."
                      value={currentSource.content}
                      onChange={(e) =>
                        setCurrentSource({ ...currentSource, content: e.target.value })
                      }
                      rows={5}
                      className="w-full border border-[#2a2b3d] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y bg-[#161728] text-slate-200 placeholder-slate-500"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <input
                        placeholder={
                          currentSource.type === "youtube"
                            ? "https://youtube.com/watch?v=..."
                            : "https://..."
                        }
                        value={currentSource.url}
                        onChange={(e) =>
                          setCurrentSource({ ...currentSource, url: e.target.value })
                        }
                        className="flex-1 border border-[#2a2b3d] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#161728] text-slate-200 placeholder-slate-500"
                      />
                      <button
                        onClick={extractContent}
                        disabled={extracting || !currentSource.url}
                        className="px-4 py-2 bg-[#2a2b3d] text-slate-200 rounded-lg text-sm hover:bg-[#3a3b4d] disabled:opacity-50 flex items-center gap-2"
                      >
                        {extracting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link className="w-4 h-4" />
                        )}
                        {extracting ? "Trích xuất..." : "Trích xuất"}
                      </button>
                    </div>
                  )}
                  {currentSource.content && (
                    <div className="p-3 bg-green-900/10 border border-green-700/40 rounded-lg text-sm text-green-400">
                      ✅ Đã trích xuất: {currentSource.content.length} ký tự
                    </div>
                  )}
                  <button
                    onClick={addSource}
                    disabled={!currentSource.url && !currentSource.content}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Thêm nguồn
                  </button>
                </div>
              )}

              {/* Sources list */}
              {sources.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nguồn đã thêm ({sources.length})
                  </label>
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between p-3 border border-[#1e2033] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {source.type === "youtube" && (
                            <Youtube className="w-5 h-5 text-red-600 shrink-0" />
                          )}
                          {source.type === "website" && (
                            <Globe className="w-5 h-5 text-blue-600 shrink-0" />
                          )}
                          {source.type === "text" && (
                            <FileText className="w-5 h-5 text-green-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-sm capitalize text-slate-200">{source.type}</div>
                            <div className="text-xs text-slate-500 truncate max-w-xs">
                              {source.content
                                ? `${source.content.length} ký tự`
                                : source.url}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeSource(source.id)}
                          className="p-2 text-red-500 hover:bg-red-950/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleGeneratePreview}
                disabled={loading || sources.length === 0}
                className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang sinh câu hỏi...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Sinh {questionCount} câu hỏi
                  </>
                )}
              </button>
            </>
          )}

          {/* ── STEP 2: Preview & Approve ── */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Xem trước câu hỏi ({previewQuestions.filter((q) => q.selected).length}/
                    {previewQuestions.length} đã chọn)
                  </h3>
                  <p className="text-sm text-slate-500">
                    Bỏ chọn câu hỏi không muốn lưu, rồi nhấn Lưu
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPreviewQuestions((prev) => prev.map((q) => ({ ...q, selected: true })))
                    }
                    className="px-3 py-1.5 border border-[#2a2b3d] text-slate-300 rounded-lg text-xs hover:bg-[#161728]"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() =>
                      setPreviewQuestions((prev) => prev.map((q) => ({ ...q, selected: false })))
                    }
                    className="px-3 py-1.5 border border-[#2a2b3d] text-slate-300 rounded-lg text-xs hover:bg-[#161728]"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      q.selected
                        ? "border-purple-600 bg-purple-950/30"
                        : "border-[#1e2033] opacity-60"
                    }`}
                    onClick={() =>
                      setPreviewQuestions((prev) =>
                        prev.map((pq, i) =>
                          i === idx ? { ...pq, selected: !pq.selected } : pq
                        )
                      )
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          q.selected
                            ? "bg-purple-600 border-purple-600"
                            : "border-[#2a2b3d]"
                        }`}
                      >
                        {q.selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">
                            {q.type}
                          </span>
                          {q.difficulty && (
                            <span className="text-xs bg-[#1e2033] text-slate-400 px-2 py-0.5 rounded-full">
                              {q.difficulty}
                            </span>
                          )}
                          {q.cognitiveLevel && (
                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                              {q.cognitiveLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-100 line-clamp-2">{q.content}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-1 text-xs text-slate-500">
                            {q.options.slice(0, 2).map((opt, i) => (
                              <span key={i} className="mr-2">
                                {String.fromCharCode(65 + i)}. {opt}
                              </span>
                            ))}
                            {q.options.length > 2 && <span>...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1e2033]">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-[#2a2b3d] text-slate-300 rounded-xl text-sm hover:bg-[#161728] flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Quay lại
                </button>
                <button
                  onClick={handleSaveSelected}
                  disabled={saving || previewQuestions.filter((q) => q.selected).length === 0}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Lưu{" "}
                      {previewQuestions.filter((q) => q.selected).length} câu hỏi
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 3 && (
            <div className="border border-green-700/40 bg-green-900/10 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="font-bold text-green-300 text-lg mb-1">Đã lưu thành công!</h3>
              <p className="text-green-400 mb-6">
                Đã thêm <strong>{savedCount}</strong> câu hỏi vào ngân hàng
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setStep(1)
                    setSources([])
                    setPreviewQuestions([])
                  }}
                  className="px-4 py-2 border border-[#2a2b3d] text-slate-300 rounded-lg text-sm hover:bg-[#161728]"
                >
                  Sinh thêm câu hỏi
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
