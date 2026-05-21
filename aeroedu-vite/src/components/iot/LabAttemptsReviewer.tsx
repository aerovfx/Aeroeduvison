/**
 * LabAttemptsReviewer — GV xem tất cả HS đã nộp bài cho 1 challenge block.
 * Bao gồm screenshot mạch + score + feedback từng check pass/fail.
 *
 * Usage:
 *   <LabAttemptsReviewer blockId="..." onClose={() => setOpen(false)} />
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Loader2, CheckCircle2, XCircle, Trophy, Image as ImageIcon,
  ChevronDown, ChevronRight, Filter,
} from 'lucide-react'
import { api } from '@/services/api'

interface Attempt {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  userImage: string | null
  success: boolean
  score: number
  feedback?: {
    checks: Array<{ name: string; label: string; pass: boolean; msg: string }>
    passed: number
    total: number
  }
  screenshot: string | null
  submittedAt: string
}

interface Props {
  blockId: string
  blockTitle?: string
  onClose: () => void
}

type FilterMode = 'all' | 'passed' | 'failed'

export default function LabAttemptsReviewer({ blockId, blockTitle, onClose }: Props) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterMode>('all')
  const [previewImg, setPreviewImg] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/labs/attempts/block/${blockId}`)
      .then(r => setAttempts(r.data.attempts || []))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false))
  }, [blockId])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const visible = attempts.filter(a => {
    if (filter === 'passed') return a.success
    if (filter === 'failed') return !a.success
    return true
  })

  // Stats
  const totalUsers = new Set(attempts.map(a => a.userId)).size
  const passedUsers = new Set(attempts.filter(a => a.success).map(a => a.userId)).size

  const content = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-zinc-100 truncate">
              Bài nộp của học sinh{blockTitle ? `: ${blockTitle}` : ''}
            </h3>
            <p className="text-xs text-zinc-400">
              {totalUsers} HS đã thử · {passedUsers} đã pass · {attempts.length} lượt nộp
            </p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-500 ml-2" />
            {(['all', 'passed', 'failed'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded font-medium ${
                  filter === f
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f === 'all' ? 'Tất cả' : f === 'passed' ? 'Đã pass' : 'Chưa pass'}
                <span className="ml-1 text-[10px] opacity-70">
                  ({f === 'all' ? attempts.length : f === 'passed' ? attempts.filter(a => a.success).length : attempts.filter(a => !a.success).length})
                </span>
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải...
            </div>
          )}
          {!loading && visible.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Chưa có lượt nộp nào.
            </div>
          )}
          {visible.map(a => {
            const isOpen = expanded.has(a.id)
            return (
              <div
                key={a.id}
                className={`rounded-xl border ${
                  a.success
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                <button
                  onClick={() => toggle(a.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 rounded-xl"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                  {a.userImage
                    ? <img src={a.userImage} alt={a.userName || ''} className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 font-bold">
                        {(a.userName || a.userEmail || '?').slice(0, 2).toUpperCase()}
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-zinc-100 truncate">
                      {a.userName || '(ẩn danh)'}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {a.userEmail} · {new Date(a.submittedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.screenshot && (
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewImg(a.screenshot) }}
                        className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800"
                        title="Xem screenshot mạch"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                    {a.success
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <XCircle className="w-5 h-5 text-rose-400" />}
                    <span className={`text-sm font-bold tabular-nums ${
                      a.success ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {a.score}/100
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Screenshot panel */}
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> Screenshot mạch của HS
                      </div>
                      {a.screenshot ? (
                        <button
                          onClick={() => setPreviewImg(a.screenshot)}
                          className="block w-full rounded-lg overflow-hidden border border-zinc-700 hover:border-cyan-500 transition-colors"
                        >
                          <img src={a.screenshot} alt="Mạch HS" className="w-full" />
                        </button>
                      ) : (
                        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-center text-xs text-zinc-500">
                          Không có screenshot (lab Arduino không hỗ trợ capture)
                        </div>
                      )}
                    </div>

                    {/* Feedback panel */}
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-2">
                        Kết quả chấm ({a.feedback?.passed || 0}/{a.feedback?.total || 0} checks pass)
                      </div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {a.feedback?.checks?.map((ch, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            {ch.pass
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              : <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                            <div>
                              <div className={`font-medium ${ch.pass ? 'text-emerald-200' : 'text-rose-200'}`}>
                                {ch.label}
                              </div>
                              <div className="text-zinc-400">{ch.msg}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Image preview modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/90 cursor-pointer p-6"
          onClick={() => setPreviewImg(null)}
        >
          <img src={previewImg} alt="Screenshot" className="max-w-full max-h-full rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
