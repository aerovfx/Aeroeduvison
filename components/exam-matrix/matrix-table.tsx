"use client"

import { Trash2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type MatrixSection,
  SECTION_COLOR_CLASSES,
} from "@/lib/constants/question-bank"

// ─── Cognitive levels (NB / TH / VD — standard Bloom 3-level) ───────────────

export const MATRIX_LEVELS = [
  { key: "Biết",      label: "NB", fullLabel: "Nhận biết"  },
  { key: "Hiểu",      label: "TH", fullLabel: "Thông hiểu" },
  { key: "Vận dụng",  label: "VD", fullLabel: "Vận dụng"   },
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Topic {
  id: string
  order: number
  topic: string
  content: string
  soTiet?: number
  distributions: {
    questionType: string
    cognitiveLevel: string
    count: number
  }[]
  percentageScore?: number
}

interface MatrixTableProps {
  /** Active sections — determines which column groups render */
  sections: MatrixSection[]
  topics: Topic[]
  totalScore: number
  totalQuestions?: number
  /** Scores keyed by section.key (e.g. { TNKQ_Nhiều_lựa_chọn: 5, Tự_luận: 3 }) */
  sectionScores?: Record<string, number>
  onUpdateTopic: (topicId: string, updates: Partial<Topic>) => void
  onUpdateDistribution: (
    topicId: string,
    questionType: string,
    cognitiveLevel: string,
    count: number
  ) => void
  onDeleteTopic: (topicId: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MatrixTable({
  sections = [],
  topics = [],
  totalScore,
  totalQuestions,
  sectionScores = {},
  onUpdateTopic,
  onUpdateDistribution,
  onDeleteTopic,
}: MatrixTableProps) {

  // ── Safety guards (defend against null/undefined props) ───────────────────
  const safeSections = (sections ?? []).filter((s) => s && s.key)
  const safeTopics   = (topics ?? []).filter((t) => t && t.id)

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getCount = (topic: Topic | undefined | null, qType: string, level: string) => {
    if (!topic || !topic.distributions) return 0
    const dist = topic.distributions?.find(
      (d) => d.questionType === qType && d.cognitiveLevel === level
    )
    return dist?.count ?? 0
  }

  const getColumnTotal = (qType: string, level: string) =>
    safeTopics.reduce((sum, t) => sum + getCount(t, qType, level), 0)

  const getRowTotal = (topic: Topic) => {
    if (!topic) return 0
    return safeSections.reduce(
      (sum, s) =>
        sum + MATRIX_LEVELS.reduce((s2, l) => s2 + getCount(topic, s.key, l.key), 0),
      0
    )
  }

  const getGrandTotal = () => safeTopics.reduce((sum, t) => sum + getRowTotal(t), 0)

  const getLevelTotal = (level: string) =>
    safeSections.reduce((sum, s) => sum + getColumnTotal(s.key, level), 0)

  // ── Derived stats ─────────────────────────────────────────────────────────

  const grandTotal  = getGrandTotal()
  const isValid     = totalQuestions === undefined || grandTotal === totalQuestions
  const soTietTotal = safeTopics.reduce((sum, t) => sum + (t.soTiet || 0), 0)

  const nbTotal  = getLevelTotal("Biết")
  const thTotal  = getLevelTotal("Hiểu")
  const vdTotal  = getLevelTotal("Vận dụng")
  const totalAll = nbTotal + thTotal + vdTotal
  const pct = (n: number) => (totalAll > 0 ? Math.round((n / totalAll) * 100) : 0)

  // Colour index for section header bands (cycles through 4 colours)
  const colorOf = (i: number) => SECTION_COLOR_CLASSES[i % SECTION_COLOR_CLASSES.length]

  // Column count = sections × 3 levels + 2 (Nội dung + Số tiết) + 2 (Tổng + Action)
  const totalCols = 2 + safeSections.length * 3 + 2

  // ─────────────────────────────────────────────────────────────────────────

  if (safeSections.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-xs italic">
        Chưa có phần thi nào được chọn. Hãy cấu hình loại ma trận ở trên.
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Validation badge ───────────────────────────────────────────── */}
      {totalQuestions !== undefined && (
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded ${
            isValid
              ? "bg-green-50 text-green-700 border"
              : "bg-red-50 text-red-700 border"
          }`}
        >
          {isValid
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle  className="h-3.5 w-3.5 shrink-0" />}
          <span>
            Tổng số câu: <strong>{grandTotal}</strong>
            {!isValid && (
              <>
                {" "}/ Yêu cầu: <strong>{totalQuestions}</strong>{" "}
                ({grandTotal > totalQuestions ? "+" : ""}{grandTotal - totalQuestions} câu)
              </>
            )}
            {isValid && <> / {totalQuestions} — Đạt yêu cầu ✓</>}
          </span>
        </div>
      )}

      {/* ── Main matrix table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>

            {/* Row 1 — top headers */}
            <tr className="bg-muted/[0.03]">
              <th rowSpan={3} className="border px-2.5 py-2 text-left text-[10px] font-semibold min-w-[180px]">
                Nội dung
              </th>
              <th rowSpan={3} className="border px-1.5 py-2 text-center text-[10px] font-semibold w-14">
                Số tiết
              </th>
              <th
                colSpan={safeSections.length * 3}
                className="border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Cấp độ tư duy
              </th>
              <th rowSpan={3} className="border px-1.5 py-2 text-center text-[10px] font-semibold w-16 leading-tight">
                Tổng số<br />câu/ý
              </th>
              <th rowSpan={3} className="border w-8" />
            </tr>

            {/* Row 2 — PHẦN labels */}
            <tr>
              {safeSections.map((s, i) => (
                <th
                  key={`hdr2-${s.key}`}
                  colSpan={3}
                  className={`border px-1.5 py-1.5 text-center text-[10px] font-semibold ${colorOf(i)}`}
                >
                  <span className="font-bold">{s.label}</span>
                  <span className="block font-normal text-muted-foreground text-[9px] leading-tight mt-0.5">
                    {s.sublabel}
                  </span>
                </th>
              ))}
            </tr>

            {/* Row 3 — NB / TH / VD */}
            <tr>
              {safeSections.map((s, i) =>
                MATRIX_LEVELS.map((l) => (
                  <th
                    key={`hdr3-${s.key}-${l.key}`}
                    title={l.fullLabel}
                    className={`border px-1.5 py-1.5 text-center text-[10px] font-medium w-12 ${colorOf(i)}`}
                  >
                    {l.label}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {safeTopics.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="border px-3 py-8 text-center text-muted-foreground italic text-xs"
                >
                  Chưa có nội dung. Nhấn "Thêm nội dung" ở bên dưới để bắt đầu.
                </td>
              </tr>
            )}

            {safeTopics.map((topic) => (
              <tr key={topic.id} className="hover:bg-muted/[0.02] transition-colors">

                {/* Nội dung */}
                <td className="border px-1.5 py-1.5 align-top">
                  <div className="flex items-start gap-1">
                    <span className="text-muted-foreground text-[10px] font-medium mt-1.5 shrink-0 w-3.5 text-right">
                      {topic.order}.
                    </span>
                    <div className="flex-1 space-y-1 min-w-0">
                      <Input
                        value={topic.topic}
                        onChange={(e) => onUpdateTopic(topic.id, { topic: e.target.value })}
                        placeholder="Tên chủ đề / đơn vị kiến thức"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={topic.content}
                        onChange={(e) => onUpdateTopic(topic.id, { content: e.target.value })}
                        placeholder="Ghi chú (tuỳ chọn)"
                        className="h-6 text-[10px] text-muted-foreground border-dashed bg-transparent"
                      />
                    </div>
                  </div>
                </td>

                {/* Số tiết */}
                <td className="border p-0.5 text-center align-top">
                  <Input
                    type="number"
                    min="0"
                    value={topic.soTiet || ""}
                    onChange={(e) =>
                      onUpdateTopic(topic.id, { soTiet: parseInt(e.target.value) || 0 })
                    }
                    className="w-12 h-7 text-center text-xs mx-auto block"
                    placeholder="—"
                  />
                </td>

                {/* Distribution cells */}
                {safeSections.map((s, si) =>
                  MATRIX_LEVELS.map((l) => (
                    <td
                      key={`cell-${topic.id}-${s.key}-${l.key}`}
                      className={`border p-0.5 text-center ${colorOf(si)}`}
                    >
                      <Input
                        type="number"
                        min="0"
                        value={getCount(topic, s.key, l.key) || ""}
                        onChange={(e) =>
                          onUpdateDistribution(
                            topic.id,
                            s.key,
                            l.key,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-10 h-7 text-center text-xs mx-auto block bg-transparent"
                        placeholder="—"
                      />
                    </td>
                  ))
                )}

                {/* Row total */}
                <td className="border px-1.5 py-1.5 text-center font-semibold text-foreground align-middle">
                  {getRowTotal(topic) || "–"}
                </td>

                {/* Delete */}
                <td className="border p-0.5 text-center align-middle">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTopic(topic.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            {/* Tổng row */}
            <tr className="bg-muted/[0.03] font-semibold">
              <td className="border px-2.5 py-2 font-bold text-xs">Tổng</td>
              <td className="border px-1.5 py-2 text-center text-xs">
                {soTietTotal || "–"}
              </td>
              {safeSections.map((s, si) =>
                MATRIX_LEVELS.map((l) => {
                  const val = getColumnTotal(s.key, l.key)
                  return (
                    <td
                      key={`foot-${s.key}-${l.key}`}
                      className={`border px-1 py-1.5 text-center text-xs font-semibold ${colorOf(si)}`}
                    >
                      {val || "–"}
                    </td>
                  )
                })
              )}
              <td className="border px-1.5 py-2 text-center font-bold text-sm">
                {grandTotal || "–"}
              </td>
              <td className="border" />
            </tr>

            {/* Điểm row */}
            <tr className="bg-blue-50/30">
              <td className="border px-2.5 py-2 font-semibold text-xs text-blue-800">
                Điểm
              </td>
              <td className="border" />
              {safeSections.map((s, si) => (
                <td
                  key={`score-${s.key}`}
                  colSpan={3}
                  className={`border px-1.5 py-2 text-center font-bold text-xs ${
                    si === 0 ? "text-blue-700"
                    : si === 1 ? "text-emerald-700"
                    : si === 2 ? "text-amber-700"
                    : "text-purple-700"
                  }`}
                >
                  {sectionScores[s.key] ?? "—"}
                </td>
              ))}
              <td className="border px-1.5 py-2 text-center font-bold text-foreground">
                {totalScore}
              </td>
              <td className="border" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Cognitive level distribution summary ──────────────────────── */}
      {totalAll > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Phân bố số câu (ý) theo cấp độ tư duy
          </p>
          <table className="text-xs border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/[0.03]">
                <th className="border px-4 py-1.5 text-left font-medium text-muted-foreground min-w-[100px]" />
                <th className="border px-4 py-1.5 text-center font-semibold text-blue-700">Nhận biết</th>
                <th className="border px-4 py-1.5 text-center font-semibold text-emerald-700">Thông hiểu</th>
                <th className="border px-4 py-1.5 text-center font-semibold text-amber-700">Vận dụng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-1.5 font-medium text-muted-foreground">Số câu (ý)</td>
                <td className="border px-4 py-1.5 text-center font-bold text-blue-700">{nbTotal}</td>
                <td className="border px-4 py-1.5 text-center font-bold text-emerald-700">{thTotal}</td>
                <td className="border px-4 py-1.5 text-center font-bold text-amber-700">{vdTotal}</td>
              </tr>
              <tr className="bg-muted/[0.02]">
                <td className="border px-4 py-1.5 font-medium text-muted-foreground">Tỉ lệ</td>
                <td className="border px-4 py-1.5 text-center text-blue-700">{pct(nbTotal)}%</td>
                <td className="border px-4 py-1.5 text-center text-emerald-700">{pct(thTotal)}%</td>
                <td className="border px-4 py-1.5 text-center text-amber-700">{pct(vdTotal)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
