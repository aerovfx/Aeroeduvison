"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText, FileCode2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/teacher/PageHeader"
import { toast } from "react-hot-toast"

interface MatrixItem {
  id: string
  name: string
  grade: string
  examType: string
  totalQuestions: number
  status: string
  createdAt: string
}

export default function CreateExamPage() {
  const router = useRouter()
  const [matrices, setMatrices] = useState<MatrixItem[]>([])
  const [loadingMatrices, setLoadingMatrices] = useState(true)
  const [matrixId, setMatrixId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [generating, setGenerating] = useState(false)
  const [exportingToLatex, setExportingToLatex] = useState(false)

  useEffect(() => {
    fetchMatrices()
  }, [])

  useEffect(() => {
    if (matrixId && matrices.length > 0) {
      const m = matrices.find((x) => x.id === matrixId)
      if (m) {
        if (!title || title === "" || title.endsWith(" - Đề thi")) {
          setTitle(`${m.name} - Đề thi`)
        }
        if (!description) {
          setDescription(`Đề thi được tạo từ ma trận: ${m.name}`)
        }
      }
    }
  }, [matrixId, matrices])

  const fetchMatrices = async () => {
    try {
      setLoadingMatrices(true)
      const res = await fetch("/api/exam-matrices")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Không thể tải danh sách ma trận")
      }
      const data = await res.json()
      setMatrices(data.matrices ?? [])
      if (data.matrices?.length === 1) {
        setMatrixId(data.matrices[0].id)
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi tải ma trận")
    } finally {
      setLoadingMatrices(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matrixId) {
      toast.error("Vui lòng chọn ma trận đề")
      return
    }
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên đề thi")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/exams/generate-from-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrixId,
          title: title.trim(),
          description: description.trim() || undefined,
          useAIForMissing: false,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const msg = data?.error?.message ?? data?.error ?? "Không thể tạo đề thi"
        throw new Error(typeof msg === "string" ? msg : "Không thể tạo đề thi")
      }

      if (data.success && data.data?.examId) {
        toast.success(data.data.message || "Đã tạo đề thi thành công")
        router.push("/teacher/exams")
        return
      }
      toast.success("Đã tạo đề thi")
      router.push("/teacher/exams")
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo đề thi")
    } finally {
      setGenerating(false)
    }
  }

  const selectedMatrix = matrices.find((m) => m.id === matrixId)

  const handleExportMatrixToLatex = async () => {
    if (!matrixId) return
    setExportingToLatex(true)
    try {
      const res = await fetch("/api/latex-projects/export-from-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrixId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Xuất thất bại")
      }
      const data = await res.json()
      toast.success("Đã tạo tài liệu LaTeX. Đang mở...")
      router.push(`/teacher/latex-documents/${data.id}`)
    } catch (e: any) {
      toast.error(e.message || "Không thể xuất sang LaTeX")
    } finally {
      setExportingToLatex(false)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50 min-h-screen">
      <PageHeader
        title="Tạo đề thi mới"
        description="Chọn ma trận đề và tạo đề thi tự động từ ngân hàng câu hỏi."
        icon={<FileText className="h-6 w-6" />}
        badge="Ma trận"
      />

      <div className="max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => router.push("/teacher/exams")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại danh sách đề thi
        </Button>

        {loadingMatrices ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải ma trận...
          </div>
        ) : matrices.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Bạn chưa có ma trận đề nào. Tạo ma trận trước rồi quay lại tạo đề thi.
            </p>
            <Button onClick={() => router.push("/teacher/exam-matrix")}>
              Đến Ma trận đề
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="matrix">Ma trận đề *</Label>
              <Select value={matrixId} onValueChange={setMatrixId} required>
                <SelectTrigger id="matrix">
                  <SelectValue placeholder="Chọn ma trận đề" />
                </SelectTrigger>
                <SelectContent>
                  {matrices.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.grade}, {m.examType} ({m.totalQuestions} câu)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMatrix && (
                <p className="text-sm text-muted-foreground">
                  {selectedMatrix.grade} · {selectedMatrix.examType} · {selectedMatrix.totalQuestions} câu
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tên đề thi *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Đề kiểm tra 1 tiết - Học kỳ 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả (tùy chọn)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn cho đề thi"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={generating} className="gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo đề...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tạo đề thi từ ma trận
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/teacher/exams")}
              >
                Hủy
              </Button>
            </div>

            {/* Soạn LaTeX */}
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3 pt-6 mt-6">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileCode2 className="h-4 w-4" />
                Soạn LaTeX
              </p>
              <p className="text-sm text-muted-foreground">
                Soạn và biên dịch tài liệu LaTeX, hoặc xuất nội dung từ ma trận đề sang LaTeX.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/teacher/latex-documents")}
                  className="gap-2"
                >
                  <FileCode2 className="h-4 w-4" />
                  Mở Soạn LaTeX
                </Button>
                {matrixId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportMatrixToLatex}
                    disabled={exportingToLatex}
                    className="gap-2"
                  >
                    {exportingToLatex ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileCode2 className="h-4 w-4" />
                    )}
                    Xuất ma trận này sang LaTeX
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
