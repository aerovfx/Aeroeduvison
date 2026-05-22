/**
 * Admin Insights — Module phân tích hành vi user + trending topics/exams
 *  + auto-recommendations
 *
 * 4 sections:
 *   1. Behavior — DAU/WAU/MAU + hourly distribution + entry pages + bounce by role
 *   2. Trending Topics — bar chart by subject với growth %
 *   3. Trending Exams — table top exams với pass rate
 *   4. Recommendations — auto-generated cards (high/medium/low priority)
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Activity, TrendingUp, TrendingDown, Minus, BookOpen, FileText, Sparkles,
  RefreshCw, Loader2, ArrowUpRight, AlertTriangle, Lightbulb, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, AreaChart, Area,
} from 'recharts'
import { adminInsightsService, type BehaviorData, type TrendingTopic, type TrendingExam, type Recommendation } from '@/services/adminInsights.service'
import { toast } from 'react-hot-toast'
import { ExportMenu } from '@/components/common/ExportMenu'
import type { SheetData } from '@/lib/exportReport'

const D = {
  bg: '#0d0e17', card: '#10111e', card2: '#161728',
  border: '#1e2033', border2: '#2a2b3d',
  text: '#f1f5f9', muted: '#94a3b8', purple: '#7c3aed',
} as const

const TIER_COLORS = {
  high: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)', text: '#f87171', label: 'CAO' },
  medium: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24', label: 'TRUNG' },
  low: { bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa', label: 'THẤP' },
}

const CATEGORY_LABELS = {
  engagement: { label: 'Tương tác', color: '#a78bfa' },
  ux: { label: 'UX', color: '#34d399' },
  content: { label: 'Nội dung', color: '#fbbf24' },
}

export default function AdminInsights() {
  const [behavior, setBehavior] = useState<BehaviorData | null>(null)
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [exams, setExams] = useState<TrendingExam[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [b, t, e, r] = await Promise.all([
        adminInsightsService.getBehavior().catch(() => null),
        adminInsightsService.getTrendingTopics().catch(() => []),
        adminInsightsService.getTrendingExams().catch(() => []),
        adminInsightsService.getRecommendations().catch(() => []),
      ])
      setBehavior(b)
      setTopics(t)
      setExams(e)
      setRecommendations(r)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tải được dữ liệu insights')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  /** Build sheets cho export — 4 sections của Insights */
  const getExportSheets = useCallback((): SheetData[] => {
    const sheets: SheetData[] = []
    if (behavior) {
      sheets.push({
        name: 'Hành vi người dùng',
        columns: [
          { key: 'metric', label: 'Chỉ số' },
          { key: 'value', label: 'Giá trị', type: 'number' },
        ],
        rows: [
          { metric: 'DAU (Daily Active Users)', value: behavior.dau },
          { metric: 'WAU (Weekly Active Users)', value: behavior.wau },
          { metric: 'MAU (Monthly Active Users)', value: behavior.mau },
          { metric: 'Stickiness (DAU/MAU %)', value: behavior.stickiness },
        ],
      })
      if (Array.isArray(behavior.hourly)) {
        sheets.push({
          name: 'Phân bố theo giờ',
          columns: [
            { key: 'hour',           label: 'Giờ' },
            { key: 'views',          label: 'Lượt xem',  type: 'number' },
            { key: 'unique_sessions',label: 'Phiên unique', type: 'number' },
          ],
          rows: behavior.hourly.map(r => ({ ...r, hour: `${r.hour}h` })),
        })
      }
      if (Array.isArray(behavior.topEntries)) {
        sheets.push({
          name: 'Trang vào (entry pages)',
          columns: [
            { key: 'path',     label: 'Đường dẫn' },
            { key: 'sessions', label: 'Số phiên', type: 'number' },
          ],
          rows: behavior.topEntries,
        })
      }
      if (Array.isArray(behavior.bounceByRole)) {
        sheets.push({
          name: 'Bounce rate theo vai trò',
          columns: [
            { key: 'role',             label: 'Vai trò' },
            { key: 'bounce_rate_pct',  label: 'Bounce',     type: 'percent' },
            { key: 'total',            label: 'Tổng phiên', type: 'number' },
            { key: 'bounced',          label: 'Bounce',     type: 'number' },
          ],
          rows: behavior.bounceByRole.map(b => ({
            ...b,
            role: b.role || 'GUEST',
            bounce_rate_pct: (b.bounce_rate_pct || 0) / 100,  // convert 42 → 0.42 for percent format
          })),
        })
      }
    }
    if (topics.length > 0) {
      sheets.push({
        name: 'Trending topics',
        columns: [
          { key: 'subject',                label: 'Môn' },
          { key: 'attempts',               label: 'Lượt làm',       type: 'number' },
          { key: 'uniqueStudents',         label: 'HS unique',      type: 'number' },
          { key: 'examCount',              label: 'Số đề',          type: 'number' },
          { key: 'avgAttemptsPerStudent',  label: 'TB/HS',          type: 'number' },
          { key: 'growthPct',              label: 'Tăng trưởng %',  type: 'percent' },
          { key: 'trend',                  label: 'Xu hướng' },
        ],
        rows: topics.map(t => ({
          ...t,
          growthPct: (t.growthPct || 0) / 100,
        })),
      })
    }
    if (exams.length > 0) {
      sheets.push({
        name: 'Trending exams',
        columns: [
          { key: 'title',           label: 'Tên đề' },
          { key: 'subject',         label: 'Môn' },
          { key: 'totalQuestions',  label: 'Số câu',     type: 'number' },
          { key: 'attempts',        label: 'Lượt làm',   type: 'number' },
          { key: 'unique_students', label: 'HS unique',  type: 'number' },
          { key: 'avg_percentage',  label: '% TB',       type: 'number' },
          { key: 'avg_score',       label: 'Điểm TB',    type: 'number' },
          { key: 'pass_rate',       label: 'Tỉ lệ đậu',  type: 'percent' },
        ],
        rows: exams.map(e => ({
          ...e,
          pass_rate: (e.pass_rate || 0) / 100,
        })),
      })
    }
    if (recommendations.length > 0) {
      sheets.push({
        name: 'Gợi ý điều chỉnh',
        columns: [
          { key: 'title',     label: 'Tiêu đề' },
          { key: 'category',  label: 'Phân loại' },
          { key: 'priority',  label: 'Mức ưu tiên' },
          { key: 'insight',   label: 'Insight' },
          { key: 'action',    label: 'Hành động' },
        ],
        rows: recommendations,
      })
    }
    return sheets
  }, [behavior, topics, exams, recommendations])

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🔮 Admin Insights</h1>
              <p style={{ color: D.muted, fontSize: 13, margin: '4px 0 0' }}>
                Phân tích hành vi user · trending topics/exams · gợi ý điều chỉnh tự động
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={load} disabled={loading}
              style={{
                padding: '8px 14px', background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8,
                color: '#a78bfa', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
            <ExportMenu
              filename={`admin-insights-${new Date().toISOString().slice(0, 10)}`}
              getSheets={getExportSheets}
              meta={{
                title: 'Báo cáo Admin Insights',
                subtitle: 'Hành vi · Trending · Recommendations — AeroEduVision',
                authorName: 'Admin Dashboard',
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed', margin: '0 auto' }} />
            <p style={{ color: D.muted, marginTop: 12, fontSize: 13 }}>Đang phân tích dữ liệu...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── 1. BEHAVIOR ── */}
            {behavior && (
              <Section title="📊 Hành vi người dùng" subtitle="7 ngày qua">
                {/* DAU/WAU/MAU */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <StatCard label="DAU" value={behavior.dau} subtitle="Daily Active Users" color="#34d399" icon={<Activity size={16} />} />
                  <StatCard label="WAU" value={behavior.wau} subtitle="Weekly Active Users" color="#60a5fa" icon={<Activity size={16} />} />
                  <StatCard label="MAU" value={behavior.mau} subtitle="Monthly Active Users" color="#a78bfa" icon={<Activity size={16} />} />
                  <StatCard label="Stickiness" value={`${behavior.stickiness}%`}
                    subtitle="DAU/WAU ratio"
                    color={behavior.stickiness >= 30 ? '#34d399' : behavior.stickiness >= 15 ? '#fbbf24' : '#f87171'}
                    icon={<TrendingUp size={16} />}
                  />
                </div>

                {/* Hourly distribution chart */}
                <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 16, marginTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: '0 0 12px' }}>
                    Phân bố hoạt động theo giờ (giờ peak)
                  </h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={behavior.hourly}>
                      <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
                      <XAxis dataKey="hour" stroke={D.muted} fontSize={11}
                        tickFormatter={(h) => `${h}h`} />
                      <YAxis stroke={D.muted} fontSize={11} />
                      <Tooltip contentStyle={{ background: D.card, border: `1px solid ${D.border2}`, borderRadius: 8 }}
                        labelFormatter={(h) => `Giờ ${h}:00`}
                        formatter={(v: any) => [`${v} views`, 'Lượt xem']} />
                      <Area type="monotone" dataKey="views" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bounce rate by role */}
                {behavior.bounceByRole.length > 0 && (
                  <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 16, marginTop: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: '0 0 12px' }}>
                      Tỷ lệ thoát ngay (bounce) theo role
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {behavior.bounceByRole.map((r) => {
                        const color = r.bounce_rate_pct >= 70 ? '#f87171' : r.bounce_rate_pct >= 50 ? '#fbbf24' : '#34d399'
                        return (
                          <div key={r.role || 'unknown'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                              <span style={{ color: D.text, fontWeight: 600 }}>{r.role || 'Guest'}</span>
                              <span style={{ color }}>{r.bounce_rate_pct}% ({r.bounced}/{r.total})</span>
                            </div>
                            <div style={{ background: D.border, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                              <div style={{ background: color, height: '100%', width: `${r.bounce_rate_pct}%`, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Top entry pages */}
                {behavior.topEntries.length > 0 && (
                  <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 16, marginTop: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: '0 0 12px' }}>
                      Top 10 trang vào đầu (entry pages)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {behavior.topEntries.map((e, i) => (
                        <div key={e.path} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 10px', background: i === 0 ? 'rgba(124,58,237,0.08)' : 'transparent',
                          borderRadius: 6, fontSize: 12,
                        }}>
                          <span style={{ color: D.text }}>
                            <span style={{ color: D.muted, marginRight: 8 }}>{i + 1}.</span>
                            <code style={{ background: D.bg, padding: '1px 6px', borderRadius: 3, color: '#a78bfa' }}>{e.path}</code>
                          </span>
                          <span style={{ color: D.muted, fontWeight: 600 }}>{e.sessions} sessions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* ── 2. TRENDING TOPICS ── */}
            <Section title="📚 Chủ đề trending" subtitle="Subject hot nhất 7 ngày qua">
              {topics.length === 0 ? (
                <EmptyState text="Chưa có dữ liệu lượt làm bài 7 ngày qua" />
              ) : (
                <>
                  <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 16 }}>
                    <ResponsiveContainer width="100%" height={Math.max(220, topics.length * 32)}>
                      <BarChart data={topics} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
                        <XAxis type="number" stroke={D.muted} fontSize={11} />
                        <YAxis dataKey="subject" type="category" stroke={D.muted} fontSize={11} width={70} />
                        <Tooltip contentStyle={{ background: D.card, border: `1px solid ${D.border2}`, borderRadius: 8 }}
                          formatter={(v: any) => [`${v} lượt`, 'Số lượt làm']} />
                        <Bar dataKey="attempts" radius={[0, 4, 4, 0]}>
                          {topics.map((t, i) => (
                            <Cell key={i} fill={t.trend === 'up' ? '#34d399' : t.trend === 'down' ? '#f87171' : '#a78bfa'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detail rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {topics.map((t) => (
                      <div key={t.subject} style={{
                        background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                        padding: 12, display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto auto',
                        alignItems: 'center', gap: 12, fontSize: 12,
                      }}>
                        <div style={{ color: D.text, fontWeight: 700 }}>{t.subject || 'Khác'}</div>
                        <div style={{ color: D.muted }}>👥 {t.uniqueStudents} HS</div>
                        <div style={{ color: D.muted }}>📦 {t.examCount} đề</div>
                        <div style={{ color: D.muted }}>🎯 {t.avgAttemptsPerStudent} lượt/HS</div>
                        <TrendBadge trend={t.trend} pct={t.growthPct} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>

            {/* ── 3. TRENDING EXAMS ── */}
            <Section title="📝 Đề thi trending" subtitle="Đề được làm nhiều nhất 30 ngày qua">
              {exams.length === 0 ? (
                <EmptyState text="Chưa có đề nào được làm 30 ngày qua" />
              ) : (
                <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: D.bg, color: D.muted, fontSize: 11, textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Đề thi</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Môn</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Lượt làm</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>HS unique</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Điểm TB</th>
                        <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Pass rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map((e, i) => {
                        const passColor = e.pass_rate >= 70 ? '#34d399' : e.pass_rate >= 50 ? '#fbbf24' : '#f87171'
                        return (
                          <tr key={e.id} style={{ borderTop: `1px solid ${D.border}`, background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '10px 12px', color: D.text, fontWeight: 600 }}>{e.title}</td>
                            <td style={{ padding: '10px 12px', color: D.muted }}>{e.subject || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#a78bfa', fontWeight: 700 }}>{e.attempts}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: D.muted }}>{e.unique_students}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: D.text, fontWeight: 600 }}>{e.avg_percentage}%</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: passColor, fontWeight: 700 }}>{e.pass_rate}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* ── 4. RECOMMENDATIONS ── */}
            <Section title="💡 Gợi ý điều chỉnh" subtitle="Auto-generated từ patterns trong data">
              {recommendations.length === 0 ? (
                <EmptyState text="✨ Hệ thống đang ổn định, không có recommendation nào tạm thời" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
                  {recommendations.map((r, i) => {
                    const tier = TIER_COLORS[r.priority]
                    const cat = CATEGORY_LABELS[r.category]
                    return (
                      <div key={i} style={{
                        background: tier.bg, border: `1px solid ${tier.border}`,
                        borderRadius: 12, padding: 14,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{r.icon}</span>
                            <h4 style={{ fontSize: 13, fontWeight: 800, color: tier.text, margin: 0 }}>{r.title}</h4>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4,
                              background: tier.text + '22', color: tier.text, fontWeight: 700,
                            }}>{tier.label}</span>
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4,
                              background: cat.color + '22', color: cat.color, fontWeight: 700,
                            }}>{cat.label}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: D.muted, lineHeight: 1.5, margin: '0 0 8px' }}>
                          📊 <b>Insight:</b> {r.insight}
                        </p>
                        <p style={{ fontSize: 12, color: D.text, lineHeight: 1.5, margin: 0,
                          padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                          💡 <b>Hành động:</b> {r.action}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: D.text, margin: 0 }}>{title}</h2>
        {subtitle && <span style={{ color: D.muted, fontSize: 12 }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, subtitle, color, icon }: {
  label: string; value: string | number; subtitle: string; color: string; icon: React.ReactNode
}) {
  return (
    <div style={{ background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 11, color: D.muted, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: D.muted }}>{subtitle}</div>
    </div>
  )
}

function TrendBadge({ trend, pct }: { trend: 'up' | 'down' | 'stable'; pct: number }) {
  const config = trend === 'up'
    ? { icon: <TrendingUp size={10} />, color: '#34d399', label: `+${pct}%` }
    : trend === 'down'
    ? { icon: <TrendingDown size={10} />, color: '#f87171', label: `${pct}%` }
    : { icon: <Minus size={10} />, color: D.muted, label: 'ổn định' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: config.color + '20', color: config.color,
    }}>
      {config.icon} {config.label}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 32, textAlign: 'center' }}>
      <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>{text}</p>
    </div>
  )
}
