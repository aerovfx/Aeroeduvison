/**
 * LearningPaths — clone chính xác từ
 * app/(dashboard)/(routes)/learning-paths/page.tsx
 *
 * Thay thế:
 *   - next/link          → react-router-dom Link (to=)
 *   - useSession         → loại bỏ (role mặc định 'STUDENT')
 *   - LearnerSurveyForm, AssessmentResults, ReAssessmentDashboard
 *                        → overlay đơn giản (không phụ thuộc Next.js lib)
 *   - assessmentEngine   → loại bỏ (currentAssessment luôn null)
 *   - API /api/…         → giữ nguyên (fallback generateDemoPath)
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Map, Target, Brain, Calendar, TrendingUp, Award, Clock,
  CheckCircle, Circle, Lock, Sparkles, ChevronRight, Play,
  BarChart, Zap, Star, BookOpen, RefreshCw,
  ArrowRight, Trophy, Flame, AlertCircle, X,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────
interface LearningPathLesson {
  id: string
  title: string
  subject: string
  type: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  xpReward: number
  status: 'completed' | 'in-progress' | 'locked' | 'available'
  day: number
  date: string
  completedAt?: Date
  progress?: number
  aiGenerated: boolean
  objectives: string[]
  prerequisites?: string[]
}

interface WeekData {
  weekNumber: number
  startDate: string
  endDate: string
  lessons: LearningPathLesson[]
  totalXP: number
  completedLessons: number
}

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
function getDemoLessonTitle(day: number): string {
  const titles = [
    'Phương trình bậc hai cơ bản', 'Hệ phương trình tuyến tính', 'Hàm số và đồ thị',
    'Đạo hàm cơ bản', 'Ứng dụng đạo hàm', 'Tích phân cơ bản', 'Ứng dụng tích phân',
    'Phương trình vi phân', 'Chuỗi số', 'Giới hạn và liên tục',
    'Hình học không gian', 'Vectơ và ma trận', 'Xác suất cơ bản',
    'Thống kê mô tả', 'Phân phối xác suất', 'Kiểm định giả thuyết',
    'Hồi quy tuyến tính', 'Phân tích phương sai', 'Chuỗi thời gian', 'Tối ưu hóa',
  ]
  return titles[day - 1] || `Bài học ngày ${day}`
}

function getDemoSubject(day: number): string {
  return ['mathematics', 'physics', 'chemistry', 'biology', 'programming'][day % 5]
}

function getDemoDifficulty(day: number): 'beginner' | 'intermediate' | 'advanced' {
  if (day <= 5) return 'beginner'
  if (day <= 15) return 'intermediate'
  return 'advanced'
}

function getSubjectIcon(subject: string): string {
  const map: Record<string, string> = {
    mathematics: '🧮', physics: '⚛️', chemistry: '🧪', biology: '🧬', programming: '💻',
  }
  return map[subject] ?? '📚'
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':   return <CheckCircle className="w-5 h-5 text-emerald-400" />
    case 'in-progress': return <Circle className="w-5 h-5 text-blue-400 animate-pulse" />
    case 'available':   return <Play className="w-5 h-5 text-violet-400" />
    case 'locked':      return <Lock className="w-5 h-5 text-white/20" />
    default:            return <Circle className="w-5 h-5 text-white/10" />
  }
}

function getDifficultyStyle(difficulty: string): string {
  switch (difficulty) {
    case 'beginner':     return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
    case 'intermediate': return 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400'
    case 'advanced':     return 'border-rose-500/20 bg-rose-500/[0.06] text-rose-400'
    default:             return 'border-white/10 bg-white/[0.04] text-white/50'
  }
}

const selectClass =
  'w-full p-3 rounded-lg bg-black/25 border border-white/[0.08] text-white/80 text-sm ' +
  'focus:outline-none focus:border-[hsl(245,85%,65%)]/50 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)] ' +
  'transition-all [&>option]:bg-[hsl(225,15%,10%)] [&>option]:text-white/80'

// ── Component ────────────────────────────────────────────────────
export default function LearningPathPage() {
  const [pathData, setPathData] = useState<WeekData[]>([])
  const [stats, setStats] = useState({
    totalDays: 0, completedDays: 0, totalXP: 0, earnedXP: 0,
    currentStreak: 0, longestStreak: 0,
  })
  const [selectedLesson, setSelectedLesson] = useState<LearningPathLesson | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [showAIForm, setShowAIForm] = useState(false)
  const [formData, setFormData] = useState<LearningPathFormData>({
    experience: '', goal: '', timeCommit: '', interest: '', budget: '',
  })
  const [aiResult, setAiResult] = useState<LearningPathResult[] | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [canGenerateAI] = useState(true)
  const [timeUntilNext] = useState<string>('')

  // ── Demo path generation ──────────────────────────────────────
  const calculateStats = useCallback((weeks: WeekData[]) => {
    let totalDays = 0, completedDays = 0, totalXP = 0, earnedXP = 0
    weeks.forEach(w => w.lessons.forEach(l => {
      totalDays++; totalXP += l.xpReward
      if (l.status === 'completed') { completedDays++; earnedXP += l.xpReward }
    }))
    setStats({ totalDays, completedDays, totalXP, earnedXP, currentStreak: 3, longestStreak: 5 })
  }, [])

  const generateDemoPath = useCallback(() => {
    const today = new Date()
    const weeks: WeekData[] = []
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(today); weekStart.setDate(today.getDate() + (week - 1) * 7)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
      const lessons: LearningPathLesson[] = []
      for (let day = 1; day <= 5; day++) {
        const lessonDate = new Date(weekStart); lessonDate.setDate(weekStart.getDate() + day - 1)
        const dayNumber = (week - 1) * 5 + day
        const isCompleted = week === 1 && day <= 3
        const isInProgress = week === 1 && day === 4
        const isAvailable = week === 1 && day === 5
        lessons.push({
          id: `lesson-w${week}-d${day}`, title: getDemoLessonTitle(dayNumber),
          subject: getDemoSubject(dayNumber), type: 'lesson',
          difficulty: getDemoDifficulty(dayNumber),
          duration: 45 + Math.floor(Math.random() * 30),
          xpReward: 100 + Math.floor(Math.random() * 100),
          status: isCompleted ? 'completed' : isInProgress ? 'in-progress' : isAvailable ? 'available' : 'locked',
          day: dayNumber, date: lessonDate.toISOString().split('T')[0],
          completedAt: isCompleted ? new Date(lessonDate) : undefined,
          progress: isInProgress ? 65 : undefined, aiGenerated: true,
          objectives: ['Hiểu khái niệm cơ bản', 'Áp dụng công thức', 'Giải bài tập thực tế'],
          prerequisites: day > 1 ? [`lesson-w${week}-d${day - 1}`] : week > 1 ? [`lesson-w${week - 1}-d5`] : undefined,
        })
      }
      weeks.push({
        weekNumber: week, startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0], lessons,
        totalXP: lessons.reduce((s, l) => s + l.xpReward, 0),
        completedLessons: lessons.filter(l => l.status === 'completed').length,
      })
    }
    setPathData(weeks)
    calculateStats(weeks)
  }, [calculateStats])

  useEffect(() => {
    generateDemoPath()
  }, [generateDemoPath])

  // ── AI form helpers ───────────────────────────────────────────
  const calculateAIMatch = (data: LearningPathFormData) => {
    const scores = { openai: 0, gemini: 0, grok: 0, claude: 0 }
    if (data.experience === 'beginner') { scores.gemini += 30; scores.claude += 25; scores.openai += 20; scores.grok += 15 }
    else if (data.experience === 'intermediate') { scores.openai += 30; scores.claude += 25; scores.gemini += 20; scores.grok += 15 }
    else if (data.experience === 'advanced') { scores.openai += 35; scores.claude += 25; scores.grok += 20; scores.gemini += 15 }
    if (data.goal === 'chat') { scores.claude += 25; scores.openai += 20; scores.gemini += 20; scores.grok += 15 }
    else if (data.goal === 'coding') { scores.openai += 30; scores.claude += 25; scores.gemini += 15; scores.grok += 10 }
    else if (data.goal === 'research') { scores.gemini += 30; scores.claude += 25; scores.openai += 20; scores.grok += 10 }
    else if (data.goal === 'realtime') { scores.grok += 35; scores.gemini += 20; scores.openai += 15; scores.claude += 10 }
    else if (data.goal === 'exam_thpt') { scores.gemini += 28; scores.claude += 25; scores.openai += 22; scores.grok += 15 }
    else if (data.goal === 'improve_grades') { scores.claude += 26; scores.gemini += 24; scores.openai += 22; scores.grok += 12 }
    else { scores.claude += 22; scores.gemini += 22; scores.openai += 20; scores.grok += 12 }
    if (data.timeCommit === 'casual') { scores.claude += 20; scores.gemini += 15; scores.openai += 10; scores.grok += 10 }
    else if (data.timeCommit === 'regular') { scores.openai += 20; scores.claude += 15; scores.gemini += 15; scores.grok += 10 }
    else if (data.timeCommit === 'intensive') { scores.openai += 25; scores.gemini += 20; scores.claude += 15; scores.grok += 10 }
    if (data.interest === 'nlp') { scores.openai += 25; scores.claude += 20; scores.gemini += 15; scores.grok += 10 }
    else if (data.interest === 'multimodal') { scores.gemini += 30; scores.openai += 20; scores.claude += 15; scores.grok += 10 }
    else if (data.interest === 'social') { scores.grok += 30; scores.gemini += 15; scores.claude += 15; scores.openai += 10 }
    else if (data.interest === 'creative') { scores.claude += 25; scores.openai += 20; scores.gemini += 15; scores.grok += 10 }
    if (data.budget === 'free') { scores.gemini += 25; scores.grok += 20; scores.claude += 15; scores.openai += 10 }
    else if (data.budget === 'moderate') { scores.claude += 20; scores.openai += 20; scores.gemini += 15; scores.grok += 15 }
    else if (data.budget === 'premium') { scores.openai += 25; scores.claude += 20; scores.gemini += 15; scores.grok += 10 }
    return scores
  }

  const generateAILearningPath = (scores: Record<string, number>): LearningPathResult[] => {
    const sorted = (Object.entries(scores) as [string, number][])
      .sort(([, a], [, b]) => b - a)
    const paths: Record<string, Omit<LearningPathResult, 'platform' | 'score' | 'recommendation'>> = {
      openai: { name: 'OpenAI (GPT-4, ChatGPT)', weeks: ['Tuần 1-2: Cơ bản về API, prompt engineering', 'Tuần 3-4: Function calling và embeddings', 'Tuần 5-6: Fine-tuning và optimization', 'Tuần 7-8: Xây dựng ứng dụng thực tế'], resources: ['OpenAI Cookbook', 'Official Documentation', 'Community Forums'], gradient: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/15', accent: 'text-emerald-400' },
      gemini: { name: 'Google Gemini', weeks: ['Tuần 1-2: Khởi đầu với Gemini API', 'Tuần 3-4: Xử lý đa phương thức (text, image, video)', 'Tuần 5-6: Tích hợp với Google Workspace', 'Tuần 7-8: Dự án tổng hợp'], resources: ['Google AI Studio', 'Gemini Documentation', 'Vertex AI Tutorials'], gradient: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/15', accent: 'text-blue-400' },
      grok: { name: 'xAI Grok', weeks: ['Tuần 1-2: Làm quen với Grok và X Platform', 'Tuần 3-4: Real-time data processing', 'Tuần 5-6: Social media analysis', 'Tuần 7-8: Ứng dụng thời gian thực'], resources: ['xAI Documentation', 'X Developer Portal', 'Community Guides'], gradient: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/15', accent: 'text-violet-400' },
      claude: { name: 'Anthropic Claude', weeks: ['Tuần 1-2: Constitutional AI và cơ bản API', 'Tuần 3-4: Long context và document analysis', 'Tuần 5-6: Tool use và agentic workflows', 'Tuần 7-8: Ứng dụng nâng cao'], resources: ['Claude Documentation', 'Anthropic Cookbook', 'Prompt Library'], gradient: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/15', accent: 'text-amber-400' },
    }
    return sorted.map(([platform, score]) => ({
      ...paths[platform], platform, score,
      recommendation: score >= 80 ? 'Rất phù hợp' : score >= 60 ? 'Phù hợp' : 'Có thể xem xét',
    }))
  }

  const handleAIChange = useCallback((field: keyof LearningPathFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleToggleAIForm = useCallback(() => setShowAIForm(p => !p), [])
  const handleCloseAIForm = useCallback(() => setShowAIForm(false), [])

  const handleAISubmit = useCallback(async () => {
    if (!formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget) return
    if (!canGenerateAI) return
    setIsGeneratingAI(true)
    try {
      const scores = calculateAIMatch(formData)
      const path = generateAILearningPath(scores)
      setAiResult(path)
    } finally {
      setIsGeneratingAI(false)
    }
  }, [formData, canGenerateAI])

  const handleLessonSelect = useCallback((lesson: LearningPathLesson) => {
    if (lesson.status !== 'locked') setSelectedLesson(lesson)
  }, [])

  const handleLessonKeyDown = useCallback((e: React.KeyboardEvent, lesson: LearningPathLesson) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (lesson.status !== 'locked') setSelectedLesson(lesson)
    }
  }, [])

  const handleLinkClickStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const regenerateLessons = useCallback(async () => {
    const confirmed = window.confirm('AI sẽ tạo lộ trình mới dựa trên tiến độ, điểm số và mục tiêu của bạn.\n\nBạn có muốn tiếp tục?')
    if (!confirmed) return
    setIsGenerating(true)
    try {
      generateDemoPath()
    } finally {
      setIsGenerating(false)
    }
  }, [generateDemoPath])

  // ── Lesson Detail Modal ───────────────────────────────────────
  const LessonModal = () => {
    if (!selectedLesson) return null
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[hsl(225,15%,10%)] p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getSubjectIcon(selectedLesson.subject)}</span>
              <div>
                <h2 className="text-base font-bold text-white/90">{selectedLesson.title}</h2>
                <p className="text-xs text-white/40">Ngày {selectedLesson.day} · {selectedLesson.duration} phút</p>
              </div>
            </div>
            <button onClick={() => setSelectedLesson(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs font-medium text-white/50 mb-2">Mục tiêu bài học</p>
              <ul className="space-y-1">
                {selectedLesson.objectives.map((obj, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selectedLesson.duration} phút</span>
              <span className="flex items-center gap-1 text-emerald-400/70"><Zap className="w-3.5 h-3.5" />+{selectedLesson.xpReward} XP</span>
              <span className={`px-2 py-0.5 rounded-full border text-[0.65rem] ${getDifficultyStyle(selectedLesson.difficulty)}`}>
                {selectedLesson.difficulty === 'beginner' ? 'Cơ bản' : selectedLesson.difficulty === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
              </span>
            </div>
            {(selectedLesson.status === 'available' || selectedLesson.status === 'in-progress') && (
              <Link
                to={`/learning-paths/lesson/${selectedLesson.id}?title=${encodeURIComponent(selectedLesson.title)}&subject=${encodeURIComponent(selectedLesson.subject)}&difficulty=${encodeURIComponent(selectedLesson.difficulty)}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:brightness-110 transition-all"
                onClick={() => setSelectedLesson(null)}
              >
                <Play className="w-4 h-4" />
                {selectedLesson.status === 'available' ? 'Bắt đầu học' : 'Tiếp tục học'}
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Lesson modal */}
      <LessonModal />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(245,85%,65%)] opacity-[0.04] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[hsl(280,75%,60%)] opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
                Lộ trình học tập của bạn
              </h1>
              <p className="text-sm text-white/40">Theo dõi tiến độ và hoàn thành mục tiêu từng ngày</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleToggleAIForm}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all"
                aria-expanded={showAIForm}
                aria-controls="ai-learning-path-form"
              >
                <Sparkles className="w-4 h-4" />
                AI Learning Path
              </button>
              <button
                type="button"
                onClick={regenerateLessons}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 text-sm font-medium hover:bg-white/[0.06] hover:text-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'AI đang tạo...' : 'Tạo lộ trình mới'}
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Learning Path Form ── */}
        {showAIForm && (
          <div id="ai-learning-path-form" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 animate-scale-in" role="region" aria-labelledby="ai-form-heading">
            <div className="flex items-center justify-between mb-6">
              <h2 id="ai-form-heading" className="text-lg font-bold text-white/90 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[hsl(245,85%,65%)]" />
                AI Learning Path Algorithm
              </h2>
              <button type="button" onClick={handleCloseAIForm} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70" aria-label="Đóng form AI Learning Path">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!canGenerateAI && (
              <div className="mb-5 p-4 rounded-lg border border-amber-500/15 bg-amber-500/[0.04]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-white/50">
                    <span className="font-medium text-amber-400">Giới hạn 1 lần/tuần.</span> Thời gian tạo lại: <span className="text-amber-400">{timeUntilNext}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Trình độ hiện tại
                </label>
                <select value={formData.experience} onChange={e => handleAIChange('experience', e.target.value)} className={selectClass}>
                  <option value="">Chọn trình độ</option>
                  <option value="beginner">Mới bắt đầu</option>
                  <option value="intermediate">Trung cấp - Đã dùng chatbot AI</option>
                  <option value="advanced">Nâng cao - Đã code với AI API</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Mục tiêu học tập
                </label>
                <select value={formData.goal} onChange={e => handleAIChange('goal', e.target.value)} className={selectClass}>
                  <option value="">Chọn mục tiêu</option>
                  <optgroup label="——— Công nghệ & AI ———">
                    <option value="chat">Sử dụng chatbot hiệu quả</option>
                    <option value="coding">Lập trình với AI</option>
                    <option value="research">Nghiên cứu và phân tích</option>
                    <option value="realtime">Ứng dụng thời gian thực</option>
                  </optgroup>
                  <optgroup label="——— Học sinh THPT ———">
                    <option value="exam_thpt">Ôn thi THPT Quốc gia / Đại học</option>
                    <option value="improve_grades">Nâng cao điểm số các môn</option>
                    <option value="curriculum">Học theo chương trình phổ thông</option>
                    <option value="career_orientation">Định hướng nghề nghiệp</option>
                    <option value="foreign_lang_thpt">Ngoại ngữ (Tiếng Anh, chứng chỉ)</option>
                    <option value="admission">Chuẩn bị hồ sơ đại học / tuyển sinh</option>
                    <option value="soft_skills_thpt">Kỹ năng mềm (thuyết trình, tư duy)</option>
                  </optgroup>
                  <optgroup label="——— Sinh viên ———">
                    <option value="major">Chuyên ngành / môn chuyên ngành</option>
                    <option value="internship">Thực tập & kỹ năng nghề nghiệp</option>
                    <option value="certificates">Chứng chỉ (tin học, ngoại ngữ)</option>
                    <option value="soft_skills_uni">Kỹ năng mềm (làm việc nhóm)</option>
                    <option value="grad_school">Ôn thi sau đại học / cao học</option>
                    <option value="foreign_lang_uni">Học thêm ngoại ngữ</option>
                  </optgroup>
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
                  <option value="nlp">Xử lý ngôn ngữ tự nhiên</option>
                  <option value="multimodal">Đa phương thức</option>
                  <option value="social">Mạng xã hội & real-time</option>
                  <option value="creative">Sáng tạo nội dung</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-white/50 mb-1.5">Ngân sách</label>
                <select value={formData.budget} onChange={e => handleAIChange('budget', e.target.value)} className={selectClass}>
                  <option value="">Chọn ngân sách</option>
                  <option value="free">Miễn phí - Free tier</option>
                  <option value="moderate">Vừa phải - $10-30/tháng</option>
                  <option value="premium">Cao - $30+/tháng</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAISubmit}
              disabled={isGeneratingAI || !canGenerateAI || !formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-busy={isGeneratingAI}
            >
              {isGeneratingAI
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> AI đang tạo lộ trình...</>
                : <><Sparkles className="w-4 h-4" /> Tạo AI Learning Path</>}
            </button>
          </div>
        )}

        {/* ── AI Learning Path Results ── */}
        {aiResult && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 animate-scale-in">
            {/* Success banner */}
            <div className="mb-6 p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Lộ trình học tập đã được tạo thành công!</p>
                  <p className="text-xs text-white/40 mt-0.5">Nội dung được tạo bởi AI và tham chiếu từ ngân hàng đề.</p>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white/90 text-center mb-6">AI Learning Path Recommendations</h2>
            <div className="space-y-4">
              {aiResult.map((path, index) => (
                <div key={path.name} className={`rounded-xl border ${path.border} bg-gradient-to-br ${path.gradient} p-5 transition-all hover:border-white/[0.1]`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-white/40' : index === 2 ? 'text-orange-400' : 'text-white/30'}`}>
                        #{index + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white/90">{path.name}</h3>
                        <p className="text-xs text-white/40">{path.recommendation} - {path.score}/100</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/50">
                      {path.score >= 80 ? '★★★' : path.score >= 60 ? '★★' : '★'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-white/50 mb-2 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3" /> Lộ trình 8 tuần
                    </h4>
                    <div className="space-y-1.5">
                      {path.weeks.map((week, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs text-white/60">{week}</div>
                      ))}
                    </div>
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

        {/* ── Assessment Prompt (first-time, simplified) ── */}
        <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.04] backdrop-blur-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Target className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-white/90 mb-1">Khảo sát người học</h2>
              <p className="text-sm text-white/50 mb-4">
                Hoàn thành khảo sát để AI đánh giá hồ sơ của bạn và tạo lộ trình học tập cá nhân hóa dựa trên 4 yếu tố: hồ sơ người học, xác nhận chuyên gia, đánh giá liên môn, và ma trận AI.
              </p>
              <Link
                to="/learning-paths/recommended"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:brightness-110 transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              >
                <Sparkles className="w-4 h-4" />
                Xem lộ trình gợi ý (3-5 phút)
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stats Overview ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Calendar, label: 'Ngày hoàn thành', value: `${stats.completedDays}/${stats.totalDays}`, color: 'text-blue-400', glow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.08)]', barPct: stats.totalDays ? (stats.completedDays / stats.totalDays) * 100 : 0, barColor: 'from-blue-500 to-indigo-500', sub: '' },
            { icon: Trophy, label: 'XP đã kiếm', value: stats.earnedXP.toLocaleString(), color: 'text-amber-400', glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]', barPct: 0, barColor: '', sub: `Mục tiêu: ${stats.totalXP.toLocaleString()} XP` },
            { icon: Flame, label: 'Streak hiện tại', value: String(stats.currentStreak), color: 'text-orange-400', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]', barPct: 0, barColor: '', sub: `Kỷ lục: ${stats.longestStreak} ngày` },
            { icon: TrendingUp, label: 'Tiến độ tổng', value: `${stats.totalDays ? ((stats.completedDays / stats.totalDays) * 100).toFixed(0) : 0}%`, color: 'text-emerald-400', glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]', barPct: 0, barColor: '', sub: 'Đang tiến bộ tốt!' },
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

        {/* ── Weekly Timeline ── */}
        <div className="space-y-4">
          {pathData.map((week) => (
            <div key={week.weekNumber} className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
              {/* Week Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
                <div>
                  <h2 className="text-base font-bold text-white/90 mb-0.5">Tuần {week.weekNumber}</h2>
                  <p className="text-xs text-white/30">
                    {new Date(week.startDate).toLocaleDateString('vi-VN')} - {new Date(week.endDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-violet-400">{week.completedLessons}/{week.lessons.length}</span>
                  <p className="text-[0.65rem] text-white/30">Hoàn thành</p>
                </div>
              </div>

              {/* Lessons */}
              <div className="p-4 space-y-2">
                {week.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    role="button"
                    tabIndex={lesson.status === 'locked' ? -1 : 0}
                    className={`relative flex items-start gap-4 p-4 rounded-lg transition-all ${
                      lesson.status === 'locked'
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-white/[0.03] cursor-pointer group'
                    }`}
                    onClick={() => handleLessonSelect(lesson)}
                    onKeyDown={(e) => handleLessonKeyDown(e, lesson)}
                  >
                    {/* Timeline line + icon */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      {getStatusIcon(lesson.status)}
                      {index < week.lessons.length - 1 && (
                        <div className="w-px h-10 bg-white/[0.06] mt-1.5" />
                      )}
                    </div>

                    {/* Lesson content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{getSubjectIcon(lesson.subject)}</span>
                          <h3 className="text-sm font-semibold text-white/85 truncate">{lesson.title}</h3>
                          {lesson.aiGenerated && (
                            <span className="nav-badge flex-shrink-0 text-[0.55rem] px-1.5 py-0.5">AI</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-medium border flex-shrink-0 ${getDifficultyStyle(lesson.difficulty)}`}>
                          {lesson.difficulty === 'beginner' ? 'Cơ bản' : lesson.difficulty === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[0.7rem] text-white/30 mb-1.5">
                        <span>Ngày {lesson.day}</span>
                        <span className="w-px h-3 bg-white/10" />
                        <span>{new Date(lesson.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration} phút</span>
                        <span className="flex items-center gap-1 text-emerald-400/70"><Zap className="w-3 h-3" />+{lesson.xpReward} XP</span>
                      </div>

                      {/* Progress bar for in-progress */}
                      {lesson.progress !== undefined && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[0.65rem] mb-1">
                            <span className="text-white/30">Tiến độ</span>
                            <span className="text-blue-400">{lesson.progress}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]" style={{ width: `${lesson.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Action link */}
                      {(lesson.status === 'available' || lesson.status === 'in-progress') && (
                        <Link
                          to={`/learning-paths/lesson/${lesson.id}?title=${encodeURIComponent(lesson.title)}&subject=${encodeURIComponent(lesson.subject)}&difficulty=${encodeURIComponent(lesson.difficulty)}`}
                          className="inline-flex items-center mt-2.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors gap-1"
                          onClick={handleLinkClickStopPropagation}
                        >
                          <Play className="w-3 h-3" />
                          {lesson.status === 'available' ? 'Bắt đầu học' : 'Tiếp tục học'}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}

                      {/* Completed info */}
                      {lesson.status === 'completed' && lesson.completedAt && (
                        <div className="mt-2 text-[0.7rem] text-emerald-400/70 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Hoàn thành {lesson.completedAt.toLocaleDateString('vi-VN')}
                        </div>
                      )}

                      {/* Locked message */}
                      {lesson.status === 'locked' && (
                        <div className="mt-2.5 p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.03]">
                          <div className="flex items-start gap-2">
                            <Lock className="w-3 h-3 text-amber-400/60 flex-shrink-0 mt-0.5" />
                            <p className="text-[0.65rem] text-white/35">
                              Hoàn thành bài trước với điểm <span className="text-amber-400/70 font-medium">≥ 60%</span> để mở khóa
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { to: '/student/ai-tutor', icon: Brain, label: 'AI Tutor', desc: 'Chat với AI để được hỗ trợ học tập', gradient: 'from-violet-600 to-purple-600', glow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]' },
            { to: '/dashboard/assignments', icon: BookOpen, label: 'Assignments', desc: 'Xem tất cả bài tập và bài học', gradient: 'from-blue-600 to-indigo-600', glow: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.12)]' },
            { to: '/dashboard/analytics', icon: BarChart, label: 'Analytics', desc: 'Phân tích chi tiết tiến độ học tập', gradient: 'from-emerald-600 to-teal-600', glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]' },
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
