"use client"

import { useState } from "react"
import { Loader2, Sparkles, Plus, Trash2, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "react-hot-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AutoGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (matrixData: any) => void
  defaultValues?: {
    name: string
    grade: string
    examType: string
    duration: number
    totalScore: number
    totalQuestions: number
  }
}

interface MatrixVariant {
  variantIndex: number
  matrix: {
    topics: { order: number; topic: string; content: string; distributions: any[]; percentageScore: number }[]
    totalQuestions: number
    totalScore: number
    cognitiveLevelDistribution: { level: string; percentage: number; questionCount: number }[]
  }
  validation: { valid: boolean; actualRatios: Record<string, number>; deviations: Record<string, number> }
  isCompliant: boolean
}

export function AutoGenerateModal({ isOpen, onClose, onSuccess, defaultValues }: AutoGenerateModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: defaultValues?.name || "",
    grade: defaultValues?.grade || "Khối 6",
    examType: defaultValues?.examType || "Kiểm tra giữa kỳ",
    duration: defaultValues?.duration || 45,
    totalScore: defaultValues?.totalScore || 10,
    totalQuestions: defaultValues?.totalQuestions || 30,
  })
  const [topics, setTopics] = useState<{ id: string; name: string; content: string }[]>([{ id: "topic-1", name: "", content: "" }])
  const [variants, setVariants] = useState<MatrixVariant[]>([])

  const handleAddTopic = () => setTopics([...topics, { id: `topic-${Date.now()}`, name: "", content: "" }])
  const handleRemoveTopic = (id: string) => {
    if (topics.length === 1) { toast.error("Cần ít nhất một đơn vị kiến thức"); return }
    setTopics(topics.filter((t) => t.id !== id))
  }
  const handleUpdateTopic = (id: string, field: string, value: string) => {
    setTopics(topics.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const handleGenerate = async () => {
    if (!formData.name.trim()) { toast.error("Vui lòng nhập tên ma trận"); return }
    if (topics.some((t) => !t.name.trim())) { toast.error("Vui lòng nhập tên cho tất cả các đơn vị kiến thức"); return }
    setLoading(true); setVariants([]); setSelectedVariant(null)
    try {
      const response = await fetch("/api/exam-matrices/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, topics: topics.map((t) => ({ name: t.name, content: t.content })), variantCount: 3 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Không thể tạo ma trận")
      setVariants(data.data.variants)
      const compliantIndex = data.data.variants.findIndex((v: MatrixVariant) => v.isCompliant)
      if (compliantIndex >= 0) setSelectedVariant(compliantIndex)
      toast.success(`Đã tạo ${data.data.variants.length} biến thể ma trận`)
    } catch (error: any) { toast.error(error.message || "Không thể tạo ma trận") } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (selectedVariant === null) { toast.error("Vui lòng chọn một biến thể ma trận"); return }
    setSaving(true)
    try {
      const response = await fetch("/api/exam-matrices/auto-generate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, variantIndex: selectedVariant, topics: topics.map((t) => ({ name: t.name, content: t.content })) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Không thể lưu ma trận")
      toast.success("Đã lưu ma trận thành công")
      onSuccess(data.data.matrix); onClose()
    } catch (error: any) { toast.error(error.message || "Không thể lưu ma trận") } finally { setSaving(false) }
  }

  const handleRegenerate = () => { setVariants([]); setSelectedVariant(null); handleGenerate() }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Tạo ma trận tự động</DialogTitle>
          <DialogDescription>Nhập các đơn vị kiến thức, AI sẽ tự động tạo ma trận với tỉ lệ 40% Nhận biết, 30% Thông hiểu, 30% Vận dụng</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-2 block">Tên ma trận *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ví dụ: Ma trận Toán 6 - Học kỳ 1" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Khối *</label>
              <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (<option key={num} value={`Khối ${num}`}>Khối {num}</option>))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Loại kiểm tra *</label>
              <select value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Kiểm tra 15 phút">Kiểm tra 15 phút</option>
                <option value="Kiểm tra 1 tiết">Kiểm tra 1 tiết</option>
                <option value="Kiểm tra giữa kỳ">Kiểm tra giữa kỳ</option>
                <option value="Thi học kỳ">Thi học kỳ</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Thời gian (phút)</label>
              <Input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 45 })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tổng điểm</label>
              <Input type="number" step="0.1" value={formData.totalScore} onChange={(e) => setFormData({ ...formData, totalScore: parseFloat(e.target.value) || 10 })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Số câu hỏi</label>
              <Input type="number" value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) || 30 })} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Đơn vị kiến thức *</label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTopic}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {topics.map((topic, index) => (
                <div key={topic.id} className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                  <Input value={topic.name} onChange={(e) => handleUpdateTopic(topic.id, "name", e.target.value)} placeholder="Tên đơn vị kiến thức" className="flex-1" />
                  <Input value={topic.content} onChange={(e) => handleUpdateTopic(topic.id, "content", e.target.value)} placeholder="Nội dung chi tiết" className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTopic(topic.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          {variants.length === 0 ? (
            <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang tạo ma trận...</>) : (<><Sparkles className="h-4 w-4 mr-2" />Tạo ma trận tự động</>)}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Chọn ma trận phù hợp ({variants.length} biến thể)</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleRegenerate}><RotateCcw className="h-4 w-4 mr-1" />Tạo lại</Button>
              </div>
              <div className="grid gap-4">
                {variants.map((variant, index) => (
                  <Card key={index} className={`cursor-pointer transition-all ${selectedVariant === index ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"}`} onClick={() => setSelectedVariant(index)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Biến thể {index + 1}</span>
                          {variant.isCompliant ? (<Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Đạt 40-30-30</Badge>) : (<Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertCircle className="h-3 w-3 mr-1" />Lệch tỉ lệ</Badge>)}
                        </div>
                        <div className="text-sm text-muted-foreground">{variant.matrix.totalQuestions} câu • {variant.matrix.totalScore} điểm</div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        {variant.matrix.cognitiveLevelDistribution.map((dist) => (
                          <div key={dist.level} className="text-center p-2 bg-muted rounded">
                            <div className="text-xs text-muted-foreground">{dist.level}</div>
                            <div className="text-lg font-bold">{dist.percentage}%</div>
                            <div className="text-xs text-muted-foreground">{dist.questionCount} câu</div>
                          </div>
                        ))}
                      </div>
                      <div className="mb-3">
                        <div className="text-xs font-semibold mb-2 text-muted-foreground">CHI TIẾT DẠNG CÂU HỎI</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            const questionTypeCounts: Record<string, number> = {}
                            variant.matrix.topics.forEach((topic) => {
                              topic.distributions.forEach((dist) => {
                                questionTypeCounts[dist.questionType] = (questionTypeCounts[dist.questionType] || 0) + dist.count
                              })
                            })
                            const typeLabels: Record<string, string> = {
                              "TNKQ_Nhiều_lựa_chọn": "Nhiều lựa chọn",
                              "TNKQ_Đúng_Sai": "Đúng - Sai",
                              "TNKQ_Trả_lời_ngắn": "Trả lời ngắn",
                              "Tự_luận": "Tự luận",
                            }
                            return Object.entries(questionTypeCounts).map(([type, count]) => (
                              <div key={type} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                <span className="text-xs">{typeLabels[type] || type}</span>
                                <Badge variant="secondary" className="text-xs">{count} câu</Badge>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">TT</TableHead>
                              <TableHead>Chủ đề</TableHead>
                              <TableHead className="text-center">Nhiều lựa chọn</TableHead>
                              <TableHead className="text-center">Đúng - Sai</TableHead>
                              <TableHead className="text-center">Trả lời ngắn</TableHead>
                              <TableHead className="text-center">Tự luận</TableHead>
                              <TableHead className="text-right">% Điểm</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variant.matrix.topics.map((topic) => {
                              const mcCount = topic.distributions.filter(d => d.questionType === "TNKQ_Nhiều_lựa_chọn").reduce((s, d) => s + d.count, 0)
                              const dsCount = topic.distributions.filter(d => d.questionType === "TNKQ_Đúng_Sai").reduce((s, d) => s + d.count, 0)
                              const rnCount = topic.distributions.filter(d => d.questionType === "TNKQ_Trả_lời_ngắn").reduce((s, d) => s + d.count, 0)
                              const tlCount = topic.distributions.filter(d => d.questionType === "Tự_luận").reduce((s, d) => s + d.count, 0)
                              return (
                                <TableRow key={topic.order}>
                                  <TableCell className="text-center">{topic.order}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{topic.topic}</div>
                                    {topic.content && (
                                      <div className="text-xs text-muted-foreground truncate">{topic.content}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-xs">{mcCount}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">{dsCount}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-xs">{rnCount}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-xs">{tlCount}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{topic.percentageScore}%</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {!variant.isCompliant && (<div className="mt-3 text-xs text-muted-foreground">Sai lệch: Nhận biết {variant.validation.deviations["Biết"]}%, Thông hiểu {variant.validation.deviations["Hiểu"]}%, Vận dụng {variant.validation.deviations["Vận dụng"]}%</div>)}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setVariants([])}>Quay lại</Button>
                <Button onClick={handleSave} disabled={saving || selectedVariant === null}>
                  {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</>) : ("Lưu ma trận")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
