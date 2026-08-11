/**
 * CareerEvolution — Timeline + đánh giá chung qua các lần làm bài.
 *
 * Hiển thị (chỉ khi history.length ≥ 1):
 *   - Timeline ngang các mốc làm bài (ngày + MBTI tag)
 *   - Phân tích nhất quán: MBTI ổn định bao nhiêu %, Holland chủ đạo,
 *     top 3 nghề được gợi ý nhiều lần nhất → kết luận chung
 *   - Đánh giá ngắn (đáng tin / cần làm lại / thay đổi đáng kể)
 *
 * Đầu vào: history[] từ careerService.getMyHistory()
 * Vai trò: gắn vào view "intro" trong /student/career — hiện ngay sau Hero,
 * giúp HS thấy hành trình + tổng kết hướng nghiệp dài hạn.
 */
import { useMemo } from 'react'
import { TrendingUp, Calendar, Sparkles, Target, BarChart3, AlertCircle, Brain } from 'lucide-react'
import type { CareerTestResult } from '@/types'

interface Props {
  history: CareerTestResult[]
  /** Click vào 1 mốc → restore bài đó vào view (cha pass handler) */
  onOpenResult?: (item: CareerTestResult) => void
}

interface Evolution {
  total: number
  spanDays: number
  mbtiCounts: Record<string, number>
  hollandCounts: Record<string, number>
  careerCounts: Record<string, number>
  dominantMbti: { type: string; percentage: number } | null
  dominantHolland: { letter: string; percentage: number } | null
  topCareers: Array<{ name: string; count: number }>
  consistency: 'high' | 'medium' | 'low'
  summary: string
}

const MBTI_NAMES: Record<string, string> = {
  INTJ: 'Nhà chiến lược', INTP: 'Nhà tư tưởng', ENTJ: 'Tổng tư lệnh', ENTP: 'Người tranh luận',
  INFJ: 'Người che chở', INFP: 'Người trung gian', ENFJ: 'Nhà sư phạm', ENFP: 'Nhà vận động',
  ISTJ: 'Nhà kỹ trị', ISFJ: 'Người bảo vệ', ESTJ: 'Nhà điều hành', ESFJ: 'Lãnh sự',
  ISTP: 'Nghệ nhân', ISFP: 'Nghệ sĩ', ESTP: 'Doanh nhân', ESFP: 'Người trình diễn',
}
const HOLLAND_LABELS: Record<string, string> = {
  R: 'Thực tế', I: 'Nghiên cứu', A: 'Nghệ thuật',
  S: 'Xã hội', E: 'Lãnh đạo', C: 'Quy củ',
}

