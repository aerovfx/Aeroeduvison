"use client"

import { useState } from "react"
import { Loader2, Sparkles, Plus, Trash2, CheckCircle2, Link, FileText, Youtube, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-hot-toast"

interface Source {
  id: string
  type: 'youtube' | 'website' | 'text' | 'pdf'
  url: string
  content?: string
}

interface BulkGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
}

export function BulkGenerateModal({ isOpen, onClose, onSuccess }: BulkGenerateModalProps) {
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("Toán")
  const [grade, setGrade] = useState("Khối 6")
  const [sources, setSources] = useState<Source[]>([])
  const [currentSource, setCurrentSource] = useState<Source | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const addSource = () => {
    if (!currentSource?.url && !currentSource?.content) {
      toast.error("Vui lòng nhập URL hoặc nội dung")
      return
    }
    setSources([...sources, { ...currentSource, id: `source-${Date.now()}` } as Source])
    setCurrentSource(null)
  }

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id))
  }

  const extractContent = async () => {
    if (!currentSource?.url || !currentSource?.type) {
      toast.error("Vui lòng chọn loại nguồn và nhập URL")
      return
    }

    setExtracting(true)
    try {
      const endpoint = currentSource.type === 'youtube' ? '/api/extract/youtube' : '/api/extract/website'
      const body = currentSource.type === 'youtube' 
        ? { videoId: currentSource.url }
        : { url: currentSource.url }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setCurrentSource({ ...currentSource, content: data.data.transcript || data.data.content })
        toast.success("Đã trích xuất nội dung!")
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể trích xuất")
    } finally {
      setExtracting(false)
    }
  }

  const handleGenerate = async () => {
    if (sources.length === 0) {
      toast.error("Vui lòng thêm ít nhất một nguồn")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/questions/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          grade,
          sources: sources.map(s => ({ type: s.type, content: s.content || s.url })),
          useAI: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Không thể sinh câu hỏi")
      
      setResult(data.data)
      toast.success(`Đã thêm ${data.data.inserted} câu hỏi! (Tổng: ${data.data.totalInBank})`)
      onSuccess?.(data.data.totalInBank)
    } catch (error: any) {
      toast.error(error.message || "Không thể sinh câu hỏi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sinh câu hỏi từ nhiều nguồn
          </DialogTitle>
          <DialogDescription>
            Trích xuất nội dung từ YouTube, Website, PDF, DOC và sinh câu hỏi tự động
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Subject & Grade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Môn học</Label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Toán">Toán</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Vật lý">Vật lý</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Sinh học">Sinh học</option>
                <option value="Lịch sử">Lịch sử</option>
                <option value="Địa lý">Địa lý</option>
              </select>
            </div>
            <div>
              <Label>Khối lớp</Label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={`Khối ${num}`}>Khối {num}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Selection */}
          <div>
            <Label>Nguồn nội dung</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Button
                variant={currentSource?.type === 'youtube' ? 'default' : 'outline'}
                onClick={() => setCurrentSource({ type: 'youtube', url: '', content: '' })}
                className="gap-2"
              >
                <Youtube className="h-4 w-4" /> YouTube
              </Button>
              <Button
                variant={currentSource?.type === 'website' ? 'default' : 'outline'}
                onClick={() => setCurrentSource({ type: 'website', url: '', content: '' })}
                className="gap-2"
              >
                <Globe className="h-4 w-4" /> Website
              </Button>
              <Button
                variant={currentSource?.type === 'text' ? 'default' : 'outline'}
                onClick={() => setCurrentSource({ type: 'text', url: '', content: '' })}
                className="gap-2"
              >
                <FileText className="h-4 w-4" /> Văn bản
              </Button>
              <Button
                variant={currentSource?.type === 'pdf' ? 'default' : 'outline'}
                onClick={() => setCurrentSource({ type: 'pdf', url: '', content: '' })}
                className="gap-2"
                disabled
              >
                <FileText className="h-4 w-4" /> PDF (Soon)
              </Button>
            </div>
          </div>

          {/* Source Input */}
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
                    onChange={(e) => setCurrentSource({ ...currentSource, content: e.target.value })}
                    className="min-h-[150px]"
                  />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={currentSource.type === 'youtube' ? "https://youtube.com/watch?v=..." : "https://..."}
                      value={currentSource.url}
                      onChange={(e) => setCurrentSource({ ...currentSource, url: e.target.value })}
                      className="flex-1"
                    />
                    <Button onClick={extractContent} disabled={extracting || !currentSource.url}>
                      {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                      {extracting ? 'Đang trích xuất...' : 'Trích xuất'}
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

          {/* Sources List */}
          {sources.length > 0 && (
            <div>
              <Label>Nguồn đã thêm ({sources.length})</Label>
              <div className="space-y-2 mt-2">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {source.type === 'youtube' && <Youtube className="h-5 w-5 text-red-600" />}
                      {source.type === 'website' && <Globe className="h-5 w-5 text-blue-600" />}
                      {source.type === 'text' && <FileText className="h-5 w-5 text-green-600" />}
                      <div>
                        <div className="font-medium text-sm">
                          {source.type === 'youtube' && 'YouTube'}
                          {source.type === 'website' && 'Website'}
                          {source.type === 'text' && 'Văn bản'}
                        </div>
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

          {/* Generate Button */}
          {result ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Đã thêm {result.inserted} câu hỏi</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-green-700 font-medium">Lần này:</div>
                    <div className="text-green-600 ml-4">{result.generated} câu đã sinh</div>
                    <div className="text-green-600 ml-4">{result.inserted} câu đã thêm</div>
                  </div>
                  <div>
                    <div className="text-green-700 font-medium">Tổng ngân hàng:</div>
                    <div className="text-green-600 ml-4 font-bold text-lg">{result.totalInBank} câu</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={handleGenerate} disabled={loading || sources.length === 0} className="w-full" size="lg">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang sinh...</> : <><Sparkles className="h-4 w-4 mr-2" /> Sinh câu hỏi</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
