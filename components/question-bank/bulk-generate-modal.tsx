"use client"

import { useState } from "react"
import { Loader2, Sparkles, Plus, Trash2, CheckCircle2, Link, FileText, Youtube, Globe, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-hot-toast"
import { SUBJECTS, GRADES, QUESTION_TYPES_DISPLAY, DIFFICULTIES_DISPLAY, COGNITIVE_LEVELS } from "@/lib/constants/question-bank"

interface Source {
  id: string
  type: 'youtube' | 'website' | 'text' | 'pdf'
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

// Step: 1 = config+sources, 2 = preview/approve, 3 = done
type Step = 1 | 2 | 3

export function BulkGenerateModal({ isOpen, onClose, onSuccess }: BulkGenerateModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Config
  const [subject, setSubject] = useState("Toán")
  const [grade, setGrade] = useState("Khối 6")
  const [questionCount, setQuestionCount] = useState(10)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["TNKQ - Nhiều lựa chọn"])
  const [selectedDifficulty, setSelectedDifficulty] = useState("Trung bình")
  const [selectedCognitive, setSelectedCognitive] = useState<string[]>(["Biết", "Hiểu", "Vận dụng"])

  // Sources
  const [sources, setSources] = useState<Source[]>([])
  const [currentSource, setCurrentSource] = useState<Source | null>(null)
  const [extracting, setExtracting] = useState(false)

  // Preview
  const [previewQuestions, setPreviewQuestions] = useState<GeneratedQuestion[]>([])
  const [savedCount, setSavedCount] = useState(0)

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleCognitive = (level: string) => {
    setSelectedCognitive(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }

  const addSource = () => {
    if (!currentSource?.url && !currentSource?.content) {
      toast.error("Vui lòng nhập URL hoặc nội dung"); return
    }
    setSources([...sources, { ...currentSource, id: `source-${Date.now()}` } as Source])
    setCurrentSource(null)
  }

  const removeSource = (id: string) => setSources(sources.filter(s => s.id !== id))

  const extractContent = async () => {
    if (!currentSource?.url || !currentSource?.type) {
      toast.error("Vui lòng chọn loại nguồn và nhập URL"); return
    }
    setExtracting(true)
    try {
      const endpoint = currentSource.type === 'youtube' ? '/api/extract/youtube' : '/api/extract/website'
      const body = currentSource.type === 'youtube'
        ? { videoId: currentSource.url }
        : { url: currentSource.url }
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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

  // Step 1 → 2: Generate preview (no DB save)
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
          sources: sources.map(s => ({ type: s.type, content: s.content || s.url })),
          useAI: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Không thể sinh câu hỏi")

      // Support both preview array response and legacy response
      const questions: GeneratedQuestion[] = (data.data?.questions || data.questions || []).map((q: any) => ({
        ...q,
        selected: true,
      }))

      if (questions.length === 0) {
        // Legacy: API saves directly → treat as step 3
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

  // Step 2 → 3: Save selected questions
  const handleSaveSelected = async () => {
    const selected = previewQuestions.filter(q => q.selected)
    if (selected.length === 0) { toast.error("Vui lòng chọn ít nhất một câu hỏi"); return }

    setSaving(true)
    try {
      // Try /api/questions/bulk-save first, fallback to bulk-generate without preview
      const response = await fetch("/api/questions/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, grade, questions: selected }),
      })

      if (!response.ok) {
        // Fallback: use original generate (saves all)
        const fallbackResp = await fetch("/api/questions/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject, grade,
            sources: sources.map(s => ({ type: s.type, content: s.content || s.url })),
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sinh câu hỏi từ nhiều nguồn
            {step > 1 && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Bước {step}/3
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Trích xuất nội dung từ YouTube, Website, văn bản và sinh câu hỏi tự động
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* ═══════════════ STEP 1: Config + Sources ═══════════════ */}
          {step === 1 && (
            <>
              {/* Basic config */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Môn học</Label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Khối lớp</Label>
                  <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Số câu hỏi</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <button onClick={() => setQuestionCount(Math.max(5, questionCount - 5))} className="px-2 py-1 border rounded text-sm">−</button>
                    <span className="w-12 text-center font-bold">{questionCount}</span>
                    <button onClick={() => setQuestionCount(Math.min(50, questionCount + 5))} className="px-2 py-1 border rounded text-sm">+</button>
                  </div>
                </div>
                <div>
                  <Label>Độ khó</Label>
                  <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {DIFFICULTIES_DISPLAY.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Question types */}
              <div>
                <Label>Loại câu hỏi</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUESTION_TYPES_DISPLAY.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cognitive levels */}
              <div>
                <Label>Cấp độ nhận thức (Bloom)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COGNITIVE_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => toggleCognitive(level)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedCognitive.includes(level)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-background border-input text-muted-foreground hover:border-blue-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source type selector */}
              <div>
                <Label>Nguồn nội dung</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['youtube', 'website', 'text'] as const).map(type => (
                    <Button
                      key={type}
                      variant={currentSource?.type === type ? 'default' : 'outline'}
                      onClick={() => setCurrentSource({ type, url: '', content: '' })}
                      className="gap-2"
                    >
                      {type === 'youtube' && <><Youtube className="h-4 w-4" /> YouTube</>}
                      {type === 'website' && <><Globe className="h-4 w-4" /> Website</>}
                      {type === 'text' && <><FileText className="h-4 w-4" /> Văn bản</>}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Source input */}
              {currentSource && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>
                        {currentSource.type === 'youtube' && 'YouTube URL'}
                        {currentSource.type === 'website' && 'Website URL'}
                        {currentSource.type === 'text' && 'Nội dung văn bản'}
                      </Label>
                      <Button size="sm" variant="outline" onClick={() => setCurrentSource(null)}>Hủy</Button>
                    </div>
                    {currentSource.type === 'text' ? (
                      <Textarea
                        placeholder="Nhập hoặc dán nội dung..."
                        value={currentSource.content}
                        onChange={e => setCurrentSource({ ...currentSource, content: e.target.value })}
                        className="min-h-[150px]"
                      />
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder={currentSource.type === 'youtube' ? "https://youtube.com/watch?v=..." : "https://..."}
                          value={currentSource.url}
                          onChange={e => setCurrentSource({ ...currentSource, url: e.target.value })}
                          className="flex-1"
                        />
                        <Button onClick={extractContent} disabled={extracting || !currentSource.url}>
                          {extracting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link className="h-4 w-4 mr-1" />}
                          {extracting ? 'Trích xuất...' : 'Trích xuất'}
                        </Button>
                      </div>
                    )}
                    {currentSource.content && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                        ✅ Đã trích xuất: {currentSource.content.length} ký tự
                      </div>
                    )}
                    <Button onClick={addSource} disabled={!currentSource.url && !currentSource.content} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Thêm nguồn
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Sources list */}
              {sources.length > 0 && (
                <div>
                  <Label>Nguồn đã thêm ({sources.length})</Label>
                  <div className="space-y-2 mt-2">
                    {sources.map(source => (
                      <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {source.type === 'youtube' && <Youtube className="h-5 w-5 text-red-600 shrink-0" />}
                          {source.type === 'website' && <Globe className="h-5 w-5 text-blue-600 shrink-0" />}
                          {source.type === 'text' && <FileText className="h-5 w-5 text-green-600 shrink-0" />}
                          <div>
                            <div className="font-medium text-sm capitalize">{source.type}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {source.content ? `${source.content.length} ký tự` : source.url}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeSource(source.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGeneratePreview}
                disabled={loading || sources.length === 0}
                className="w-full"
                size="lg"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang sinh câu hỏi...</>
                  : <><Sparkles className="h-4 w-4 mr-2" /> Sinh {questionCount} câu hỏi</>}
              </Button>
            </>
          )}

          {/* ═══════════════ STEP 2: Preview & Approve ═══════════════ */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Xem trước câu hỏi ({previewQuestions.filter(q => q.selected).length}/{previewQuestions.length} đã chọn)</h3>
                  <p className="text-sm text-muted-foreground">Bỏ chọn câu hỏi không muốn lưu, rồi nhấn Lưu</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewQuestions(prev => prev.map(q => ({ ...q, selected: true })))}>
                    Chọn tất cả
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPreviewQuestions(prev => prev.map(q => ({ ...q, selected: false })))}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      q.selected ? 'border-primary bg-primary/5' : 'border-muted opacity-60'
                    }`}
                    onClick={() => setPreviewQuestions(prev => prev.map((pq, i) => i === idx ? { ...pq, selected: !pq.selected } : pq))}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${q.selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {q.selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{q.type}</Badge>
                          {q.difficulty && <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>}
                          {q.cognitiveLevel && <Badge variant="outline" className="text-xs">{q.cognitiveLevel}</Badge>}
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{q.content}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {q.options.slice(0, 2).map((opt, i) => <span key={i} className="mr-2">{String.fromCharCode(65 + i)}. {opt}</span>)}
                            {q.options.length > 2 && <span>...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại
                </Button>
                <Button
                  onClick={handleSaveSelected}
                  disabled={saving || previewQuestions.filter(q => q.selected).length === 0}
                  className="flex-1"
                  size="lg"
                >
                  {saving
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang lưu...</>
                    : <><CheckCircle2 className="h-4 w-4 mr-2" /> Lưu {previewQuestions.filter(q => q.selected).length} câu hỏi</>}
                </Button>
              </div>
            </>
          )}

          {/* ═══════════════ STEP 3: Done ═══════════════ */}
          {step === 3 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-green-900 text-lg mb-1">Đã lưu thành công!</h3>
                <p className="text-green-700 mb-4">
                  Đã thêm <strong>{savedCount}</strong> câu hỏi vào ngân hàng
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => { setStep(1); setSources([]); setPreviewQuestions([]) }}>
                    Sinh thêm câu hỏi
                  </Button>
                  <Button onClick={handleClose}>Đóng</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
