import { useState, useCallback } from "react"
import { Upload, X, FileText, Image as ImageIcon, Folder, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import toast from "react-hot-toast"

const D = {
  bg: '#0d0e17',
  card: '#10111e',
  card2: '#161728',
  border: '#1e2033',
  border2: '#2a2b3d',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
  purpleHover: '#6d28d9',
}

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
}

interface FileWithPreview extends File {
  preview?: string
}

export function DocumentUploadModal({ isOpen, onClose, onUploadComplete }: DocumentUploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [enableAIProcessing, setEnableAIProcessing] = useState(true)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: FileWithPreview[] = []
    const maxSize = 50 * 1024 * 1024

    acceptedFiles.forEach((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} không được hỗ trợ. Chỉ hỗ trợ PDF, JPG, PNG.`)
        return
      }
      if (file.size > maxSize) {
        toast.error(`File ${file.name} quá lớn. Kích thước tối đa: 50MB.`)
        return
      }
      const fileWithPreview: FileWithPreview = file
      if (file.type.startsWith("image/")) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      validFiles.push(fileWithPreview)
    })
    setFiles((prev) => [...prev, ...validFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  })

  const handleRemoveFile = (index: number) => {
    const file = files[index]
    if (file.preview) URL.revokeObjectURL(file.preview)
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return <FileText style={{ width: 20, height: 20, color: '#f87171' }} />
    if (file.type.startsWith("image/")) return <ImageIcon style={{ width: 20, height: 20, color: D.purple }} />
    return <FileText style={{ width: 20, height: 20, color: D.muted }} />
  }

  const handleUpload = async () => {
    if (files.length === 0) { toast.error("Vui lòng chọn ít nhất một file"); return }
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/documents/upload", { method: "POST", body: formData })
      if (!response.ok) {
        let msg = "Upload failed"
        try { const err = await response.json(); msg = err.error || err.message || msg } catch { /**/ }
        throw new Error(msg)
      }

      const data = await response.json()
      toast.success(data.message || `Đã tải lên ${files.length} file thành công`)

      if (enableAIProcessing && data.documents) {
        Promise.all(
          data.documents.map(async (doc: { id: string }) => {
            try { await fetch(`/api/documents/${doc.id}/process`, { method: "POST" }) } catch { /**/ }
          })
        ).catch(console.error)
        toast.success("Đang xử lý tài liệu với AI...")
      }

      setFiles([])
      onUploadComplete?.()
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể tải lên file")
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: D.card, border: `1px solid ${D.border2}`, borderRadius: 16,
        padding: 32, width: '90%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: D.text, fontSize: 20, fontWeight: 700, margin: 0 }}>Tải tài liệu lên</h2>
            <p style={{ color: D.muted, fontSize: 14, margin: '4px 0 0' }}>Tải PDF hoặc ảnh để số hoá với AI</p>
          </div>
          <button onClick={onClose} style={{
            background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8,
            color: D.muted, cursor: 'pointer', padding: '6px 8px', lineHeight: 1,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left — Upload area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = ".pdf,.jpg,.jpeg,.png"
                  input.multiple = true
                  input.onchange = (e) => {
                    const t = e.target as HTMLInputElement
                    if (t.files) onDrop(Array.from(t.files))
                  }
                  input.click()
                }}
                style={{
                  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                  color: D.text, cursor: 'pointer', padding: '8px 16px', fontSize: 14,
                }}
              >Chọn tệp</button>
              <button
                disabled={files.length === 0}
                onClick={() => toast.success("Đã nhóm các file")}
                style={{
                  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                  color: files.length === 0 ? D.muted : D.text,
                  cursor: files.length === 0 ? 'not-allowed' : 'pointer',
                  padding: '8px 16px', fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              ><Folder size={14} />Nhóm lại</button>
            </div>

            {/* Dropzone */}
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? D.purple : D.border2}`,
              borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
              background: isDragActive ? 'rgba(124,58,237,0.08)' : D.card2,
              transition: 'all 0.2s',
            }}>
              <input {...getInputProps()} />
              <Upload style={{ width: 40, height: 40, color: D.muted, margin: '0 auto 12px' }} />
              <p style={{ color: D.muted, fontSize: 14, margin: '0 0 4px' }}>Kéo thả file vào đây hoặc click để chọn</p>
              <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>Hỗ trợ: PDF, JPG, PNG • Tối đa 50MB/tệp</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: D.card2, border: `1px solid ${D.border}`,
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    {getFileIcon(file)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: D.text, fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                      <p style={{ color: D.muted, fontSize: 11, margin: 0 }}>{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={() => handleRemoveFile(idx)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: D.muted, padding: 4,
                    }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  background: uploading ? '#4c1d95' : D.purple,
                  border: 'none', borderRadius: 10, color: '#fff',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  padding: '12px 20px', fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {uploading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Đang tải lên...</>
                  : <><Upload size={16} />Tải lên ({files.length})</>
                }
              </button>
            )}
          </div>

          {/* Right — Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', fontSize: 56 }}>🤖</div>
            <div>
              <h3 style={{ color: D.text, fontWeight: 700, margin: '0 0 8px', fontSize: 16 }}>Số hóa với AI</h3>
              <p style={{ color: D.muted, fontSize: 14, margin: '0 0 16px' }}>
                Tài liệu sẽ được tự động số hóa bằng OCR và phân tích với AI sau khi upload.
              </p>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(124,58,237,0.12)', border: `1px solid rgba(124,58,237,0.3)`,
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer', marginBottom: 16,
              }}>
                <input
                  type="checkbox"
                  checked={enableAIProcessing}
                  onChange={(e) => setEnableAIProcessing(e.target.checked)}
                  style={{ accentColor: D.purple, width: 16, height: 16 }}
                />
                <span style={{ color: D.text, fontSize: 14, fontWeight: 500 }}>Tự động số hóa với AI</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Hỗ trợ', 'PDF, JPG, PNG'],
                  ['Kích thước tối đa', '50MB/tệp'],
                  ['AI Features', 'OCR + Phân tích nội dung'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <span style={{ color: D.text, fontWeight: 600 }}>{k}:</span>
                    <span style={{ color: D.muted }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} style={{
            background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
            color: D.muted, cursor: 'pointer', padding: '8px 20px', fontSize: 14,
          }}>Đóng</button>
        </div>
      </div>
    </div>
  )
}
