"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, FileText, Eye, Edit, Trash2, Copy, Grid3x3,
  Search, BarChart3, Clock, CheckCircle2, Sparkles, Loader2
} from "lucide-react"
import { toast } from "react-hot-toast"

interface Exam {
  id: string
  title: string
  subject?: string
  examType: string
  duration: number
  totalQuestions: number
  status: string
  createdAt: string
}

export default function ExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("Tất cả môn")
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [exportingLatexExamId, setExportingLatexExamId] = useState<string | null>(null)

  useEffect(() => {
    loadExams()
  }, [subjectFilter])

  const loadExams = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/exams')
      if (!response.ok) {
        throw new Error(`Load exams failed (${response.status})`)
      }
      const data = await response.json().catch(() => ({}))
      const list = Array.isArray(data?.exams) ? data.exams : []
      setExams(
        list.map((exam: any) => ({
          id: String(exam.id),
          title: String(exam.title || "Untitled exam"),
          subject: exam.subject ? String(exam.subject) : undefined,
          examType: String(exam.examType || "N/A"),
          duration: Number(exam.duration || 0),
          totalQuestions: Number(exam.totalQuestions || 0),
          status: String(exam.status || "Nháp"),
          createdAt: String(exam.createdAt || new Date().toISOString()),
        }))
      )
    } catch (error) {
      console.error('Error loading exams:', error)
      setExams([])
      toast.error("Không tải được danh sách đề thi")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa đề thi này?')) return
    try {
      const response = await fetch(`/api/teacher/exams/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error("Delete failed")
      }
      toast.success('Đã xóa đề thi')
      loadExams()
    } catch (error) {
      toast.error('Không thể xóa đề thi')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/teacher/exams/${id}/duplicate`, { method: 'POST' })
      if (!response.ok) {
        throw new Error("Duplicate failed")
      }
      toast.success('Đã nhân bản đề thi')
      loadExams()
    } catch (error) {
      toast.error('Không thể nhân bản')
    }
  }

  const handleExportToLatex = async (examId: string) => {
    if (!examId || exportingLatexExamId) return
    setExportingLatexExamId(examId)
    try {
      const response = await fetch("/api/latex-projects/export-from-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "Không thể gửi đề sang LaTeX")
      }
      toast.success("Đã tạo tài liệu LaTeX. Đang mở...")
      router.push(`/teacher/latex-documents/${data.id}`)
    } catch (error: any) {
      toast.error(error?.message || "Không thể gửi đề sang LaTeX")
    } finally {
      setExportingLatexExamId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      "Hoàn tất": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      "Nháp": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
      "Đang thi": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      "Kết thúc": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    }
    const c = config[status as keyof typeof config] || config["Nháp"]
    return (
      <span className={`px-2 py-1 rounded-md text-xs border ${c.bg} ${c.text} ${c.border}`}>
        {status}
      </span>
    )
  }

  const selectedExam = exams.find(e => e.id === selectedExamId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Đề Thi</h1>
                <p className="text-sm text-gray-600">Quản lý và chấm điểm tự động</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/teacher/exams/create")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Tạo đề thi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Exam List - 8 columns */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm đề thi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Tất cả môn">Tất cả môn</option>
                  <option value="Toán học">Toán học</option>
                  <option value="Vật lý">Vật lý</option>
                  <option value="Hóa học">Hóa học</option>
                  <option value="Văn học">Văn học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                </select>
              </div>
            </div>

            {/* Exam Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Đề thi</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Môn</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Loại</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Thời gian</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">SL câu</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Trạng thái</th>
                      <th className="text-right p-4 text-xs font-medium text-gray-600 uppercase">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            <span className="text-gray-600">Đang tải...</span>
                          </div>
                        </td>
                      </tr>
                    ) : exams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-600 font-medium">Chưa có đề thi nào</p>
                            <p className="text-sm text-gray-500 mt-1">Tạo đề thi đầu tiên để bắt đầu</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      exams.map((exam) => (
                        <tr 
                          key={exam.id} 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            selectedExamId === exam.id ? 'bg-purple-50' : ''
                          }`}
                          onClick={() => setSelectedExamId(exam.id)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{exam.title}</div>
                                <div className="text-xs text-gray-500">ID: {exam.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{exam.subject || "Chưa phân môn"}</td>
                          <td className="p-4 text-sm text-gray-600">{exam.examType}</td>
                          <td className="p-4 text-sm text-gray-600">{exam.duration} phút</td>
                          <td className="p-4 text-sm text-gray-600">{exam.totalQuestions} câu</td>
                          <td className="p-4">{getStatusBadge(exam.status)}</td>
                          <td className="text-right p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => router.push(`/teacher/exams/${exam.id}`)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Xem"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Sửa"
                              >
                                <Edit className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(exam.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Nhân bản"
                              >
                                <Copy className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleExportToLatex(exam.id)}
                                disabled={exportingLatexExamId === exam.id}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Gửi sang LaTeX để biên tập và in"
                              >
                                {exportingLatexExamId === exam.id ? (
                                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-blue-600" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(exam.id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Detail Panel - 4 columns */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Thống kê</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-600">Tổng số đề</span>
                  <span className="text-lg font-bold text-purple-700">{exams.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Hoàn tất</span>
                  <span className="text-lg font-bold text-green-700">
                    {exams.filter(e => e.status === "Hoàn tất").length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Đang thi</span>
                  <span className="text-lg font-bold text-blue-700">
                    {exams.filter(e => e.status === "Đang thi").length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Nháp</span>
                  <span className="text-lg font-bold text-gray-700">
                    {exams.filter(e => e.status === "Nháp").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Exam Details */}
            {selectedExam ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Chi tiết</h3>
                      <p className="text-xs text-gray-500 truncate max-w-[150px]">{selectedExam.title}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Môn học</span>
                    <span className="text-sm font-medium text-gray-900">{selectedExam.subject || "Chưa phân môn"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Loại đề</span>
                    <span className="text-sm font-medium text-gray-900">{selectedExam.examType}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Thời gian</span>
                    <span className="text-sm font-medium text-gray-900">{selectedExam.duration} phút</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Số câu hỏi</span>
                    <span className="text-sm font-medium text-gray-900">{selectedExam.totalQuestions} câu</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Trạng thái</span>
                    {getStatusBadge(selectedExam.status)}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => router.push(`/teacher/exams/${selectedExam.id}`)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Xem đề thi
                  </button>
                  <button
                    onClick={() => handleExportToLatex(selectedExam.id)}
                    disabled={exportingLatexExamId === selectedExam.id}
                    className="px-3 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Gửi sang LaTeX để biên tập và in"
                  >
                    {exportingLatexExamId === selectedExam.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        LaTeX
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        LaTeX
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/teacher/exams/${selectedExam.id}/edit`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Chọn đề thi để xem chi tiết
                </h3>
                <p className="text-sm text-gray-600">
                  Click vào một đề thi trong danh sách để xem thông tin chi tiết
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/teacher/exams/create")}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-3"
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Tạo đề thi mới</div>
                    <div className="text-xs text-purple-100">Tạo từ đầu hoặc từ ma trận</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/teacher/exam-matrix")}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-3"
                >
                  <Grid3x3 className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Ma trận đề thi</div>
                    <div className="text-xs text-gray-500">Quản lý ma trận</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/teacher/question-bank")}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-3"
                >
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Ngân hàng câu hỏi</div>
                    <div className="text-xs text-gray-500">Quản lý câu hỏi</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
