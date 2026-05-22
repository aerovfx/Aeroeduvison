/**
 * Cold-Start Onboarding Modal — RS-Phase 10 enhancement
 *
 * Hiện cho HS mới lần đầu vào /student/for-you hoặc /student/daily
 * khi backend trả isColdStart=true VÀ user chưa onboarding (completedAt
 * null/skipped=false). 3 bước:
 *   1. Pick subject (Vật lí / Toán / Hoá / ...)
 *   2. Pick grade (Khối 10/11/12 / Ôn ĐH)
 *   3. Pick topics interested (3-5 chips multi-select, optional)
 *
 * Submit → PUT /reco/onboarding/prefs → backend filter cold-start theo prefs.
 * Skip → set skipped=true, không hiện lại trong session này.
 */
import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, BookOpen, Sparkles, X, ChevronRight, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { recommendationService as rs, type RsOnboardingPrefs } from '@/services/recommendation.service'

interface Props {
  onComplete: (prefs: RsOnboardingPrefs) => void
  onSkip: () => void
}

const SAMPLE_TOPICS = [
  'Cơ học', 'Điện học', 'Nhiệt học', 'Quang học', 'Sóng cơ', 'Sóng điện từ',
  'Đại số', 'Hình học', 'Giải tích', 'Xác suất', 'Hoá hữu cơ', 'Hoá vô cơ',
  'Sinh học tế bào', 'Di truyền', 'Tiến hoá', 'Sinh thái',
]

export default function OnboardingModal({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [topics, setTopics] = useState<string[]>([])

  const [subjectOptions, setSubjectOptions] = useState<string[]>([])
  const [gradeOptions, setGradeOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load options
  useEffect(() => {
    rs.getOnboardingOptions()
      .then(r => {
        setSubjectOptions(r.subjects)
        setGradeOptions(r.grades)
      })
      .catch(() => {
        // Fallback hardcoded (rare — backend luôn fallback)
        setSubjectOptions(['Vật lí', 'Toán', 'Hoá', 'Sinh', 'Tiếng Anh', 'Văn'])
        setGradeOptions(['Khối 10', 'Khối 11', 'Khối 12', 'Đang ôn thi đại học'])
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleTopic = useCallback((t: string) => {
    setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].slice(0, 5))
  }, [])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const r = await rs.updateOnboardingPrefs({
        subject: subject || null,
        grade: grade || null,
        interestedTopics: topics,
        skipped: false,
      })
      toast.success('Đã lưu sở thích — gợi ý cá nhân hoá đang sẵn sàng ✨')
      onComplete(r.prefs)
    } catch (e: any) {
      toast.error(`Lỗi lưu: ${e?.message || 'thử lại'}`)
    } finally {
      setSaving(false)
    }
  }, [subject, grade, topics, onComplete])

  const handleSkip = useCallback(async () => {
    try {
      // Best-effort: lưu skipped=true để không hiện lại
      await rs.updateOnboardingPrefs({ skipped: true })
    } catch {}
    onSkip()
  }, [onSkip])

  const canAdvance = step === 1 ? !!subject : step === 2 ? !!grade : true
  const isLastStep = step === 3

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="w-full sm:max-w-md bg-zinc-900 border border-zinc-800 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-zinc-800 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-cyan-100">Chào mừng đến inphysic!</h2>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Cho AI biết bạn để gợi ý chính xác từ phút đầu — 30 giây thôi
            </p>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Bỏ qua"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-5 pt-3">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${
                step >= s ? 'bg-cyan-400' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Step body */}
        <div className="p-5 min-h-[280px]">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" />
            </div>
          ) : step === 1 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-zinc-100">Bạn đang học môn nào?</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Chọn môn chính bạn cần ôn — gợi ý sẽ tập trung vào môn này
              </p>
              <div className="grid grid-cols-2 gap-2">
                {subjectOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`px-3 py-3 rounded-xl text-sm font-bold border-2 transition ${
                      subject === s
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {s}
                    {subject === s && <Check className="w-3.5 h-3.5 inline ml-1" />}
                  </button>
                ))}
              </div>
            </>
          ) : step === 2 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-zinc-100">Bạn đang ở giai đoạn nào?</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Chọn khối lớp hoặc giai đoạn ôn — gợi ý độ khó phù hợp
              </p>
              <div className="grid grid-cols-1 gap-2">
                {gradeOptions.map(g => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold border-2 text-left transition ${
                      grade === g
                        ? 'bg-purple-500/20 border-purple-400 text-purple-100'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {g}
                    {grade === g && <Check className="w-3.5 h-3.5 inline ml-2 text-purple-300" />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  Chủ đề bạn quan tâm <span className="text-zinc-500 font-normal">(tuỳ chọn)</span>
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Chọn tối đa 5 — AI sẽ ưu tiên những chủ đề này. Bỏ qua nếu chưa rõ.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_TOPICS.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                      topics.includes(t)
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {t}
                    {topics.includes(t) && <Check className="w-3 h-3 inline ml-1" />}
                  </button>
                ))}
              </div>
              {topics.length > 0 && (
                <p className="text-[11px] text-amber-300 mt-3">
                  ✓ Đã chọn {topics.length}/5 chủ đề
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between gap-2">
          <button
            onClick={handleSkip}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
          >
            Bỏ qua
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold"
              >
                ← Lùi
              </button>
            )}
            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Đang lưu…' : 'Bắt đầu'}
              </button>
            ) : (
              <button
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold disabled:opacity-50 disabled:bg-zinc-700"
              >
                Tiếp <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
