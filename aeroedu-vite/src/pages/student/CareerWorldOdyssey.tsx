/**
 * /student/career-world — Page wrapper cho game Career World Odyssey.
 *
 * Pixel Odyssey mở rộng với 25 nghề, 5 quận và 3 câu hỏi mỗi nghề.
 */
import { Link } from 'react-router-dom'
import { ChevronLeft, Compass } from 'lucide-react'
import CareerWorldOdyssey from '@/components/career/CareerWorldOdyssey'
import usePageTitle from '@/hooks/usePageTitle'

export default function CareerWorldOdysseyPage() {
  usePageTitle('Career World — Khám phá 25 nghề')

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12 overflow-auto">
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <Link to="/student/games" className="text-zinc-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Compass className="w-5 h-5 text-amber-300" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Career World</h1>
            <p className="text-[11px] text-zinc-500 leading-tight">
              Pixel Odyssey mở rộng · 25 nghề · 5 quận · 3 câu hỏi mỗi nghề
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-4">
        <CareerWorldOdyssey />
      </main>
    </div>
  )
}
