/**
 * NewsReview — Admin duyệt tin từ giáo viên.
 * Queue PENDING, approve → public ngay; reject → ghi reason cho giáo viên.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, XCircle, Eye, Clock, User as UserIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'

interface PendingNews {
  id: string
  slug: string
  title: string
  sapo: string
  body: string
  hero_image: string | null
  category: string
  tags: string
  authorId: string
  authorName: string
  createdAt: string
}

export default function NewsReview() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-news-pending'],
    queryFn: () =>
      api.get<{ items: PendingNews[] }>('/admin/news/pending').then(r => r.data.items || []),
  })
  const items = data || []
  const selected = items.find((i) => i.id === selectedId) || items[0]

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/news/${id}/approve`),
    onSuccess: () => {
      toast.success('Đã duyệt — bài đã hiện tại /news')
      qc.invalidateQueries({ queryKey: ['admin-news-pending'] })
      setSelectedId(null)
    },
    onError: () => toast.error('Duyệt thất bại'),
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/news/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Đã từ chối — giáo viên sẽ thấy lý do')
      qc.invalidateQueries({ queryKey: ['admin-news-pending'] })
      setSelectedId(null)
      setRejectReason('')
    },
    onError: () => toast.error('Từ chối thất bại'),
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Duyệt tin tức</h1>
        <span className="ml-auto inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
          <Clock className="w-3 h-3" /> {items.length} chờ duyệt
        </span>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-foreground font-semibold">Không có bài chờ duyệt</p>
          <p className="text-sm text-muted-foreground mt-1">
            Khi giáo viên gửi bài mới, sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* List queue */}
          <aside>
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => setSelectedId(it.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected?.id === it.id
                        ? 'border-[hsl(262,83%,58%)] bg-[hsl(262,83%,58%)]/8'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2">
                      {it.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <UserIcon className="w-3 h-3" />
                      <span>{it.authorName || '—'}</span>
                      <span>·</span>
                      <span>{new Date(it.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Article preview + actions */}
          {selected && (
            <article className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="p-5 sm:p-6">
                <span className="text-xs font-bold uppercase tracking-wide text-[hsl(0,73%,45%)]">
                  {selected.category}
                </span>
                <h2 className="text-2xl font-bold text-foreground leading-tight mt-2 mb-3">
                  {selected.title}
                </h2>
                {selected.sapo && (
                  <p className="text-base font-semibold text-muted-foreground italic border-l-4 border-[hsl(0,73%,45%)] pl-3 mb-4">
                    {selected.sapo}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                  <UserIcon className="w-3.5 h-3.5" /> {selected.authorName}
                  <span>·</span>
                  <Clock className="w-3.5 h-3.5" /> {new Date(selected.createdAt).toLocaleString('vi-VN')}
                </div>
                {selected.hero_image && (
                  <img src={selected.hero_image} alt="" className="w-full rounded-md mb-4" />
                )}
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {selected.body}
                </div>
                {selected.tags && (
                  <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-1.5">
                    {selected.tags.split(',').map(t => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do từ chối (chỉ điền nếu từ chối)"
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => reject.mutate({ id: selected.id, reason: rejectReason || 'Không đạt tiêu chuẩn nội dung' })}
                    disabled={reject.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-sm font-semibold disabled:opacity-50 transition"
                  >
                    <XCircle className="w-4 h-4" /> Từ chối
                  </button>
                  <button
                    onClick={() => approve.mutate(selected.id)}
                    disabled={approve.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Duyệt &amp; Đăng
                  </button>
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  )
}
