/**
 * LabChallengeBlock — Wrapper cho 3 lab simulators làm bài tập có chấm.
 *
 * Hỗ trợ:
 *   - analog   → AnalogCircuitBuilder (mạch điện DC)
 *   - digital  → DigitalLogicLab (cổng logic + truth table)
 *   - arduino  → ArduinoEmulator (Arduino C++ sketch)
 *
 * 2 modes:
 *   1. AUTHOR (giáo viên soạn đáp án):
 *      - Vẽ mạch/viết code trong simulator
 *      - Set criteria (auto-detect từ snapshot)
 *      - Bấm "💾 Lưu làm đáp án" → save vào metadata LessonBlock
 *
 *   2. ATTEMPT (học sinh làm bài):
 *      - Đọc yêu cầu + criteria preview (KHÔNG xem đáp án GV)
 *      - Làm bài → "🚀 Nộp bài" → server validate behavioral match
 *      - Screenshot canvas tự gửi kèm để GV review
 *      - Pass → onPass() callback mở khoá lesson next
 *
 * Bonus:
 *   - <LabLeaderboard /> hiển thị top 10 điểm cao
 *   - useLessonLabGate() hook check tất cả challenge blocks của lesson
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Save, Send, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Trophy, Sparkles, Target, Loader2, Medal, Crown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AnalogCircuitBuilder, { type AnalogCircuitHandle } from './AnalogCircuitBuilder'
import DigitalLogicLab, { type DigitalLogicHandle } from '@/pages/labs/DigitalLogicLab'
import ArduinoEmulator, { type ArduinoEmulatorHandle } from '@/pages/labs/ArduinoEmulator'
import { api } from '@/services/api'

// ─── Types ──────────────────────────────────────────────────────────

export type LabType = 'analog' | 'digital' | 'arduino'

export interface LabChallengeCriteria {
  // Analog
  requiredComponents?: Array<string | { type: string; count: number }>
  expectedLedStates?: Record<string, 'on' | 'off' | 'burnt'>
  currentRange?: [number, number]
  // Digital
  requiredGates?: Array<string | { kind: string; count: number }>
  expectedTruthTable?: {
    rows: Array<{ inputs: Record<string, 0 | 1>; outputs: Record<string, 0 | 1> }>
  }
  // Arduino
  requiredKeywords?: string[]
  requiredPins?: Array<{ pin: number; mode: 'OUTPUT' | 'INPUT' | 'INPUT_PULLUP' }>
  expectedPinStates?: Record<string, 0 | 1>
  // Common
  minWires?: number
  description?: string
}

export interface LabChallengeMetadata {
  labType: LabType
  challenge: true
  referenceSnapshot?: Record<string, unknown>
  criteria: LabChallengeCriteria
  description?: string
}

interface AttemptFeedback {
  checks: Array<{ name: string; label: string; pass: boolean; msg: string }>
  passed: number
  total: number
}

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  email: string
  image: string | null
  bestScore: number
  firstPassAt: string | null
  attempts: number
  isMe: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Capture <svg> đầu tiên trong container thành data:image/png URL. */
async function svgToPng(container: HTMLElement | null, maxSize = 800): Promise<string | null> {
  if (!container) return null
  const svg = container.querySelector('svg')
  if (!svg) return null
  try {
    // Clone SVG để không ảnh hưởng UI live
    const clone = svg.cloneNode(true) as SVGSVGElement
    // Inline computed font-family để tránh missing fonts khi render
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const xml = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('img load'))
      img.src = url
    })
    // Scale xuống maxSize giữ aspect
    const ratio = Math.min(1, maxSize / Math.max(img.width || 800, img.height || 500))
    const w = Math.floor((img.width || 800) * ratio)
    const h = Math.floor((img.height || 500) * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) { URL.revokeObjectURL(url); return null }
    ctx.fillStyle = '#0a0612'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    return canvas.toDataURL('image/png', 0.85)
  } catch {
    return null
  }
}

// ─── Unified simulator wrapper ──────────────────────────────────────

interface SimRefs {
  analog: React.RefObject<AnalogCircuitHandle>
  digital: React.RefObject<DigitalLogicHandle>
  arduino: React.RefObject<ArduinoEmulatorHandle>
}

