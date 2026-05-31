/**
 * AdmissionsPanel — Bảng điểm chuẩn ĐH 2024-2025 + gợi ý điểm cần đạt.
 *
 * Hiển thị bên trong view "career-detail":
 *   - Tìm các ngành học liên quan (CAREER_MAJOR_MAP) cho nghề đang xem
 *   - Mỗi ngành: bảng top trường + điểm chuẩn 2024 / 2023 / học bạ + xu hướng
 *   - 2 slider: học bạ TB (5.0-10.0) + điểm thi dự kiến (15.0-30.0)
 *   - Mỗi hàng tự đánh giá "Đủ / Sát / Cần thêm X / Khó" theo điểm user nhập
 *   - Card xu hướng ngành (hot/ổn định/giảm) + lương khởi điểm tham khảo
 *
 * Persist input vào localStorage('career_admissions_input_v1') để lần sau quay
 * lại không phải nhập lại.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap, TrendingUp, TrendingDown, Minus, Info,
  Sliders, MapPin, DollarSign, AlertCircle,
} from 'lucide-react'
import type { CareerDetail } from '@/lib/career-detail-data'
import {
  findMajorsForCareer,
  evaluateAdmissionFit,
  cutoffTrend,
  type MajorAdmission,
  type UniversityCutoff,
} from '@/lib/career-admissions-data'

interface Props {
  career: CareerDetail
}

const STORAGE_KEY = 'career_admissions_input_v1'

interface UserInput {
  examScore: number       // tổng 3 môn / 30
  transcriptAvg: number   // học bạ TB / 10
}
const DEFAULT_INPUT: UserInput = { examScore: 24, transcriptAvg: 8.0 }

function readInput(): UserInput {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_INPUT, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_INPUT
}

function transcriptTo30(avg: number): number {
  // Học bạ TB 5 môn (thang 10) → quy ước nhân 3 (thang 30)
  return +(avg * 3).toFixed(2)
}

function trendBadge(trend: MajorAdmission['trend']) {
  const map = {
    hot:        { color: '#ef4444', icon: '🔥' },
    stable:     { color: '#22d3ee', icon: '➡️' },
    recovering: { color: '#10b981', icon: '📈' },
    declining:  { color: '#f59e0b', icon: '📉' },
  } as const
  const m = map[trend.direction]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: `${m.color}1a`, color: m.color, border: `1px solid ${m.color}40` }}>
      {m.icon} {trend.label}
    </span>
  )
}

function CutoffTrendArrow({ u }: { u: UniversityCutoff }) {
  const t = cutoffTrend(u)
  if (!t) return null
  if (t.direction === 'flat') return <span className="inline-flex items-center gap-0.5 text-[10px] text-white/45"><Minus className="w-2.5 h-2.5" /> ổn định</span>
  if (t.direction === 'up')   return <span className="inline-flex items-center gap-0.5 text-[10px] text-red-300"><TrendingUp className="w-2.5 h-2.5" /> +{t.delta.toFixed(2)}</span>
  return                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300"><TrendingDown className="w-2.5 h-2.5" /> {t.delta.toFixed(2)}</span>
}

export default function AdmissionsPanel({ career }: Props) {
  const [input, setInput] = useState<UserInput>(() => readInput())
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(input)) }, [input])

  const majors = useMemo(() => findMajorsForCareer(career.name), [career.name])
  const transcript30 = transcriptTo30(input.transcriptAvg)

  if (majors.length === 0) {
    return (
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/55">
            Chưa có dữ liệu điểm chuẩn cho nghề <b className="text-white/80">{career.name}</b>. Bạn có thể tham khảo các trường gần ngành ở phần "Trường đại học khuyến nghị" bên dưới.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[hsl(265,40%,12%)] via-[hsl(245,40%,12%)] to-[hsl(210,40%,12%)] rounded-2xl border border-white/[0.08] p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-white">Điểm chuẩn ĐH 2024-2025 & gợi ý điểm cần đạt</h3>
          <p className="text-xs text-white/45 mt-0.5">
            Dữ liệu công khai năm 2024 — nguồn tham khảo, cần verify lại trên website chính thức của trường trước khi nộp.
          </p>
        </div>
      </div>

      {/* Sliders — học bạ + điểm thi */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-300" />
          <span className="text-sm font-semibold text-white/85">Điểm hiện tại của bạn</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-white/65">📚 Học bạ TB (thang 10)</label>
            <span className="text-sm font-bold text-emerald-300">{input.transcriptAvg.toFixed(2)}
              <span className="text-white/40 text-[10px] font-normal ml-1">≈ {transcript30}/30 quy đổi</span>
            </span>
          </div>
          <input type="range" min={5} max={10} step={0.05}
            value={input.transcriptAvg}
            onChange={e => setInput(s => ({ ...s, transcriptAvg: parseFloat(e.target.value) }))}
            className="w-full accent-emerald-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-white/65">📝 Điểm thi THPT dự kiến (3 môn, thang 30)</label>
            <span className="text-sm font-bold text-cyan-300">{input.examScore.toFixed(2)}<span className="text-white/40 text-[10px] font-normal ml-1">/30</span></span>
          </div>
          <input type="range" min={15} max={30} step={0.1}
            value={input.examScore}
            onChange={e => setInput(s => ({ ...s, examScore: parseFloat(e.target.value) }))}
            className="w-full accent-cyan-400"
          />
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          Mỗi hàng trường dưới đây sẽ tự đánh giá: bạn ĐỦ điểm / SÁT chuẩn / CẦN THÊM X điểm — dựa trên cao hơn giữa 2 điểm bạn nhập.
        </p>
      </div>

      {/* Per-major panels */}
      {majors.map((m) => (
        <div key={m.id} className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Major header */}
          <div className="bg-white/[0.03] px-4 py-3 border-b border-white/[0.06] flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white">{m.name}</h4>
              {m.code && <p className="text-[10px] text-white/35 font-mono mt-0.5">Mã ngành: {m.code}</p>}
            </div>
            {trendBadge(m.trend)}
            {m.startingSalary && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <DollarSign className="w-3 h-3" />
                {m.startingSalary.min}-{m.startingSalary.max}tr/tháng
              </span>
            )}
          </div>

          <div className="px-4 py-3">
            <p className="text-[12px] text-white/60 leading-relaxed mb-3 flex items-start gap-1.5">
              <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-300" />
              <span>{m.trend.note}</span>
            </p>

            {/* Universities table */}
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-white/35 border-b border-white/[0.06]">
                    <th className="pb-2 text-left font-medium px-2">Trường</th>
                    <th className="pb-2 text-center font-medium w-20">Khối</th>
                    <th className="pb-2 text-right font-medium w-20">CC 2024</th>
                    <th className="pb-2 text-right font-medium w-16">'23→'24</th>
                    <th className="pb-2 text-right font-medium w-32 px-2">Khả năng đỗ</th>
                  </tr>
                </thead>
                <tbody>
                  {m.universities.map((u) => {
                    // Lấy điểm cao hơn giữa thi và học bạ (xét tuyển kết hợp thường lấy max)
                    const bestUserPts = Math.max(input.examScore, transcript30)
                    const fit = evaluateAdmissionFit(bestUserPts, u.cutoff2024)
                    return (
                      <tr key={u.code} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        <td className="py-2 px-2">
                          <p className="text-xs text-white/85 font-medium leading-tight">{u.name}</p>
                          <p className="text-[10px] text-white/40 flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {u.location}
                          </p>
                          {u.notes && <p className="text-[10px] text-amber-300/80 mt-1 italic">{u.notes}</p>}
                        </td>
                        <td className="py-2 text-center text-[10px] text-white/60 font-mono">
                          {u.groups.join(', ')}
                        </td>
                        <td className="py-2 text-right">
                          {u.cutoff2024 != null ? (
                            <span className="text-sm font-bold text-white">{u.cutoff2024.toFixed(2)}</span>
                          ) : (
                            <span className="text-[10px] text-white/35">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <CutoffTrendArrow u={u} />
                        </td>
                        <td className="py-2 text-right px-2">
                          {fit ? (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: `${fit.color}22`, color: fit.color, border: `1px solid ${fit.color}55` }}>
                              {fit.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/35">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Disclaimer */}
      <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/25 px-3 py-2 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-100/90 leading-relaxed">
          <b>Lưu ý:</b> Điểm chuẩn và xu hướng là số liệu công khai 2024 — mỗi mùa tuyển sinh trường công bố lại.
          Trước khi nộp hồ sơ, hãy kiểm tra website chính thức của trường và bộ GD&ĐT (tuyensinh.moet.gov.vn) để có thông tin mới nhất.
        </p>
      </div>
    </div>
  )
}
