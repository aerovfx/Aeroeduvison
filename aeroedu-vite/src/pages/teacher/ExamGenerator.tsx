/**
 * ExamGenerator — Tạo đề thi từ ma trận câu hỏi bằng AI.
 * Nhập Matrix ID + Teacher ID, chọn số mã đề (1 hoặc nhiều), tùy chọn trộn câu/không trùng,
 * gọi /api/ai/exam/generate-from-matrix hoặc generate-multiple-variants,
 * xem đề đã tạo + xuất PDF (mỗi mã đề một bản).
 */

import { useState } from 'react'
import { Loader2, FileText, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface ExamQuestion {
  question_id: string
  position: number
  assigned_score: number
  question_type: string
}

interface ExamMetadata {
  generated_at: string
  variant: string
  generation_time_ms: number
  llm_model: string
}

interface GeneratedExam {
  exam_id: string
  matrix_id: string
  teacher_id: string
  questions: ExamQuestion[]
  metadata: ExamMetadata
}

// Component chính: form tạo đề + danh sách đề đã tạo
export default function ExamGeneratorPage() {
  const [matrixId, setMatrixId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [variantCount, setVariantCount] = useState(1)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [ensureNoOverlap, setEnsureNoOverlap] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedExams, setGeneratedExams] = useState<GeneratedExam[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Tạo đề: gọi API generate theo số lượng mã đề rồi lưu vào state hiển thị
  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const endpoint = variantCount > 1
        ? '/api/ai/exam/generate-multiple-variants'
        : '/api/ai/exam/generate-from-matrix'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrix_id: matrixId,
          teacher_id: teacherId,
          variant_count: variantCount,
          options: { exam_variant: 'A', shuffle_questions: shuffleQuestions, ensure_no_overlap: ensureNoOverlap },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate exam')
      }

      const data = await res.json()
      if (variantCount > 1) {
        setGeneratedExams(data.variants)
        setSuccess(`Đã tạo ${data.variants.length} mã đề thành công!`)
      } else {
        setGeneratedExams([data.exam])
        setSuccess('Đã tạo đề thi thành công!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setIsGenerating(false)
    }
  }

  // Xuất đề đã tạo ra file PDF tải về máy
  const handleExportPDF = async (examId: string, variant: string) => {
    try {
      const res = await fetch(`/api/ai/exam/export/${examId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exam-${examId}-${variant}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      setError('Không thể xuất PDF')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tạo Đề Thi từ Ma Trận</h1>
          <p className="text-gray-500">Sử dụng AI để tạo đề thi từ ma trận câu hỏi</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Generation Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Tạo Đề Thi</h2>
            <p className="text-sm text-gray-500 mb-6">Tạo đề thi từ ma trận của bạn</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Matrix ID</label>
                <input
                  type="text"
                  value={matrixId}
                  onChange={e => setMatrixId(e.target.value)}
                  placeholder="matrix_math_11_hk1_2026"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Teacher ID</label>
                <input
                  type="text"
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                  placeholder="teacher_123"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Số lượng mã đề</label>
                <select
                  value={variantCount}
                  onChange={e => setVariantCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} mã đề</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-semibold text-gray-700">Trộn câu hỏi</label>
                <button
                  onClick={() => setShuffleQuestions(v => !v)}
                  className={`w-12 h-6 rounded-full transition-colors ${shuffleQuestions ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${shuffleQuestions ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-semibold text-gray-700">Không trùng câu hỏi</label>
                <button
                  onClick={() => setEnsureNoOverlap(v => !v)}
                  className={`w-12 h-6 rounded-full transition-colors ${ensureNoOverlap ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${ensureNoOverlap ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !matrixId || !teacherId}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                ) : (
                  <><FileText className="w-4 h-4" /> Tạo Đề Thi</>
                )}
              </button>
            </div>
          </div>

          {/* Generated Exams */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Đề Thi Đã Tạo</h2>
            <p className="text-sm text-gray-500 mb-6">Các đề thi vừa được tạo gần đây</p>

            {generatedExams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Chưa có đề thi nào được tạo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedExams.map(exam => (
                  <div key={exam.exam_id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Mã đề {exam.metadata.variant}</p>
                      <p className="text-xs text-gray-500">
                        {exam.questions.length} câu hỏi • {exam.metadata.generation_time_ms}ms
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportPDF(exam.exam_id, exam.metadata.variant)}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                        title="Xuất PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/exam/${exam.exam_id}/preview`, '_blank')}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                        title="Xem trước"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
