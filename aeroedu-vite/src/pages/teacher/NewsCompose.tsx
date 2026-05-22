/**
 * NewsCompose — Trang giáo viên soạn tin tức.
 * Sau khi submit, bài viết ở trạng thái PENDING — admin duyệt mới hiện public.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Save, Eye, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'

const CATEGORIES = [
  { value: 'cong-nghe-giao-duc', label: 'Công nghệ giáo dục' },
  { value: 'cap-nhat-san-pham',  label: 'Cập nhật sản phẩm' },
  { value: 'huong-dan',          label: 'Hướng dẫn' },
  { value: 'su-kien',            label: 'Sự kiện' },
]

interface MyNewsItem {
  id: string
  slug: string
  title: string
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'DRAFT'
  category: string
  createdAt: string
  publishedAt: string | null
  rejectReason?: string | null
  views: number
}

export default function NewsCompose() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [sapo, setSapo] = useState('')
  const [body, setBody] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [category, setCategory] = useState('cong-nghe-giao-duc')
  const [tags, setTags] = useState('')
  const [preview, setPreview] = useState(false)

  const { data: mineData } = useQuery({
    queryKey: ['my-news'],
    queryFn: () => api.get<{ items: MyNewsItem[] }>('/teacher/news/mine').then(r => r.data.items || []),
  })
  const mine = mineData || []

  const submit = useMutation({
    mutationFn: () =>
      api.post('/teacher/news', {
        title, sapo, body, heroImage, category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }).then(r => r.data),
    onSuccess: () => {
      toast.success('Bài viết đã gửi lên admin duyệt')
      qc.invalidateQueries({ queryKey: ['my-news'] })
      setTitle(''); setSapo(''); setBody(''); setHeroImage(''); setTags('')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || 'Gửi bài thất bại')
    },
  })

  const onSubmit = () => {
    if (!title.trim()) return toast.error('Thiếu tiêu đề')
    if (!body.trim()) return toast.error('Thiếu nội dung')
    submit.mutate()
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Soạn tin tức</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Compose form */}
        <div className="space-y-4">
          {/* Toggle preview */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                !preview ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Save className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Soạn
            </button>
            <button
              onClick={() => setPreview(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                preview ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Eye className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Xem trước
            </button>
          </div>

          {preview ? (
            <article className="rounded-xl bg-card border border-border p-6">
              <span className="text-xs font-bold uppercase tracking-wide text-[hsl(0,73%,45%)]">
                {CATEGORIES.find(c => c.value === category)?.label}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-2 mb-3">
                {title || '(Tiêu đề bài viết)'}
              </h1>
              <p className="text-base text-muted-foreground italic font-semibold border-l-4 border-[hsl(0,73%,45%)] pl-3 mb-4">
                {sapo || '(Sapo / lead paragraph)'}
              </p>
              {heroImage && (
                <img src={heroImage} alt="" className="w-full rounded-md mb-4" />
              )}
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {body || '(Nội dung)'}
              </div>
            </article>
          ) : (
            <div className="space-y-3 rounded-xl bg-card border border-border p-4 sm:p-5">
              <Field label="Tiêu đề *">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Vd: AeroEduVision ra mắt module Mastery Peak"
                  className="news-input"
                  maxLength={140}
                />
                <span className="text-[11px] text-muted-foreground">{title.length}/140</span>
              </Field>

              <Field label="Sapo (đoạn dẫn — sẽ in đậm trong bài)">
                <textarea
                  value={sapo}
                  onChange={(e) => setSapo(e.target.value)}
                  rows={2}
                  placeholder="Đoạn ngắn 2-3 câu giới thiệu nội dung chính của bài viết..."
                  className="news-input resize-none"
                  maxLength={300}
                />
                <span className="text-[11px] text-muted-foreground">{sapo.length}/300</span>
              </Field>

              <Field label="URL hình ảnh hero">
                <input
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="https://..."
                  className="news-input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Chuyên mục">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="news-input"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Thẻ (phẩy ngăn cách)">
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="THPT 2026, Vật lý, ..."
                    className="news-input"
                  />
                </Field>
              </div>

              <Field label="Nội dung bài viết *">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  placeholder="Viết nội dung bài viết ở đây. Hỗ trợ xuống dòng (Enter), markdown đơn giản. Sau khi gửi, admin sẽ duyệt trước khi hiển thị công khai."
                  className="news-input font-mono text-sm resize-y"
                />
              </Field>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  ✓ Bài sẽ gửi vào hàng đợi <strong>PENDING</strong> để admin duyệt.
                </p>
                <button
                  onClick={onSubmit}
                  disabled={submit.isPending || !title || !body}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(0,73%,45%)] to-[hsl(340,75%,40%)] text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition"
                >
                  {submit.isPending ? 'Đang gửi…' : <><Send className="w-4 h-4" /> Gửi duyệt</>}
                </button>
              </div>
            </div>
          )}

          <style>{`
            .news-input {
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              background: hsl(var(--background));
              border: 1px solid hsl(var(--border));
              color: hsl(var(--foreground));
              font-size: 14px;
              outline: none;
              transition: border-color .15s;
            }
            .news-input:focus {
              border-color: hsl(262, 83%, 58%);
            }
          `}</style>
        </div>

        {/* Sidebar: my submissions */}
        <aside className="space-y-3">
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="font-bold text-foreground text-sm mb-3">Bài viết của tôi</h3>
            {mine.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có bài viết nào.</p>
            ) : (
              <ul className="space-y-3">
                {mine.map((m) => (
                  <li key={m.id} className="border-b border-border last:border-0 pb-2.5 last:pb-0">
                    <Link
                      to={m.status === 'PUBLISHED' ? `/news/${m.slug}` : '#'}
                      className={`block font-medium text-sm leading-snug ${
                        m.status === 'PUBLISHED' ? 'hover:text-[hsl(262,83%,58%)]' : ''
                      }`}
                    >
                      {m.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusChip status={m.status} />
                      {m.status === 'PUBLISHED' && (
                        <span className="text-[10px] text-muted-foreground">{m.views} views</span>
                      )}
                    </div>
                    {m.status === 'REJECTED' && m.rejectReason && (
                      <p className="text-[11px] text-rose-400 mt-1 italic">"{m.rejectReason}"</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-card border border-border p-4">
            <h4 className="font-bold text-foreground text-sm mb-2">📝 Mẹo viết tốt</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Tiêu đề ngắn gọn, có số đo hoặc thông tin cụ thể.</li>
              <li>Sapo 2-3 câu tóm tắt nội dung quan trọng nhất.</li>
              <li>Body có sub-heading (## Tên section) cho mỗi 200-300 từ.</li>
              <li>Đính link nội bộ tới <Link to="/docs" className="text-foreground underline">/docs</Link> khi nhắc tới thuật ngữ.</li>
              <li>Tránh viết quá tự khen — đưa số liệu cụ thể.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    PENDING:   { color: 'text-amber-300 bg-amber-500/15 border-amber-500/30',  icon: <Clock className="w-3 h-3" />,        label: 'Chờ duyệt' },
    PUBLISHED: { color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Đã đăng' },
    REJECTED:  { color: 'text-rose-300 bg-rose-500/15 border-rose-500/30',     icon: <XCircle className="w-3 h-3" />,      label: 'Từ chối' },
    DRAFT:     { color: 'text-slate-300 bg-slate-500/15 border-slate-500/30',  icon: <AlertCircle className="w-3 h-3" />,  label: 'Nháp' },
  }
  const c = cfg[status] || cfg.DRAFT
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${c.color}`}>
      {c.icon} {c.label}
    </span>
  )
}
