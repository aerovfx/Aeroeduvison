"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Upload, Folder, Search, FileText, ImageIcon, File, Eye, Edit,
  Trash2, Download, Loader2, CheckCircle2, XCircle, Clock, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DocumentUploadModal } from "@/components/document-digitization/upload-modal"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"
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

const statusColors: Record<string, string> = {
  "Hàng đợi": "bg-gray-100 text-gray-800",
  "Đang xử lý": "bg-blue-100 text-blue-800",
  "Hoàn tất": "bg-green-100 text-green-800",
  "Lỗi": "bg-red-100 text-red-800",
}

const statusIcons: Record<string, any> = {
  "Hàng đợi": Clock,
  "Đang xử lý": Loader2,
  "Hoàn tất": CheckCircle2,
  "Lỗi": XCircle,
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

  useEffect(() => {
    fetchDocuments()
  }, [selectedStatus, currentPath])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") params.append("status", selectedStatus)
      if (currentPath.length > 0) params.append("path", currentPath.join("/"))

      const response = await fetch(`/api/documents?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch documents")
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      toast.error("Không thể tải danh sách tài liệu")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!documentToDelete) return
    try {
      const response = await fetch(`/api/documents/${documentToDelete}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete")
      toast.success("Đã xóa tài liệu")
      fetchDocuments()
    } catch (error) {
      toast.error("Không thể xóa tài liệu")
    } finally {
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status] || Clock
    return <Icon className={`h-4 w-4 ${status === "Đang xử lý" ? "animate-spin" : ""}`} />
  }

  const filteredDocuments = documents.filter(doc =>
    doc.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: documents.length,
    queue: documents.filter(d => d.status === "Hàng đợi").length,
    processing: documents.filter(d => d.status === "Đang xử lý").length,
    completed: documents.filter(d => d.status === "Hoàn tất").length,
    error: documents.filter(d => d.status === "Lỗi").length,
  }

  return (
    <div className="space-y-6 p-6 neu-container">
      {/* Header with Gradient Text */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">
            Số Hóa Tài Liệu
          </h1>
          <p className="text-gray-600">
            Quản lý và số hóa tài liệu học tập với AI
          </p>
        </div>
        <Button
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload className="w-5 h-5 mr-2" />
          Tải Lên Tài Liệu
        </Button>
      </div>

      {/* Stats Cards with Neumorphic Design */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[
          { label: "Tổng cộng", value: stats.total, color: "from-blue-500 to-blue-600" },
          { label: "Hàng đợi", value: stats.queue, color: "from-gray-500 to-gray-600" },
          { label: "Đang xử lý", value: stats.processing, color: "from-yellow-500 to-yellow-600" },
          { label: "Hoàn tất", value: stats.completed, color: "from-green-500 to-green-600" },
          { label: "Lỗi", value: stats.error, color: "from-red-500 to-red-600" },
        ].map((stat) => (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center" key={stat.label}>
            <div className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as DocumentStatus)}>
            <TabsList className="shadow-md">
              <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
              <TabsTrigger value="Hàng đợi">Hàng đợi</TabsTrigger>
              <TabsTrigger value="Đang xử lý">Đang xử lý</TabsTrigger>
              <TabsTrigger value="Hoàn tất">Hoàn tất</TabsTrigger>
              <TabsTrigger value="Lỗi">Lỗi</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedDocuments(checked ? new Set(filteredDocuments.map(d => d.id)) : new Set())
                    }}
                  />
                </TableHead>
                <TableHead>Tên tài liệu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                    <p className="text-gray-600 mt-2">Đang tải...</p>
                  </TableCell>
                </TableRow>
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <EmptyState
                      icon={FileText}
                      title="Không có tài liệu"
                      description="Tải lên tài liệu đầu tiên của bạn"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selectedDocuments.has(doc.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedDocuments)
                          if (checked) newSet.add(doc.id)
                          else newSet.delete(doc.id)
                          setSelectedDocuments(newSet)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {doc.type.includes("image") ? (
                          <ImageIcon className="w-5 h-5 text-purple-500" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-500" />
                        )}
                        <div>
                          <div className="font-medium">{doc.displayName}</div>
                          {doc.folderPath && (
                            <div className="text-xs text-gray-500">{doc.folderPath}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm">
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("shadow-md", statusColors[doc.status])}>
                        {getStatusIcon(doc.status)}
                        <span className="ml-1">{doc.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {doc.executionTime ? `${doc.executionTime}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="shadow-sm hover:shadow-md">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="shadow-sm hover:shadow-md">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDocumentToDelete(doc.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-600 shadow-sm hover:shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={fetchDocuments}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="neu-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-purple-600">Xóa tài liệu?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tài liệu sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-button">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="neu-button bg-gradient-to-br from-red-500 to-red-600"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Empty State Component with Neumorphic Design
function EmptyState({ icon: Icon, title, description }: any) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md-inner">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  )
}
