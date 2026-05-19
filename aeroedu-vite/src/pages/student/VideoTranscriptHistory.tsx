import { useState, useEffect } from 'react'
import { Mic, Clock, Calendar, Trash2, Eye, Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { tokenStore } from '@/services/api'

// Theme-aware palette via CSS vars (auto light/dark switching)
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  purple:      'var(--td-purple)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  blue:        'var(--td-blue)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
} as const

interface TranscriptRecord {
  id: string
  title: string
  type: string
  transcript: string
  summary?: string
  duration: number
  createdAt: string
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function VideoTranscriptHistory() {
  const navigate = useNavigate()
  
  const [records, setRecords] = useState<TranscriptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TranscriptRecord | null>(null)

  useEffect(() => {
    const headers: HeadersInit = tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}
    fetch('/api/transcript/history', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRecords(Array.isArray(data) ? data : (data.records ?? [])))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [])

  const deleteRecord = async (id: string) => {
    if (!confirm('Xóa bản ghi này?')) return
    const headers: HeadersInit = { ...(tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}) }
    await fetch(`/api/transcript/${id}`, { method: 'DELETE', headers })
    setRecords(p => p.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Đã xóa bản ghi')
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/student/video-transcript')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: D.muted, fontSize: 14, cursor: 'pointer', padding: '6px 0' }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} /> Quay lại
          </button>
          <div style={{ width: 1, height: 20, background: D.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock style={{ width: 18, height: 18, color: D.purpleL }} />
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: D.text }}>Lịch sử Transcript</h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: 20 }}>
        {/* List */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 style={{ width: 32, height: 32, color: D.muted, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: D.muted }}>
              <Mic style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'rgba(148,163,184,0.2)' }} />
              <div style={{ fontSize: 15, marginBottom: 8 }}>Chưa có lịch sử ghi âm</div>
              <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)', marginBottom: 20 }}>Hãy ghi âm bài giảng và lưu lại</div>
              <button
                onClick={() => navigate('/student/video-transcript')}
                style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Bắt đầu ghi âm
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {records.map(rec => (
                <div
                  key={rec.id}
                  onClick={() => setSelected(rec)}
                  style={{
                    background: selected?.id === rec.id ? 'rgba(124,58,237,0.1)' : D.card,
                    border: `1px solid ${selected?.id === rec.id ? D.purple + '44' : D.border}`,
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (selected?.id !== rec.id) e.currentTarget.style.borderColor = D.purple + '33' }}
                  onMouseLeave={e => { if (selected?.id !== rec.id) e.currentTarget.style.borderColor = D.border }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mic style={{ width: 18, height: 18, color: D.purpleL }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: D.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.title}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: D.muted }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar style={{ width: 12, height: 12 }} />
                          {new Date(rec.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        {rec.duration > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock style={{ width: 12, height: 12 }} />
                            {formatDuration(rec.duration)}
                          </span>
                        )}
                        {rec.summary && <span style={{ color: D.purpleL }}>✨ Có tóm tắt</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(rec) }}
                        style={{ width: 30, height: 30, borderRadius: 8, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Eye style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteRecord(rec.id) }}
                        style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail view */}
        {selected && (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text }}>{selected.title}</h2>
                <div style={{ fontSize: 12, color: D.muted, marginTop: 4 }}>
                  {new Date(selected.createdAt).toLocaleString('vi-VN')}
                  {selected.duration > 0 && ` · ${formatDuration(selected.duration)}`}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ width: 30, height: 30, borderRadius: 8, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
            </div>

            {selected.summary && (
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`, background: 'rgba(124,58,237,0.05)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.purpleL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✨ TÓM TẮT AI</div>
                <div style={{ fontSize: 14, color: D.muted, lineHeight: 1.7 }}>{selected.summary}</div>
              </div>
            )}

            <div style={{ flex: 1, padding: '18px 24px', overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>TRANSCRIPT ĐẦY ĐỦ</div>
              <div style={{ fontSize: 14, color: D.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selected.transcript}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
