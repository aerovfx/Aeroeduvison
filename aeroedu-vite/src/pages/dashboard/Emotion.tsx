import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emotionService, EmotionType, EmotionRecord } from '@/services/emotion.service'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Heart, Plus, X, TrendingUp, Brain, Zap, Smile, Meh, Frown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Demo weekly data
const DEMO_WEEKLY = [
  { date: 'T2', happy: 7, focused: 8, stressed: 3, neutral: 5 },
  { date: 'T3', happy: 6, focused: 9, stressed: 2, neutral: 4 },
  { date: 'T4', happy: 5, focused: 6, stressed: 5, neutral: 6 },
  { date: 'T5', happy: 8, focused: 7, stressed: 2, neutral: 3 },
  { date: 'T6', happy: 9, focused: 8, stressed: 1, neutral: 2 },
  { date: 'T7', happy: 7, focused: 5, stressed: 3, neutral: 5 },
  { date: 'CN', happy: 6, focused: 4, stressed: 4, neutral: 7 },
]

const DEMO_RECORDS: EmotionRecord[] = [
  { id: '1', emotion: 'focused', intensity: 8, note: 'Tập trung học bài Vật lý', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: '2', emotion: 'happy', intensity: 9, note: 'Hoàn thành bài quiz đạt 95%', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', emotion: 'stressed', intensity: 5, note: 'Chuẩn bị kỳ thi giữa kỳ', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: '4', emotion: 'excited', intensity: 8, note: 'Thí nghiệm 3D lab rất thú vị!', timestamp: new Date(Date.now() - 900000).toISOString() },
]

const DEMO_STATS = {
  dominant: 'focused' as EmotionType,
  averageIntensity: 7.2,
  focusRatio: 0.68,
  studyQuality: 'good' as const,
  records: DEMO_RECORDS,
  weeklyTrend: DEMO_WEEKLY,
}

const emotionConfig: Record<EmotionType, { label: string; emoji: string; color: string; bg: string; description: string }> = {
  happy: { label: 'Vui vẻ', emoji: '😊', color: '#f59e0b', bg: 'bg-yellow-500/10', description: 'Tâm trạng tích cực, sẵn sàng học' },
  neutral: { label: 'Bình thường', emoji: '😐', color: '#94a3b8', bg: 'bg-slate-500/10', description: 'Trạng thái ổn định' },
  sad: { label: 'Buồn', emoji: '😢', color: '#3b82f6', bg: 'bg-blue-500/10', description: 'Cần nghỉ ngơi và động lực' },
  stressed: { label: 'Căng thẳng', emoji: '😰', color: '#ef4444', bg: 'bg-red-500/10', description: 'Hãy thư giãn một chút' },
  excited: { label: 'Phấn khích', emoji: '🤩', color: '#8b5cf6', bg: 'bg-purple-500/10', description: 'Năng lượng cao, học tốt nhất!' },
  focused: { label: 'Tập trung', emoji: '🎯', color: '#10b981', bg: 'bg-emerald-500/10', description: 'Trạng thái lý tưởng để học' },
}

const qualityConfig = {
  excellent: { label: 'Xuất sắc', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  good: { label: 'Tốt', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  average: { label: 'Trung bình', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  poor: { label: 'Kém', color: 'text-red-600', bg: 'bg-red-500/10' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`
  return d.toLocaleDateString('vi-VN')
}

// Log modal
function LogEmotionModal({ onClose, onLog }: { onClose: () => void; onLog: (e: EmotionType, i: number, n?: string) => void }) {
  const [selected, setSelected] = useState<EmotionType | null>(null)
  const [intensity, setIntensity] = useState(7)
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">Ghi nhận cảm xúc</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">Bạn đang cảm thấy thế nào?</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {(Object.entries(emotionConfig) as [EmotionType, typeof emotionConfig[EmotionType]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                selected === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <span className="text-xs font-medium text-foreground">{cfg.label}</span>
            </button>
          ))}
        </div>

        {selected && (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Mức độ</span>
                <span className="font-semibold text-foreground">{intensity}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={intensity}
                onChange={e => setIntensity(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Nhẹ</span><span>Trung bình</span><span>Mạnh</span>
              </div>
            </div>
            <div className="mb-5">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú (không bắt buộc)..."
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Huỷ
          </button>
          <button
            onClick={() => { if (selected) { onLog(selected, intensity, note || undefined); onClose() } }}
            disabled={!selected}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmotionPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [period, setPeriod] = useState<7 | 14 | 30>(7)

  const { data: stats = DEMO_STATS } = useQuery({
    queryKey: ['emotionStats', period],
    queryFn: () => emotionService.getStats(period),
    retry: false,
    initialData: DEMO_STATS as any,
  })

  const logMutation = useMutation({
    mutationFn: ({ emotion, intensity, note }: { emotion: EmotionType; intensity: number; note?: string }) =>
      emotionService.log(emotion, intensity, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emotionStats'] })
    },
  })

  const dominant = emotionConfig[stats.dominant as EmotionType] || emotionConfig.focused
  const quality = qualityConfig[stats.studyQuality as keyof typeof qualityConfig] || qualityConfig.good
  const weeklyData = stats.weeklyTrend || DEMO_WEEKLY
  const records = stats.records || DEMO_RECORDS

  return (
    <div className="p-6 animate-fade-in space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Bản Đồ Cảm Xúc</h1>
            <p className="text-sm text-muted-foreground">Theo dõi trạng thái cảm xúc trong học tập</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Ghi nhận
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn('rounded-xl p-4 border border-border', dominant.bg)}>
          <p className="text-xs text-muted-foreground mb-1">Cảm xúc chủ đạo</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{dominant.emoji}</span>
            <span className="font-bold text-foreground">{dominant.label}</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Cường độ trung bình</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-foreground">{stats.averageIntensity.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground mb-0.5">/10</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Tỷ lệ tập trung</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-foreground">{Math.round(stats.focusRatio * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.focusRatio * 100}%` }} />
          </div>
        </div>
        <div className={cn('rounded-xl p-4 border border-border', quality.bg)}>
          <p className="text-xs text-muted-foreground mb-1">Chất lượng học</p>
          <span className={cn('text-xl font-bold', quality.color)}>{quality.label}</span>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart — span 2 */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Xu hướng cảm xúc theo tuần
            </h2>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-lg transition-colors',
                    period === d ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {d}N
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gradHappy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFocused" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradStressed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="focused" name="Tập trung" stroke="#10b981" fill="url(#gradFocused)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="happy" name="Vui vẻ" stroke="#f59e0b" fill="url(#gradHappy)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="stressed" name="Căng thẳng" stroke="#ef4444" fill="url(#gradStressed)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Emotion distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Phân bố cảm xúc
          </h2>
          <div className="space-y-3">
            {(Object.entries(emotionConfig) as [EmotionType, typeof emotionConfig[EmotionType]][]).map(([key, cfg]) => {
              const count = records.filter((r: any) => r.emotion === key).length
              const pct = records.length > 0 ? Math.round(count / records.length * 100) : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>{cfg.emoji}</span>
                      <span className="text-foreground">{cfg.label}</span>
                    </span>
                    <span className="text-muted-foreground">{count} lần</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent emotion log */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Nhật ký cảm xúc gần đây</h2>
        </div>
        <div className="divide-y divide-border">
          {records.slice(0, 8).map((record: any) => {
            const cfg = emotionConfig[record.emotion as EmotionType] || emotionConfig.neutral
            return (
              <div key={record.id} className="flex items-center gap-4 px-5 py-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                  <span className="text-lg">{cfg.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: i < record.intensity ? cfg.color : 'hsl(var(--muted))' }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{record.intensity}/10</span>
                  </div>
                  {record.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{record.note}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatTime(record.timestamp)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Log modal */}
      {showModal && (
        <LogEmotionModal
          onClose={() => setShowModal(false)}
          onLog={(emotion, intensity, note) => logMutation.mutate({ emotion, intensity, note })}
        />
      )}
    </div>
  )
}
