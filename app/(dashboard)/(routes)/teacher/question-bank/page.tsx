"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Upload, Sparkles, FileText, Database, BookOpen, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BulkGenerateModal } from "@/components/question-bank/bulk-generate-modal"
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { toast } from "react-hot-toast"

export default function QuestionBankPage() {
  const router = useRouter()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTotalQuestions()
  }, [])

  const loadTotalQuestions = async () => {
    try {
      const response = await fetch('/api/questions?limit=1')
      const data = await response.json()
      if (data.success) {
        setTotalQuestions(data.data.pagination.total)
      }
    } catch (error) {
      console.error('Error loading total questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = async (count: number) => {
    setTotalQuestions(count)
    toast.success(`Đã thêm câu hỏi vào ngân hàng đề!`)
    setTimeout(() => {
      router.push("/teacher/question-bank/list")
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Ngân Hàng Câu Hỏi</h1>
              <p className="text-gray-600">Quản lý và sinh hàng loạt câu hỏi với AI</p>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <NeumorphicCard variant="default" size="sm" className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600">Đang tải...</span>
                  </div>
                </NeumorphicCard>
              ) : (
                <NeumorphicCard variant="gradient" size="sm" className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-xs text-gray-600">TỔNG SỐ CÂU</div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                        {totalQuestions}
                      </div>
                    </div>
                  </div>
                </NeumorphicCard>
              )}
              <NeumorphicButton
                variant="primary"
                size="lg"
                onClick={() => setGenerateOpen(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Sinh hàng loạt
              </NeumorphicButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto">
          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <NeumorphicCard
              variant="gradient"
              hover
              size="lg"
              onClick={() => setGenerateOpen(true)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg gradient-text">Sinh tự động</h3>
              </div>
              <p className="text-sm text-gray-600">
                Tạo hàng loạt câu hỏi tự động theo chủ đề và khối lớp. Tỉ lệ: 60% Nhiều lựa chọn, 20% Đúng-Sai, 10% Trả lời ngắn, 10% Tự luận
              </p>
            </NeumorphicCard>

            <NeumorphicCard variant="gradient" hover size="lg" className="opacity-75">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center neu-shadow-inner">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg gradient-text">Import từ file</h3>
              </div>
              <p className="text-sm text-gray-600">
                Nhập câu hỏi từ file Excel, Word có sẵn (Coming soon)
              </p>
            </NeumorphicCard>

            <NeumorphicCard
              variant="gradient"
              hover
              size="lg"
              onClick={() => router.push("/teacher/question-bank/add")}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center neu-shadow-inner">
                  <Plus className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg gradient-text">Thêm thủ công</h3>
              </div>
              <p className="text-sm text-gray-600">
                Tự nhập từng câu hỏi vào ngân hàng đề
              </p>
            </NeumorphicCard>
          </div>

          {/* Stats & Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stats Card */}
            <NeumorphicCard variant="gradient" size="lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">Thống kê ngân hàng</h3>
              </div>
              
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-gray-600">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-2">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                      {totalQuestions}
                    </div>
                    <span className="text-sm text-gray-600">câu hỏi</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Tổng số câu hỏi đã lưu trữ
                  </p>
                  <NeumorphicButton
                    variant="outline"
                    onClick={() => router.push("/teacher/question-bank/list")}
                    className="w-full"
                  >
                    <List className="w-4 h-4 mr-2" />
                    Xem tất cả câu hỏi
                  </NeumorphicButton>
                </>
              )}
            </NeumorphicCard>

            {/* Quick Guide */}
            <NeumorphicCard variant="gradient" size="lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center neu-shadow-inner">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg">Hướng dẫn nhanh</h3>
              </div>
              
              <ol className="space-y-3 text-sm text-gray-600">
                {[
                  "Chọn môn học và khối lớp",
                  "Nhập các chủ đề kiến thức cần sinh câu hỏi",
                  "Chỉ định số câu hỏi cho mỗi chủ đề",
                  "Click 'Sinh câu hỏi' và chờ kết quả",
                  "Xem và chỉnh sửa câu hỏi trong danh sách"
                ].map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 neu-shadow">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </NeumorphicCard>
          </div>
        </div>
      </div>

      {/* Bulk Generate Modal */}
      <BulkGenerateModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
