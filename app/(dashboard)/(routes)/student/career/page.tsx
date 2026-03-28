"use client"

import { useState } from "react"
import {
  Briefcase, Target, TrendingUp, Users, DollarSign, Star,
  ChevronLeft, Brain, Heart, Compass, Sparkles,
  BookOpen, Lightbulb, Zap, RotateCcw,
  Award, HeartHandshake,
  Palette, Wrench, Search, Calculator,
  GraduationCap, Clock, ArrowLeft, CheckCircle, XCircle,
  Building
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { PageHeader } from "@/components/layout/page-header"
import {
  allQuestions,
  calculateResults,
  hollandCareers,
  type PersonalityResult,
} from "@/lib/career/personality-test-data"
import {
  findCareerByName,
  type CareerDetail,
} from "@/lib/career/career-detail-data"

// ===== MAIN PAGE =====
type PageView = 'intro' | 'test' | 'result' | 'career-detail' | 'history'

export default function CareerAdvisorPage() {
  const [view, setView] = useState<PageView>('intro')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [result, setResult] = useState<PersonalityResult | null>(null)
  const [animDir, setAnimDir] = useState<'next' | 'prev'>('next')
  const [selectedCareer, setSelectedCareer] = useState<CareerDetail | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const totalQuestions = allQuestions?.length ?? 0
  const progress = totalQuestions > 0 ? Math.round(((currentQ) / totalQuestions) * 100) : 0

  const startTest = () => {
    setView('test')
    setCurrentQ(0)
    setAnswers({})
  }

  const handleAnswer = (value: number) => {
    const q = allQuestions?.[currentQ]
    if (!q) return
    const updatedAnswers = { ...answers, [q.id]: value }
    setAnswers(updatedAnswers)

    // Auto-advance after brief visual feedback
    setTimeout(() => {
      if (currentQ < totalQuestions - 1) {
        setAnimDir('next')
        setCurrentQ(prev => prev + 1)
      } else {
        // Last question — calculate results & save
        const res = calculateResults(updatedAnswers)
        setResult(res)
        setView('result')
        // Save to DB
        saveResult(res, updatedAnswers)
      }
    }, 300)
  }

  const saveResult = async (res: PersonalityResult, allAnswers: Record<number, number>) => {
    try {
      await fetch('/api/personality-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          mbtiType: res.mbtiType,
          mbtiScores: res.mbtiScores,
          hollandCode: res.hollandCode,
          hollandScores: res.hollandScores,
          personalityName: res.personalityName,
          careers: res.careers,
          answers: allAnswers,
        }),
      })
    } catch (e) {
      console.error('Failed to save result:', e)
    }
  }

  const goNext = () => {
    if (currentQ < totalQuestions - 1) {
      setAnimDir('next')
      setCurrentQ(prev => prev + 1)
    } else {
      // Calculate results
      const res = calculateResults(answers)
      setResult(res)
      setView('result')
      saveResult(res, answers)
    }
  }

  const goPrev = () => {
    if (currentQ > 0) {
      setAnimDir('prev')
      setCurrentQ(prev => prev - 1)
    }
  }

  const resetTest = () => {
    setView('intro')
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
  }

  const openCareerDetail = (careerName: string) => {
    const career = findCareerByName(careerName)
    if (career) {
      setSelectedCareer(career)
      setView('career-detail')
    } else {
      toast.error('Chưa có dữ liệu chi tiết cho nghề này')
    }
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/personality-test?action=history')
      const data = await res.json()
      if (data.success) {
        setHistory(data.data || [])
        setView('history')
      }
    } catch (e) {
      toast.error('Không thể tải lịch sử')
    } finally {
      setLoadingHistory(false)
    }
  }

  const currentAnswer = answers[allQuestions?.[currentQ]?.id ?? -1]

  // ===== INTRO VIEW =====
  if (view === 'intro') {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Tư Vấn Hướng Nghiệp" description="Khám phá tính cách và ngành nghề phù hợp với bạn" />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-[hsl(265,85%,18%)] via-[hsl(245,80%,22%)] to-[hsl(210,85%,18%)] rounded-3xl border border-white/[0.08] p-10 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(265,85%,40%)_0%,transparent_50%)] opacity-20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(210,85%,40%)_0%,transparent_50%)] opacity-15" />

              <div className="relative z-10">
                <div className="flex justify-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(265,85%,60%)] to-[hsl(280,75%,50%)] flex items-center justify-center shadow-[0_0_30px_rgba(150,100,255,0.3)]">
                    <Brain className="h-7 w-7 text-white" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(175,80%,45%)] to-[hsl(195,85%,45%)] flex items-center justify-center shadow-[0_0_30px_rgba(50,200,180,0.3)]">
                    <Compass className="h-7 w-7 text-white" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">Bạn Là Ai?</h2>
                <p className="text-white/50 max-w-lg mx-auto mb-2 text-sm leading-relaxed">
                  Khám phá tính cách, điểm mạnh và ngành nghề phù hợp nhất với bạn thông qua bài kiểm tra tính cách toàn diện.
                </p>
                <p className="text-white/30 text-xs mb-8">
                  {totalQuestions} câu hỏi • ~10 phút • Dựa trên mô hình MBTI & Holland
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={startTest}
                    className="bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] border-0 text-white px-10 py-6 text-base shadow-[0_0_30px_rgba(120,100,255,0.25)] hover:shadow-[0_0_40px_rgba(120,100,255,0.4)] hover:brightness-110 transition-all"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Bắt Đầu Khám Phá
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="bg-white/[0.04] border-white/[0.12] text-white/70 hover:bg-white/[0.08] px-8 py-6 text-base"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Xem Lịch Sử
                  </Button>
                </div>
              </div>
            </div>

            {/* What You'll Discover */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Brain, color: 'hsl(265,85%,60%)', title: 'Tính Cách MBTI', desc: 'Khám phá 1 trong 16 kiểu tính cách độc đáo của bạn' },
                { icon: Compass, color: 'hsl(175,80%,50%)', title: 'Sở Thích Nghề Nghiệp', desc: 'Phân tích xu hướng nghề nghiệp theo mô hình Holland' },
                { icon: Briefcase, color: 'hsl(35,90%,55%)', title: 'Ngành Nghề Phù Hợp', desc: 'Gợi ý nghề nghiệp, trường ĐH và lộ trình phát triển' },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 text-center transition-all hover:-translate-y-1 hover:bg-white/[0.04] hover:border-white/[0.1]">
                  <Icon className="h-10 w-10 mx-auto mb-3" style={{ color }} />
                  <h3 className="font-semibold text-white/85 text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* How the test works */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                Cách Thực Hiện
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: 1, title: 'Trả lời câu hỏi', desc: 'Chọn mức độ đồng ý với mỗi phát biểu', icon: BookOpen },
                  { step: 2, title: 'Phân tích tính cách', desc: 'Hệ thống tính toán kiểu tính cách MBTI', icon: Brain },
                  { step: 3, title: 'Khám phá sở thích', desc: 'Xác định nhóm nghề nghiệp Holland phù hợp', icon: Compass },
                  { step: 4, title: 'Nhận kết quả', desc: 'Xem ngành nghề, trường ĐH và lộ trình', icon: Target },
                ].map(({ step, title, desc, icon: Icon }) => (
                  <div key={step} className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[hsl(265,85%,60%)]/10 border border-[hsl(265,85%,60%)]/20 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-5 w-5 text-[hsl(265,85%,70%)]" />
                    </div>
                    <div className="text-xs font-semibold text-white/70 mb-0.5">{title}</div>
                    <div className="text-[0.65rem] text-white/30">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial / Note */}
            <div className="bg-gradient-to-r from-[hsl(175,80%,50%)]/5 to-[hsl(210,85%,55%)]/5 rounded-2xl border border-[hsl(175,80%,50%)]/10 p-5 text-center">
              <p className="text-xs text-white/40 italic">
                "Không có câu trả lời đúng hay sai — hãy chọn theo bản năng đầu tiên của bạn để có kết quả chính xác nhất."
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== TEST VIEW =====
  if (view === 'test') {
    // Ensure currentQ is within bounds
    const safeQ = Math.min(Math.max(0, currentQ), totalQuestions - 1)
    const question = totalQuestions > 0 ? allQuestions[safeQ] : null

    if (!question || totalQuestions === 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center">
          <p className="text-white/50 mb-4">Đang tải câu hỏi...</p>
          <Button onClick={() => { setView('intro'); setCurrentQ(0) }} className="bg-white/[0.06] text-white/60">
            Quay về trang chính
          </Button>
        </div>
      )
    }
    const isHolland = safeQ >= 28
    const sectionLabel = isHolland ? 'Sở Thích Nghề Nghiệp' : 'Tính Cách Cá Nhân'
    const sectionIcon = isHolland ? Compass : Brain
    const SectionIcon = sectionIcon

    return (
      <div className="flex flex-col h-full">
        {/* Progress Header */}
        <div className="px-6 pt-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SectionIcon className="h-4 w-4 text-[hsl(265,85%,65%)]" />
                <span className="text-xs font-medium text-white/50">{sectionLabel}</span>
              </div>
              <span className="text-xs text-white/30">
                {currentQ + 1} / {totalQuestions}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(175,80%,50%)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-10">
              <h2 className="text-xl md:text-2xl font-semibold text-white/90 leading-relaxed px-4">
                {question?.text ?? ''}
              </h2>
            </div>

            {/* Answer Slider */}
            <div className="space-y-6">
              {/* Labels */}
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-medium text-[hsl(175,80%,55%)]">Đồng ý</span>
                <span className="text-xs text-white/25">Trung lập</span>
                <span className="text-xs font-medium text-[hsl(280,75%,60%)]">Không đồng ý</span>
              </div>

              {/* Button Options */}
              <div className="flex justify-center gap-2 md:gap-3">
                {[
                  { value: 7, size: 'w-14 h-14 md:w-16 md:h-16', color: 'hsl(175,80%,50%)', label: 'Rất đồng ý' },
                  { value: 6, size: 'w-12 h-12 md:w-14 md:h-14', color: 'hsl(175,80%,45%)', label: 'Đồng ý' },
                  { value: 5, size: 'w-10 h-10 md:w-12 md:h-12', color: 'hsl(175,60%,40%)', label: 'Hơi đồng ý' },
                  { value: 4, size: 'w-9 h-9 md:w-10 md:h-10', color: 'hsl(220,10%,50%)', label: 'Trung lập' },
                  { value: 3, size: 'w-10 h-10 md:w-12 md:h-12', color: 'hsl(280,50%,45%)', label: 'Hơi không đồng ý' },
                  { value: 2, size: 'w-12 h-12 md:w-14 md:h-14', color: 'hsl(280,65%,50%)', label: 'Không đồng ý' },
                  { value: 1, size: 'w-14 h-14 md:w-16 md:h-16', color: 'hsl(280,75%,55%)', label: 'Rất không đồng ý' },
                ].map(({ value, size, color, label }) => {
                  const isSelected = currentAnswer === value
                  return (
                    <button
                      key={value}
                      onClick={() => handleAnswer(value)}
                      title={label}
                      className={`${size} rounded-full transition-all duration-200 flex items-center justify-center border-2 hover:scale-110 ${
                        isSelected
                          ? 'scale-110 shadow-[0_0_20px_rgba(150,100,255,0.4)]'
                          : 'hover:brightness-110'
                      }`}
                      style={{
                        backgroundColor: isSelected ? color : 'transparent',
                        borderColor: isSelected ? color : `${color}40`,
                        opacity: isSelected ? 1 : 0.6,
                      }}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Current selection label */}
              <div className="text-center h-5">
                {currentAnswer && (
                  <span className="text-xs text-white/40">
                    {currentAnswer === 7 && 'Rất đồng ý'}
                    {currentAnswer === 6 && 'Đồng ý'}
                    {currentAnswer === 5 && 'Hơi đồng ý'}
                    {currentAnswer === 4 && 'Trung lập'}
                    {currentAnswer === 3 && 'Hơi không đồng ý'}
                    {currentAnswer === 2 && 'Không đồng ý'}
                    {currentAnswer === 1 && 'Rất không đồng ý'}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation — only Back button */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={goPrev}
                disabled={currentQ === 0}
                className="text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>

              <span className="text-xs text-white/20">
                {currentQ + 1} / {totalQuestions}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== RESULT VIEW =====
  if (view === 'result' && result) {
    const hollandTop3 = Object.entries(result.hollandScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const hollandIcons: Record<string, typeof Wrench> = {
      R: Wrench, I: Search, A: Palette, S: HeartHandshake, E: Zap, C: Calculator,
    }

    const getDimensionBar = (letter1: string, letter2: string, score1: number) => {
      const isFirst = score1 >= 50
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold ${isFirst ? 'text-[hsl(175,80%,55%)]' : 'text-white/40'}`}>
              {letter1} ({score1}%)
            </span>
            <span className={`font-semibold ${!isFirst ? 'text-[hsl(280,75%,60%)]' : 'text-white/40'}`}>
              {letter2} ({100 - score1}%)
            </span>
          </div>
          <div className="relative w-full h-3 rounded-full overflow-hidden bg-white/[0.06]">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(175,80%,40%)]"
              style={{ width: `${score1}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 bg-gradient-to-l from-[hsl(280,75%,55%)] to-[hsl(280,75%,45%)]"
              style={{ width: `${100 - score1}%` }}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Kết Quả Tư Vấn Hướng Nghiệp"
          description="Khám phá bản thân và ngành nghề phù hợp"
          actions={
            <Button variant="outline" onClick={resetTest} className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
              <RotateCcw className="h-4 w-4 mr-2" />
              Làm Lại
            </Button>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ===== PERSONALITY TYPE HERO ===== */}
            <div className="relative bg-gradient-to-br from-[hsl(265,85%,18%)] via-[hsl(245,80%,20%)] to-[hsl(210,85%,18%)] rounded-3xl border border-white/[0.08] p-8 md:p-10 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(265,85%,40%)_0%,transparent_50%)] opacity-15" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,hsl(175,80%,40%)_0%,transparent_50%)] opacity-10" />

              <div className="relative z-10 text-center">
                <div className="text-5xl mb-3">{result.personalityEmoji}</div>
                <div className="inline-flex items-center gap-2 bg-white/[0.06] rounded-full px-4 py-1.5 mb-3">
                  <span className="text-2xl font-bold tracking-wider text-white">{result.mbtiType}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{result.personalityName}</h2>
                <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
                  {result.description}
                </p>
              </div>
            </div>

            {/* ===== MBTI DIMENSIONS ===== */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-[hsl(265,85%,65%)]" />
                Phân Tích Tính Cách MBTI
              </h3>
              <div className="space-y-4">
                {getDimensionBar('E (Hướng ngoại)', 'I (Hướng nội)', result.mbtiScores['E'])}
                {getDimensionBar('S (Thực tế)', 'N (Trực giác)', result.mbtiScores['S'])}
                {getDimensionBar('T (Lý trí)', 'F (Cảm xúc)', result.mbtiScores['T'])}
                {getDimensionBar('J (Nguyên tắc)', 'P (Linh hoạt)', result.mbtiScores['J'])}
              </div>
            </div>

            {/* ===== STRENGTHS & WEAKNESSES ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[hsl(175,80%,50%)]/5 rounded-2xl border border-[hsl(175,80%,50%)]/10 p-6">
                <h3 className="font-semibold text-[hsl(175,80%,55%)] mb-3 flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4" />
                  Điểm Mạnh
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <Badge key={i} className="bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,60%)] border border-[hsl(175,80%,50%)]/20 text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="bg-[hsl(280,75%,55%)]/5 rounded-2xl border border-[hsl(280,75%,55%)]/10 p-6">
                <h3 className="font-semibold text-[hsl(280,75%,60%)] mb-3 flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4" />
                  Cần Cải Thiện
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.weaknesses.map((w, i) => (
                    <Badge key={i} className="bg-[hsl(280,75%,55%)]/10 text-[hsl(280,75%,65%)] border border-[hsl(280,75%,55%)]/20 text-xs">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== HOLLAND CAREER INTERESTS ===== */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Compass className="h-4 w-4 text-[hsl(175,80%,55%)]" />
                Sở Thích Nghề Nghiệp (Holland Code: <span className="text-[hsl(175,80%,55%)]">{result.hollandCode}</span>)
              </h3>

              {/* Holland Bars */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(result.hollandScores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, score]) => {
                    const info = hollandCareers[code]
                    const Icon = hollandIcons[code] || Briefcase
                    const isTop3 = hollandTop3.some(([c]) => c === code)
                    return (
                      <div
                        key={code}
                        className={`rounded-xl p-4 transition-all ${
                          isTop3
                            ? 'bg-[hsl(265,85%,60%)]/8 border border-[hsl(265,85%,60%)]/15'
                            : 'bg-white/[0.02] border border-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-4 w-4 ${isTop3 ? 'text-[hsl(265,85%,70%)]' : 'text-white/30'}`} />
                          <span className={`text-xs font-medium ${isTop3 ? 'text-white/80' : 'text-white/40'}`}>
                            {info.name}
                          </span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className={`text-xl font-bold ${isTop3 ? 'text-[hsl(265,85%,70%)]' : 'text-white/30'}`}>
                            {score}%
                          </span>
                        </div>
                        <div className="mt-2 w-full h-1.5 rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isTop3 ? 'bg-gradient-to-r from-[hsl(265,85%,55%)] to-[hsl(210,85%,55%)]' : 'bg-white/[0.1]'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Top Holland Careers */}
              <div className="space-y-3">
                {hollandTop3.map(([code, score]) => {
                  const info = hollandCareers[code]
                  return (
                    <div key={code} className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white/80">{info.name}</span>
                        <Badge className="bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,60%)] border border-[hsl(175,80%,50%)]/20 text-xs">
                          {score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-white/35 mb-2">{info.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {info.careers.map((c, i) => (
                          <span key={i} className="text-[0.65rem] bg-white/[0.04] text-white/50 rounded-md px-2 py-0.5">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ===== RECOMMENDED CAREERS ===== */}
            <div className="bg-gradient-to-r from-[hsl(245,85%,55%)]/8 to-[hsl(175,80%,50%)]/8 rounded-2xl border border-[hsl(245,85%,60%)]/15 p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                Ngành Nghề Gợi Ý Cho Bạn
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {result.careers.map((career, i) => (
                  <button
                    key={i}
                    onClick={() => openCareerDetail(career)}
                    className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.06] hover:border-white/[0.1] cursor-pointer group"
                  >
                    <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                      i === 0 ? 'bg-[hsl(35,90%,55%)]/15 text-[hsl(35,90%,60%)]' :
                      i === 1 ? 'bg-[hsl(175,80%,50%)]/15 text-[hsl(175,80%,55%)]' :
                      'bg-[hsl(265,85%,60%)]/15 text-[hsl(265,85%,70%)]'
                    }`}>
                      {i === 0 ? <Award className="h-5 w-5" /> :
                       i === 1 ? <Star className="h-5 w-5" /> :
                       <Briefcase className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium text-white/80">{career}</span>
                    {i === 0 && (
                      <div className="text-[0.6rem] text-[hsl(35,90%,55%)] mt-1">Phù hợp nhất</div>
                    )}
                    <div className="text-[0.6rem] text-white/25 mt-1 group-hover:text-[hsl(175,80%,55%)] transition-colors">
                      Xem chi tiết →
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ===== LEARNING STYLE ===== */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-[hsl(210,90%,60%)]" />
                Phong Cách Học Tập
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{result.learningStyle}</p>
            </div>

            {/* ===== FAMOUS PEOPLE ===== */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-[hsl(280,75%,60%)]" />
                Người Nổi Tiếng Cùng Tính Cách
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.famousPeople.map((name, i) => (
                  <Badge key={i} className="bg-white/[0.04] text-white/60 border border-white/[0.08] text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* ===== CTA ===== */}
            <div className="bg-gradient-to-r from-[hsl(265,85%,55%)]/10 to-[hsl(175,80%,50%)]/10 rounded-2xl border border-white/[0.08] p-6 text-center">
              <h3 className="font-semibold text-white/80 mb-2 text-sm">Muốn tìm hiểu chi tiết hơn?</h3>
              <p className="text-xs text-white/35 mb-4">AI sẽ phân tích kết hợp tính cách với kết quả học tập để đưa ra gợi ý chính xác hơn</p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={resetTest}
                  variant="outline"
                  className="bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06]"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Làm Lại Bài Test
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== CAREER DETAIL VIEW =====
  if (view === 'career-detail' && selectedCareer) {
    const c = selectedCareer
    const demandColor = c.market.demandLevel === 'Rất cao' ? 'hsl(175,80%,50%)' :
      c.market.demandLevel === 'Cao' ? 'hsl(175,60%,45%)' :
      c.market.demandLevel === 'Trung bình' ? 'hsl(35,90%,55%)' : 'hsl(0,60%,55%)'

    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={c.name}
          description={c.shortDescription}
          actions={
            <Button variant="outline" onClick={() => setView('result')} className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay Lại
            </Button>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Hero */}
            <div className="relative bg-gradient-to-br from-[hsl(265,85%,18%)] via-[hsl(245,80%,20%)] to-[hsl(210,85%,18%)] rounded-3xl border border-white/[0.08] p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(265,85%,40%)_0%,transparent_50%)] opacity-15" />
              <div className="relative z-10">
                <div className="text-5xl mb-3">{c.icon}</div>
                <h2 className="text-2xl font-bold text-white mb-2">{c.name}</h2>
                <Badge className="bg-white/[0.06] text-white/60 border-white/[0.1] mb-4">{c.category}</Badge>
                <p className="text-white/50 text-sm leading-relaxed max-w-2xl">{c.fullDescription}</p>
              </div>
            </div>

            {/* Market Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Nhu cầu', value: c.market.demandLevel, icon: TrendingUp, color: demandColor },
                { label: 'Lương khởi điểm', value: c.market.salaryRange.entry, icon: DollarSign, color: 'hsl(175,80%,50%)' },
                { label: 'Lương trung cấp', value: c.market.salaryRange.mid, icon: DollarSign, color: 'hsl(35,90%,55%)' },
                { label: 'Lương cao cấp', value: c.market.salaryRange.senior, icon: DollarSign, color: 'hsl(265,85%,65%)' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5 text-center">
                  <Icon className="h-5 w-5 mx-auto mb-2" style={{ color }} />
                  <div className="text-xs text-white/40 mb-1">{label}</div>
                  <div className="text-sm font-semibold text-white/85">{value}</div>
                </div>
              ))}
            </div>

            {/* Extra market info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
                <div className="text-xs text-white/40 mb-1">Tăng trưởng</div>
                <div className="text-sm font-semibold text-[hsl(175,80%,55%)]">{c.market.growthRate}</div>
              </div>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
                <div className="text-xs text-white/40 mb-1">Tổng vị trí tuyển dụng</div>
                <div className="text-sm font-semibold text-white/85">{c.market.totalJobs}</div>
              </div>
            </div>

            {/* AI Exposure Analysis */}
            {c.aiExposure && (
              <div className={`rounded-2xl border p-6 ${
                c.aiExposure.score >= 7 ? 'bg-[hsl(0,60%,50%)]/5 border-[hsl(0,60%,50%)]/15' :
                c.aiExposure.score >= 4 ? 'bg-[hsl(35,90%,55%)]/5 border-[hsl(35,90%,55%)]/15' :
                'bg-[hsl(175,80%,50%)]/5 border-[hsl(175,80%,50%)]/15'
              }`}>
                <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                  Phân Tích Tác Động AI (Karpathy 2026)
                </h3>
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      c.aiExposure.score >= 7 ? 'text-[hsl(0,60%,60%)]' :
                      c.aiExposure.score >= 4 ? 'text-[hsl(35,90%,60%)]' :
                      'text-[hsl(175,80%,55%)]'
                    }`}>
                      {c.aiExposure.score}/10
                    </div>
                    <div className="text-[0.6rem] text-white/30 mt-1">Mức độ ảnh hưởng</div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${
                        c.aiExposure.score >= 7 ? 'bg-gradient-to-r from-[hsl(35,90%,55%)] to-[hsl(0,60%,55%)]' :
                        c.aiExposure.score >= 4 ? 'bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(35,90%,55%)]' :
                        'bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(175,60%,40%)]'
                      }`} style={{ width: `${c.aiExposure.score * 10}%` }} />
                    </div>
                    <div className="flex justify-between text-[0.55rem] text-white/20 mt-1">
                      <span>An toàn</span>
                      <span>Trung bình (5.3)</span>
                      <span>Rủi ro cao</span>
                    </div>
                  </div>
                  <Badge className={`text-xs border ${
                    c.aiExposure.trend === 'Tăng' ? 'bg-[hsl(0,60%,50%)]/10 text-[hsl(0,60%,65%)] border-[hsl(0,60%,50%)]/20' :
                    c.aiExposure.trend === 'Giảm' ? 'bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,55%)] border-[hsl(175,80%,50%)]/20' :
                    'bg-white/[0.04] text-white/50 border-white/[0.08]'
                  }`}>
                    {c.aiExposure.trend === 'Tăng' ? '↑' : c.aiExposure.trend === 'Giảm' ? '↓' : '→'} {c.aiExposure.trend}
                  </Badge>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{c.aiExposure.analysis}</p>
              </div>
            )}

            {/* Education */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-[hsl(210,90%,60%)]" />
                Yêu Cầu Học Vấn
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-white/40">Bằng tối thiểu: </span>
                  <Badge className="bg-[hsl(210,90%,60%)]/10 text-[hsl(210,90%,65%)] border border-[hsl(210,90%,60%)]/20 text-xs">
                    {c.education.minimumDegree}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-2">Ngành học phù hợp:</div>
                  <div className="flex flex-wrap gap-2">
                    {c.education.recommendedMajors.map((m, i) => (
                      <Badge key={i} className="bg-white/[0.04] text-white/60 border border-white/[0.08] text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-2">Trường đại học hàng đầu:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {c.education.topUniversities.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                        <Building className="h-3.5 w-3.5 text-white/30" />
                        <div>
                          <div className="text-xs font-medium text-white/70">{u.name}</div>
                          <div className="text-[0.6rem] text-white/30">{u.location} {u.ranking && `• ${u.ranking}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {c.education.certifications && c.education.certifications.length > 0 && (
                  <div>
                    <div className="text-xs text-white/40 mb-2">Chứng chỉ quan trọng:</div>
                    <div className="flex flex-wrap gap-2">
                      {c.education.certifications.map((cert, i) => (
                        <Badge key={i} className="bg-[hsl(35,90%,55%)]/10 text-[hsl(35,90%,60%)] border border-[hsl(35,90%,55%)]/20 text-xs">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                Kỹ Năng Cần Có
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/40 mb-2">Kỹ năng chuyên môn:</div>
                  <div className="space-y-2">
                    {c.skills.technical.map((s, i) => {
                      const levelW = s.level === 'Chuyên gia' ? '100%' : s.level === 'Nâng cao' ? '75%' : s.level === 'Trung bình' ? '50%' : '25%'
                      const levelColor = s.level === 'Chuyên gia' ? 'hsl(265,85%,60%)' : s.level === 'Nâng cao' ? 'hsl(175,80%,50%)' : s.level === 'Trung bình' ? 'hsl(210,85%,55%)' : 'hsl(35,90%,55%)'
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-white/60 w-32 shrink-0">{s.name}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full transition-all" style={{ width: levelW, backgroundColor: levelColor }} />
                          </div>
                          <span className="text-[0.6rem] text-white/30 w-16 text-right">{s.level}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-2">Kỹ năng mềm:</div>
                  <div className="flex flex-wrap gap-2">
                    {c.skills.soft.map((s, i) => (
                      <Badge key={i} className="bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,60%)] border border-[hsl(175,80%,50%)]/20 text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-2">Công cụ thường dùng:</div>
                  <div className="flex flex-wrap gap-2">
                    {c.skills.tools.map((t, i) => (
                      <Badge key={i} className="bg-white/[0.04] text-white/50 border border-white/[0.08] text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Career Roadmap */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-[hsl(265,85%,65%)]" />
                Lộ Trình Phát Triển
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[1.125rem] top-3 bottom-3 w-px bg-gradient-to-b from-[hsl(175,80%,50%)] via-[hsl(265,85%,60%)] to-[hsl(280,75%,55%)]" />

                <div className="space-y-6">
                  {c.roadmap.map((stage, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                        i === 0 ? 'bg-[hsl(175,80%,50%)]/20 border border-[hsl(175,80%,50%)]/30' :
                        i === c.roadmap.length - 1 ? 'bg-[hsl(265,85%,60%)]/20 border border-[hsl(265,85%,60%)]/30' :
                        'bg-white/[0.04] border border-white/[0.08]'
                      }`}>
                        <span className="text-xs font-bold text-white/60">{stage.stage}</span>
                      </div>
                      <div className="flex-1 bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-white/80">{stage.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-white/[0.04] text-white/40 border border-white/[0.06] text-[0.6rem]">
                              <Clock className="h-3 w-3 mr-1" />
                              {stage.duration}
                            </Badge>
                            {stage.salary && (
                              <Badge className="bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,55%)] border border-[hsl(175,80%,50%)]/20 text-[0.6rem]">
                                {stage.salary}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">{stage.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[hsl(175,80%,50%)]/5 rounded-2xl border border-[hsl(175,80%,50%)]/10 p-6">
                <h3 className="font-semibold text-[hsl(175,80%,55%)] mb-3 flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Ưu Điểm
                </h3>
                <ul className="space-y-2">
                  {c.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/55 leading-relaxed">
                      <span className="text-[hsl(175,80%,50%)] mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[hsl(280,75%,55%)]/5 rounded-2xl border border-[hsl(280,75%,55%)]/10 p-6">
                <h3 className="font-semibold text-[hsl(280,75%,60%)] mb-3 flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4" />
                  Nhược Điểm
                </h3>
                <ul className="space-y-2">
                  {c.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/55 leading-relaxed">
                      <span className="text-[hsl(280,75%,55%)] mt-0.5">•</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Top Employers */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-[hsl(210,90%,60%)]" />
                Nhà Tuyển Dụng Hàng Đầu
              </h3>
              <div className="flex flex-wrap gap-2">
                {c.market.topEmployers.map((e, i) => (
                  <Badge key={i} className="bg-white/[0.04] text-white/60 border border-white/[0.08] text-xs">{e}</Badge>
                ))}
              </div>
            </div>

            {/* Important Subjects */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                Môn Học Quan Trọng
              </h3>
              <div className="space-y-2">
                {c.importantSubjects.map((s, i) => {
                  const impColor = s.importance === 'Rất quan trọng' ? 'hsl(175,80%,50%)' : s.importance === 'Quan trọng' ? 'hsl(35,90%,55%)' : 'hsl(210,85%,55%)'
                  const impW = s.importance === 'Rất quan trọng' ? '100%' : s.importance === 'Quan trọng' ? '66%' : '33%'
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-white/60 w-28 shrink-0">{s.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: impW, backgroundColor: impColor }} />
                      </div>
                      <span className="text-[0.6rem] text-white/30 w-24 text-right">{s.importance}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Daily Life */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[hsl(175,80%,55%)]" />
                Một Ngày Làm Việc Điển Hình
              </h3>
              <div className="space-y-2">
                {c.dailyLife.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                    <div className="w-6 h-6 rounded-lg bg-[hsl(265,85%,60%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[0.55rem] font-bold text-[hsl(265,85%,70%)]">{i + 1}</span>
                    </div>
                    <span className="text-xs text-white/55 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suitable Personalities & Holland */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
                <div className="text-xs text-white/40 mb-2">Tính cách MBTI phù hợp:</div>
                <div className="flex flex-wrap gap-2">
                  {c.suitablePersonalities.map((p, i) => (
                    <Badge key={i} className={`text-xs border ${
                      result?.mbtiType === p
                        ? 'bg-[hsl(175,80%,50%)]/15 text-[hsl(175,80%,55%)] border-[hsl(175,80%,50%)]/25'
                        : 'bg-white/[0.04] text-white/50 border-white/[0.08]'
                    }`}>
                      {p} {result?.mbtiType === p && '✓'}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
                <div className="text-xs text-white/40 mb-2">Holland Code phù hợp:</div>
                <div className="flex flex-wrap gap-2">
                  {c.suitableHolland.map((h, i) => (
                    <Badge key={i} className={`text-xs border ${
                      result?.hollandCode?.includes(h)
                        ? 'bg-[hsl(265,85%,60%)]/15 text-[hsl(265,85%,70%)] border-[hsl(265,85%,60%)]/25'
                        : 'bg-white/[0.04] text-white/50 border-white/[0.08]'
                    }`}>
                      {h} {result?.hollandCode?.includes(h) && '✓'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Related Careers */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Compass className="h-4 w-4 text-[hsl(280,75%,60%)]" />
                Ngành Nghề Liên Quan
              </h3>
              <div className="flex flex-wrap gap-2">
                {c.relatedCareers.map((rc, i) => (
                  <button
                    key={i}
                    onClick={() => openCareerDetail(rc)}
                    className="text-xs bg-white/[0.04] text-white/50 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:bg-white/[0.08] hover:text-white/70 transition-all cursor-pointer"
                  >
                    {rc} →
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== HISTORY VIEW =====
  if (view === 'history') {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Lịch Sử Bài Test"
          description="Xem lại kết quả các lần kiểm tra tính cách"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView('intro')} className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay Lại
              </Button>
              <Button onClick={startTest} className="bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] border-0 text-white">
                <Sparkles className="h-4 w-4 mr-2" />
                Làm Bài Mới
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-16">
                <Brain className="h-12 w-12 mx-auto mb-4 text-white/20" />
                <h3 className="text-lg font-semibold text-white/50 mb-2">Chưa có kết quả nào</h3>
                <p className="text-sm text-white/30 mb-6">Hãy làm bài kiểm tra tính cách để khám phá bản thân</p>
                <Button onClick={startTest} className="bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] border-0 text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Bắt Đầu Ngay
                </Button>
              </div>
            ) : (
              history.map((item, i) => {
                const date = new Date(item.createdAt)
                const dateStr = date.toLocaleDateString('vi-VN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })

                return (
                  <div
                    key={item.id}
                    className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(265,85%,60%)]/20 to-[hsl(175,80%,50%)]/20 border border-white/[0.08] flex items-center justify-center">
                          <span className="text-lg font-bold text-white/80">{item.mbtiType}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white/85">{item.personalityName}</h4>
                          <div className="flex items-center gap-2 text-[0.65rem] text-white/35">
                            <Clock className="h-3 w-3" />
                            {dateStr}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,55%)] border border-[hsl(175,80%,50%)]/20 text-xs">
                        Holland: {item.hollandCode}
                      </Badge>
                    </div>

                    {/* Mini dimension bars */}
                    <div className="grid grid-cols-4 gap-3">
                      {item.mbtiScores && Object.entries(item.mbtiScores as Record<string, number>).slice(0, 4).map(([key, val]) => {
                        const pairs: Record<string, string> = { E: 'I', S: 'N', T: 'F', J: 'P' }
                        const opp = pairs[key] || ''
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-[0.6rem] text-white/30">
                              <span>{key}</span><span>{opp}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                              <div className="h-full rounded-full bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(175,80%,40%)]"
                                style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Careers */}
                    {item.careers && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(item.careers as string[]).slice(0, 4).map((c: string, j: number) => (
                          <span key={j} className="text-[0.6rem] bg-white/[0.04] text-white/40 rounded-md px-2 py-0.5">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
