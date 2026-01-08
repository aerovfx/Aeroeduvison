"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { X, Download, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

interface Document {
  id: string
  name: string
  displayName: string
  originalUrl: string
  digitizedUrl?: string
  status: string
  ocrText?: string
  createdAt: string
  processedAt?: string
}

export default function DocumentReviewPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchDocument()
  }, [documentId])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${documentId}`)
      if (!response.ok) throw new Error("Failed to fetch document")
      
      const data = await response.json()
      setDocument(data.document)
      
      // TODO: Calculate total pages from metadata
      setTotalPages(data.document.metadata?.pages || 1)
    } catch (error) {
      console.error("Error fetching document:", error)
      toast.error("Không thể tải tài liệu")
      router.push("/teacher/document-digitization")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (document?.digitizedUrl) {
      window.open(document.digitizedUrl, "_blank")
    } else {
      toast.error("Bản số hoá chưa sẵn sàng")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{document.displayName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(document.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                document.status === "Hoàn tất"
                  ? "bg-green-100 text-green-800"
                  : document.status === "Đang xử lý"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {document.status}
            </Badge>
            {document.status === "Hoàn tất" && (
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Tải bản số hoá
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.back()}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Side by Side Comparison */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 p-4">
        {/* Left Panel - Original */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
          <div className="border-b px-4 py-2 bg-gray-50">
            <h2 className="font-semibold">Bản gốc</h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {document.originalUrl ? (
              <div className="space-y-4">
                {document.mimeType === "application/pdf" ? (
                  <iframe
                    src={document.originalUrl}
                    className="w-full h-full min-h-[600px] border rounded"
                    title="Original Document"
                  />
                ) : (
                  <img
                    src={document.originalUrl}
                    alt="Original Document"
                    className="w-full h-auto rounded"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Không có bản gốc
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="border-t px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Trang {currentPage} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Digitized */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
          <div className="border-b px-4 py-2 bg-gray-50">
            <h2 className="font-semibold">Bản số hoá</h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {document.status === "Hoàn tất" && document.digitizedUrl ? (
              <div className="space-y-4">
                {document.mimeType === "application/pdf" ? (
                  <iframe
                    src={document.digitizedUrl}
                    className="w-full h-full min-h-[600px] border rounded"
                    title="Digitized Document"
                  />
                ) : (
                  <img
                    src={document.digitizedUrl}
                    alt="Digitized Document"
                    className="w-full h-auto rounded"
                  />
                )}
                {document.ocrText && (
                  <div className="mt-4 p-4 bg-gray-50 rounded border">
                    <h3 className="font-semibold mb-2">Text đã trích xuất:</h3>
                    <p className="text-sm whitespace-pre-wrap">{document.ocrText}</p>
                  </div>
                )}
              </div>
            ) : document.status === "Đang xử lý" ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                <p>Đang xử lý...</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Bản số hoá chưa sẵn sàng
              </div>
            )}
          </div>
          {totalPages > 1 && document.status === "Hoàn tất" && (
            <div className="border-t px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Trang {currentPage} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {document.processedAt
            ? `Hoàn tất: ${new Date(document.processedAt).toLocaleString("vi-VN")}`
            : `Tải lên: ${new Date(document.createdAt).toLocaleString("vi-VN")}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Đóng
          </Button>
          {document.status === "Hoàn tất" && (
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Tải bản số hoá
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
