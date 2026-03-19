"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileCode2, Plus, Loader2, Trash2, Pencil, Search, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NeumorphicInput } from "@/components/ui/neumorphic-input";
import { toast } from "react-hot-toast";

interface LatexProjectItem {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function LatexDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<LatexProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/latex-projects");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải danh sách tài liệu LaTeX");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) fetchProjects();
  }, [session?.user]);

  const filtered = projects.filter(
    (p) => !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/latex-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Tài liệu LaTeX mới" }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      toast.success("Đã tạo tài liệu mới");
      router.push(`/teacher/latex-documents/${data.id}`);
    } catch (e) {
      toast.error("Không thể tạo tài liệu");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/latex-projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      toast.success("Đã xóa tài liệu");
    } catch (e) {
      toast.error("Không thể xóa tài liệu");
    }
  };

  const stats = {
    total: projects.length,
    recent: projects.filter(p => {
      const now = new Date();
      const updated = new Date(p.updatedAt);
      return (now.getTime() - updated.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  return (
    <div className="space-y-6 p-6 neu-container">
      {/* Header with Gradient Text */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">
            Tài Liệu LaTeX
          </h1>
          <p className="text-gray-600">
            Soạn thảo và quản lý tài liệu LaTeX chuyên nghiệp
          </p>
        </div>
        <Button
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
          Tạo Tài Liệu
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FileCode2 className="w-8 h-8 text-blue-500" />
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              {stats.total}
            </div>
          </div>
          <div className="text-sm text-gray-600">Tổng tài liệu</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Edit3 className="w-8 h-8 text-green-500" />
            <div className="text-4xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              {stats.recent}
            </div>
          </div>
          <div className="text-sm text-gray-600">Cập nhật tuần này</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Pencil className="w-8 h-8 text-purple-500" />
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
              {stats.total - stats.recent}
            </div>
          </div>
          <div className="text-sm text-gray-600">Tài liệu cũ</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <input className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Tìm kiếm tài liệu LaTeX..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Tên tài liệu</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 shadow-md" />
                      <p className="text-gray-600">Đang tải...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <EmptyState
                      icon={FileCode2}
                      title="Chưa có tài liệu LaTeX"
                      description="Tạo tài liệu đầu tiên để bắt đầu soạn thảo"
                      action={
                        <button className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={handleCreate}>
                          <Plus className="w-4 h-4 mr-2" />
                          Tạo tài liệu
                        </button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((project) => (
                  <TableRow key={project.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-md-inner">
                        <FileCode2 className="w-5 h-5 text-blue-600" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{project.title}</div>
                        {project.folderId && (
                          <div className="text-xs text-gray-500">Trong thư mục</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(project.createdAt).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(project.updatedAt).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/teacher/latex-documents/${project.id}`)}
                          className="shadow-sm hover:shadow-md text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProjectToDelete(project.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="shadow-sm hover:shadow-md text-red-600"
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="neu-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-purple-600">Xóa tài liệu LaTeX?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tài liệu sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-button">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && handleDelete(projectToDelete)}
              className="neu-button bg-gradient-to-br from-red-500 to-red-600"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Empty State Component with Neumorphic Design
function EmptyState({ icon: Icon, title, description, action }: any) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-md-inner">
        <Icon className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