function SimulatorByType({
  labType, refs, initialSnapshot, containerRef,
}: {
  labType: LabType
  refs: SimRefs
  initialSnapshot?: Record<string, unknown>
  containerRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div ref={containerRef}>
      {labType === 'analog' && (
        <AnalogCircuitBuilder
          ref={refs.analog}
          initialSnapshot={initialSnapshot as { components?: never[]; wires?: never[] }}
        />
      )}
      {labType === 'digital' && (
        <DigitalLogicLab
          ref={refs.digital}
          initialCircuit={(initialSnapshot as { circuit?: never })?.circuit}
        />
      )}
      {labType === 'arduino' && (
        <ArduinoEmulator
          ref={refs.arduino}
          initialCode={(initialSnapshot as { code?: string })?.code}
        />
      )}
    </div>
  )
}

function getSimSnapshot(labType: LabType, refs: SimRefs): Record<string, unknown> | null {
  if (labType === 'analog')  return refs.analog.current?.getSnapshot()  as unknown as Record<string, unknown> ?? null
  if (labType === 'digital') return refs.digital.current?.getSnapshot() as unknown as Record<string, unknown> ?? null
  if (labType === 'arduino') return refs.arduino.current?.getSnapshot() as unknown as Record<string, unknown> ?? null
  return null
}

// ─── Author mode ─────────────────────────────────────────────────────

