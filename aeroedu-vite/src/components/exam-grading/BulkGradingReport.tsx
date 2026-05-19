/**
 * BulkGradingReport — báo cáo phân tích sau khi chấm hàng loạt.
 *
 * Hiển thị khi BulkGrading có ít nhất 1 kết quả ok:
 *   1. Stats row: tổng số thí sinh, TB, cao nhất, thấp nhất, tỉ lệ đậu
 *   2. Biểu đồ phổ điểm (histogram 10 bins 0-1, 1-2, ..., 9-10)
 *   3. Pie chart phân loại học lực (Giỏi/Khá/TB/Yếu)
 *   4. Top 5 cao điểm + Top 5 thấp điểm
 *
 * Dùng recharts (đã có trong package.json). Responsive theme-aware.
 */
import { useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, TrendingUp, Award, AlertTriangle, Target, Download,
} from 'lucide-react'

export interface ReportRow {
  studentName?: string
  studentId?: string
  className?: string
  examCode?: string
  score?: number
  maxScore?: number
  correct?: number
  total?: number
  ok: boolean
}

interface Props {
  results: ReportRow[]
}

/* Phân loại học lực chuẩn Bộ GD&ĐT (thang 10) */
const PERFORMANCE_LEVELS = [
  { key: 'gioi', label: 'Giỏi (≥8.0)',    min: 8.0,  max: 10.1, color: '#10b981' }, // green
  { key: 'kha',  label: 'Khá (6.5-7.9)',  min: 6.5,  max: 8.0,  color: '#06b6d4' }, // cyan
  { key: 'tb',   label: 'TB (5.0-6.4)',   min: 5.0,  max: 6.5,  color: '#f59e0b' }, // amber
  { key: 'yeu',  label: 'Yếu (<5.0)',     min: 0,    max: 5.0,  color: '#ef4444' }, // red
] as const

