"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  Clock,
  Eye,
  FileAudio,
  FileText,
  FileVideo,
  Pencil,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "react-hot-toast"

type TranscriptType = "lecture" | "meeting"
type TranscriptFilter = "all" | TranscriptType

interface TranscriptItem {
  id: string
  title: string
  type: TranscriptType
  transcript: string
  summary: string
  duration?: number
  createdAt: string
}

export default function TranscriptLibraryPage() {
  const router = useRouter()
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<TranscriptFilter>("all")
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptItem | null>(null)
  const [actionId, setActionId] = useState<string>("")

  const loadTranscripts = useCallback(async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({ limit: "200" })
      if (filterType !== "all") {
        query.set("type", filterType)
      }

      const response = await fetch(`/api/transcript/history?${query.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể tải transcript")
      }

      const apiTranscripts = Array.isArray(payload?.transcripts)
        ? payload.transcripts
        : Array.isArray(payload?.data?.transcripts)
          ? payload.data.transcripts
          : []

      setTranscripts(apiTranscripts)
    } catch (error) {
      console.error("Error loading transcripts:", error)
      toast.error("Không thể tải transcript")
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    void loadTranscripts()
  }, [loadTranscripts])

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa transcript này?")) return

    try {
      setActionId(id)
      const response = await fetch(`/api/transcript/${id}`, { method: "DELETE" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể xóa")
      }
      setTranscripts((prev) => prev.filter((t) => t.id !== id))
      if (selectedTranscript?.id === id) {
        setSelectedTranscript(null)
      }
      toast.success("Đã xóa transcript")
    } catch (error) {
      toast.error("Không thể xóa transcript")
    } finally {
      setActionId("")
    }
  }

  const handleRename = async (item: TranscriptItem) => {
    const nextTitle = prompt("Nhập tên transcript mới", item.title)?.trim()
    if (!nextTitle || nextTitle === item.title) return

    try {
      setActionId(item.id)
      const response = await fetch(`/api/transcript/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể đổi tên")
      }
      const updated = payload?.data
      setTranscripts((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, title: updated?.title || nextTitle } : t))
      )
      if (selectedTranscript?.id === item.id) {
        setSelectedTranscript((prev) =>
          prev ? { ...prev, title: updated?.title || nextTitle } : prev
        )
      }
      toast.success("Đã đổi tên transcript")
    } catch (error) {
      toast.error("Không thể đổi tên")
    } finally {
      setActionId("")
    }
  }

  const handleExport = (item: TranscriptItem, format: "txt" | "srt") => {
    const rawText = item.transcript.trim()
    if (!rawText) {
      toast.error("Transcript trống")
      return
    }

    const filenameBase = item.title.replace(/[^\w\d-]+/g, "-").replace(/-+/g, "-")
    let content = rawText
    let mimeType = "text/plain"

    if (format === "srt") {
      const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      content = lines
        .map(
          (line, index) =>
            `${index + 1}\n00:00:${String(index).padStart(2, "0")},000 --> 00:00:${String(
              index + 1
            ).padStart(2, "0")},000\n${line}\n`
        )
        .join("\n")
      mimeType = "application/x-subrip"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filenameBase || "transcript"}.${format}`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Đã export ${format.toUpperCase()}`)
  }

  const filteredTranscripts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return transcripts
    return transcripts.filter((item) => {
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.transcript.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword)
      )
    })
  }, [searchQuery, transcripts])

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Thư viện Transcript</h1>
              <p className="text-sm text-gray-600">Quản lý transcript đã tạo</p>
            </div>
          </div>
          <Button onClick={() => router.push("/teacher/transcript")} variant="outline">
            Tạo mới
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            Tất cả
          </Button>
          <Button
            variant={filterType === "lecture" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("lecture")}
          >
            Bài giảng
          </Button>
          <Button
            variant={filterType === "meeting" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("meeting")}
          >
            Cuộc họp
          </Button>
          <span className="ml-auto text-sm text-gray-500">
            Tổng: {filteredTranscripts.length} transcript
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc nội dung..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 focus:border-transparent focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-green-200 border-t-green-600" />
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : filteredTranscripts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="font-medium text-gray-600">Chưa có transcript nào</p>
                <p className="mt-2 text-sm text-gray-500">Bắt đầu ghi âm để tạo transcript mới</p>
              </CardContent>
            </Card>
          ) : (
            filteredTranscripts.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                        {item.type === "meeting" ? (
                          <FileAudio className="h-6 w-6 text-green-600" />
                        ) : (
                          <FileVideo className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate font-semibold text-gray-900">{item.title}</h3>
                          <Badge variant="default">Hoàn tất</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(item.duration)}
                          </span>
                          <span>{item.type === "meeting" ? "Cuộc họp" : "Bài giảng"}</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                        {item.summary ? (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
                        ) : (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{item.transcript}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTranscript(item)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Xem
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionId === item.id}
                        onClick={() => void handleRename(item)}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Đổi tên
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExport(item, "txt")}>
                        TXT
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExport(item, "srt")}>
                        SRT
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={actionId === item.id}
                        onClick={() => void handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedTranscript)} onOpenChange={(open) => !open && setSelectedTranscript(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTranscript?.title || "Chi tiết transcript"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-600">
            {selectedTranscript ? (
              <>
                <div className="flex flex-wrap gap-4">
                  <span>Loại: {selectedTranscript.type === "meeting" ? "Cuộc họp" : "Bài giảng"}</span>
                  <span>Thời lượng: {formatDuration(selectedTranscript.duration)}</span>
                  <span>Tạo lúc: {formatDate(selectedTranscript.createdAt)}</span>
                </div>
                {!!selectedTranscript.summary && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-800">
                    {selectedTranscript.summary}
                  </div>
                )}
                <ScrollArea className="h-[50vh] rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                    {selectedTranscript.transcript}
                  </pre>
                </ScrollArea>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
