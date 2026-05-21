/**
 * LabChallengeBlock — Wrapper cho AnalogCircuitBuilder làm bài tập có chấm.
 *
 * 2 modes:
 *   1. AUTHOR (giáo viên soạn đáp án):
 *      - GV vẽ mạch reference trong simulator
 *      - Set criteria (required components, expected LED states, current range)
 *      - Bấm "💾 Lưu làm đáp án" → save vào metadata của LessonBlock
 *
 *   2. ATTEMPT (học sinh làm bài):
 *      - HS thấy mô tả yêu cầu + simulator trống (không thấy đáp án GV!)
 *      - Vẽ mạch của mình + Mô phỏng
 *      - Bấm "🚀 Nộp bài" → server validate behavioral match
 *      - Hiển thị kết quả: ✅ pass / ❌ fail + feedback từng check
 *      - Nếu pass → gọi onPass() để CoursePlayer mở khoá lesson next
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Save, Send, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Trophy, Lock, Sparkles, Target, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AnalogCircuitBuilder, { type AnalogCircuitHandle } from './AnalogCircuitBuilder'
import { api } from '@/services/api'

// ─── Types ──────────────────────────────────────────────────────────

export interface LabChallengeCriteria {
  /** Linh kiện bắt buộc — array các type hoặc {type, count} */
  requiredComponents?: Array<string | { type: string; count: number }>
  /** Số dây tối thiểu */
  minWires?: number
  /** LED nào phải sáng — { led_red: 'on', led_blue: 'off' } */
  expectedLedStates?: Record<string, 'on' | 'off' | 'burnt'>
  /** Dòng điện trong khoảng [min, max] Ampe */
  currentRange?: [number, number]
}

export interface LabChallengeMetadata {
  labType: 'analog'   // V1 chỉ analog
  challenge: true
  /** Snapshot mạch reference của GV (không show cho HS) */
  referenceSnapshot?: { components: unknown[]; wires: unknown[] }
  /** Criteria chấm điểm */
  criteria: LabChallengeCriteria
  /** Mô tả bài tập hiển thị cho HS */
  description?: string
}

interface AttemptFeedback {
  checks: Array<{ name: string; label: string; pass: boolean; msg: string }>
  passed: number
  total: number
}

// ─── Author mode ─────────────────────────────────────────────────────

