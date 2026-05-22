/**
 * SoftSkillsPanel — Panel kỹ năng mềm cho HS/GV/PH trong KG.
 *
 * Hiển thị danh sách kỹ năng mềm theo role + self-assess slider 1-5 +
 * gợi ý hoạt động rèn luyện. State lưu localStorage theo userId.
 *
 * KG hiện chấm điểm hard skills tự động qua activities; soft skills
 * khó tự đo → kết hợp self-assess + tracking hoạt động liên quan.
 */
import { useEffect, useState } from 'react'
import { Heart, ChevronDown, Sparkles } from 'lucide-react'
import { getSoftSkillsForRole, type Role, type SoftSkill } from '@/lib/soft-skills'

interface Props {
  role: Role
  /** userId để persist self-assess theo từng user */
  userId?: string | null
}

const RATING_LABELS = ['Chưa biết', 'Mới bắt đầu', 'Đang học', 'Thành thạo', 'Chuyên gia']

export default function SoftSkillsPanel({ role, userId }: Props) {
  const skills = getSoftSkillsForRole(role)
  const storageKey = `soft-skills-rating:${role}:${userId || 'anon'}`

  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(ratings)) } catch { /* ignore */ }
  }, [ratings, storageKey])

  const setRating = (id: string, val: number) => {
    setRatings(prev => ({ ...prev, [id]: val }))
  }

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const totalRated = Object.keys(ratings).length
  const avgRating = totalRated > 0
    ? Object.values(ratings).reduce((s, v) => s + v, 0) / totalRated
    : 0

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-pink-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-rose-500/20 bg-black/20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-rose-100">
              💝 Kỹ năng mềm ({skills.length})
            </h3>
            <p className="text-[11px] text-rose-200/70">
              {role === 'STUDENT' && 'Năng lực 21st-century song hành với kiến thức hàn lâm'}
              {role === 'TEACHER' && 'Nền tảng cho mọi tương tác giáo dục hiệu quả'}
              {role === 'PARENT'  && 'Xây quan hệ tin tưởng + nuôi con tự lập'}
            </p>
          </div>
          {totalRated > 0 && (
            <div className="text-right flex-shrink-0">
              <div className="text-base font-bold text-rose-200">
                {avgRating.toFixed(1)}/5
              </div>
              <div className="text-[10px] text-rose-300/70">
                {totalRated}/{skills.length} đã đánh giá
              </div>
            </div>
          )}
        </div>
        {totalRated < skills.length && (
          <div className="mt-2 flex items-start gap-2 text-[11px] text-rose-200/80">
            <Sparkles className="w-3.5 h-3.5 text-rose-300 flex-shrink-0 mt-0.5" />
            <span>
              Self-assess giúp KG mềm phát triển. Mở rộng từng skill, kéo slider 1-5
              + xem hoạt động gợi ý để rèn luyện.
            </span>
          </div>
        )}
      </div>

      {/* Skill list */}
      <div className="divide-y divide-rose-500/15">
        {skills.map(skill => {
          const rating = ratings[skill.id] ?? 0
          const isOpen = expanded.has(skill.id)
          return (
            <div key={skill.id}>
              <button
                onClick={() => toggle(skill.id)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-rose-500/5 text-left"
              >
                <span className="text-xl">{skill.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-rose-100 truncate">{skill.label}</div>
                  <div className="text-[11px] text-rose-200/60 truncate">{skill.shortDesc}</div>
                </div>
                {rating > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/40">
                    {rating}/5
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-rose-300/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3 bg-black/20">
                  <RatingRow skill={skill} rating={rating} onChange={(v) => setRating(skill.id, v)} />
                  <div>
                    <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1.5">
                      🎯 Hoạt động rèn luyện
                    </div>
                    <ul className="space-y-1">
                      {skill.activities.map((act, i) => (
                        <li key={i} className="text-[12px] text-rose-100/80 flex items-start gap-2">
                          <span className="text-rose-400 flex-shrink-0">•</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RatingRow({
  skill, rating, onChange,
}: { skill: SoftSkill; rating: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5">
      <p className="text-[12px] text-rose-100/90 italic mb-2">"{skill.selfAssessQuestion}"</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 py-1.5 rounded text-[10.5px] font-bold transition-all ${
              rating === v
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : rating > 0 && v <= rating
                  ? 'bg-rose-500/40 text-rose-100'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[9.5px] text-rose-300/60 px-1">
        {RATING_LABELS.map((l, i) => (
          <span key={i} className={rating === i + 1 ? 'text-rose-200 font-bold' : ''}>
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
