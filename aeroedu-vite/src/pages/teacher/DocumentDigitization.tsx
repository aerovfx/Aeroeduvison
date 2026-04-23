import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Upload, Search, FileText, ImageIcon, Eye,
  Trash2, Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react"
import toast from "react-hot-toast"
import { DocumentUploadModal } from "@/components/document-digitization/UploadModal"

/* ── Dark palette ── */
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
} as const

/* ── Types ── */
type DocumentStatus = 'Tất cả' | 'Hàng đợi' | 'Đang xử lý' | 'Hoàn tất' | 'Lỗi'

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

/* ── Status helpers ── */
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Hàng đợi':    { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  'Đang xử lý':  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  'Hoàn tất':    { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  'Lỗi':         { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
}

const StatusBadge = ({ status }: { status: string }) => {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS['Hàng đợi']
  const IconMap: Record<string, React.ReactNode> = {
    'Hàng đợi':   <Clock size={12} />,
    'Đang xử lý': <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />,
    'Hoàn tất':   <CheckCircle2 size={12} />,
    'Lỗi':        <XCircle size={12} />,
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {IconMap[status] ?? <Clock size={12} />}
      {status}
    </span>
  )
}

/* ── Main page ── */
export default function DocumentDigitizationPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>('Tất cả')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => { fetchDocuments() }, [selectedStatus])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== 'Tất cả') params.append('status', selectedStatus)
      const res = await fetch(`/api/documents?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch {
      toast.error('Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Đã xóa tài liệu')
      fetchDocuments()
    } catch {
      toast.error('Không thể xóa tài liệu')
    } finally {
      setDeleteTarget(null)
    }
  }

  const filtered = documents.filter(d =>
    d.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total:      documents.length,
    queue:      documents.filter(d => d.status === 'Hàng đợi').length,
    processing: documents.filter(d => d.status === 'Đang xử lý').length,
    completed:  documents.filter(d => d.status === 'Hoàn tất').length,
    error:      documents.filter(d => d.status === 'Lỗi').length,
  }

  const allChecked = filtered.length > 0 && selectedIds.size === filtered.length
  const toggleAll = () =>
    setSelectedIds(allChecked ? new Set() : new Set(filtered.map(d => d.id)))
  const toggleOne = (id: string) => {
    const s = new Set(selectedIds)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelectedIds(s)
  }

  const STAT_CARDS = [
    { label: 'Tổng cộng',   value: stats.total,      color: '#60a5fa' },
    { label: 'Hàng đợi',    value: stats.queue,      color: '#94a3b8' },
    { label: 'Đang xử lý',  value: stats.processing, color: '#fbbf24' },
    { label: 'Hoàn tất',    value: stats.completed,  color: '#4ade80' },
    { label: 'Lỗi',         value: stats.error,      color: '#f87171' },
  ]

  const STATUS_TABS: DocumentStatus[] = ['Tất cả', 'Hàng đợi', 'Đang xử lý', 'Hoàn tất', 'Lỗi']

  return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: D.purple, fontSize: 32, fontWeight: 800, margin: 0 }}>Số Hóa Tài Liệu</h1>
          <p style={{ color: D.muted, fontSize: 14, margin: '6px 0 0' }}>Quản lý và số hóa tài liệu học tập với AI</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: D.purple, border: 'none', borderRadius: 10,
            color: '#fff', cursor: 'pointer', fontWeight: 600,
            fontSize: 14, padding: '10px 20px',
          }}
        >
          <Upload size={16} />
          Tải Lên Tài Liệu
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
            padding: '20px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: D.muted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: D.card2, border: `1px solid ${D.border2}`,
              borderRadius: 8, color: D.text, fontSize: 14,
              padding: '8px 12px 8px 36px',
              outline: 'none',
            }}
          />
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 4, background: D.card2, borderRadius: 10, padding: 4 }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              style={{
                background: selectedStatus === tab ? D.purple : 'transparent',
                border: 'none', borderRadius: 7,
                color: selectedStatus === tab ? '#fff' : D.muted,
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                padding: '6px 14px', transition: 'all 0.15s',
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* Table head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 120px 140px 100px 120px',
          padding: '14px 20px',
          borderBottom: `1px solid ${D.border}`,
          background: D.card2,
        }}>
          {['', 'Tên tài liệu', 'Loại', 'Trạng thái', 'Thời gian', 'Thao tác'].map((h, i) => (
            <div key={i} style={{ color: D.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 5 ? 'right' : 'left' }}>
              {i === 0
                ? <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ accentColor: D.purple }} />
                : h
              }
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: D.muted, margin: 0 }}>Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: D.card2, border: `1px solid ${D.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <FileText size={28} style={{ color: D.muted }} />
            </div>
            <h3 style={{ color: D.text, fontWeight: 700, margin: '0 0 8px' }}>Không có tài liệu</h3>
            <p style={{ color: D.muted, margin: 0, fontSize: 14 }}>Tải lên tài liệu đầu tiên của bạn</p>
          </div>
        ) : (
          filtered.map((doc, idx) => (
            <div
              key={doc.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 120px 140px 100px 120px',
                padding: '14px 20px',
                borderBottom: idx < filtered.length - 1 ? `1px solid ${D.border}` : 'none',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* checkbox */}
              <div>
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => toggleOne(doc.id)}
                  style={{ accentColor: D.purple }}
                />
              </div>

              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {doc.type.includes('image')
                  ? <ImageIcon size={18} style={{ color: D.purple, flexShrink: 0 }} />
                  : <FileText size={18} style={{ color: '#60a5fa', flexShrink: 0 }} />
                }
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: D.text, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.displayName}
                  </div>
                  {doc.folderPath && (
                    <div style={{ color: D.muted, fontSize: 11 }}>{doc.folderPath}</div>
                  )}
                </div>
              </div>

              {/* Type */}
              <div>
                <span style={{
                  background: D.card2, border: `1px solid ${D.border2}`,
                  borderRadius: 6, color: D.muted, fontSize: 12,
                  padding: '3px 8px',
                }}>{doc.type}</span>
              </div>

              {/* Status */}
              <div><StatusBadge status={doc.status} /></div>

              {/* Execution time */}
              <div style={{ color: D.muted, fontSize: 13 }}>
                {doc.executionTime ? `${doc.executionTime}ms` : '—'}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  onClick={() => navigate(`/teacher/document-digitization/${doc.id}/review`)}
                  title="Xem chi tiết"
                  style={{
                    background: D.card2, border: `1px solid ${D.border}`, borderRadius: 7,
                    color: D.muted, cursor: 'pointer', padding: '5px 8px', lineHeight: 1,
                  }}
                ><Eye size={14} /></button>
                <button
                  onClick={() => setDeleteTarget(doc.id)}
                  title="Xóa"
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 7, color: '#f87171', cursor: 'pointer', padding: '5px 8px', lineHeight: 1,
                  }}
                ><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={fetchDocuments}
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: D.card, border: `1px solid ${D.border2}`, borderRadius: 16,
            padding: 32, maxWidth: 420, width: '90%',
          }}>
            <h3 style={{ color: D.text, fontWeight: 700, margin: '0 0 12px', fontSize: 18 }}>Xóa tài liệu?</h3>
            <p style={{ color: D.muted, margin: '0 0 24px', fontSize: 14 }}>
              Hành động này không thể hoàn tác. Tài liệu sẽ bị xóa vĩnh viễn.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                  color: D.muted, cursor: 'pointer', padding: '8px 20px', fontSize: 14,
                }}
              >Hủy</button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={{
                  background: '#dc2626', border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', fontWeight: 600,
                  padding: '8px 20px', fontSize: 14,
                }}
              >Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
