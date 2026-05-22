/**
 * TranscriptRecording — Lịch sử transcript đã ghi của GV
 *
 * Route: /teacher/transcript/recording
 *
 * Features:
 *  - List transcripts (sort newest first) với preview 200 chars
 *  - Click expand → xem full text + summary + meta
 *  - Edit inline title/type
 *  - Copy text / Download .txt / Delete
 *  - Empty state hint quay về /teacher/transcript để ghi mới
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Search, Trash2, Loader2, Calendar, Hash, Clock,
  Copy, Download, ChevronDown, ChevronRight, ArrowLeft, Plus, FileAudio,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { transcriptService, type TranscriptSummary, type Transcript } from '@/services/transcript.service'

const D = {
  bg: '#0d0e17', card: '#10111e', card2: '#161728',
  border: '#1e2033', border2: '#2a2b3d',
  text: '#f1f5f9', muted: '#94a3b8', purple: '#7c3aed',
} as const

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m < 60) return `${m}p ${sec}s`
  const h = Math.floor(m / 60)
  return `${h}g ${m % 60}p`
}

function typeLabel(t: string): { label: string; color: string } {
  switch (t) {
    case 'lecture': return { label: '🎓 Bài giảng', color: '#a78bfa' }
    case 'meeting': return { label: '👥 Họp', color: '#60a5fa' }
    default:        return { label: '📝 Khác', color: '#94a3b8' }
  }
}

export default function TranscriptRecording() {
  const navigate = useNavigate()
  const [items, setItems] = useState<TranscriptSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fullCache, setFullCache] = useState<Record<string, Transcript>>({})

  const load = async () => {
    setLoading(true)
    try {
      const r = await transcriptService.list()
      setItems(r.history)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Không tải được lịch sử transcript')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!fullCache[id]) {
      try {
        const t = await transcriptService.get(id)
        setFullCache(prev => ({ ...prev, [id]: t }))
      } catch (e: any) {
        toast.error(e?.response?.data?.error || 'Lỗi tải nội dung')
      }
    }
  }

  const handleDelete = async (it: TranscriptSummary) => {
    if (!confirm(`Xoá transcript "${it.title}"?\nKhông thể hoàn tác.`)) return
    try {
      await transcriptService.remove(it.id)
      toast.success('Đã xoá')
      setItems(prev => prev.filter(t => t.id !== it.id))
      if (expandedId === it.id) setExpandedId(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi xoá')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Đã copy vào clipboard')
  }

  const handleDownload = (it: TranscriptSummary, full: string) => {
    const blob = new Blob([
      `${it.title}\n${'='.repeat(it.title.length)}\n\n`,
      `Loại: ${it.type}\n`,
      `Thời lượng: ${fmtDuration(it.duration)}\n`,
      `Ngôn ngữ: ${it.sourceLanguage} → ${it.targetLanguage}\n`,
      `Provider: ${it.provider}\n`,
      `Số từ: ${it.wordCount}\n`,
      `Thời gian: ${new Date(it.createdAt).toLocaleString('vi-VN')}\n\n`,
      `--- NỘI DUNG ---\n\n${full}\n`,
    ], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${it.title.replace(/[^\w\d-]+/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Đã download .txt')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(it =>
      it.title.toLowerCase().includes(q) ||
      (it.preview || '').toLowerCase().includes(q) ||
      (it.summary || '').toLowerCase().includes(q)
    )
  }, [items, search])

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => navigate('/teacher/transcript')}
            style={{
              padding: '6px 10px', background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${D.border}`, borderRadius: 8, cursor: 'pointer',
              color: D.muted, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
            }}>
            <ArrowLeft size={13} /> Về trang ghi âm
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileAudio size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                🎙 Lịch sử Transcript
              </h1>
              <p style={{ color: D.muted, fontSize: 13, margin: '4px 0 0' }}>
                Các bản ghi âm + transcript đã lưu qua fal.ai Whisper
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/teacher/transcript')}
            style={{
              padding: '10px 18px', background: D.purple, color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            }}>
            <Plus size={15} /> Ghi âm mới
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: D.muted,
          }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm transcript theo tên, nội dung, summary..."
            style={{
              width: '100%', padding: '10px 14px 10px 38px', boxSizing: 'border-box',
              background: D.card, border: `1px solid ${D.border}`, borderRadius: 10,
              color: D.text, fontSize: 14, outline: 'none',
            }} />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: D.purple, margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
            padding: 40, textAlign: 'center',
          }}>
            <Mic size={36} style={{ color: '#475569', margin: '0 auto 10px' }} />
            <p style={{ color: '#cbd5e1', fontWeight: 600, margin: '0 0 4px' }}>
              {search ? 'Không tìm thấy transcript nào' : 'Chưa có transcript nào'}
            </p>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              {search ? 'Thử tìm với từ khoá khác' : 'Vào /teacher/transcript để ghi âm và transcribe lần đầu'}
            </p>
            {!search && (
              <button onClick={() => navigate('/teacher/transcript')}
                style={{
                  padding: '10px 20px', background: D.purple, color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                <Mic size={14} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                Ghi âm đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(it => {
              const isExpanded = expandedId === it.id
              const t = typeLabel(it.type)
              const fullText = fullCache[it.id]?.transcript
              return (
                <div key={it.id} style={{
                  background: D.card, border: `1px solid ${isExpanded ? D.purple : D.border}`,
                  borderRadius: 12, transition: 'border-color 0.2s',
                  overflow: 'hidden',
                }}>
                  {/* Header row */}
                  <button onClick={() => handleExpand(it.id)} style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: 'transparent', border: 'none', padding: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'rgba(124,58,237,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {isExpanded ? <ChevronDown size={18} style={{ color: D.purple }} />
                                  : <ChevronRight size={18} style={{ color: D.purple }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.title}
                        </h3>
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4,
                          background: t.color + '20', color: t.color, fontWeight: 700,
                        }}>{t.label}</span>
                      </div>
                      {!isExpanded && it.preview && (
                        <p style={{ color: D.muted, fontSize: 12, margin: '0 0 4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.preview}...
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {fmtDuration(it.duration)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Hash size={10} /> {it.wordCount} từ
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {it.sourceLanguage} → {it.targetLanguage}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={10} />
                          {new Date(it.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{
                      borderTop: `1px solid ${D.border}`, padding: 14,
                      background: 'rgba(0,0,0,0.2)',
                    }}>
                      {!fullText ? (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                          <Loader2 size={20} className="animate-spin" style={{ color: D.purple, margin: '0 auto' }} />
                        </div>
                      ) : (
                        <>
                          {/* Action bar */}
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button onClick={() => handleCopy(fullText)} style={{
                              padding: '6px 10px', background: 'rgba(96,165,250,0.12)',
                              border: '1px solid rgba(96,165,250,0.3)', borderRadius: 7,
                              color: '#60a5fa', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <Copy size={11} /> Copy
                            </button>
                            <button onClick={() => handleDownload(it, fullText)} style={{
                              padding: '6px 10px', background: 'rgba(34,197,94,0.12)',
                              border: '1px solid rgba(34,197,94,0.3)', borderRadius: 7,
                              color: '#4ade80', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <Download size={11} /> Download .txt
                            </button>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => handleDelete(it)} style={{
                              padding: '6px 10px', background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7,
                              color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <Trash2 size={11} /> Xoá
                            </button>
                          </div>
                          {/* Summary */}
                          {it.summary && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 11, color: D.muted, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                Tóm tắt
                              </p>
                              <p style={{ fontSize: 12, color: D.text, margin: 0, lineHeight: 1.5,
                                background: 'rgba(124,58,237,0.06)', padding: '8px 10px',
                                borderLeft: '3px solid ' + D.purple, borderRadius: 4 }}>
                                {it.summary}
                              </p>
                            </div>
                          )}
                          {/* Full transcript */}
                          <div>
                            <p style={{ fontSize: 11, color: D.muted, fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                              Nội dung đầy đủ ({fullText.split('\n').length} đoạn)
                            </p>
                            <div style={{
                              background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                              padding: 12, fontSize: 13, color: D.text, lineHeight: 1.7,
                              maxHeight: 400, overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {fullText}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
