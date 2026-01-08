"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Upload, 
  Folder, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  File,
  Eye,
  Edit,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DocumentUploadModal } from "@/components/document-digitization/upload-modal"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

type DocumentStatus = "Tất cả" | "Hàng đợi" | "Đang xử lý" | "Hoàn tất" | "Lỗi"

interface Document {
  id: string
  name: string
  displayName: string
  type: string
  status: string
  createdAt: string
  executionTime?: number
  folderPath?: string
}

export default function DocumentDigitizationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>("Tất cả")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState<string[]>([])

  // Fetch documents
  useEffect(() => {
    fetchDocuments()
  }, [selectedStatus, currentPath])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") {
        params.append("status", selectedStatus)
      }
      if (currentPath.length > 0) {
        params.append("path", currentPath.join("/"))
      }

      const response = await fetch(`/api/documents?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch documents")
      
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast.error("Không thể tải danh sách tài liệu")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status: DocumentStatus) => {
    setSelectedStatus(status)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const filteredDocuments = documents.filter((doc) => {
    if (searchQuery) {
      return doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             doc.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const handleSelectDocument = (id: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedDocuments(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete document")
      
      toast.success("Đã xóa tài liệu")
      fetchDocuments()
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error("Không thể xóa tài liệu")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Hoàn tất":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "Đang xử lý":
        return <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
      case "Lỗi":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "Hàng đợi":
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      "Hoàn tất": "bg-green-100 text-green-800",
      "Đang xử lý": "bg-orange-100 text-orange-800",
      "Lỗi": "bg-red-100 text-red-800",
      "Hàng đợi": "bg-gray-100 text-gray-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  const getTypeIcon = (type: string) => {
    if (type === "THƯ MỤC") {
      return <Folder className="h-5 w-5 text-blue-600" />
    } else if (type === "VĂN BẢN" || type === "PDF") {
      return <FileText className="h-5 w-5 text-red-600" />
    } else if (type === "IMAGE" || type.includes("image")) {
      return <ImageIcon className="h-5 w-5 text-purple-600" />
    }
    return <File className="h-5 w-5 text-gray-600" />
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    const dateStr = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    return `${time} ${dateStr}`
  }

  const formatExecutionTime = (seconds?: number) => {
    if (!seconds) return "-"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Số hoá tài liệu</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Quản lý và số hoá tài liệu với AI
              </p>
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs value={selectedStatus} onValueChange={(v) => handleStatusChange(v as DocumentStatus)}>
            <TabsList className="grid w-full max-w-md grid-cols-5">
              <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
              <TabsTrigger value="Hàng đợi">Hàng đợi</TabsTrigger>
              <TabsTrigger value="Đang xử lý">Đang xử lý</TabsTrigger>
              <TabsTrigger value="Hoàn tất">Hoàn tất</TabsTrigger>
              <TabsTrigger value="Lỗi">Lỗi</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Breadcrumbs */}
      {currentPath.length > 0 && (
        <div className="border-b bg-gray-50 px-6 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm">
            <button
              onClick={() => setCurrentPath([])}
              className="hover:text-primary"
            >
              🏠
            </button>
            {currentPath.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <span>/</span>
                <button
                  onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                  className="hover:text-primary"
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm đề thi, câu hỏi, lớp..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {/* TODO: Folder action */}}>
              <Folder className="h-4 w-4 mr-2" />
              Thư mục
            </Button>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Số hoá
            </Button>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Chưa có tài liệu nào</p>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Tải tài liệu lên
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="flex items-center gap-2">
                    TÊN TÀI LIỆU
                    <span className="text-muted-foreground">↓</span>
                  </TableHead>
                  <TableHead>LOẠI</TableHead>
                  <TableHead className="flex items-center gap-2">
                    THỜI GIAN
                    <span className="text-muted-foreground">↓</span>
                  </TableHead>
                  <TableHead>THỜI GIAN THỰC HIỆN</TableHead>
                  <TableHead>TRẠNG THÁI</TableHead>
                  <TableHead>HÀNH ĐỘNG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedDocuments.has(doc.id)}
                        onCheckedChange={() => handleSelectDocument(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(doc.type)}
                        <div>
                          <div className="font-medium">{doc.displayName || doc.name}</div>
                          {doc.type === "THƯ MỤC" && (
                            <div className="text-xs text-muted-foreground">THƯ MỤC</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(doc.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatExecutionTime(doc.executionTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        <Badge className={cn("text-xs", getStatusBadge(doc.status))}>
                          {doc.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.status === "Hoàn tất" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/teacher/document-digitization/${doc.id}/review`)}
                              title="Xem"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {/* TODO: Download */}}
                              title="Tải bản số hoá"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {doc.status !== "Đang xử lý" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {/* TODO: Edit */}}
                              title="Sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDocumentToDelete(doc.id)
                                setDeleteDialogOpen(true)
                              }}
                              title="Xóa"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          fetchDocuments()
          setIsUploadModalOpen(false)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDelete(documentToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
