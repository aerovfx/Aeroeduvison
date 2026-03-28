"use client"

import { useState, useEffect } from "react"
import { Upload, FileText, CheckCircle, XCircle, Loader2, Database, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface DataFile {
  filename: string
  subject: string
  grade: string
  topic: string
  questionCount: number
}

interface ImportDataModalProps {
  onSuccess?: (count: number) => void
}

export function ImportDataModal({ onSuccess }: ImportDataModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [files, setFiles] = useState<DataFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)

  // Fetch available files when modal opens
  useEffect(() => {
    if (open) {
      fetchFiles()
    }
  }, [open])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/questions/import-from-data")
      const data = await response.json()

      if (response.ok && data.success) {
        setFiles(data.data.files || [])
      } else {
        toast.error("Không thể tải danh sách file")
      }
    } catch (error: any) {
      console.error("Fetch error:", error)
      toast.error("Lỗi: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFile = (filename: string) => {
    setSelectedFiles(prev =>
      prev.includes(filename)
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    )
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(files.map(f => f.filename))
    }
  }

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 file để import")
      return
    }

    try {
      setImporting(true)
      setProgress(0)

      // Simulate progress (since we don't have real-time updates)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch("/api/questions/import-from-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: selectedFiles,
          batchSize: 5,
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (response.ok && data.success) {
        const { summary } = data.data
        setImportedCount(summary.totalQuestions)

        toast.success(
          `Đã import ${summary.success} file với ${summary.totalQuestions} câu hỏi${
            summary.failed > 0 ? ` (${summary.failed} lỗi)` : ""
          }`
        )

        onSuccess?.(summary.totalQuestions)

        // Reset selection
        setSelectedFiles([])

        // Close after delay
        setTimeout(() => {
          setOpen(false)
        }, 2000)
      } else {
        toast.error(data.error || "Import thất bại")
      }
    } catch (error: any) {
      console.error("Import error:", error)
      toast.error("Lỗi: " + error.message)
    } finally {
      setImporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const totalQuestions = files
    .filter(f => selectedFiles.includes(f.filename))
    .reduce((sum, f) => sum + f.questionCount, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Database className="h-4 w-4" />
          Import từ Data
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Import câu hỏi từ thư mục /data
          </DialogTitle>
          <DialogDescription>
            Chọn các file JSON chứa câu hỏi trắc nghiệm để import vào ngân hàng đề
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Đang tải danh sách file...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Không tìm thấy file nào</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Đã chọn: <span className="text-primary">{selectedFiles.length}</span> / {files.length} file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tổng số câu hỏi: <span className="font-medium">{totalQuestions}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {selectedFiles.length === files.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </Button>
                </div>
              </div>

              {/* File List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {files.map((file) => (
                  <Card
                    key={file.filename}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedFiles.includes(file.filename)
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => handleToggleFile(file.filename)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedFiles.includes(file.filename)}
                          onCheckedChange={() => handleToggleFile(file.filename)}
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm truncate">{file.filename}</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {file.subject}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {file.grade}
                            </Badge>
                            <Badge variant="outline" className="text-xs max-w-[200px] truncate">
                              {file.topic}
                            </Badge>
                            {file.questionCount > 0 ? (
                              <Badge className="text-xs bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {file.questionCount} câu
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                0 câu
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Progress Bar */}
              {importing && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Đang import...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Success Message */}
              {importedCount > 0 && !importing && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      Đã import thành công {importedCount} câu hỏi vào ngân hàng đề!
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Các câu hỏi sẽ được đánh dấu là "Đã duyệt"</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Hủy
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedFiles.length === 0}
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {selectedFiles.length} file ({totalQuestions} câu)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
