"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Upload, Plus, Search, FileText, Grid3x3, Eye, Edit, Trash2,
  Copy, Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
  BarChart3, Filter, Download
} from "lucide-react"
import { DigitizeMatrixModal } from "@/components/exam-matrix/digitize-modal"
import { GenerateExamModal } from "@/components/exam-matrix/generate-exam-modal"
import { toast } from "react-hot-toast"

type MatrixStatus = "Tất cả" | "Hàng đợi" | "Đang xử lý" | "Hoàn tất" | "Lỗi"

interface ExamMatrix {
  id: string
  name: string
  grade: string
  examType: string
  type: string
  status: string
  totalQuestions: number
  createdAt: string
}

export default function ExamMatrixPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [matrices, setMatrices] = useState<ExamMatrix[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<MatrixStatus>("Tất cả")
  const [searchQuery, setSearchQuery] = useState("")
  const [examTypeFilter, setExamTypeFilter] = useState("Tất cả loại đề")
  const [isDigitizeModalOpen, setIsDigitizeModalOpen] = useState(false)
  const [isGenerateExamModalOpen, setIsGenerateExamModalOpen] = useState(false)
  const [selectedMatrixForExam, setSelectedMatrixForExam] = useState<{ id: string; name: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [matrixToDelete, setMatrixToDelete] = useState<string | null>(null)
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null)

  useEffect(() => { fetchMatrices() }, [selectedStatus, examTypeFilter])

  const fetchMatrices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") params.append("status", selectedStatus)
      if (examTypeFilter !== "Tất cả loại đề") params.append("examType", examTypeFilter)

      const response = await fetch(`/api/exam-matrices?${params.toString()}`)
      if (!response.ok) throw new Error("Không thể tải danh sách ma trận")
      const data = await response.json()
      setMatrices(data.matrices || [])
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách ma trận")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/exam-matrices/${id}`, { method: "DELETE" })
      toast.success("Đã xóa ma trận")
      fetchMatrices()
      setDeleteDialogOpen(false)
      setMatrixToDelete(null)
    } catch (error) {
      toast.error("Không thể xóa ma trận")
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Hoàn tất": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      "Đang xử lý": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      "Hàng đợi": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
      "Lỗi": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["Hàng đợi"]
    return (
      <span className={`px-2 py-1 rounded-md text-xs border ${config.bg} ${config.text} ${config.border}`}>
        {status}
      </span>
    )
  }

  const selectedMatrix = matrices.find(m => m.id === selectedMatrixId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Grid3x3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ma Trận Đề Thi</h1>
                <p className="text-sm text-gray-600">Quản lý và số hóa ma trận đề thi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDigitizeModalOpen(true)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Số hóa
              </button>
              <button
                onClick={() => router.push("/teacher/exam-matrix/create")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout like AI Dashboard */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Matrix List - 8 columns */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm ma trận..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as MatrixStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  <option value="Hàng đợi">Hàng đợi</option>
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Hoàn tất">Hoàn tất</option>
                  <option value="Lỗi">Lỗi</option>
                </select>
                <select
                  value={examTypeFilter}
                  onChange={(e) => setExamTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Tất cả loại đề">Tất cả loại</option>
                  <option value="Kiểm tra 1 tiết">1 tiết</option>
                  <option value="Kiểm tra giữa kỳ">Giữa kỳ</option>
                  <option value="Kiểm tra cuối kỳ">Cuối kỳ</option>
                  <option value="Thi học kỳ">Học kỳ</option>
                </select>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Tên ma trận</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Loại</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Loại đề</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Ngày tạo</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Trạng thái</th>
                      <th className="text-right p-4 text-xs font-medium text-gray-600 uppercase">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                            <span className="text-gray-600">Đang tải...</span>
                          </div>
                        </td>
                      </tr>
                    ) : matrices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-600 font-medium">Chưa có ma trận nào</p>
                            <p className="text-sm text-gray-500 mt-1">Tạo ma trận đầu tiên để bắt đầu</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      matrices.map((matrix) => (
                        <tr 
                          key={matrix.id} 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            selectedMatrixId === matrix.id ? 'bg-purple-50' : ''
                          }`}
                          onClick={() => setSelectedMatrixId(matrix.id)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{matrix.name}</div>
                                <div className="text-xs text-gray-500">{matrix.grade}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{matrix.type}</td>
                          <td className="p-4 text-sm text-gray-600">{matrix.examType || "-"}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(matrix.createdAt).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="p-4">{getStatusBadge(matrix.status)}</td>
                          <td className="text-right p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => router.push(`/teacher/exam-matrix/${matrix.id}`)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Xem"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMatrixForExam({ id: matrix.id, name: matrix.name })
                                  setIsGenerateExamModalOpen(true)
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Sinh đề"
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(matrix.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Nhân bản"
                              >
                                <Copy className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setMatrixToDelete(matrix.id)
                                  setDeleteDialogOpen(true)
                                }}
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
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Tổng số ma trận</span>
                  <span className="text-lg font-bold text-gray-900">{matrices.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Hoàn tất</span>
                  <span className="text-lg font-bold text-green-700">
                    {matrices.filter(m => m.status === "Hoàn tất").length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Đang xử lý</span>
                  <span className="text-lg font-bold text-blue-700">
                    {matrices.filter(m => m.status === "Đang xử lý").length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-600">Có lỗi</span>
                  <span className="text-lg font-bold text-red-700">
                    {matrices.filter(m => m.status === "Lỗi").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Matrix Details */}
            {selectedMatrix ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Chi tiết</h3>
                      <p className="text-xs text-gray-500">{selectedMatrix.name}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Loại</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMatrix.type}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Loại đề</span>
                    <span className="text-sm font-medium text-gray-900">{selectedMatrix.examType || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Ngày tạo</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(selectedMatrix.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Trạng thái</span>
                    {getStatusBadge(selectedMatrix.status)}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => router.push(`/teacher/exam-matrix/${selectedMatrix.id}`)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMatrixForExam({ id: selectedMatrix.id, name: selectedMatrix.name })
                      setIsGenerateExamModalOpen(true)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Sinh đề
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Grid3x3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Chọn ma trận để xem chi tiết
                </h3>
                <p className="text-sm text-gray-600">
                  Click vào một ma trận trong danh sách để xem thông tin chi tiết
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setIsDigitizeModalOpen(true)}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-3"
                >
                  <Upload className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Số hóa ma trận</div>
                    <div className="text-xs text-gray-500">Upload file để trích xuất</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/teacher/exam-matrix/create")}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-3"
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Tạo ma trận mới</div>
                    <div className="text-xs text-purple-100">Tạo thủ công từ đầu</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DigitizeMatrixModal
        isOpen={isDigitizeModalOpen}
        onClose={() => setIsDigitizeModalOpen(false)}
        onSuccess={fetchMatrices}
      />
      
      <GenerateExamModal
        isOpen={isGenerateExamModalOpen}
        onClose={() => {
          setIsGenerateExamModalOpen(false)
          setSelectedMatrixForExam(null)
        }}
        matrix={selectedMatrixForExam}
        onSuccess={() => {
          toast.success("Đã sinh đề thi thành công!")
          router.push("/teacher/exams")
        }}
      />

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xóa ma trận?</h3>
            <p className="text-sm text-gray-600 mb-4">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setMatrixToDelete(null)
                }}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => matrixToDelete && handleDelete(matrixToDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function handleDuplicate(id: string) {
  // Implementation for duplicate
  console.log('Duplicate matrix:', id)
}