export function LabChallengeAuthor({
  initialMetadata,
  onSave,
}: {
  initialMetadata?: Partial<LabChallengeMetadata>
  onSave: (metadata: LabChallengeMetadata) => void
}) {
  const labType: LabType = initialMetadata?.labType || 'analog'
  const refs: SimRefs = {
    analog:  useRef<AnalogCircuitHandle>(null),
    digital: useRef<DigitalLogicHandle>(null),
    arduino: useRef<ArduinoEmulatorHandle>(null),
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const [description, setDescription] = useState(initialMetadata?.description || '')
  const [criteria, setCriteria] = useState<LabChallengeCriteria>(initialMetadata?.criteria || {})
  const [saving, setSaving] = useState(false)

  const handleSaveReference = () => {
    const snap = getSimSnapshot(labType, refs)
    if (!snap) { toast.error('Không lấy được snapshot — chưa vẽ mạch?'); return }

    let detectedCriteria: LabChallengeCriteria = { minWires: 2 }

    if (labType === 'analog') {
      const s = snap as { components: Array<{ id: string; type: string }>; wires: unknown[]; simResult?: { ok?: boolean; current?: number; ledStates?: Record<string, string> } }
      if (s.components?.length === 0) { toast.error('Hãy vẽ mạch trước khi lưu'); return }
      const detectedTypes = Array.from(new Set(s.components.map(c => c.type)))
      const autoRequired = detectedTypes
        .filter(t => !['ammeter', 'voltmeter'].includes(t))
        .map(t => ({ type: t, count: s.components.filter(c => c.type === t).length }))
      const expectedLedStates: Record<string, 'on' | 'off' | 'burnt'> = {}
      if (s.simResult?.ok) {
        for (const c of s.components) {
          if (c.type.startsWith('led_')) {
            const state = s.simResult.ledStates?.[c.id]
            if (state === 'on') expectedLedStates[c.type] = 'on'
          }
        }
      }
      let currentRange: [number, number] | undefined
      if (s.simResult?.ok && s.simResult.current && s.simResult.current > 0) {
        const I = s.simResult.current
        currentRange = [Number((I * 0.8).toFixed(4)), Number((I * 1.2).toFixed(4))]
      }
      detectedCriteria = {
        requiredComponents: autoRequired,
        minWires: Math.max(2, Math.floor((s.wires?.length || 0) * 0.7)),
        ...(Object.keys(expectedLedStates).length > 0 && { expectedLedStates }),
        ...(currentRange && { currentRange }),
      }
    } else if (labType === 'digital') {
      const s = snap as { circuit: { gates: Array<{ kind: string }>; wires: unknown[] }; truthTable?: { rows: Array<{ inputs: Record<string, 0|1>; outputs: Record<string, 0|1> }> } }
      if (!s.circuit?.gates?.length) { toast.error('Hãy vẽ mạch digital trước'); return }
      const gateKinds = Array.from(new Set(s.circuit.gates.map(g => g.kind)))
      const autoRequired = gateKinds
        .filter(k => !['INPUT', 'OUTPUT', 'CLOCK'].includes(k))
        .map(k => ({ kind: k, count: s.circuit.gates.filter(g => g.kind === k).length }))
      detectedCriteria = {
        requiredGates: autoRequired,
        minWires: Math.max(1, Math.floor((s.circuit.wires?.length || 0) * 0.7)),
        ...(s.truthTable?.rows && s.truthTable.rows.length > 0 && { expectedTruthTable: s.truthTable }),
      }
    } else if (labType === 'arduino') {
      const s = snap as { code: string; pinStates?: { digitalOut?: Record<string, 0|1> } }
      if (!s.code || s.code.length < 30) { toast.error('Code quá ngắn — viết sketch trước'); return }
      // Detect API keywords used
      const apiKeywords = ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'Serial.print', 'Serial.println']
      const usedKeywords = apiKeywords.filter(k => s.code.includes(k))
      // Detect pinMode assignments
      const pinModeRegex = /pinMode\s*\(\s*\w+\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)/g
      const requiredPins: Array<{ pin: number; mode: 'OUTPUT' | 'INPUT' | 'INPUT_PULLUP' }> = []
      // Simpler: extract `pinMode(13, OUTPUT)` literal pin numbers
      const litPinRegex = /pinMode\s*\(\s*(\d+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)/g
      let m: RegExpExecArray | null
      while ((m = litPinRegex.exec(s.code)) !== null) {
        requiredPins.push({ pin: Number(m[1]), mode: m[2] as 'OUTPUT' })
      }
      pinModeRegex.lastIndex = 0
      detectedCriteria = {
        requiredKeywords: usedKeywords,
        ...(requiredPins.length > 0 && { requiredPins }),
        ...(s.pinStates?.digitalOut && Object.keys(s.pinStates.digitalOut).length > 0 && {
          expectedPinStates: s.pinStates.digitalOut,
        }),
      }
    }

    const finalCriteria = { ...detectedCriteria, ...criteria }
    const metadata: LabChallengeMetadata = {
      labType,
      challenge: true,
      referenceSnapshot: snap,
      criteria: finalCriteria,
      description,
    }
    setSaving(true)
    try {
      onSave(metadata)
      setCriteria(finalCriteria)
      toast.success(`Đã lưu đáp án ${labType.toUpperCase()}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-2 text-cyan-200 font-bold text-sm">
          <Target className="w-4 h-4" /> Soạn bài tập có chấm
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-100 border border-cyan-400/40">
            {labType}
          </span>
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder={
            labType === 'analog'  ? "VD: 'Lắp mạch LED đỏ + điện trở + pin 9V sao cho LED sáng. Dòng điện < 25mA để LED không cháy.'" :
            labType === 'digital' ? "VD: 'Xây mạch cộng nửa (Half Adder) với 2 INPUT A, B và 2 OUTPUT Sum, Cout.'" :
                                    "VD: 'Viết code blink LED pin 13 mỗi 500ms với delay() và digitalWrite().'"
          }
          className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-cyan-500 outline-none"
        />
      </div>

      <SimulatorByType
        labType={labType}
        refs={refs}
        initialSnapshot={initialMetadata?.referenceSnapshot}
        containerRef={containerRef}
      />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-amber-200 text-sm">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              <b>Mẹo:</b>
              {labType === 'analog'  && ' Vẽ mạch + Mô phỏng trước khi lưu — auto sinh linh kiện + LED + dòng điện ±20%'}
              {labType === 'digital' && ' Vẽ cổng + INPUT/OUTPUT — auto sinh cổng cần + truth table'}
              {labType === 'arduino' && ' Viết code + Chạy — auto detect keywords + pinMode + pin states'}
            </span>
          </div>
          <button
            onClick={handleSaveReference}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu làm đáp án
          </button>
        </div>
        {Object.keys(criteria).length > 0 && (
          <div className="mt-3 text-xs text-amber-100/80 space-y-1">
            <div><b>Yêu cầu hiện tại:</b></div>
            {criteria.requiredComponents && (
              <div>• Linh kiện: {(criteria.requiredComponents as Array<{type: string; count: number}>).map(r =>
                typeof r === 'string' ? r : `${r.type}×${r.count}`).join(', ')}</div>
            )}
            {criteria.requiredGates && (
              <div>• Cổng: {(criteria.requiredGates as Array<{kind: string; count: number}>).map(r =>
                typeof r === 'string' ? r : `${r.kind}×${r.count}`).join(', ')}</div>
            )}
            {criteria.requiredKeywords && (
              <div>• API: {criteria.requiredKeywords.join(', ')}</div>
            )}
            {criteria.requiredPins && (
              <div>• Pins: {criteria.requiredPins.map(p => `${p.pin}=${p.mode}`).join(', ')}</div>
            )}
            {criteria.expectedTruthTable && (
              <div>• Truth table: {criteria.expectedTruthTable.rows.length} dòng</div>
            )}
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
  const labType = metadata.labType || 'analog'
  const refs: SimRefs = {
    analog:  useRef<AnalogCircuitHandle>(null),
    digital: useRef<DigitalLogicHandle>(null),
    arduino: useRef<ArduinoEmulatorHandle>(null),
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; score: number; feedback: AttemptFeedback } | null>(null)
  const [status, setStatus] = useState<{ hasPassed: boolean; bestScore: number; attemptCount: number } | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

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
    const snap = getSimSnapshot(labType, refs)
    if (!snap) { toast.error('Hãy hoàn thành bài làm trước khi nộp'); return }
    setSubmitting(true)
    try {
      // Capture screenshot trước khi submit (chỉ analog/digital có SVG canvas)
      let screenshot: string | null = null
      if (labType === 'analog' || labType === 'digital') {
        screenshot = await svgToPng(containerRef.current, 600)
      }
      const { data } = await api.post('/labs/attempts', {
        blockId, lessonId,
        snapshot: snap,
        screenshot,
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
            <div className="font-bold text-sm flex items-center gap-2 mb-1 flex-wrap">
              {hasPassed ? (
                <span className="text-emerald-200">✓ Đã hoàn thành bài tập này</span>
              ) : (
                <span className="text-cyan-200">Bài tập lab</span>
              )}
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-400/30">
                {labType}
              </span>
              {status && (
                <span className="text-[11px] font-normal text-zinc-400">
                  · {status.attemptCount} lần thử · Điểm cao nhất {status.bestScore}/100
                </span>
              )}
              <button
                onClick={() => setShowLeaderboard(s => !s)}
                className="ml-auto text-[11px] inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
              >
                <Trophy className="w-3 h-3" /> {showLeaderboard ? 'Ẩn BXH' : 'Xem BXH lớp'}
              </button>
            </div>
            {metadata.description && (
              <div className="text-sm text-zinc-300 whitespace-pre-wrap">{metadata.description}</div>
            )}
            {/* Criteria preview */}
            <div className="mt-2 text-[11px] text-zinc-400 space-y-0.5">
              {metadata.criteria.requiredComponents && (
                <div>📦 Linh kiện cần: {(metadata.criteria.requiredComponents as Array<{type: string; count: number}>)
                  .map(r => typeof r === 'string' ? r : `${r.type}×${r.count}`).join(', ')}</div>
              )}
              {metadata.criteria.requiredGates && (
                <div>🧠 Cổng logic cần: {(metadata.criteria.requiredGates as Array<{kind: string; count: number}>)
                  .map(r => typeof r === 'string' ? r : `${r.kind}×${r.count}`).join(', ')}</div>
              )}
              {metadata.criteria.requiredKeywords && (
                <div>📝 API cần dùng: {metadata.criteria.requiredKeywords.join(', ')}</div>
              )}
              {metadata.criteria.requiredPins && (
                <div>📌 Pin assignment: {metadata.criteria.requiredPins.map(p => `${p.pin}=${p.mode}`).join(', ')}</div>
              )}
              {metadata.criteria.currentRange && (
                <div>⚡ Dòng điện mục tiêu: {(metadata.criteria.currentRange[0] * 1000).toFixed(1)}–{(metadata.criteria.currentRange[1] * 1000).toFixed(1)} mA</div>
              )}
              {metadata.criteria.expectedLedStates && Object.entries(metadata.criteria.expectedLedStates).length > 0 && (
                <div>💡 LED phải: {Object.entries(metadata.criteria.expectedLedStates).map(([t, s]) =>
                  `${t.replace('led_', '')} ${s === 'on' ? 'sáng' : s === 'off' ? 'tắt' : 'cháy'}`).join(', ')}</div>
              )}
              {metadata.criteria.expectedTruthTable && (
                <div>📊 Truth table: {metadata.criteria.expectedTruthTable.rows.length} dòng cần đúng</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard (toggle) */}
      {showLeaderboard && <LabLeaderboard blockId={blockId} />}

      <SimulatorByType labType={labType} refs={refs} containerRef={containerRef} />

      {/* Submit + feedback */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-zinc-400">
            <b className="text-zinc-200">Bước cuối:</b>
            {labType === 'analog'  && ' Bấm "▶ Mô phỏng" → kiểm tra mạch chạy → '}
            {labType === 'digital' && ' Mạch tự simulate live → '}
            {labType === 'arduino' && ' Bấm "▶ Chạy" → kiểm tra sketch chạy → '}
            <b>"🚀 Nộp bài"</b> dưới đây để chấm.
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

// ─── Leaderboard ─────────────────────────────────────────────────────

export function LabLeaderboard({ blockId }: { blockId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [me, setMe] = useState<LeaderboardEntry | null>(null)
  const [totalRanked, setTotalRanked] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/labs/leaderboard/block/${blockId}`)
      .then(r => {
        setEntries(r.data.entries || [])
        setMe(r.data.me || null)
        setTotalRanked(r.data.totalRanked || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [blockId])

  if (loading) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 text-amber-200 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải bảng xếp hạng...
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        <Trophy className="w-4 h-4 inline mr-2" />
        Chưa có ai pass — bạn có thể là người đầu tiên!
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-amber-200 font-bold text-sm">
          <Crown className="w-5 h-5 text-amber-400" /> Bảng xếp hạng top {entries.length}
        </div>
        <span className="text-xs text-amber-100/70">{totalRanked} HS đã pass</span>
      </div>
      <div className="space-y-1.5">
        {entries.map(e => (
          <div
            key={e.userId}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              e.isMe
                ? 'bg-cyan-500/15 border border-cyan-400/40'
                : e.rank <= 3
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-zinc-800/40'
            }`}
          >
            <div className={`w-7 text-center font-bold ${
              e.rank === 1 ? 'text-amber-300' :
              e.rank === 2 ? 'text-zinc-300' :
              e.rank === 3 ? 'text-orange-400' :
              'text-zinc-500'
            }`}>
              {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
            </div>
            {e.image
              ? <img src={e.image} alt={e.name} className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                  {(e.name || '?').slice(0, 2).toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="truncate text-zinc-200 font-medium">
                {e.name} {e.isMe && <span className="text-cyan-300 text-[10px]">(BẠN)</span>}
              </div>
              <div className="text-[10px] text-zinc-500">{e.attempts} lần thử</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-200">{e.bestScore}</span>
              <span className="text-[10px] text-zinc-500">/100</span>
            </div>
          </div>
        ))}
      </div>
      {me && !entries.some(e => e.isMe) && (
        <div className="mt-3 pt-3 border-t border-amber-500/20">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-sm">
            <div className="w-7 text-center font-bold text-zinc-400">#{me.rank}</div>
            <div className="flex-1 text-zinc-200">Bạn — {me.attempts} lần thử</div>
            <div className="font-bold text-cyan-200">{me.bestScore}/100</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Gate hook — multiple challenges support ────────────────────────

/**
 * Trả về { isLocked, loading } cho 1 lesson dựa trên các lab challenge block trong đó.
 * Nếu lesson có ≥ 1 challenge block chưa pass → isLocked = true.
 * V2: support multiple challenges per lesson — phải pass HẾT.
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
        setState({ loading: false, isLocked: false, passed: {} })
      })
  }, [lessonId, challengeBlockIds.join('|')])

  return state
}
