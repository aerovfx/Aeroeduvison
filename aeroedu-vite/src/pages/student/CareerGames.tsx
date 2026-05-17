/**
 * CareerGames — /student/games
 *
 * Dedicated landing hosting cả 2 pixel games (Pixel Odyssey + Pixel Agent).
 * Discoverable từ Sidebar, không cần đi qua Career trang chính.
 *
 * Layout:
 *   1. Pixel Odyssey — game khám phá nghề (always visible)
 *   2. Pixel Agent picker — chọn 1 nghề để xem mô phỏng 1 ngày
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Gamepad2, Search, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'
import PixelOdyssey from '@/components/career/PixelOdyssey'
import CareerDayPixelSim from '@/components/career/CareerDayPixelSim'
import { careerDetails } from '@/lib/career-detail-data'
import usePageTitle from '@/hooks/usePageTitle'

const ALL_CAREERS = Object.values(careerDetails)

export default function CareerGamesPage() {
  usePageTitle('Pixel Games — Khám phá nghề')

  const [searchParams, setSearchParams] = useSearchParams()
  // URL ?career=<id> → deep-link to specific career (validate id exists)
  const initialId = (() => {
    const fromUrl = searchParams.get('career')
    if (fromUrl && ALL_CAREERS.some(c => c.id === fromUrl)) return fromUrl
    return ALL_CAREERS[0].id
  })()
  const [selectedCareerId, setSelectedCareerId] = useState<string>(initialId)
  const [searchQuery, setSearchQuery] = useState('')

  // Sync state changes back to URL (no scroll, replace history)
  useEffect(() => {
    const current = searchParams.get('career')
    if (selectedCareerId && selectedCareerId !== current) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('career', selectedCareerId)
        return next
      }, { replace: true })
    }
  }, [selectedCareerId, searchParams, setSearchParams])

  const selected = useMemo(
    () => ALL_CAREERS.find(c => c.id === selectedCareerId) || ALL_CAREERS[0],
    [selectedCareerId]
  )

  // Filter careers theo search query (search name + category)
  const filteredCareers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return ALL_CAREERS
    return ALL_CAREERS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <Link to="/student/career" className="text-zinc-400 hover:text-zinc-100 p-1">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Gamepad2 className="w-5 h-5 text-amber-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Pixel Games</h1>
            <p className="text-[10px] text-zinc-500 leading-tight">
              Khám phá nghề qua game · cảm hứng pixel-agents + MetroCity
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        {/* Pixel Odyssey */}
        <section>
          <PixelOdyssey />
        </section>

        {/* Pixel Agent — career picker + sim */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-sm font-bold text-zinc-100 mb-1">🤖 Pixel Agent — Mô phỏng 1 ngày</h2>
            <p className="text-[11px] text-zinc-500">
              Chọn 1 nghề để xem character làm 1 ngày làm việc điển hình.
            </p>
          </div>

          {/* Search input + count */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nghề (vd: bác sĩ, IT, sáng tạo)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700
                           text-xs text-zinc-100 placeholder:text-zinc-500
                           focus:outline-none focus:border-cyan-400/50"
              />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
              {filteredCareers.length}/{ALL_CAREERS.length}
            </span>
          </div>

          {/* Career picker — horizontal scroll chips (filtered) */}
          {filteredCareers.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}>
              {filteredCareers.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCareerId(c.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    c.id === selectedCareerId
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 px-1 py-2">
              Không có nghề khớp với "{searchQuery}" — thử từ khoá khác
            </p>
          )}

          {/* Selected career sim */}
          <CareerDayPixelSim
            careerName={selected.name}
            category={selected.category}
            dailyLife={selected.dailyLife}
          />

          {/* Selected career info quick view */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{selected.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-zinc-100">{selected.name}</h3>
                <p className="text-[10px] text-zinc-500">{selected.category}</p>
              </div>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/student/games?career=${selected.id}`
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: `Pixel Agent: ${selected.name}`, url })
                    } else {
                      await navigator.clipboard.writeText(url)
                      toast.success('Đã copy link!')
                    }
                  } catch (_) { /* user cancel — ignore */ }
                }}
                title="Chia sẻ link tới nghề này"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-300 shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{selected.shortDescription}</p>
            <Link
              to="/student/career"
              className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 mt-2"
            >
              Xem chi tiết nghề →
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