export function LabChallengeAuthor({
  blockId,
  initialMetadata,
  onSave,
}: {
  blockId?: string
  initialMetadata?: Partial<LabChallengeMetadata>
  onSave: (metadata: LabChallengeMetadata) => void
}) {
  const ref = useRef<AnalogCircuitHandle>(null)
  const [description, setDescription] = useState(initialMetadata?.description || '')
  const [criteria, setCriteria] = useState<LabChallengeCriteria>(initialMetadata?.criteria || {
    minWires: 2,
    requiredComponents: [],
  })
  const [saving, setSaving] = useState(false)

  const handleSaveReference = async () => {
    if (!ref.current) return
    const snap = ref.current.getSnapshot()
    if (snap.components.length === 0) {
      toast.error('Hãy vẽ mạch đáp án trước khi lưu')
      return
    }
    // Auto-detect criteria từ mạch GV vừa vẽ
    const detectedTypes = Array.from(new Set(snap.components.map(c => c.type)))
    const autoRequired = detectedTypes
      .filter(t => !['ammeter', 'voltmeter'].includes(t))  // exclude measurement tools
      .map(t => ({
        type: t,
        count: snap.components.filter(c => c.type === t).length,
      }))

    // Auto-detect expected LED states từ simResult nếu có
    const expectedLedStates: Record<string, 'on' | 'off' | 'burnt'> = {}
    if (snap.simResult?.ok) {
      for (const c of snap.components) {
        if (c.type.startsWith('led_')) {
          const state = snap.simResult.ledStates[c.id]
          if (state === 'on') expectedLedStates[c.type] = 'on'
        }
      }
    }

    // Current range với tolerance ±20%
    let currentRange: [number, number] | undefined
    if (snap.simResult?.ok && snap.simResult.current && snap.simResult.current > 0) {
      const I = snap.simResult.current
      currentRange = [Number((I * 0.8).toFixed(4)), Number((I * 1.2).toFixed(4))]
    }

    const finalCriteria: LabChallengeCriteria = {
      requiredComponents: criteria.requiredComponents?.length ? criteria.requiredComponents : autoRequired,
      minWires: Math.max(criteria.minWires || 2, Math.floor(snap.wires.length * 0.7)),
      ...(Object.keys(expectedLedStates).length > 0 && { expectedLedStates }),
      ...(currentRange && { currentRange }),
    }

    const metadata: LabChallengeMetadata = {
      labType: 'analog',
      challenge: true,
      referenceSnapshot: { components: snap.components, wires: snap.wires },
      criteria: finalCriteria,
      description,
    }
    setSaving(true)
    try {
      onSave(metadata)
      setCriteria(finalCriteria)
      toast.success(`Đã lưu đáp án: ${snap.components.length} linh kiện, ${snap.wires.length} dây`)
    } finally {
      setSaving(false)
    }
  }

  const initialSnap = useMemo(() => {
    if (!initialMetadata?.referenceSnapshot) return undefined
    return {
      components: initialMetadata.referenceSnapshot.components as never,
      wires: initialMetadata.referenceSnapshot.wires as never,
    }
  }, [initialMetadata])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-2 text-cyan-200 font-bold text-sm">
          <Target className="w-4 h-4" /> Soạn bài tập có chấm
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Mô tả yêu cầu cho HS — ví dụ: 'Lắp mạch LED đỏ + điện trở + pin 9V sao cho LED sáng. Dòng điện phải nhỏ hơn 25mA để LED không cháy.'"
          className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-cyan-500 outline-none"
        />
      </div>

      <AnalogCircuitBuilder ref={ref} initialSnapshot={initialSnap} />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-amber-200 text-sm">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              <b>Mẹo:</b> Vẽ mạch + bấm <b>Mô phỏng</b> trước khi lưu — hệ thống sẽ tự sinh criteria
              (linh kiện cần, LED phải sáng, dòng điện ±20%).
            </span>
          </div>
          <button
            onClick={handleSaveReference}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu mạch hiện tại làm đáp án
          </button>
        </div>
        {criteria.requiredComponents && criteria.requiredComponents.length > 0 && (
          <div className="mt-3 text-xs text-amber-100/80 space-y-1">
            <div><b>Yêu cầu hiện tại:</b></div>
            <div>• Linh kiện: {(criteria.requiredComponents as Array<{type: string; count: number}>).map(r =>
              typeof r === 'string' ? r : `${r.type}×${r.count}`).join(', ')}</div>
            <div>• Tối thiểu {criteria.minWires} dây nối</div>
            {criteria.currentRange && (
              <div>• Dòng điện: {(criteria.currentRange[0] * 1000).toFixed(1)}–{(criteria.currentRange[1] * 1000).toFixed(1)} mA</div>
            )}
            {criteria.expectedLedStates && Object.entries(criteria.expectedLedStates).length > 0 && (
              <div>• LED: {Object.entries(criteria.expectedLedStates).map(([t, s]) => `${t}=${s}`).join(', ')}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Student attempt mode ────────────────────────────────────────────

export function LabChallengeAttempt({
  blockId,
  lessonId,
  metadata,
  onPass,
}: {
  blockId: string
  lessonId?: string
  metadata: LabChallengeMetadata
  onPass?: () => void
}) {
  const ref = useRef<AnalogCircuitHandle>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; score: number; feedback: AttemptFeedback } | null>(null)
  const [status, setStatus] = useState<{ hasPassed: boolean; bestScore: number; attemptCount: number } | null>(null)

  // Load existing attempt status on mount
  useEffect(() => {
    if (!lessonId) return
    api.get(`/labs/attempts/me/lesson/${lessonId}`)
      .then(r => {
        const s = r.data.blocks?.[blockId]
        if (s) setStatus({ hasPassed: s.hasPassed, bestScore: s.bestScore, attemptCount: s.attemptCount })
      })
      .catch(() => { /* ignore */ })
  }, [blockId, lessonId])

  const handleSubmit = async () => {
    if (!ref.current) return
    const snap = ref.current.getSnapshot()
    if (snap.components.length === 0) {
      toast.error('Hãy vẽ mạch trước khi nộp bài')
      return
    }
    if (!snap.simResult) {
      toast('Đề xuất: bấm "Mô phỏng" trước khi nộp để kiểm tra mạch chạy không', { icon: '💡' })
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/labs/attempts', {
        blockId, lessonId,
        snapshot: { components: snap.components, wires: snap.wires, simResult: snap.simResult },
      })
      setResult({ success: data.success, score: data.score, feedback: data.feedback })
      setStatus(prev => ({
        hasPassed: prev?.hasPassed || data.success,
        bestScore: Math.max(prev?.bestScore || 0, data.score),
        attemptCount: (prev?.attemptCount || 0) + 1,
      }))
      if (data.success) {
        toast.success(`Đỗ! Điểm: ${data.score}/100`)
        onPass?.()
      } else {
        toast.error(`Chưa đạt: ${data.score}/100 — xem feedback để sửa`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi nộp bài'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const hasPassed = status?.hasPassed

  return (
    <div className="space-y-4">
      {/* Description + status banner */}
      <div className={`rounded-xl border p-4 ${
        hasPassed
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-cyan-500/30 bg-cyan-500/5'
      }`}>
        <div className="flex items-start gap-3">
          {hasPassed
            ? <Trophy className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            : <Target className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm flex items-center gap-2 mb-1">
              {hasPassed ? (
                <span className="text-emerald-200">✓ Đã hoàn thành bài tập này</span>
              ) : (
                <span className="text-cyan-200">Bài tập lắp mạch</span>
              )}
              {status && (
                <span className="text-[11px] font-normal text-zinc-400">
                  · {status.attemptCount} lần thử · Điểm cao nhất {status.bestScore}/100
                </span>
              )}
            </div>
            {metadata.description && (
              <div className="text-sm text-zinc-300 whitespace-pre-wrap">{metadata.description}</div>
            )}
            {/* Criteria preview */}
            <div className="mt-2 text-[11px] text-zinc-400 space-y-0.5">
              {metadata.criteria.requiredComponents && metadata.criteria.requiredComponents.length > 0 && (
                <div>📦 Linh kiện cần: {(metadata.criteria.requiredComponents as Array<{type: string; count: number}>)
                  .map(r => typeof r === 'string' ? r : `${r.type}×${r.count}`).join(', ')}</div>
              )}
              {metadata.criteria.currentRange && (
                <div>⚡ Dòng điện mục tiêu: {(metadata.criteria.currentRange[0] * 1000).toFixed(1)}–{(metadata.criteria.currentRange[1] * 1000).toFixed(1)} mA</div>
              )}
              {metadata.criteria.expectedLedStates && Object.entries(metadata.criteria.expectedLedStates).length > 0 && (
                <div>💡 LED phải: {Object.entries(metadata.criteria.expectedLedStates).map(([t, s]) =>
                  `${t.replace('led_', '')} ${s === 'on' ? 'sáng' : s === 'off' ? 'tắt' : 'cháy'}`).join(', ')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnalogCircuitBuilder ref={ref} />

      {/* Submit + feedback */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-zinc-400">
            <b className="text-zinc-200">Bước cuối:</b> Bấm <b>"▶ Mô phỏng"</b> trên canvas →
            kiểm tra mạch chạy đúng → <b>"🚀 Nộp bài"</b> dưới đây để chấm.
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : hasPassed ? <RefreshCw className="w-4 h-4" /> : <Send className="w-4 h-4" />
            }
            {hasPassed ? 'Nộp lại' : '🚀 Nộp bài'}
          </button>
        </div>

        {/* Latest attempt feedback */}
        {result && (
          <div className={`mt-4 rounded-lg border p-3 ${
            result.success
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-rose-500/40 bg-rose-500/10'
          }`}>
            <div className="flex items-center gap-2 mb-2 font-bold text-sm">
              {result.success
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-400" /> <span className="text-emerald-200">Đỗ! ({result.score}/100)</span></>
                : <><AlertTriangle className="w-5 h-5 text-rose-400" /> <span className="text-rose-200">Chưa đạt ({result.score}/100)</span></>}
            </div>
            <div className="space-y-1.5">
              {result.feedback.checks.map((ch, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {ch.pass
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  <div>
                    <span className={ch.pass ? 'text-emerald-200' : 'text-rose-200'}>
                      <b>{ch.label}:</b> {ch.msg}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Gate hook — CoursePlayer dùng để check lesson đã pass chưa ─────

/**
 * Trả về { isLocked, loading } cho 1 lesson dựa trên các lab challenge block trong đó.
 * Nếu lesson có ≥ 1 challenge block chưa pass → isLocked = true.
 */
export function useLessonLabGate(lessonId: string | undefined, challengeBlockIds: string[]) {
  const [state, setState] = useState<{ loading: boolean; isLocked: boolean; passed: Record<string, boolean> }>({
    loading: true, isLocked: false, passed: {},
  })

  useEffect(() => {
    if (!lessonId || challengeBlockIds.length === 0) {
      setState({ loading: false, isLocked: false, passed: {} })
      return
    }
    api.get(`/labs/attempts/me/lesson/${lessonId}`)
      .then(r => {
        const blocks = (r.data?.blocks || {}) as Record<string, { hasPassed: boolean }>
        const passed: Record<string, boolean> = {}
        for (const bid of challengeBlockIds) {
          passed[bid] = !!blocks[bid]?.hasPassed
        }
        const allPassed = challengeBlockIds.every(bid => passed[bid])
        setState({ loading: false, isLocked: !allPassed, passed })
      })
      .catch(() => {
        // Network error → fail-open (cho phép tiếp tục)
        setState({ loading: false, isLocked: false, passed: {} })
      })
  }, [lessonId, challengeBlockIds.join('|')])

  return state
}
