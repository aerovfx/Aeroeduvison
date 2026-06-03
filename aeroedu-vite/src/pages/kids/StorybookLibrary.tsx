/**
 * StorybookLibrary — thư viện Flipbook có audio cho thiếu nhi.
 *
 * • Bé/PH: lưới truyện đầy màu sắc, bấm để đọc (xem + nghe).
 * • GV/Admin: nút "Tạo truyện mới" + khu "Truyện của tôi" (sửa/nháp).
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Pencil, Loader2, Volume2, Home, Sparkles, Eye } from 'lucide-react'
import { listStorybooks } from '@/services/storybook.service'
import type { Storybook } from '@/types/storybook'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ShareMenu from '@/components/common/ShareMenu'

export default function StorybookLibrary() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN'

  const [books, setBooks] = useState<Storybook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listStorybooks(false)
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  const mine = isTeacher && user ? books.filter((b) => b.ownerId === user.id) : []
  const published = books.filter((b) => b.published)

  const Card = ({ b, manage }: { b: Storybook; manage?: boolean }) => (
    <div className="group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition">
      <Link to={`/kids/storybooks/${b.id}`} className="block">
        <div className="aspect-[4/3] bg-gradient-to-br from-indigo-200 to-pink-200 dark:from-indigo-900 dark:to-pink-900 overflow-hidden">
          {b.coverUrl
            ? <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
            : <div className="w-full h-full flex items-center justify-center text-white/70"><BookOpen className="w-16 h-16" /></div>}
        </div>
        <div className="p-3">
          <div className="font-black text-base sm:text-lg text-slate-800 dark:text-white truncate">{b.title}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {b.pages?.length || 0} trang</span>
            <span className="inline-flex items-center gap-1"><Volume2 className="w-3.5 h-3.5 text-pink-500" /> {b.mode === 'narration' ? 'Kể chuyện' : 'Audio/trang'}</span>
          </div>
          {b.ownerName && <div className="text-[11px] text-slate-400 mt-1 truncate">GV: {b.ownerName}</div>}
        </div>
      </Link>
      <div className="absolute top-2 left-2 z-10">
        <ShareMenu path={`/kids/storybooks/${b.id}`} title={b.title} embeddable />
      </div>
      {manage && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          {!b.published && <span className="px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-black shadow">NHÁP</span>}
          <button onClick={() => navigate(`/kids/storybooks/${b.id}/edit`)}
            className="w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-indigo-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Link to="/kids/aero" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-white font-bold shadow hover:bg-white">
            <Home className="w-4 h-4" /> AeroKids
          </Link>
          <h1 className="flex-1 text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-400" /> Truyện tranh có giọng kể
          </h1>
          {isTeacher && (
            <button onClick={() => navigate('/kids/storybooks/new')}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-black shadow-lg hover:scale-105 transition flex items-center gap-1.5">
              <Plus className="w-5 h-5" /> Tạo truyện mới
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
        ) : (
          <>
            {isTeacher && mine.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><Pencil className="w-4 h-4" /> Truyện của tôi</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mine.map((b) => <Card key={b.id} b={b} manage />)}
                </div>
              </section>
            )}

            <section>
              {isTeacher && <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><Eye className="w-4 h-4" /> Đã xuất bản</h2>}
              {published.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-indigo-200 dark:border-slate-700 p-12 text-center text-slate-400">
                  <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-40" />
                  <p className="font-bold text-lg">Chưa có truyện nào.</p>
                  {isTeacher && <p className="text-sm mt-1">Bấm “Tạo truyện mới” để thêm sách đầu tiên cho các bé nhé!</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {published.map((b) => <Card key={b.id} b={b} manage={isTeacher && b.ownerId === user?.id} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