// Phân tích toàn bộ lịch sử làm bài → MBTI/Holland/nghề chủ đạo + độ nhất quán
function analyse(history: CareerTestResult[]): Evolution {
  const total = history.length
  if (total === 0) {
    return {
      total: 0, spanDays: 0, mbtiCounts: {}, hollandCounts: {}, careerCounts: {},
      dominantMbti: null, dominantHolland: null, topCareers: [], consistency: 'low',
      summary: 'Chưa có dữ liệu',
    }
  }
  const sorted = [...history].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  const spanMs = +new Date(sorted[sorted.length - 1].createdAt) - +new Date(sorted[0].createdAt)
  const spanDays = Math.max(0, Math.round(spanMs / (24 * 3600 * 1000)))

  const mbtiCounts: Record<string, number> = {}
  const hollandCounts: Record<string, number> = {}
  const careerCounts: Record<string, number> = {}
  for (const r of sorted) {
    if (r.mbtiType) mbtiCounts[r.mbtiType] = (mbtiCounts[r.mbtiType] || 0) + 1
    if (r.hollandCode) for (const c of r.hollandCode.slice(0, 3)) hollandCounts[c] = (hollandCounts[c] || 0) + 1
    for (const c of r.careers || []) careerCounts[c] = (careerCounts[c] || 0) + 1
  }
  const topMbti = Object.entries(mbtiCounts).sort((a, b) => b[1] - a[1])[0]
  const topHolland = Object.entries(hollandCounts).sort((a, b) => b[1] - a[1])[0]
  const topCareers = Object.entries(careerCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const dominantMbti = topMbti ? { type: topMbti[0], percentage: Math.round((topMbti[1] / total) * 100) } : null
  const dominantHolland = topHolland ? { letter: topHolland[0], percentage: Math.round((topHolland[1] / (total * 3)) * 100) } : null

  // Consistency: nếu MBTI dominant ≥ 70% qua nhiều lần test → high
  let consistency: Evolution['consistency'] = 'medium'
  if (total >= 2 && dominantMbti) {
    if (dominantMbti.percentage >= 70) consistency = 'high'
    else if (dominantMbti.percentage < 40) consistency = 'low'
  }
  if (total === 1) consistency = 'medium'

  // Summary tiếng Việt
  let summary = ''
  if (total === 1) {
    summary = `Lần làm bài đầu tiên cho thấy bạn thuộc nhóm ${dominantMbti?.type} — hãy làm lại sau 2-4 tuần để xác nhận tính ổn định.`
  } else if (consistency === 'high') {
    summary = `Qua ${total} lần làm bài, bạn nhất quán ở nhóm ${dominantMbti?.type} (${dominantMbti?.percentage}%). Đây là tính cách thực sự — định hướng nghề nghiệp ĐÁNG TIN.`
  } else if (consistency === 'low') {
    summary = `Qua ${total} lần làm bài, kết quả thay đổi nhiều (${dominantMbti?.type} chỉ ${dominantMbti?.percentage}%). Có thể do tâm trạng khác nhau khi làm; nên làm lại lúc bình tĩnh nhất.`
  } else {
    summary = `Qua ${total} lần làm bài, bạn thường ra nhóm ${dominantMbti?.type} (${dominantMbti?.percentage}%). Kết quả khá nhất quán — định hướng nghề nghiệp đã rõ ràng.`
  }

  return {
    total, spanDays, mbtiCounts, hollandCounts, careerCounts,
    dominantMbti, dominantHolland, topCareers, consistency, summary,
  }
}

// Timeline + đánh giá chung: tính các thống kê rồi render dòng thời gian các mốc
export default function CareerEvolution({ history, onOpenResult }: Props) {
  const ev = useMemo(() => analyse(history), [history])
  if (ev.total === 0) return null

  const sorted = useMemo(
    () => [...history].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [history],
  )

  const consistencyColor = ev.consistency === 'high' ? '#10b981'
                         : ev.consistency === 'low'  ? '#f59e0b'
                         : '#22d3ee'

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-white/90">Hành trình hướng nghiệp của bạn</h3>
          <p className="text-xs text-white/40">
            {ev.total} lần làm bài
            {ev.spanDays > 0 && ` · trong ${ev.spanDays} ngày`}
          </p>
        </div>
        <span
          className="text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${consistencyColor}22`, color: consistencyColor }}
        >
          {ev.consistency === 'high' ? 'Nhất quán cao' : ev.consistency === 'low' ? 'Cần làm lại' : 'Khá nhất quán'}
        </span>
      </div>

      {/* Summary đánh giá chung */}
      <div className="rounded-xl p-3 mb-4 flex items-start gap-2"
        style={{ background: `${consistencyColor}10`, border: `1px solid ${consistencyColor}33` }}>
        {ev.consistency === 'low' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: consistencyColor }} />
          : <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: consistencyColor }} />}
        <p className="text-sm text-white/85 leading-relaxed flex-1">{ev.summary}</p>
      </div>

      {/* 3 cột: MBTI dominant · Holland chủ đạo · Top nghề xuất hiện nhiều nhất */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] uppercase text-white/40 font-semibold tracking-wide">MBTI chủ đạo</span>
          </div>
          {ev.dominantMbti && (
            <>
              <p className="text-2xl font-extrabold text-white">{ev.dominantMbti.type}</p>
              <p className="text-xs text-white/55">{MBTI_NAMES[ev.dominantMbti.type] || ''}</p>
              <p className="text-[11px] text-purple-300 mt-1.5">{ev.dominantMbti.percentage}% các lần test</p>
            </>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] uppercase text-white/40 font-semibold tracking-wide">Holland chủ đạo</span>
          </div>
          {ev.dominantHolland && (
            <>
              <p className="text-2xl font-extrabold text-white">{ev.dominantHolland.letter}</p>
              <p className="text-xs text-white/55">{HOLLAND_LABELS[ev.dominantHolland.letter] || ''}</p>
              <p className="text-[11px] text-cyan-300 mt-1.5">{ev.dominantHolland.percentage}% trọng số</p>
            </>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] uppercase text-white/40 font-semibold tracking-wide">Nghề lặp lại</span>
          </div>
          {ev.topCareers[0] ? (
            <>
              <p className="text-sm font-bold text-white truncate">{ev.topCareers[0].name}</p>
              <p className="text-[11px] text-amber-300 mt-1">{ev.topCareers[0].count}/{ev.total} lần gợi ý</p>
            </>
          ) : (
            <p className="text-xs text-white/40">Chưa có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Timeline ngang các mốc */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-white/45" />
          <span className="text-[11px] uppercase text-white/40 font-semibold tracking-wide">Các mốc đã làm bài</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {sorted.slice(0, 10).map((r, i) => {
            const d = new Date(r.createdAt)
            return (
              <button
                key={r.id ?? i}
                onClick={() => onOpenResult?.(r)}
                className="flex-shrink-0 text-left bg-white/[0.04] hover:bg-white/[0.08] rounded-lg border border-white/[0.08] hover:border-white/20 px-3 py-2 transition-all"
                title={`Xem lại bài làm ngày ${d.toLocaleString('vi-VN')}`}
              >
                <p className="text-[10px] text-white/45 font-mono">
                  {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                <p className="text-sm font-bold text-white">{r.mbtiType}</p>
                <p className="text-[10px] text-white/55 truncate max-w-[10rem]">{r.personalityName}</p>
              </button>
            )
          })}
          {sorted.length > 10 && (
            <div className="flex-shrink-0 flex items-center justify-center px-3 text-xs text-white/40">
              +{sorted.length - 10} mốc
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
