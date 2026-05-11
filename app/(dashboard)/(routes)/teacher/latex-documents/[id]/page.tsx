"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, FileCode2, Play, Download, Printer, History, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LatexEditor } from "@/components/latex-editor";
import { LATEX_TEMPLATES, getTemplateById } from "@/lib/latex-templates";
import { toast } from "react-hot-toast";

const AUTO_SAVE_DEBOUNCE_MS = 2500;

export default function LatexDocumentEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState<{
    status: number;
    code: string;
    message: string;
    log: string;
  } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [versions, setVersions] = useState<{ id: string; titleSnapshot: string | null; trigger: string; createdAt: string }[]>([]);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<{ userId: string; email: string | null; name: string | null; role: string }[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"VIEW" | "EDIT">("VIEW");
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPdfUrlRef = useRef<string | null>(null);
  const compileInFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (prevPdfUrlRef.current) URL.revokeObjectURL(prevPdfUrlRef.current);
    };
  }, []);

  const saveContent = useCallback(
    async (newContent: string, newTitle?: string) => {
      if (!id) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/latex-projects/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mainContent: newContent,
            ...(newTitle !== undefined && { title: newTitle }),
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        toast.success("Đã lưu");
      } catch {
        toast.error("Không thể lưu");
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!id || !session?.user) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/latex-projects/${id}`)
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setTitle(data.title ?? "");
        setContent(data.mainContent ?? "");
        setIsOwner(data.isOwner !== false);
      })
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, session?.user]);

  const fetchVersions = useCallback(() => {
    if (!id) return;
    fetch(`/api/latex-projects/${id}/versions`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data?.versions && setVersions(data.versions))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || loading) return;
    fetchVersions();
  }, [id, loading, fetchVersions]);

  const fetchCollaborators = useCallback(() => {
    if (!id) return;
    fetch(`/api/latex-projects/${id}/collaborators`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.collaborators) setCollaborators(data.collaborators);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (shareOpen && id) fetchCollaborators();
  }, [shareOpen, id, fetchCollaborators]);

  useEffect(() => {
    if (!id || loading) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      saveContent(content);
    }, AUTO_SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, id, loading, saveContent]);

  const handleSaveClick = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    saveContent(content);
  };

  const handleTemplateChange = (templateId: string) => {
    const t = getTemplateById(templateId);
    if (t) {
      setContent(t.body);
      toast.success(`Đã áp dụng mẫu: ${t.name}`);
    }
  };

  const handleCompile = async () => {
    if (!id) return;
    if (compileInFlightRef.current) return;
    compileInFlightRef.current = true;
    setCompiling(true);
    setCompileError(null);
    try {
      const res = await fetch("/api/latex-projects/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? "Biên dịch thất bại";
        setCompileError({
          status: res.status,
          code: data.code ?? (res.status === 503 ? "COMPILE_NOT_AVAILABLE" : "COMPILE_ERROR"),
          message: msg,
          log: data.log ?? "",
        });
        if (res.status === 503) {
          toast.error("Compile LaTeX server-side chưa khả dụng. Liên hệ quản trị để cài TeX Live/Tectonic hoặc cấu hình LATEX_SERVICE_URL.");
        } else {
          toast.error(msg);
        }
        return;
      }
      const blob = await res.blob();
      if (prevPdfUrlRef.current) URL.revokeObjectURL(prevPdfUrlRef.current);
      const url = URL.createObjectURL(blob);
      prevPdfUrlRef.current = url;
      setPdfBlobUrl(url);
      toast.success("Đã biên dịch. Xem PDF bên phải.");
    } catch {
      toast.error("Lỗi khi gọi dịch vụ biên dịch");
    } finally {
      setCompiling(false);
      compileInFlightRef.current = false;
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = `${title || "output"}.pdf`;
    a.click();
  };

  const handlePrintPdf = () => {
    if (!pdfBlobUrl) return;
    const w = window.open(pdfBlobUrl, "_blank");
    if (w) w.onload = () => { w.print(); w.close(); };
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!id) return;
    setRestoringVersionId(versionId);
    try {
      const res = await fetch(`/api/latex-projects/${id}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) throw new Error("Restore failed");
      const data = await res.json();
      setContent(data.mainContent ?? "");
      setTitle(data.title ?? "");
      toast.success("Đã khôi phục phiên bản");
      fetchVersions();
    } catch {
      toast.error("Không thể khôi phục");
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleAddCollaborator = async () => {
    if (!id || !shareEmail.trim()) return;
    setAddingCollaborator(true);
    try {
      const res = await fetch(`/api/latex-projects/${id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: shareEmail.trim(), role: shareRole }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      setShareEmail("");
      fetchCollaborators();
      toast.success("Đã thêm cộng tác viên");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể thêm");
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/latex-projects/${id}/collaborators/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      fetchCollaborators();
      toast.success("Đã xóa cộng tác viên");
    } catch {
      toast.error("Không thể xóa");
    }
  };

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!id || notFound) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Tài liệu không tồn tại.</p>
        <Button variant="link" onClick={() => router.push("/teacher/latex-documents")}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex items-center gap-4 px-4 py-2 bg-white border-b shrink-0">
        <Button
          className="gap-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          size="sm"
          onClick={() => router.push("/teacher/latex-documents")}
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách
        </Button>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && saveContent(content, title.trim())}
            placeholder="Tên tài liệu"
            className="w-full px-2 py-1 text-lg font-medium border rounded bg-transparent truncate"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Chọn mẫu..." />
            </SelectTrigger>
            <SelectContent>
              {LATEX_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSaveClick} disabled={saving} size="sm" className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
          <Button
            size="sm"
            disabled={compiling}
            onClick={handleCompile}
            title="Biên dịch LaTeX sang PDF (cần Docker TeX Live)"
            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {compiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Biên dịch
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 rounded-lg" size="sm" title="Lịch sử phiên bản">
                <History className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto w-64">
              <DropdownMenuLabel>Lịch sử phiên bản</DropdownMenuLabel>
              {versions.length === 0 ? (
                <DropdownMenuItem disabled>Chưa có phiên bản</DropdownMenuItem>
              ) : (
                versions.map((v) => (
                  <DropdownMenuItem
                    key={v.id}
                    onSelect={() => handleRestoreVersion(v.id)}
                    disabled={restoringVersionId === v.id}
                  >
                    <span className="truncate block">
                      {new Date(v.createdAt).toLocaleString("vi-VN")} ({v.trigger === "compile" ? "Sau biên dịch" : "Lưu"})
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {isOwner && (
            <Button className="gap-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg" size="sm" onClick={() => setShareOpen(true)} title="Chia sẻ">
              <Share2 className="h-4 w-4" />
              Chia sẻ
            </Button>
          )}
        </div>
      </header>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chia sẻ dự án</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Email người dùng"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCollaborator()}
              />
              <Select value={shareRole} onValueChange={(v) => setShareRole(v as "VIEW" | "EDIT")}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW">Xem</SelectItem>
                  <SelectItem value="EDIT">Chỉnh sửa</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddCollaborator} disabled={addingCollaborator || !shareEmail.trim()}>
                {addingCollaborator ? <Loader2 className="h-4 w-4 animate-spin" /> : "Thêm"}
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Cộng tác viên</p>
              {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có ai được chia sẻ</p>
              ) : (
                <ul className="space-y-2">
                  {collaborators.map((c) => (
                    <li key={c.userId} className="flex items-center justify-between text-sm">
                      <span>{c.email || c.name || c.userId}</span>
                      <span className="text-muted-foreground">({c.role})</span>
                      <Button className="h-7 w-7 p-0 text-red-600" size="sm" onClick={() => handleRemoveCollaborator(c.userId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" onClick={() => setShareOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 min-h-0 flex flex-row gap-0 overflow-hidden">
        {/* Left: Code editor */}
        <div className="flex-1 min-w-0 flex flex-col border-r bg-white">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">main.tex</span>
          </div>
          <div className="flex-1 min-h-0">
            <LatexEditor value={content} onChange={setContent} height="100%" />
          </div>
        </div>

        {/* Right: PDF preview */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
            <span className="text-sm font-medium">Xem PDF</span>
            <div className="flex items-center gap-1">
              <Button
                className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 rounded-lg"
                size="sm"
                disabled={!pdfBlobUrl}
                onClick={handleDownloadPdf}
                title="Tải xuống PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-100 rounded-lg"
                size="sm"
                disabled={!pdfBlobUrl}
                onClick={handlePrintPdf}
                title="In PDF"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                disabled={compiling}
                onClick={handleCompile}
                className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                {compiling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Biên dịch lại
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden bg-gray-100">
            {compileError ? (
              <div className="h-full overflow-auto p-4">
                {compileError.status === 503 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Compile LaTeX server-side chưa khả dụng (503)
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Server chưa cài TeX Live/Tectonic hoặc dịch vụ biên dịch (LATEX_SERVICE_URL) chưa phản hồi. Liên hệ quản trị viên để cài đặt.
                    </p>
                    <p className="mt-2 text-xs text-amber-700">
                      <strong>Gợi ý:</strong> Linux <code className="bg-amber-100 px-1 rounded">sudo apt install texlive-xetex texlive-latex-extra</code> · macOS <code className="bg-amber-100 px-1 rounded">brew install --cask mactex</code> · hoặc <code className="bg-amber-100 px-1 rounded">cargo install tectonic</code>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-700">
                      Biên dịch thất bại ({compileError.status})
                    </p>
                    <p className="mt-1 text-xs text-red-700">
                      Đây là lỗi nội dung LaTeX hoặc package/font, không phải lỗi đăng nhập.
                    </p>
                    <p className="mt-1 text-xs text-red-700">{compileError.message}</p>
                    {(() => {
                      const lines = compileError.log.split("\n");
                      const errLines = lines
                        .map((l, i) => ({ l, i }))
                        .filter(({ l }) => /^!|^l\.\d+|^.*Error:|^.*Undefined control sequence|LaTeX Error/i.test(l))
                        .slice(0, 5);
                      if (errLines.length === 0) return null;
                      return (
                        <ul className="mt-2 list-disc list-inside text-xs text-red-800 space-y-0.5">
                          {errLines.map(({ l, i }) => (
                            <li key={i} className="font-mono">{l.trim()}</li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                )}
                {compileError.log && (
                  <details className="mt-3 rounded-lg border border-gray-200 bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      Xem log đầy đủ
                    </summary>
                    <pre className="whitespace-pre-wrap border-t border-gray-200 p-3 text-xs text-gray-700 max-h-[400px] overflow-auto">
                      {compileError.log}
                    </pre>
                  </details>
                )}
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title="PDF preview"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <FileCode2 className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Chưa có bản PDF</p>
                <p className="text-xs mt-1 max-w-[240px]">
                  Nhấn &quot;Biên dịch&quot; trên thanh công cụ để biên dịch LaTeX và xem PDF tại đây.
                </p>
                <Button
                  size="sm"
                  onClick={handleCompile}
                  disabled={compiling}
                  className="mt-4 gap-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {compiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Biên dịch
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