export function BulkGradingReport({ results }: Props) {
  /* Filter chỉ những row có điểm hợp lệ */
  const validRows = useMemo(
    () => results.filter(r => r.ok && typeof r.score === 'number'),
    [results]
  )

  /* Stats tổng quát */
  const stats = useMemo(() => {
    if (validRows.length === 0) {
      return { total: 0, avg: 0, max: 0, min: 0, passRate: 0, median: 0, std: 0 }
    }
    const scores = validRows.map(r => r.score as number).sort((a, b) => a - b)
    const n = scores.length
    const sum = scores.reduce((s, x) => s + x, 0)
    const avg = Math.round((sum / n) * 100) / 100
    const max = scores[n - 1]
    const min = scores[0]
    const median = n % 2 === 0
      ? Math.round(((scores[n / 2 - 1] + scores[n / 2]) / 2) * 100) / 100
      : scores[Math.floor(n / 2)]
    const variance = scores.reduce((s, x) => s + (x - avg) ** 2, 0) / n
    const std = Math.round(Math.sqrt(variance) * 100) / 100
    const passed = scores.filter(s => s >= 5).length
    const passRate = Math.round((passed / n) * 1000) / 10  // 1 decimal %
    return { total: n, avg, max, min, passRate, median, std }
  }, [validRows])

  /* Histogram data: 10 bins từ 0 tới 10 */
  const histogram = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${i}-${i + 1}`,
      count: 0,
      pct: 0,
    }))
    for (const r of validRows) {
      const s = r.score as number
      // Đặc biệt: điểm 10 → bin cuối (9-10)
      const idx = s >= 10 ? 9 : Math.floor(s)
      if (idx >= 0 && idx < 10) bins[idx].count++
    }
    const total = validRows.length || 1
    bins.forEach(b => { b.pct = Math.round((b.count / total) * 1000) / 10 })
    return bins
  }, [validRows])

  /* Performance distribution */
  const performance = useMemo(() => {
    return PERFORMANCE_LEVELS.map(level => {
      const count = validRows.filter(r => {
        const s = r.score as number
        return s >= level.min && s < level.max
      }).length
      const pct = validRows.length > 0
        ? Math.round((count / validRows.length) * 1000) / 10
        : 0
      return { ...level, count, pct }
    }).filter(p => p.count > 0)  // hide empty slices
  }, [validRows])

  /* Top 5 cao + Top 5 thấp */
  const top5 = useMemo(
    () => [...validRows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5),
    [validRows]
  )
  const bottom5 = useMemo(
    () => [...validRows].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 5),
    [validRows]
  )

  /* Export full report CSV */
  const exportFullReport = () => {
    const lines: string[] = []
    lines.push('﻿BÁO CÁO CHẤM BÀI HÀNG LOẠT')
    lines.push(`Thời gian xuất,${new Date().toLocaleString('vi-VN')}`)
    lines.push('')
    lines.push('TỔNG QUAN')
    lines.push(`Tổng số thí sinh,${stats.total}`)
    lines.push(`Điểm trung bình,${stats.avg}`)
    lines.push(`Điểm trung vị,${stats.median}`)
    lines.push(`Độ lệch chuẩn,${stats.std}`)
    lines.push(`Điểm cao nhất,${stats.max}`)
    lines.push(`Điểm thấp nhất,${stats.min}`)
    lines.push(`Tỉ lệ đậu (≥5),${stats.passRate}%`)
    lines.push('')
    lines.push('PHÂN LOẠI HỌC LỰC')
    lines.push('Loại,Số lượng,Tỉ lệ')
    for (const p of PERFORMANCE_LEVELS) {
      const count = validRows.filter(r => {
        const s = r.score as number
        return s >= p.min && s < p.max
      }).length
      const pct = validRows.length > 0
        ? Math.round((count / validRows.length) * 1000) / 10
        : 0
      lines.push(`${p.label},${count},${pct}%`)
    }
    lines.push('')
    lines.push('PHỔ ĐIỂM')
    lines.push('Khoảng điểm,Số lượng,Tỉ lệ')
    histogram.forEach(b => lines.push(`${b.range},${b.count},${b.pct}%`))
    lines.push('')
    lines.push('CHI TIẾT TỪNG THÍ SINH')
    lines.push('STT,Họ tên,SBD,Lớp,Mã đề,Đúng,Tổng,Điểm /10')
    validRows
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .forEach((r, i) => {
        lines.push([
          i + 1,
          r.studentName ?? '',
          r.studentId ?? '',
          r.className ?? '',
          r.examCode ?? '',
          r.correct ?? '',
          r.total ?? '',
          r.score ?? '',
        ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      })

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `baocao-chamthi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (validRows.length === 0) {
    return null  // không render nếu chưa có kết quả
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            📊 Báo cáo chấm bài
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phân tích {validRows.length} thí sinh đã chấm thành công
          </p>
        </div>
        <button
          onClick={exportFullReport}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-50 dark:bg-purple-900/15 text-purple-700 dark:text-purple-300 text-sm font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
        >
          <Download className="w-4 h-4" />
          Xuất báo cáo CSV
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Thí sinh" value={stats.total} unit="" Icon={Users} accent="#a78bfa" />
        <StatCard label="Điểm TB" value={stats.avg} unit="/10" Icon={Target} accent="#06b6d4" />
        <StatCard label="Trung vị" value={stats.median} unit="/10" Icon={TrendingUp} accent="#10b981" />
        <StatCard label="Cao nhất" value={stats.max} unit="/10" Icon={Award} accent="#f59e0b" />
        <StatCard label="Thấp nhất" value={stats.min} unit="/10" Icon={AlertTriangle} accent="#ef4444" />
        <StatCard label="Đậu" value={stats.passRate} unit="%" Icon={TrendingUp} accent={stats.passRate >= 70 ? '#10b981' : stats.passRate >= 50 ? '#f59e0b' : '#ef4444'} />
      </div>

      {/* ── 2-col: Histogram + Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Histogram (chiếm 2/3) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            📈 Phổ điểm
            <span className="text-xs font-normal text-muted-foreground ml-2">
              Mỗi cột = số thí sinh trong khoảng điểm
            </span>
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogram} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="range"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                allowDecimals={false}
                tick={{ fill: 'hsl(var(--foreground))' }}
                label={{ value: 'Số thí sinh', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                formatter={(value: number, _name, item: any) => [`${value} thí sinh (${item.payload?.pct}%)`, 'Số lượng']}
                labelFormatter={(label) => `Điểm ${label}`}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histogram.map((bin, idx) => {
                  /* Color theo dải điểm: đỏ → cam → vàng → xanh dương → xanh lá */
                  const score = idx + 0.5
                  let fill = '#ef4444'  // đỏ <5
                  if (score >= 8) fill = '#10b981'      // xanh lá
                  else if (score >= 6.5) fill = '#06b6d4' // cyan
                  else if (score >= 5) fill = '#f59e0b'   // amber
                  return <Cell key={idx} fill={fill} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart phân loại học lực */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            🥧 Phân loại học lực
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={performance}
                cx="50%"
                cy="50%"
                outerRadius={75}
                dataKey="count"
                nameKey="label"
                label={(entry: any) => `${entry.pct}%`}
                labelLine={false}
                fontSize={11}
              >
                {performance.map((p, idx) => (
                  <Cell key={idx} fill={p.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, _name, item: any) => [`${value} thí sinh`, item?.payload?.label]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {performance.map(p => (
              <div key={p.key} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
                <span className="text-foreground">{p.label}</span>
                <span className="ml-auto font-semibold text-foreground">{p.count}</span>
                <span className="text-muted-foreground tabular-nums w-12 text-right">({p.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top 5 cao + thấp ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList
          title="🏆 Top 5 điểm cao nhất"
          rows={top5}
          accent="green"
        />
        <RankList
          title="⚠️ Top 5 điểm thấp nhất"
          rows={bottom5}
          accent="red"
        />
      </div>
    </div>
  )
}

/* ─── Sub-components ────────────────────────────────────────── */

function StatCard({ label, value, unit, Icon, accent }: {
  label: string
  value: number
  unit: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  accent: string
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold text-foreground">
        {value}
        <span className="text-xs text-muted-foreground font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  )
}

function RankList({ title, rows, accent }: {
  title: string
  rows: ReportRow[]
  accent: 'green' | 'red'
}) {
  const barColor = accent === 'green'
    ? 'bg-green-500'
    : 'bg-red-500'
  const textColor = accent === 'green'
    ? 'text-green-700 dark:text-green-400'
    : 'text-red-700 dark:text-red-400'

  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="font-semibold text-foreground mb-3 text-sm">{title}</h4>
      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Chưa có dữ liệu</p>
        )}
        {rows.map((r, idx) => {
          const score = r.score ?? 0
          const widthPct = Math.min(100, (score / 10) * 100)
          return (
            <div key={`${r.studentId}-${idx}`} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-muted-foreground text-xs font-mono shrink-0">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-foreground font-medium truncate">
                    {r.studentName || <span className="italic text-muted-foreground">— chưa OCR tên —</span>}
                  </span>
                  <span className={`font-bold tabular-nums shrink-0 ${textColor}`}>{score}/10</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${widthPct}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {r.className || ''} {r.examCode ? `· Mã ${r.examCode}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BulkGradingReport
