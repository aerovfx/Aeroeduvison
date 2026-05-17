/**
 * LearningPaths — trang lộ trình học của học sinh
 *
 * 2 nguồn lộ trình:
 *   1. Lộ trình từ GIÁO VIÊN đã đăng ký (free)
 *      → GET /api/student/learning-paths (LearningPathAssignment)
 *   2. Lộ trình do AI tạo (PAID — gói "AI Learning Path")
 *      → Gate bằng <AiSubscriptionGate feature="ai_learning_path">
 *
 * Nếu HS chưa có GV nào assign + không có gói AI → hiển thị empty state
 * giải thích cách nhận lộ trình (gửi link mời GV / mua gói).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Target, Brain, Calendar, TrendingUp, Clock,
  CheckCircle, Circle, Lock, Sparkles, ChevronRight, Play,
  BarChart, Zap, BookOpen, RefreshCw,
  ArrowRight, Trophy, Flame, AlertCircle, X,
  GraduationCap, UserCheck, CreditCard, Crown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AiSubscriptionGate } from '@/components/common/AiSubscriptionGate'
import studentLearningPathService, {
  type StudentLearningPath, type StudentLearningPathModule,
} from '@/services/studentLearningPath.service'

// ── Types cho AI form (giữ nguyên flow cũ) ─────────────────────
interface LearningPathFormData {
  experience: string
  goal: string
  timeCommit: string
  interest: string
  budget: string
}

interface LearningPathResult {
  platform: string
  name: string
  score: number
  recommendation: string
  weeks: string[]
  resources: string[]
  gradient: string
  border: string
  accent: string
}

// ── Helpers ──────────────────────────────────────────────────────
function getSubjectIcon(subject: string | null | undefined): string {
  if (!subject) return '📚'
  const s = subject.toLowerCase()
  if (s.includes('vật lí') || s.includes('vat li') || s.includes('physic')) return '⚛️'
  if (s.includes('toán') || s.includes('toan') || s.includes('math')) return '🧮'
  if (s.includes('hóa') || s.includes('hoa') || s.includes('chem'))   return '🧪'
  if (s.includes('sinh') || s.includes('bio'))                          return '🧬'
  if (s.includes('văn') || s.includes('van') || s.includes('liter'))    return '📖'
  if (s.includes('anh') || s.includes('eng'))                           return '🗣️'
  if (s.includes('sử') || s.includes('su') || s.includes('hist'))       return '🏛️'
  if (s.includes('địa') || s.includes('dia') || s.includes('geo'))      return '🗺️'
  if (s.includes('tin') || s.includes('prog') || s.includes('cs'))      return '💻'
  return '📚'
}

function getModuleStatusIcon(status: 'completed' | 'in_progress' | undefined) {
  switch (status) {
    case 'completed':   return <CheckCircle className="w-5 h-5 text-emerald-400" />
    case 'in_progress': return <Circle className="w-5 h-5 text-blue-400 animate-pulse" />
    default:            return <Play className="w-5 h-5 text-violet-400" />
  }
}

function getDifficultyStyle(difficulty: string): string {
  const d = difficulty.toLowerCase()
  if (d === 'beginner' || d === 'easy')           return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
  if (d === 'intermediate' || d === 'medium')     return 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400'
  if (d === 'advanced' || d === 'hard')           return 'border-rose-500/20 bg-rose-500/[0.06] text-rose-400'
  return 'border-white/10 bg-white/[0.04] text-white/50'
}

function difficultyLabel(d: string): string {
  const s = d.toLowerCase()
  if (s === 'beginner' || s === 'easy')       return 'Cơ bản'
  if (s === 'intermediate' || s === 'medium') return 'Trung bình'
  if (s === 'advanced' || s === 'hard')       return 'Nâng cao'
  return d
}

const selectClass =
  'w-full p-3 rounded-lg bg-black/25 border border-white/[0.08] text-white/80 text-sm ' +
  'focus:outline-none focus:border-[hsl(245,85%,65%)]/50 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)] ' +
  'transition-all [&>option]:bg-[hsl(225,15%,10%)] [&>option]:text-white/80'

// ────────────────────────────────────────────────────────────────
// Component chính
// ────────────────────────────────────────────────────────────────
export default function LearningPathPage() {
  // ── 1. Lộ trình từ GV (free, primary content) ────────────────
  const {
    data: teacherPaths = [],
    isLoading: pathsLoading,
    refetch: refetchPaths,
  } = useQuery<StudentLearningPath[]>({
    queryKey: ['student-learning-paths'],
    queryFn: studentLearningPathService.getMine,
    staleTime: 60_000,
    retry: false,
  })

  // ── 2. Trạng thái cho AI form (paid, gated) ─────────────────
  const [showAIForm, setShowAIForm] = useState(false)
  const [formData, setFormData] = useState<LearningPathFormData>({
    experience: '', goal: '', timeCommit: '', interest: '', budget: '',
  })
  const [aiResult, setAiResult] = useState<LearningPathResult[] | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // ── 3. Stats tổng hợp (tính từ tất cả paths của GV) ─────────
  const stats = useMemo(() => {
    let totalModules = 0, completedModules = 0, totalXP = 0, earnedXP = 0
    teacherPaths.forEach((p) => {
      const mods = p.modules || []
      totalModules += mods.length
      totalXP += p.totalXP || 0
      mods.forEach((m) => {
        const status = p.moduleStatus?.[m.id]
        if (status === 'completed') {
          completedModules++
          earnedXP += m.xpReward || 0
        }
      })
    })
    return { totalModules, completedModules, totalXP, earnedXP }
  }, [teacherPaths])

  // ── AI form handlers (giữ logic cũ — chỉ chạy khi qua gate) ──
  const calculateAIMatch = (data: LearningPathFormData) => {
    const scores = { openai: 0, gemini: 0, grok: 0, claude: 0 }
    if (data.experience === 'beginner')      { scores.gemini += 30; scores.claude += 25; scores.openai += 20; scores.grok += 15 }
    else if (data.experience === 'intermediate') { scores.openai += 30; scores.claude += 25; scores.gemini += 20; scores.grok += 15 }
    else if (data.experience === 'advanced') { scores.openai += 35; scores.claude += 25; scores.grok += 20; scores.gemini += 15 }
    if (data.goal === 'exam_thpt')           { scores.gemini += 28; scores.claude += 25; scores.openai += 22; scores.grok += 15 }
    else if (data.goal === 'improve_grades') { scores.claude += 26; scores.gemini += 24; scores.openai += 22; scores.grok += 12 }
    else                                     { scores.claude += 22; scores.gemini += 22; scores.openai += 20; scores.grok += 12 }
    if (data.budget === 'free')              { scores.gemini += 25; scores.grok += 20; scores.claude += 15; scores.openai += 10 }
    else if (data.budget === 'premium')      { scores.openai += 25; scores.claude += 20; scores.gemini += 15; scores.grok += 10 }
    return scores
  }

  const generateAILearningPath = (scores: Record<string, number>): LearningPathResult[] => {
    const sorted = (Object.entries(scores) as [string, number][])
      .sort(([, a], [, b]) => b - a)
    const paths: Record<string, Omit<LearningPathResult, 'platform' | 'score' | 'recommendation'>> = {
      openai: { name: 'OpenAI GPT-4', weeks: ['Tuần 1-2: Cơ bản API + prompt engineering', 'Tuần 3-4: Function calling', 'Tuần 5-6: Fine-tuning', 'Tuần 7-8: Build ứng dụng thực tế'], resources: ['OpenAI Cookbook', 'Official Docs'], gradient: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/15', accent: 'text-emerald-400' },
      gemini: { name: 'Google Gemini', weeks: ['Tuần 1-2: Gemini API basics', 'Tuần 3-4: Multimodal (text/image/video)', 'Tuần 5-6: Workspace integration', 'Tuần 7-8: Capstone project'], resources: ['Google AI Studio', 'Gemini Docs'], gradient: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/15', accent: 'text-blue-400' },
      grok:   { name: 'xAI Grok',     weeks: ['Tuần 1-2: Grok + X platform', 'Tuần 3-4: Real-time data', 'Tuần 5-6: Social analysis', 'Tuần 7-8: Live app'], resources: ['xAI Docs', 'X Developer Portal'], gradient: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/15', accent: 'text-violet-400' },
      claude: { name: 'Anthropic Claude', weeks: ['Tuần 1-2: Constitutional AI + API', 'Tuần 3-4: Long context + document analysis', 'Tuần 5-6: Tool use + agentic workflows', 'Tuần 7-8: Advanced apps'], resources: ['Claude Docs', 'Anthropic Cookbook'], gradient: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/15', accent: 'text-amber-400' },
    }
    return sorted.map(([platform, score]) => ({
      ...paths[platform], platform, score,
      recommendation: score >= 80 ? 'Rất phù hợp' : score >= 60 ? 'Phù hợp' : 'Có thể xem xét',
    }))
  }

  const handleAIChange = useCallback((field: keyof LearningPathFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleAISubmit = useCallback(async () => {
    if (!formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget) return
    setIsGeneratingAI(true)
    try {
      const scores = calculateAIMatch(formData)
      const path = generateAILearningPath(scores)
      setAiResult(path)
    } finally {
      setIsGeneratingAI(false)
    }
  }, [formData])

  // Refresh khi quay lại tab (nếu GV vừa assign path mới)
  useEffect(() => {
    const onFocus = () => { refetchPaths() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetchPaths])

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 p-4">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(245,85%,65%)] opacity-[0.04] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[hsl(280,75%,60%)] opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
                Lộ trình học tập của bạn
              </h1>
              <p className="text-sm text-white/40">
                {teacherPaths.length > 0
                  ? `${teacherPaths.length} lộ trình từ giáo viên · ${stats.completedModules}/${stats.totalModules} bài đã hoàn thành`
                  : 'Lộ trình do giáo viên bạn đăng ký giao cho bạn — hoặc tự tạo bằng AI (gói trả phí)'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAIForm(p => !p)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all"
                aria-expanded={showAIForm}
                aria-controls="ai-learning-path-form"
              >
                <Sparkles className="w-4 h-4" />
                Tạo lộ trình AI
                <Crown className="w-3.5 h-3.5 text-amber-300" />
              </button>
              <button
                type="button"
                onClick={() => refetchPaths()}
                disabled={pathsLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 text-sm font-medium hover:bg-white/[0.06] hover:text-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${pathsLoading ? 'animate-spin' : ''}`} />
                {pathsLoading ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Learning Path — GATED BY SUBSCRIPTION ── */}
        {showAIForm && (
          <div id="ai-learning-path-form" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[hsl(245,85%,65%)]" />
                AI Learning Path
                <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-200 uppercase tracking-wider">
                  <Crown className="w-3 h-3" /> Pro
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAIForm(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
                aria-label="Đóng form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gate — fail-open: nếu API entitlements lỗi, vẫn cho user thử
                (server-side AI call sẽ reject nếu thực sự không có quota) */}
            <AiSubscriptionGate
              feature="ai_learning_path"
              featureLabel="AI Learning Path Generator"
              description="Tạo lộ trình học cá nhân hoá bằng AI dựa trên trình độ, mục tiêu và thời gian của bạn. Cần đăng ký gói trả phí hàng tháng để chi trả cho dịch vụ AI (OpenAI, Gemini, Claude)."
            >
              <div className="p-6">
                <div className="mb-5 p-4 rounded-lg border border-purple-500/15 bg-purple-500/[0.04] flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-white/60">
                    <span className="font-medium text-purple-300">Lưu ý:</span> Mỗi lần tạo lộ trình AI tốn token API.
                    Gói trả phí bao gồm <span className="text-purple-300 font-medium">30 lần tạo/tháng</span>.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Trình độ hiện tại
                    </label>
                    <select value={formData.experience} onChange={e => handleAIChange('experience', e.target.value)} className={selectClass}>
                      <option value="">Chọn trình độ</option>
                      <option value="beginner">Mới bắt đầu</option>
                      <option value="intermediate">Trung cấp</option>
                      <option value="advanced">Nâng cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Mục tiêu học tập
                    </label>
                    <select value={formData.goal} onChange={e => handleAIChange('goal', e.target.value)} className={selectClass}>
                      <option value="">Chọn mục tiêu</option>
                      <option value="exam_thpt">Ôn thi THPT Quốc gia</option>
                      <option value="improve_grades">Nâng cao điểm số</option>
                      <option value="curriculum">Học theo chương trình</option>
                      <option value="career_orientation">Định hướng nghề nghiệp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Thời gian cam kết
                    </label>
                    <select value={formData.timeCommit} onChange={e => handleAIChange('timeCommit', e.target.value)} className={selectClass}>
                      <option value="">Chọn thời gian</option>
                      <option value="casual">1-2 giờ/tuần</option>
                      <option value="regular">5-10 giờ/tuần</option>
                      <option value="intensive">15+ giờ/tuần</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Lĩnh vực quan tâm</label>
                    <select value={formData.interest} onChange={e => handleAIChange('interest', e.target.value)} className={selectClass}>
                      <option value="">Chọn lĩnh vực</option>
                      <option value="science">Khoa học tự nhiên (Lí, Hoá, Sinh)</option>
                      <option value="math">Toán</option>
                      <option value="humanities">Khoa học xã hội (Văn, Sử, Địa)</option>
                      <option value="tech">Công nghệ (Tin, Kỹ thuật)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Mức độ chi tiết</label>
                    <select value={formData.budget} onChange={e => handleAIChange('budget', e.target.value)} className={selectClass}>
                      <option value="">Chọn mức độ</option>
                      <option value="free">Sơ lược (10 bài/tuần)</option>
                      <option value="moderate">Vừa (15 bài/tuần)</option>
                      <option value="premium">Chi tiết (25+ bài/tuần)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAISubmit}
                  disabled={isGeneratingAI || !formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  aria-busy={isGeneratingAI}
                >
                  {isGeneratingAI
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> AI đang tạo lộ trình...</>
                    : <><Sparkles className="w-4 h-4" /> Tạo AI Learning Path</>}
                </button>
              </div>
            </AiSubscriptionGate>
          </div>
        )}

        {/* ── AI results (chỉ render khi đã tạo qua gate) ── */}
        {aiResult && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
            <div className="mb-6 p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Lộ trình AI đã được tạo!</p>
                <p className="text-xs text-white/40 mt-0.5">Dùng gợi ý này tham khảo. Liên hệ GV để được thiết kế lộ trình chính thức.</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white/90 text-center mb-6">AI Recommendations</h2>
            <div className="space-y-4">
              {aiResult.map((path, index) => (
                <div key={path.name} className={`rounded-xl border ${path.border} bg-gradient-to-br ${path.gradient} p-5`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${index === 0 ? 'text-amber-400' : 'text-white/40'}`}>
                        #{index + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white/90">{path.name}</h3>
                        <p className="text-xs text-white/40">{path.recommendation} — {path.score}/100</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/50">
                      {path.score >= 80 ? '★★★' : path.score >= 60 ? '★★' : '★'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {path.weeks.map((week, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs text-white/60">{week}</div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {path.resources.map((resource, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[0.65rem] text-white/50">{resource}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats overview (chỉ hiện khi có path từ GV) ── */}
        {teacherPaths.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Calendar, label: 'Bài hoàn thành', value: `${stats.completedModules}/${stats.totalModules}`, color: 'text-blue-400', glow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.08)]', barPct: stats.totalModules ? (stats.completedModules / stats.totalModules) * 100 : 0, barColor: 'from-blue-500 to-indigo-500', sub: '' },
              { icon: Trophy,   label: 'XP đã kiếm',     value: stats.earnedXP.toLocaleString(),                   color: 'text-amber-400', glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]', barPct: 0, barColor: '', sub: `Mục tiêu: ${stats.totalXP.toLocaleString()} XP` },
              { icon: Flame,    label: 'Lộ trình GV',    value: String(teacherPaths.length),                       color: 'text-orange-400', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]', barPct: 0, barColor: '', sub: 'Từ giáo viên' },
              { icon: TrendingUp, label: 'Tiến độ tổng', value: `${stats.totalModules ? ((stats.completedModules / stats.totalModules) * 100).toFixed(0) : 0}%`, color: 'text-emerald-400', glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]', barPct: 0, barColor: '', sub: 'Tổng các path' },
            ].map((card) => (
              <div key={card.label} className={`group rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] ${card.glow}`}>
                <div className="flex items-center justify-between mb-2">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <span className={`text-xl font-bold ${card.color}`}>{card.value}</span>
                </div>
                <p className="text-xs text-white/50 mb-1">{card.label}</p>
                {card.barPct > 0 && (
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-2">
                    <div className={`h-full rounded-full bg-gradient-to-r ${card.barColor}`} style={{ width: `${card.barPct}%` }} />
                  </div>
                )}
                {card.sub && <p className="text-[0.65rem] text-white/30 mt-1">{card.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {pathsLoading && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Đang tải lộ trình từ giáo viên...</p>
          </div>
        )}

        {/* ── Empty state: chưa có path từ GV ── */}
        {!pathsLoading && teacherPaths.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.04] to-purple-500/[0.03] backdrop-blur-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/20">
                <GraduationCap className="w-10 h-10 text-violet-300" />
              </div>
              <h2 className="text-xl font-bold text-white/90 mb-2">Bạn chưa có lộ trình từ giáo viên</h2>
              <p className="text-sm text-white/50 max-w-xl mx-auto leading-relaxed">
                Lộ trình học tập trên Aeroedu được thiết kế bởi giáo viên mà bạn đã đăng ký theo học.
                Sau khi GV phân công, bài học sẽ xuất hiện tại đây theo thứ tự cần làm.
              </p>
            </div>

            {/* 2 options: kết nối GV (free) HOẶC mua gói AI (paid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Option 1: Kết nối với GV — FREE */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25">
                    <UserCheck className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-200 text-base">Kết nối với giáo viên</h3>
                    <p className="text-[11px] text-emerald-300/70">Miễn phí · khuyến nghị</p>
                  </div>
                </div>
                <p className="text-xs text-white/55 leading-relaxed mb-4">
                  Gửi yêu cầu kết nối với GV bằng email của thầy/cô. GV sẽ phê duyệt và phân công lộ trình phù hợp.
                </p>
                <Link
                  to="/student/teachers"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 text-sm font-medium transition-all w-full justify-center"
                >
                  <UserCheck className="w-4 h-4" />
                  Kết nối với GV
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Option 2: Tạo bằng AI — PAID */}
              <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.04] p-5 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/25">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-200 text-base">Tự tạo bằng AI</h3>
                    <p className="text-[11px] text-amber-300/70 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Gói trả phí · 49.000đ/tháng
                    </p>
                  </div>
                </div>
                <p className="text-xs text-white/55 leading-relaxed mb-4">
                  AI sinh lộ trình cá nhân hoá theo trình độ + mục tiêu. Phí hàng tháng để chi trả dịch vụ
                  AI (OpenAI, Gemini, Claude) chạy backend.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAIForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/30 text-amber-100 text-sm font-medium transition-all w-full justify-center"
                >
                  <Sparkles className="w-4 h-4" />
                  Xem chi tiết & dùng thử
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] text-white/35 mt-5">
              💡 Lộ trình do GV phân công luôn miễn phí. AI Learning Path là tính năng phụ cho HS tự học.
            </p>
          </div>
        )}

        {/* ── Teacher paths list (1 card / path) ── */}
        {!pathsLoading && teacherPaths.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                Lộ trình từ giáo viên ({teacherPaths.length})
              </h2>
            </div>
            {teacherPaths.map((path) => (
              <TeacherPathCard key={path.assignmentId} path={path} />
            ))}
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { to: '/student/ai-tutor',           icon: Brain,    label: 'AI Tutor',    desc: 'Chat với AI để được hỗ trợ', gradient: 'from-violet-600 to-purple-600', glow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]' },
            { to: '/dashboard/assignments',      icon: BookOpen, label: 'Bài tập',     desc: 'Xem tất cả bài tập và bài học', gradient: 'from-blue-600 to-indigo-600',  glow: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.12)]' },
            { to: '/dashboard/analytics',        icon: BarChart, label: 'Tiến độ',     desc: 'Phân tích chi tiết tiến độ',    gradient: 'from-emerald-600 to-teal-600', glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]' },
          ].map((action) => (
            <Link key={action.to} to={action.to} className={`group block rounded-xl bg-gradient-to-br ${action.gradient} p-5 transition-all duration-300 ${action.glow} hover:translate-y-[-2px]`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <action.icon className="w-8 h-8 text-white/70 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">{action.label}</h3>
                <p className="text-xs text-white/50">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Card hiển thị 1 lộ trình từ GV
// ────────────────────────────────────────────────────────────────
function TeacherPathCard({ path }: { path: StudentLearningPath }) {
  const [expanded, setExpanded] = useState(false)
  const subj = getSubjectIcon(path.subject)
  const completedCount = (path.modules || []).filter(
    (m) => path.moduleStatus?.[m.id] === 'completed'
  ).length
  const totalCount = path.modules?.length || 0
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-3xl flex-shrink-0">{subj}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white/90 mb-1 truncate">{path.name}</h3>
              {path.description && (
                <p className="text-xs text-white/45 leading-relaxed line-clamp-2 mb-2">{path.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {path.subject && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/55">
                    {path.subject}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full border ${getDifficultyStyle(path.difficulty)}`}>
                  {difficultyLabel(path.difficulty)}
                </span>
                {path.estimatedDays && (
                  <span className="flex items-center gap-1 text-white/40">
                    <Calendar className="w-3 h-3" /> {path.estimatedDays} ngày
                  </span>
                )}
                {path.totalXP && (
                  <span className="flex items-center gap-1 text-emerald-400/70">
                    <Zap className="w-3 h-3" /> {path.totalXP} XP
                  </span>
                )}
                {path.teacher?.name && (
                  <span className="flex items-center gap-1 text-violet-300/80">
                    <GraduationCap className="w-3 h-3" /> GV: {path.teacher.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-lg font-bold text-violet-400">{completedCount}/{totalCount}</span>
            <p className="text-[10px] text-white/30">Hoàn thành</p>
            <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </button>

      {/* Modules list — expanded */}
      {expanded && totalCount > 0 && (
        <div className="border-t border-white/[0.05] p-4 space-y-2">
          {path.modules.map((m, idx) => {
            const status = path.moduleStatus?.[m.id]
            const isLocked = idx > 0 &&
              path.moduleStatus?.[path.modules[idx - 1].id] !== 'completed' &&
              status !== 'completed' && status !== 'in_progress'
            return (
              <ModuleRow
                key={m.id}
                module={m}
                index={idx}
                status={status}
                locked={isLocked}
                pathId={path.id}
              />
            )
          })}
        </div>
      )}

      {expanded && totalCount === 0 && (
        <div className="border-t border-white/[0.05] p-6 text-center text-sm text-white/40">
          GV chưa thêm bài học nào vào lộ trình này.
        </div>
      )}
    </div>
  )
}

function ModuleRow({
  module: m, index, status, locked, pathId,
}: {
  module: StudentLearningPathModule
  index: number
  status: 'completed' | 'in_progress' | undefined
  locked: boolean
  pathId: string
}) {
  const isCompleted = status === 'completed'
  const isInProgress = status === 'in_progress'
  const canOpen = !locked

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${locked ? 'opacity-50' : 'hover:bg-white/[0.03]'} transition-colors`}>
      <div className="flex-shrink-0 mt-0.5">
        {locked ? <Lock className="w-5 h-5 text-white/20" /> : getModuleStatusIcon(status)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-white/30 px-1.5 py-0.5 rounded bg-white/[0.04] flex-shrink-0">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h4 className="text-sm font-semibold text-white/85 truncate">{m.title}</h4>
            {m.type && (
              <span className="nav-badge flex-shrink-0 text-[0.55rem] px-1.5 py-0.5 uppercase">
                {m.type}
              </span>
            )}
          </div>
        </div>
        {m.description && (
          <p className="text-[11px] text-white/40 line-clamp-1 mb-1">{m.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-white/40">
          {m.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.duration} phút</span>}
          {m.xpReward && <span className="flex items-center gap-1 text-emerald-400/70"><Zap className="w-3 h-3" />+{m.xpReward} XP</span>}
        </div>
        {canOpen && !isCompleted && (
          <Link
            to={m.resourceUrl || `/learning-paths/lesson/${m.id}?pathId=${encodeURIComponent(pathId)}&title=${encodeURIComponent(m.title)}`}
            className="inline-flex items-center mt-2 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors gap-1"
          >
            <Play className="w-3 h-3" />
            {isInProgress ? 'Tiếp tục' : 'Bắt đầu'}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
        {isCompleted && (
          <div className="mt-1.5 text-[10px] text-emerald-400/70 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Đã hoàn thành
          </div>
        )}
        {locked && (
          <div className="mt-1.5 text-[10px] text-amber-400/60 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Mở khoá khi hoàn thành bài trước
          </div>
        )}
      </div>
    </div>
  )
}
