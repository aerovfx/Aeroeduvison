
import { useState } from "react"
import {
  Briefcase, Target, TrendingUp, Users, DollarSign, Star,
  ChevronLeft, Brain, Heart, Compass, Sparkles,
  BookOpen, Lightbulb, Zap, RotateCcw,
  Award, HeartHandshake,
  Palette, Wrench, Search, Calculator,
  GraduationCap, Clock, ArrowLeft, CheckCircle, XCircle,
  Building,
  Trophy, BarChart3, Loader2, User as UserIcon,
  QrCode, Download, Smartphone, Copy, X,
  MapPin, Coins, Layers, ListChecks,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  allQuestions,
  calculateResults,
  hollandCareers,
  type PersonalityResult,
} from "@/lib/career-personality-data"
import {
  findCareerByName,
  type CareerDetail,
} from "@/lib/career-detail-data"
import { getCareerExtended } from "@/lib/career-vn-extended"
import { careerService } from "@/services/career.service"
import { useAuth } from "@/hooks/useAuth"
import { formatRelativeTime } from "@/lib/utils"
import type { CareerCommunityStats, CareerTestResult } from "@/types"
import CareerDayPixelSim from "@/components/career/CareerDayPixelSim"
import PixelOdyssey from "@/components/career/PixelOdyssey"
import ScrollToTopButton from "@/components/common/ScrollToTopButton"

/* ─── Inline replacements ─────────────────────────── */
function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white/90">{title}</h1>
        {description && <p className="text-sm text-white/40 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// Badge replacement
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

// ===== MAIN PAGE =====
type PageView = "intro" | "test" | "result" | "career-detail" | "history"

export default function CareerAdvisorPage() {
  const [view, setView] = useState<PageView>("intro")
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [result, setResult] = useState<PersonalityResult | null>(null)
  const [selectedCareer, setSelectedCareer] = useState<CareerDetail | null>(null)
  const [history, setHistory] = useState<CareerTestResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  /** Nghề đã mở xem chi tiết trong lần làm bài hiện tại — auto append khi
   *  openCareerDetail() chạy, save lại để khi xem lại lịch sử có cả info này. */
  const [viewedCareers, setViewedCareers] = useState<string[]>([])
  /** Khi true → đang xem lại bài đã làm cũ (read-only mode) thay vì làm mới */
  const [reviewMode, setReviewMode] = useState(false)
  /** Collapse trạng thái cho section "Xem lại 60 câu trả lời" */
  const [showAnswersReview, setShowAnswersReview] = useState(false)

  // Cổng nhập thông tin người làm bài (tên + năm sinh) để hiển thị cho QR-scanner
  const [showTakerGate, setShowTakerGate] = useState(false)
  const [takerName, setTakerName] = useState("")
  const [takerYob, setTakerYob] = useState<string>("")
  const [takerError, setTakerError] = useState<string | null>(null)

  // Modal hiển thị QR code
  const [showQrModal, setShowQrModal] = useState(false)

  const { user } = useAuth()
  const queryClient = useQueryClient()

  // URL cố định của bài test — dùng làm dữ liệu QR
  const TEST_URL =
    typeof window !== "undefined"
      ? window.location.origin + "/student/career"
      : "https://inphysic.com/student/career"
  const QR_IMG_URL = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(
    TEST_URL,
  )}`

  // Thống kê cộng đồng: cache 1 phút, luôn có dữ liệu (fallback local)
  const {
    data: communityStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["career-community-stats"],
    queryFn: () => careerService.getCommunityStats(),
    staleTime: 60_000,
  })

  const totalQuestions = allQuestions?.length ?? 0
  const progress = totalQuestions > 0 ? Math.round(((currentQ) / totalQuestions) * 100) : 0

  // Mở cổng nhập tên + năm sinh trước khi vào bài (bất cứ ai scan QR
  // cũng phải khai báo, giúp thống kê có dữ liệu tham chiếu).
  const openTakerGate = () => {
    setTakerError(null)
    // Nếu đang login sẵn, tự điền tên
    if (user?.name && !takerName) setTakerName(user.name)
    setShowTakerGate(true)
  }

  const startTest = () => {
    setView("test")
    setCurrentQ(0)
    setAnswers({})
  }

  const confirmTakerAndStart = () => {
    const name = takerName.trim()
    const currentYear = new Date().getFullYear()
    const yob = parseInt(takerYob, 10)

    if (!name || name.length < 2) {
      setTakerError("Vui lòng nhập tên đầy đủ (≥ 2 ký tự).")
      return
    }
    if (!Number.isFinite(yob) || yob < 1940 || yob > currentYear) {
      setTakerError(`Năm sinh không hợp lệ (1940 – ${currentYear}).`)
      return
    }
    setTakerError(null)
    setShowTakerGate(false)
    startTest()
  }

  const handleAnswer = (value: number) => {
    const q = allQuestions?.[currentQ]
    if (!q) return
    const updatedAnswers = { ...answers, [q.id]: value }
    setAnswers(updatedAnswers)

    setTimeout(() => {
      if (currentQ < totalQuestions - 1) {
        setCurrentQ(prev => prev + 1)
      } else {
        const res = calculateResults(updatedAnswers)
        setResult(res)
        setView("result")
        saveResult(res, updatedAnswers)
      }
    }, 300)
  }

  const saveResult = async (
    res: PersonalityResult,
    allAnswers: Record<number, number>,
    viewed: string[] = viewedCareers,
  ) => {
    const yobNum = parseInt(takerYob, 10)
    await careerService.saveTest({
      mbtiType: res.mbtiType,
      mbtiScores: res.mbtiScores,
      hollandCode: res.hollandCode,
      hollandScores: res.hollandScores,
      personalityName: res.personalityName,
      careers: res.careers,
      answers: allAnswers,
      viewedCareers: viewed,
      userId: user?.id ?? null,
      // Ưu tiên thông tin người làm nhập thủ công (từ QR scan) — nếu không
      // có thì fallback về tài khoản đang đăng nhập.
      userName: (takerName.trim() || user?.name) ?? null,
      userImage: user?.image ?? null,
      userYearOfBirth: Number.isFinite(yobNum) ? yobNum : null,
    })
    // Làm mới thống kê cộng đồng sau khi lưu
    queryClient.invalidateQueries({ queryKey: ["career-community-stats"] })
  }

  const goPrev = () => {
    if (currentQ > 0) {
      setCurrentQ(prev => prev - 1)
    }
  }

  const resetTest = () => {
    setView("intro")
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
    setViewedCareers([])
    setReviewMode(false)
    setShowAnswersReview(false)
  }

  const openCareerDetail = (careerName: string) => {
    const career = findCareerByName(careerName)
    if (career) {
      // Gộp dữ liệu mở rộng (universitiesVN + jobTasks) cập nhật 2026
      const ext = getCareerExtended(career.id)
      setSelectedCareer({ ...career, ...ext })
      setView("career-detail")
      // Track nghề đã xem — append unique. Khi review mode thì không save lại
      // (vì là re-open bài cũ, không muốn modify lịch sử).
      if (!reviewMode) {
        setViewedCareers(prev => {
          if (prev.includes(careerName)) return prev
          const next = [...prev, careerName]
          // Re-save với updated viewedCareers (fire-and-forget)
          if (result && Object.keys(answers).length > 0) {
            saveResult(result, answers, next).catch(() => {/* ignore */})
          }
          return next
        })
      }
    } else {
      toast.error("Chưa có dữ liệu chi tiết cho nghề này")
    }
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const data = await careerService.getMyHistory()
      setHistory(data)
      setView("history")
    } catch {
      toast.error("Không thể tải lịch sử")
    } finally {
      setLoadingHistory(false)
    }
  }

  /**
   * Khôi phục bài đã làm cũ vào state hiện tại → chuyển sang view "result"
   * ở read-only mode. HS có thể bấm vào từng nghề trong gợi ý để xem chi tiết,
   * bấm vào "Xem lại 60 câu trả lời" để duyệt từng câu hỏi đã trả lời.
   */
  const restoreFromHistory = (item: CareerTestResult) => {
    const restoredAnswers = (item.answers || {}) as Record<number, number>
    const restoredViewed = item.viewedCareers || []
    // Rebuild full PersonalityResult bằng calculateResults() từ answers gốc
    // → có đủ personalityEmoji, description, strengths, weaknesses, learningStyle, famousPeople
    const personality = Object.keys(restoredAnswers).length > 0
      ? calculateResults(restoredAnswers)
      : null
    if (!personality) {
      toast.error('Lần làm này thiếu dữ liệu câu trả lời — không thể mở lại')
      return
    }
    setAnswers(restoredAnswers)
    setViewedCareers(restoredViewed)
    setResult(personality)
    setReviewMode(true)
    setShowAnswersReview(false)
    setView("result")
    const dateStr = new Date(item.createdAt).toLocaleString("vi-VN", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    toast.success(`Đã mở lại bài làm lúc ${dateStr}`, { icon: "📂" })
  }

  const currentAnswer = answers[allQuestions?.[currentQ]?.id ?? -1]

  // ===== INTRO VIEW =====
  if (view === "intro") {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Tư Vấn Hướng Nghiệp" description="Khám phá tính cách và ngành nghề phù hợp với bạn" />
        <ScrollToTopButton containerSelector="#career-intro-scroll" />

        <div id="career-intro-scroll" className="flex-1 overflow-auto p-6">
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
                  <button
                    onClick={openTakerGate}
                    className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] text-white font-semibold text-base shadow-[0_0_30px_rgba(120,100,255,0.25)] hover:shadow-[0_0_40px_rgba(120,100,255,0.4)] hover:brightness-110 transition-all"
                  >
                    <Sparkles className="h-5 w-5" />
                    Bắt Đầu Khám Phá
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-white/70 hover:bg-white/[0.08] font-semibold text-base transition-all"
                  >
                    <QrCode className="h-5 w-5" />
                    Quét QR Làm Trên Điện Thoại
                  </button>
                  <button
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-white/70 hover:bg-white/[0.08] font-semibold text-base transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Xem Lịch Sử
                  </button>
                </div>
              </div>
            </div>

            {/* Pixel Odyssey — game khám phá nghề tương tác */}
            <PixelOdyssey />

            {/* What You'll Discover */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Brain, color: "hsl(265,85%,60%)", title: "Tính Cách MBTI", desc: "Khám phá 1 trong 16 kiểu tính cách độc đáo của bạn" },
                { icon: Compass, color: "hsl(175,80%,50%)", title: "Sở Thích Nghề Nghiệp", desc: "Phân tích xu hướng nghề nghiệp theo mô hình Holland" },
                { icon: Briefcase, color: "hsl(35,90%,55%)", title: "Ngành Nghề Phù Hợp", desc: "Gợi ý nghề nghiệp, trường ĐH và lộ trình phát triển" },
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
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Cách Thực Hiện
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: 1, title: "Trả lời câu hỏi", desc: "Chọn mức độ đồng ý với mỗi phát biểu", icon: BookOpen },
                  { step: 2, title: "Phân tích tính cách", desc: "Hệ thống tính toán kiểu tính cách MBTI", icon: Brain },
                  { step: 3, title: "Khám phá sở thích", desc: "Xác định nhóm nghề nghiệp Holland phù hợp", icon: Compass },
                  { step: 4, title: "Nhận kết quả", desc: "Xem ngành nghề, trường ĐH và lộ trình", icon: Target },
                ].map(({ step, title, desc, icon: Icon }) => (
                  <div key={step} className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-xs font-semibold text-white/70 mb-0.5">{title}</div>
                    <div className="text-[0.65rem] text-white/30">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR CODE CARD — Làm bài trên điện thoại */}
            <QrCodeCard
              testUrl={TEST_URL}
              qrImgUrl={QR_IMG_URL}
              onOpenFull={() => setShowQrModal(true)}
            />

            {/* Note */}
            <div className="bg-gradient-to-r from-[hsl(175,80%,50%)]/5 to-[hsl(210,85%,55%)]/5 rounded-2xl border border-cyan-500/10 p-5 text-center">
              <p className="text-xs text-white/40 italic">
                "Không có câu trả lời đúng hay sai — hãy chọn theo bản năng đầu tiên của bạn để có kết quả chính xác nhất."
              </p>
            </div>

            {/* COMMUNITY STATS — Thống kê cộng đồng */}
            <CommunityStatsTable
              stats={communityStats}
              loading={statsLoading}
              onRefresh={() => refetchStats()}
            />
          </div>
        </div>

        {/* ── Modal: Nhập tên + năm sinh trước khi làm bài ── */}
        {showTakerGate && (
          <TakerInfoGate
            name={takerName}
            yearOfBirth={takerYob}
            error={takerError}
            onNameChange={setTakerName}
            onYearChange={setTakerYob}
            onCancel={() => setShowTakerGate(false)}
            onConfirm={confirmTakerAndStart}
          />
        )}

        {/* ── Modal: QR code phóng to ── */}
        {showQrModal && (
          <QrCodeModal
            testUrl={TEST_URL}
            qrImgUrl={QR_IMG_URL.replace("size=360x360", "size=520x520")}
            onClose={() => setShowQrModal(false)}
          />
        )}
      </div>
    )
  }

  // ===== TEST VIEW =====
  if (view === "test") {
    const safeQ = Math.min(Math.max(0, currentQ), totalQuestions - 1)
    const question = totalQuestions > 0 ? allQuestions[safeQ] : null

    if (!question || totalQuestions === 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center">
          <p className="text-white/50 mb-4">Đang tải câu hỏi...</p>
          <button
            onClick={() => { setView("intro"); setCurrentQ(0) }}
            className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/60 text-sm"
          >
            Quay về trang chính
          </button>
        </div>
      )
    }

    const isHolland = safeQ >= 28
    const sectionLabel = isHolland ? "Sở Thích Nghề Nghiệp" : "Tính Cách Cá Nhân"
    const SectionIcon = isHolland ? Compass : Brain

    return (
      <div className="flex flex-col h-full">
        {/* Progress Header */}
        <div className="px-6 pt-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SectionIcon className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium text-white/50">{sectionLabel}</span>
              </div>
              <span className="text-xs text-white/30">
                {currentQ + 1} / {totalQuestions}
              </span>
            </div>
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
                {question?.text ?? ""}
              </h2>
            </div>

            {/* Answer Slider */}
            <div className="space-y-6">
              {/* Labels */}
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-medium text-cyan-500">Đồng ý</span>
                <span className="text-xs text-white/25">Trung lập</span>
                <span className="text-xs font-medium text-purple-400">Không đồng ý</span>
              </div>

              {/* Button Options */}
              <div className="flex justify-center gap-2 md:gap-3">
                {[
                  { value: 7, size: "w-14 h-14 md:w-16 md:h-16", color: "hsl(175,80%,50%)", label: "Rất đồng ý" },
                  { value: 6, size: "w-12 h-12 md:w-14 md:h-14", color: "hsl(175,80%,45%)", label: "Đồng ý" },
                  { value: 5, size: "w-10 h-10 md:w-12 md:h-12", color: "hsl(175,60%,40%)", label: "Hơi đồng ý" },
                  { value: 4, size: "w-9 h-9 md:w-10 md:h-10", color: "hsl(220,10%,50%)", label: "Trung lập" },
                  { value: 3, size: "w-10 h-10 md:w-12 md:h-12", color: "hsl(280,50%,45%)", label: "Hơi không đồng ý" },
                  { value: 2, size: "w-12 h-12 md:w-14 md:h-14", color: "hsl(280,65%,50%)", label: "Không đồng ý" },
                  { value: 1, size: "w-14 h-14 md:w-16 md:h-16", color: "hsl(280,75%,55%)", label: "Rất không đồng ý" },
                ].map(({ value, size, color, label }) => {
                  const isSelected = currentAnswer === value
                  return (
                    <button
                      key={value}
                      onClick={() => handleAnswer(value)}
                      title={label}
                      className={`${size} rounded-full transition-all duration-200 flex items-center justify-center border-2 hover:scale-110 ${
                        isSelected
                          ? "scale-110 shadow-[0_0_20px_rgba(150,100,255,0.4)]"
                          : "hover:brightness-110"
                      }`}
                      style={{
                        backgroundColor: isSelected ? color : "transparent",
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
                    {currentAnswer === 7 && "Rất đồng ý"}
                    {currentAnswer === 6 && "Đồng ý"}
                    {currentAnswer === 5 && "Hơi đồng ý"}
                    {currentAnswer === 4 && "Trung lập"}
                    {currentAnswer === 3 && "Hơi không đồng ý"}
                    {currentAnswer === 2 && "Không đồng ý"}
                    {currentAnswer === 1 && "Rất không đồng ý"}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={goPrev}
                disabled={currentQ === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Quay lại
              </button>

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
  if (view === "result" && result) {
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
            <span className={`font-semibold ${isFirst ? "text-cyan-500" : "text-white/40"}`}>
              {letter1} ({score1}%)
            </span>
            <span className={`font-semibold ${!isFirst ? "text-purple-400" : "text-white/40"}`}>
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
          title={reviewMode ? "Xem Lại Bài Đã Làm" : "Kết Quả Tư Vấn Hướng Nghiệp"}
          description={reviewMode
            ? "Bài làm cũ — xem kết quả, câu trả lời và các nghề đã khám phá"
            : "Khám phá bản thân và ngành nghề phù hợp"}
          actions={
            <div className="flex items-center gap-2">
              {reviewMode && (
                <button
                  onClick={loadHistory}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Về Lịch Sử
                </button>
              )}
              <button
                onClick={resetTest}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
              >
                <RotateCcw className="h-4 w-4" />
                {reviewMode ? "Làm Bài Mới" : "Làm Lại"}
              </button>
            </div>
          }
        />
        {reviewMode && (
          <div className="px-6 py-2 bg-purple-600/30 border-b border-purple-600/20">
            <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-purple-300">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>
                Đang xem lại bài cũ ở chế độ read-only. Bấm vào nghề để xem chi tiết — KHÔNG cập nhật vào lịch sử.
              </span>
            </div>
          </div>
        )}
        <ScrollToTopButton containerSelector="#career-results-scroll" />

        <div id="career-results-scroll" className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* PERSONALITY TYPE HERO */}
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

            {/* MBTI DIMENSIONS */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-purple-400" />
                Phân Tích Tính Cách MBTI
              </h3>
              <div className="space-y-4">
                {getDimensionBar("E (Hướng ngoại)", "I (Hướng nội)", result.mbtiScores["E"])}
                {getDimensionBar("S (Thực tế)", "N (Trực giác)", result.mbtiScores["S"])}
                {getDimensionBar("T (Lý trí)", "F (Cảm xúc)", result.mbtiScores["T"])}
                {getDimensionBar("J (Nguyên tắc)", "P (Linh hoạt)", result.mbtiScores["J"])}
              </div>
            </div>

            {/* STRENGTHS & WEAKNESSES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-cyan-500/5 rounded-2xl border border-cyan-500/10 p-6">
                <h3 className="font-semibold text-cyan-500 mb-3 flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4" />
                  Điểm Mạnh
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <Badge key={i} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="bg-purple-500/5 rounded-2xl border border-purple-500/10 p-6">
                <h3 className="font-semibold text-purple-400 mb-3 flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4" />
                  Cần Cải Thiện
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.weaknesses.map((w, i) => (
                    <Badge key={i} className="bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* HOLLAND CAREER INTERESTS */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Compass className="h-4 w-4 text-cyan-500" />
                Sở Thích Nghề Nghiệp (Holland Code: <span className="text-cyan-500">{result.hollandCode}</span>)
              </h3>

              {/* Holland Bars */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(result.hollandScores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, score]) => {
                    const info = (hollandCareers as any)[code]
                    const Icon = hollandIcons[code] || Briefcase
                    const isTop3 = hollandTop3.some(([c]) => c === code)
                    return (
                      <div
                        key={code}
                        className={`rounded-xl p-4 transition-all ${
                          isTop3
                            ? "bg-purple-400/8 border border-purple-400/15"
                            : "bg-white/[0.02] border border-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-4 w-4 ${isTop3 ? "text-purple-400" : "text-white/30"}`} />
                          <span className={`text-xs font-medium ${isTop3 ? "text-white/80" : "text-white/40"}`}>
                            {info?.name}
                          </span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className={`text-xl font-bold ${isTop3 ? "text-purple-400" : "text-white/30"}`}>
                            {score}%
                          </span>
                        </div>
                        <div className="mt-2 w-full h-1.5 rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isTop3 ? "bg-gradient-to-r from-[hsl(265,85%,55%)] to-[hsl(210,85%,55%)]" : "bg-white/[0.1]"
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
                  const info = (hollandCareers as any)[code]
                  return (
                    <div key={code} className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white/80">{info?.name}</span>
                        <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-white/35 mb-2">{info?.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {info?.careers?.map((c: string, i: number) => (
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

            {/* RECOMMENDED CAREERS */}
            <div className="bg-gradient-to-r from-[hsl(245,85%,55%)]/8 to-[hsl(175,80%,50%)]/8 rounded-2xl border border-indigo-400/15 p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-amber-500" />
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
                      i === 0 ? "bg-amber-500/15 text-amber-400" :
                      i === 1 ? "bg-cyan-500/15 text-cyan-500" :
                      "bg-purple-400/15 text-purple-400"
                    }`}>
                      {i === 0 ? <Award className="h-5 w-5" /> :
                       i === 1 ? <Star className="h-5 w-5" /> :
                       <Briefcase className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium text-white/80">{career}</span>
                    {i === 0 && (
                      <div className="text-[0.6rem] text-amber-500 mt-1">Phù hợp nhất</div>
                    )}
                    <div className="text-[0.6rem] text-white/25 mt-1 group-hover:text-cyan-500 transition-colors">
                      Xem chi tiết →
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* LEARNING STYLE */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-sky-400" />
                Phong Cách Học Tập
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{result.learningStyle}</p>
            </div>

            {/* FAMOUS PEOPLE */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-purple-400" />
                Người Nổi Tiếng Cùng Tính Cách
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.famousPeople.map((name, i) => (
                  <Badge key={i} className="bg-white/[0.04] text-white/60 border border-white/[0.08]">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* ── NGHỀ ĐÃ XEM CHI TIẾT (chỉ hiện khi có ≥1 nghề đã click vào) ── */}
            {viewedCareers.length > 0 && (
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-amber-500" />
                  Nghề Đã Xem Chi Tiết
                  <span className="ml-auto text-[0.7rem] text-white/35 font-normal">
                    {viewedCareers.length} / {result.careers.length} nghề
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {viewedCareers.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => openCareerDetail(name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40 text-xs font-medium transition-all"
                    >
                      <Briefcase className="h-3 w-3" />
                      {name}
                    </button>
                  ))}
                </div>
                <p className="text-[0.7rem] text-white/30 mt-3 italic">
                  💡 Bấm vào tên nghề để xem lại trang chi tiết
                </p>
              </div>
            )}

            {/* ── XEM LẠI 60 CÂU TRẢ LỜI (collapsible) ── */}
            {Object.keys(answers).length > 0 && allQuestions && (
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setShowAnswersReview(prev => !prev)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <h3 className="font-semibold text-white/90 flex items-center gap-2 text-sm">
                    <ListChecks className="h-4 w-4 text-sky-400" />
                    Xem Lại {Object.keys(answers).length} Câu Trả Lời Đã Làm
                  </h3>
                  <ChevronLeft className={`h-4 w-4 text-white/40 transition-transform ${showAnswersReview ? '-rotate-90' : 'rotate-180'}`} />
                </button>
                {showAnswersReview && (
                  <div className="px-6 pb-6 max-h-[600px] overflow-y-auto space-y-3">
                    {allQuestions.map((q, idx) => {
                      const ansValue = answers[q.id]
                      const hasAnswer = ansValue !== undefined && ansValue !== null
                      // Map value → label (Hoàn toàn không đồng ý → Hoàn toàn đồng ý)
                      const SCALE_LABELS = [
                        'Hoàn toàn không đồng ý',
                        'Không đồng ý',
                        'Bình thường',
                        'Đồng ý',
                        'Hoàn toàn đồng ý',
                      ]
                      const ansLabel = hasAnswer && ansValue >= 1 && ansValue <= 5
                        ? SCALE_LABELS[ansValue - 1]
                        : '(chưa trả lời)'
                      const ansColor = ansValue === 5 ? 'text-emerald-300'
                                    : ansValue === 4 ? 'text-cyan-300'
                                    : ansValue === 3 ? 'text-white/60'
                                    : ansValue === 2 ? 'text-orange-300'
                                    : ansValue === 1 ? 'text-rose-300'
                                    : 'text-white/30'
                      return (
                        <div
                          key={q.id}
                          className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-3.5"
                        >
                          <div className="flex items-start gap-2.5 mb-2">
                            <span className="text-[0.65rem] font-mono text-white/30 mt-0.5 flex-shrink-0">#{idx + 1}</span>
                            <p className="text-sm text-white/80 leading-snug flex-1">{q.text}</p>
                          </div>
                          <div className="pl-7 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <CheckCircle className={`h-3 w-3 ${hasAnswer ? ansColor : 'text-white/20'}`} />
                              <span className={`text-xs font-medium ${ansColor}`}>{ansLabel}</span>
                            </div>
                            {hasAnswer && (
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(v => (
                                  <div
                                    key={v}
                                    className={`w-2 h-2 rounded-full ${
                                      v === ansValue
                                        ? 'bg-[hsl(195,85%,60%)] scale-150'
                                        : 'bg-white/10'
                                    } transition-all`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-r from-[hsl(265,85%,55%)]/10 to-[hsl(175,80%,50%)]/10 rounded-2xl border border-white/[0.08] p-6 text-center">
              <h3 className="font-semibold text-white/80 mb-2 text-sm">
                {reviewMode ? "Muốn làm bài mới?" : "Muốn tìm hiểu chi tiết hơn?"}
              </h3>
              <p className="text-xs text-white/35 mb-4">
                {reviewMode
                  ? "Tính cách có thể thay đổi theo thời gian — làm lại bài để so sánh kết quả"
                  : "AI sẽ phân tích kết hợp tính cách với kết quả học tập để đưa ra gợi ý chính xác hơn"}
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={resetTest}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] transition-all text-sm font-medium"
                >
                  <RotateCcw className="h-4 w-4" />
                  {reviewMode ? "Làm Bài Mới" : "Làm Lại Bài Test"}
                </button>
                {reviewMode && (
                  <button
                    onClick={loadHistory}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] transition-all text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Về Lịch Sử
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== CAREER DETAIL VIEW =====
  if (view === "career-detail" && selectedCareer) {
    const c = selectedCareer
    const demandColor = c.market.demandLevel === "Rất cao" ? "hsl(175,80%,50%)" :
      c.market.demandLevel === "Cao" ? "hsl(175,60%,45%)" :
      c.market.demandLevel === "Trung bình" ? "hsl(35,90%,55%)" : "hsl(0,60%,55%)"

    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={c.name}
          description={c.shortDescription}
          actions={
            <button
              onClick={() => setView("result")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay Lại
            </button>
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
                <Badge className="bg-white/[0.06] text-white/60 border border-white/[0.1] mb-4">{c.category}</Badge>
                <p className="text-white/50 text-sm leading-relaxed max-w-2xl">{c.fullDescription}</p>
              </div>
            </div>

            {/* Market Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Nhu cầu", value: c.market.demandLevel, icon: TrendingUp, color: demandColor },
                { label: "Lương khởi điểm", value: c.market.salaryRange.entry, icon: DollarSign, color: "hsl(175,80%,50%)" },
                { label: "Lương trung cấp", value: c.market.salaryRange.mid, icon: DollarSign, color: "hsl(35,90%,55%)" },
                { label: "Lương cao cấp", value: c.market.salaryRange.senior, icon: DollarSign, color: "hsl(265,85%,65%)" },
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
                <div className="text-sm font-semibold text-cyan-500">{c.market.growthRate}</div>
              </div>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
                <div className="text-xs text-white/40 mb-1">Tổng vị trí tuyển dụng</div>
                <div className="text-sm font-semibold text-white/85">{c.market.totalJobs}</div>
              </div>
            </div>

            {/* AI Exposure Analysis */}
            {c.aiExposure && (
              <div className={`rounded-2xl border p-6 ${
                c.aiExposure.score >= 7 ? "bg-red-500/5 border-red-500/15" :
                c.aiExposure.score >= 4 ? "bg-amber-500/5 border-amber-500/15" :
                "bg-cyan-500/5 border-cyan-500/15"
              }`}>
                <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Phân Tích Tác Động AI (Karpathy 2026)
                </h3>
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      c.aiExposure.score >= 7 ? "text-red-400" :
                      c.aiExposure.score >= 4 ? "text-amber-400" :
                      "text-cyan-500"
                    }`}>
                      {c.aiExposure.score}/10
                    </div>
                    <div className="text-[0.6rem] text-white/30 mt-1">Mức độ ảnh hưởng</div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${
                        c.aiExposure.score >= 7 ? "bg-gradient-to-r from-[hsl(35,90%,55%)] to-[hsl(0,60%,55%)]" :
                        c.aiExposure.score >= 4 ? "bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(35,90%,55%)]" :
                        "bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(175,60%,40%)]"
                      }`} style={{ width: `${c.aiExposure.score * 10}%` }} />
                    </div>
                    <div className="flex justify-between text-[0.55rem] text-white/20 mt-1">
                      <span>An toàn</span>
                      <span>Trung bình (5.3)</span>
                      <span>Rủi ro cao</span>
                    </div>
                  </div>
                  <Badge className={`text-xs border ${
                    c.aiExposure.trend === "Tăng" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    c.aiExposure.trend === "Giảm" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                    "bg-white/[0.04] text-white/50 border-white/[0.08]"
                  }`}>
                    {c.aiExposure.trend === "Tăng" ? "↑" : c.aiExposure.trend === "Giảm" ? "↓" : "→"} {c.aiExposure.trend}
                  </Badge>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{c.aiExposure.analysis}</p>
              </div>
            )}

            {/* Education */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-sky-400" />
                Yêu Cầu Học Vấn
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-white/40">Bằng tối thiểu: </span>
                  <Badge className="bg-sky-400/10 text-sky-400 border border-sky-400/20">
                    {c.education.minimumDegree}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-2">Ngành học phù hợp:</div>
                  <div className="flex flex-wrap gap-2">
                    {c.education.recommendedMajors.map((m, i) => (
                      <Badge key={i} className="bg-white/[0.04] text-white/60 border border-white/[0.08]">{m}</Badge>
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
                        <Badge key={i} className="bg-amber-500/10 text-amber-400 border border-amber-500/20">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VN Universities (cập nhật 2026) — hiển thị nếu có dữ liệu mở rộng */}
            {c.universitiesVN && c.universitiesVN.schools.length > 0 && (
              <VnUniversitiesSection data={c.universitiesVN} />
            )}

            {/* Skills */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                Kỹ Năng Cần Có
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/40 mb-2">Kỹ năng chuyên môn:</div>
                  <div className="space-y-2">
                    {c.skills.technical.map((s, i) => {
                      const levelW = s.level === "Chuyên gia" ? "100%" : s.level === "Nâng cao" ? "75%" : s.level === "Trung bình" ? "50%" : "25%"
                      const levelColor = s.level === "Chuyên gia" ? "hsl(265,85%,60%)" : s.level === "Nâng cao" ? "hsl(175,80%,50%)" : s.level === "Trung bình" ? "hsl(210,85%,55%)" : "hsl(35,90%,55%)"
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
                      <Badge key={i} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-2">Công cụ thường dùng:</div>
                  <div className="flex flex-wrap gap-2">
                    {c.skills.tools.map((t, i) => (
                      <Badge key={i} className="bg-white/[0.04] text-white/50 border border-white/[0.08]">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Career Roadmap */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-5 flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-purple-400" />
                Lộ Trình Phát Triển
              </h3>
              <div className="relative">
                <div className="absolute left-[1.125rem] top-3 bottom-3 w-px bg-gradient-to-b from-[hsl(175,80%,50%)] via-[hsl(265,85%,60%)] to-[hsl(280,75%,55%)]" />
                <div className="space-y-6">
                  {c.roadmap.map((stage, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                        i === 0 ? "bg-cyan-500/20 border border-cyan-500/30" :
                        i === c.roadmap.length - 1 ? "bg-purple-400/20 border border-purple-400/30" :
                        "bg-white/[0.04] border border-white/[0.08]"
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
                              <Badge className="bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[0.6rem]">
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
              <div className="bg-cyan-500/5 rounded-2xl border border-cyan-500/10 p-6">
                <h3 className="font-semibold text-cyan-500 mb-3 flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Ưu Điểm
                </h3>
                <ul className="space-y-2">
                  {c.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/55 leading-relaxed">
                      <span className="text-cyan-500 mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-purple-500/5 rounded-2xl border border-purple-500/10 p-6">
                <h3 className="font-semibold text-purple-400 mb-3 flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4" />
                  Nhược Điểm
                </h3>
                <ul className="space-y-2">
                  {c.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/55 leading-relaxed">
                      <span className="text-purple-500 mt-0.5">•</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Top Employers */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-sky-400" />
                Nhà Tuyển Dụng Hàng Đầu
              </h3>
              <div className="flex flex-wrap gap-2">
                {c.market.topEmployers.map((e, i) => (
                  <Badge key={i} className="bg-white/[0.04] text-white/60 border border-white/[0.08]">{e}</Badge>
                ))}
              </div>
            </div>

            {/* Important Subjects */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-amber-500" />
                Môn Học Quan Trọng
              </h3>
              <div className="space-y-2">
                {c.importantSubjects.map((s, i) => {
                  const impColor = s.importance === "Rất quan trọng" ? "hsl(175,80%,50%)" : s.importance === "Quan trọng" ? "hsl(35,90%,55%)" : "hsl(210,85%,55%)"
                  const impW = s.importance === "Rất quan trọng" ? "100%" : s.importance === "Quan trọng" ? "66%" : "33%"
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

            {/* Job Tasks — Làm gì? Ở đâu? (nếu có dữ liệu mở rộng) */}
            {c.jobTasks && (
              <JobTasksSection data={c.jobTasks} />
            )}

            {/* Pixel sim 1 ngày — cảm hứng từ pixel-agents (github.com/pablodelucca) */}
            {c.dailyLife && c.dailyLife.length > 0 && (
              <CareerDayPixelSim
                careerName={c.name}
                category={c.category}
                dailyLife={c.dailyLife}
              />
            )}

            {/* Daily Life */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-cyan-500" />
                Một Ngày Làm Việc Điển Hình
              </h3>
              <div className="space-y-2">
                {c.dailyLife.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                    <div className="w-6 h-6 rounded-lg bg-purple-400/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[0.55rem] font-bold text-purple-400">{i + 1}</span>
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
                    <Badge key={i} className={`border ${
                      result?.mbtiType === p
                        ? "bg-cyan-500/15 text-cyan-500 border-cyan-500/25"
                        : "bg-white/[0.04] text-white/50 border-white/[0.08]"
                    }`}>
                      {p} {result?.mbtiType === p && "✓"}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5">
                <div className="text-xs text-white/40 mb-2">Holland Code phù hợp:</div>
                <div className="flex flex-wrap gap-2">
                  {c.suitableHolland.map((h, i) => (
                    <Badge key={i} className={`border ${
                      result?.hollandCode?.includes(h)
                        ? "bg-purple-400/15 text-purple-400 border-purple-400/25"
                        : "bg-white/[0.04] text-white/50 border-white/[0.08]"
                    }`}>
                      {h} {result?.hollandCode?.includes(h) && "✓"}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Related Careers */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2 text-sm">
                <Compass className="h-4 w-4 text-purple-400" />
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
  if (view === "history") {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Lịch Sử Bài Test"
          description="Xem lại kết quả các lần kiểm tra tính cách"
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => setView("intro")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay Lại
              </button>
              <button
                onClick={startTest}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] text-white text-sm font-medium hover:brightness-110 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Làm Bài Mới
              </button>
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
                <button
                  onClick={startTest}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] text-white text-sm font-medium hover:brightness-110 transition-all mx-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  Bắt Đầu Ngay
                </button>
              </div>
            ) : (
              history.map((item, i) => {
                const date = new Date(item.createdAt)
                const dateStr = date.toLocaleDateString("vi-VN", {
                  year: "numeric", month: "long", day: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })

                const canReopen = Boolean(item.answers && Object.keys(item.answers).length > 0)
                return (
                  <div
                    key={item.id ?? i}
                    className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                  >
                    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(265,85%,60%)]/20 to-[hsl(175,80%,50%)]/20 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-white/80">{item.mbtiType}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white/85 truncate">{item.personalityName}</h4>
                          <div className="flex items-center gap-2 text-[0.65rem] text-white/35">
                            <Clock className="h-3 w-3" />
                            {dateStr}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className="bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                          Holland: {item.hollandCode}
                        </Badge>
                        <button
                          onClick={() => restoreFromHistory(item)}
                          disabled={!canReopen}
                          title={canReopen
                            ? "Mở lại bài làm này — xem kết quả, câu trả lời và các nghề đã xem"
                            : "Lần làm này không có dữ liệu câu trả lời để mở lại"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            canReopen
                              ? 'bg-gradient-to-r from-[hsl(265,85%,60%)]/20 to-[hsl(210,85%,55%)]/20 border-white/15 text-white/85 hover:from-[hsl(265,85%,60%)]/30 hover:to-[hsl(210,85%,55%)]/30 hover:border-white/25'
                              : 'bg-white/[0.02] border-white/[0.05] text-white/25 cursor-not-allowed'
                          }`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Xem lại từ đầu
                        </button>
                      </div>
                    </div>

                    {/* Mini dimension bars */}
                    <div className="grid grid-cols-4 gap-3">
                      {item.mbtiScores && Object.entries(item.mbtiScores as Record<string, number>).slice(0, 4).map(([key, val]) => {
                        const pairs: Record<string, string> = { E: "I", S: "N", T: "F", J: "P" }
                        const opp = pairs[key] || ""
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
                        {(item.careers as string[]).slice(0, 4).map((career: string, j: number) => (
                          <span key={j} className="text-[0.6rem] bg-white/[0.04] text-white/40 rounded-md px-2 py-0.5">
                            {career}
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

/* ══════════════════════════════════════════════════════════════════
 * COMMUNITY STATS TABLE
 * Hiển thị dưới trang giới thiệu bài test để học sinh tham khảo
 * kết quả của cộng đồng: phân bố MBTI, Holland, nghề nghiệp phổ biến,
 * và những người đã hoàn thành bài test gần nhất.
 * ═══════════════════════════════════════════════════════════════ */
interface CommunityStatsTableProps {
  stats: CareerCommunityStats | undefined
  loading: boolean
  onRefresh: () => void
}

const HOLLAND_ICON: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', typeof Wrench> = {
  R: Wrench,
  I: Search,
  A: Palette,
  S: HeartHandshake,
  E: Zap,
  C: Calculator,
}

/* ── CSV helpers ─────────────────────────────────────────────────
 * Tự viết CSV để không phải phụ thuộc thư viện ngoài. Kèm BOM để
 * Excel/Google Sheets đọc đúng tiếng Việt.
 * ───────────────────────────────────────────────────────────── */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Quote nếu chứa dấu phẩy, xuống dòng, hoặc dấu ngoặc kép
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowsToCsv(rows: Array<Array<unknown>>): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n')
}

function downloadCsv(filename: string, csv: string) {
  // Thêm BOM cho Excel hiển thị tiếng Việt chuẩn
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function exportStatsCsv(stats: CareerCommunityStats | undefined) {
  if (!stats || stats.totalAttempts === 0) {
    toast.error('Chưa có dữ liệu thống kê để xuất.')
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  const rows: Array<Array<unknown>> = []

  rows.push(['# Bang thong ke cong dong - Aeroedu Career'])
  rows.push(['# Ngay xuat', new Date().toLocaleString('vi-VN')])
  rows.push(['# Tong luot test', stats.totalAttempts])
  rows.push(['# Tong so nguoi', stats.totalUsers])
  rows.push([])

  rows.push(['== Phan bo MBTI =='])
  rows.push(['Kieu', 'Ten', 'Luot', 'Ti le (%)'])
  stats.mbtiDistribution.forEach((r) =>
    rows.push([r.type, r.name, r.count, r.percentage]),
  )
  rows.push([])

  rows.push(['== Phan bo Holland =='])
  rows.push(['Ma', 'Nhom', 'Luot', 'Ti le (%)'])
  stats.hollandDistribution.forEach((r) =>
    rows.push([r.code, r.label, r.count, r.percentage]),
  )
  rows.push([])

  if (stats.yearOfBirthDistribution && stats.yearOfBirthDistribution.length > 0) {
    rows.push(['== Phan bo nam sinh =='])
    rows.push(['Nam sinh', 'Luot', 'Ti le (%)'])
    stats.yearOfBirthDistribution.forEach((r) =>
      rows.push([r.year, r.count, r.percentage]),
    )
    rows.push([])
  }

  rows.push(['== Top nganh nghe =='])
  rows.push(['Hang', 'Nganh nghe', 'Luot goi y', 'Ti le (%)'])
  stats.topCareers.forEach((r, i) =>
    rows.push([i + 1, r.name, r.count, r.percentage]),
  )
  rows.push([])

  rows.push(['== Hoc sinh da hoan thanh gan day =='])
  rows.push(['Ten', 'Nam sinh', 'MBTI', 'Kieu tinh cach', 'Holland', 'Thoi diem'])
  stats.recentTakers.forEach((r) =>
    rows.push([
      r.userName,
      r.userYearOfBirth ?? '',
      r.mbtiType,
      r.personalityName,
      r.hollandCode,
      r.createdAt,
    ]),
  )

  downloadCsv(`aeroedu-career-stats-${today}.csv`, rowsToCsv(rows))
  toast.success('Đã xuất CSV thống kê cộng đồng')
}

function exportRawEntriesCsv() {
  const entries = careerService.getAllLocalEntries()
  if (entries.length === 0) {
    toast.error('Chưa có bản ghi nào để xuất.')
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  const rows: Array<Array<unknown>> = []
  rows.push([
    'ID',
    'Ho ten',
    'Nam sinh',
    'MBTI',
    'Kieu tinh cach',
    'Holland',
    'E (%)',
    'S (%)',
    'T (%)',
    'J (%)',
    'R',
    'I',
    'A',
    'S_H',
    'E_H',
    'C',
    'Top nganh nghe',
    'Thoi diem',
  ])
  entries.forEach((e) => {
    rows.push([
      e.id,
      e.userName,
      e.userYearOfBirth ?? '',
      e.mbtiType,
      e.personalityName,
      e.hollandCode,
      e.mbtiScores?.E ?? '',
      e.mbtiScores?.S ?? '',
      e.mbtiScores?.T ?? '',
      e.mbtiScores?.J ?? '',
      e.hollandScores?.R ?? '',
      e.hollandScores?.I ?? '',
      e.hollandScores?.A ?? '',
      e.hollandScores?.S ?? '',
      e.hollandScores?.E ?? '',
      e.hollandScores?.C ?? '',
      (e.careers ?? []).join(' | '),
      e.createdAt,
    ])
  })
  downloadCsv(`aeroedu-career-entries-${today}.csv`, rowsToCsv(rows))
  toast.success(`Đã xuất CSV (${entries.length} bản ghi)`)
}

const HOLLAND_COLOR: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', string> = {
  R: 'hsl(35,90%,55%)',
  I: 'hsl(210,85%,60%)',
  A: 'hsl(320,75%,60%)',
  S: 'hsl(175,80%,55%)',
  E: 'hsl(265,85%,65%)',
  C: 'hsl(150,60%,50%)',
}

function CommunityStatsTable({ stats, loading, onRefresh }: CommunityStatsTableProps) {
  const empty = !loading && (!stats || stats.totalAttempts === 0)

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(265,85%,60%)]/20 to-[hsl(175,80%,50%)]/20 border border-white/[0.08] flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white/90 text-sm">
              Bảng Thống Kê Cộng Đồng
            </h3>
            <p className="text-[0.7rem] text-white/40">
              Học sinh đã làm bài test — dùng để tham khảo xu hướng chung
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportStatsCsv(stats)}
            disabled={!stats || stats.totalAttempts === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-[0.7rem] text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Xuất CSV tổng hợp thống kê (MBTI, Holland, năm sinh, top nghề)"
          >
            <Download className="h-3 w-3" />
            Xuất CSV
          </button>
          <button
            type="button"
            onClick={() => exportRawEntriesCsv()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[0.7rem] text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all"
            title="Xuất toàn bộ các lần làm bài (ẩn danh)"
          >
            <Download className="h-3 w-3" />
            Xuất CSV chi tiết
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[0.7rem] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Làm mới
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-white/40 py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Đang tải thống kê cộng đồng…</span>
        </div>
      )}

      {empty && (
        <div className="text-center py-8 text-xs text-white/40">
          Chưa có kết quả nào trong cộng đồng. Hãy là người đầu tiên hoàn thành bài test!
        </div>
      )}

      {!loading && stats && stats.totalAttempts > 0 && (
        <>
          {/* Tổng quan */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile
              icon={Users}
              label="Tổng lượt test"
              value={stats.totalAttempts.toLocaleString('vi-VN')}
              color="hsl(265,85%,65%)"
            />
            <SummaryTile
              icon={UserIcon}
              label="Số học sinh"
              value={stats.totalUsers.toLocaleString('vi-VN')}
              color="hsl(175,80%,55%)"
            />
            <SummaryTile
              icon={Trophy}
              label="Kiểu MBTI phổ biến"
              value={stats.mbtiDistribution[0]?.type ?? '--'}
              sublabel={stats.mbtiDistribution[0]?.name}
              color="hsl(35,90%,55%)"
            />
            <SummaryTile
              icon={Compass}
              label="Nhóm Holland dẫn đầu"
              value={stats.hollandDistribution[0]?.code ?? '--'}
              sublabel={
                stats.hollandDistribution[0]
                  ? `${stats.hollandDistribution[0].percentage}%`
                  : undefined
              }
              color="hsl(210,85%,60%)"
            />
          </div>

          {/* 2 cột: MBTI + Holland */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* MBTI Distribution */}
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-white/80">
                  Phân bố 16 kiểu MBTI
                </h4>
              </div>
              {stats.mbtiDistribution.length === 0 ? (
                <p className="text-[0.7rem] text-white/30 italic">
                  Chưa có dữ liệu
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stats.mbtiDistribution.slice(0, 8).map((row) => (
                    <div key={row.type} className="flex items-center gap-2">
                      <span className="text-[0.65rem] font-mono font-semibold text-white/80 w-10">
                        {row.type}
                      </span>
                      <span className="text-[0.65rem] text-white/40 flex-1 truncate">
                        {row.name}
                      </span>
                      <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(175,80%,50%)]"
                          style={{ width: `${Math.max(4, row.percentage)}%` }}
                        />
                      </div>
                      <span className="text-[0.65rem] text-white/50 w-12 text-right">
                        {row.count} ({row.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Holland Distribution */}
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="h-4 w-4 text-sky-400" />
                <h4 className="text-xs font-semibold text-white/80">
                  Phân bố 6 nhóm Holland
                </h4>
              </div>
              <div className="space-y-1.5">
                {stats.hollandDistribution.map((row) => {
                  const Icon = HOLLAND_ICON[row.code]
                  const color = HOLLAND_COLOR[row.code]
                  return (
                    <div key={row.code} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="h-3 w-3" style={{ color }} />
                      </div>
                      <span className="text-[0.65rem] text-white/70 flex-1 truncate">
                        {row.label}
                      </span>
                      <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, row.percentage)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="text-[0.65rem] text-white/50 w-14 text-right">
                        {row.count} ({row.percentage}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Year-of-birth distribution */}
          {stats.yearOfBirthDistribution && stats.yearOfBirthDistribution.length > 0 && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-semibold text-white/80">
                  Phân bố theo năm sinh
                </h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {stats.yearOfBirthDistribution.slice(0, 12).map((row) => (
                  <div
                    key={row.year}
                    className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-white/80 font-mono">
                      {row.year}
                    </span>
                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[hsl(35,90%,55%)] to-[hsl(35,90%,45%)]"
                        style={{ width: `${Math.max(6, row.percentage)}%` }}
                      />
                    </div>
                    <span className="text-[0.65rem] text-white/45 w-14 text-right">
                      {row.count} ({row.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ngành Hot xu thế 2026 — predefined list từ server, hiện luôn */}
          {stats.trendingCareers2026 && stats.trendingCareers2026.length > 0 && (
            <div className="bg-gradient-to-br from-orange-500/[0.05] to-pink-500/[0.05] rounded-xl border border-orange-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔥</span>
                <h4 className="text-xs font-semibold text-orange-300">
                  Ngành nghề Hot xu thế 2026 — phù hợp thị trường lao động hiện tại
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stats.trendingCareers2026.slice(0, 12).map((t) => (
                  <div
                    key={t.label}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex flex-col items-center min-w-[32px]">
                      <span className="text-orange-400 text-xs font-black">{t.heat}/5</span>
                      <span className="text-[8px] text-orange-400/60 uppercase tracking-wider">Heat</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/85 font-medium">{t.label}</p>
                      <p className="text-[10px] text-white/45 mt-0.5">{t.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/35 mt-3 italic">
                💡 Khi ngành nghề bài test gợi ý cho bạn nằm trong danh sách này, nó sẽ có badge 🔥 ở bảng dưới.
              </p>
            </div>
          )}

          {/* Top careers */}
          {stats.topCareers.length > 0 && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-semibold text-white/80">
                  Ngành nghề được gợi ý nhiều nhất
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[0.65rem] text-white/35 border-b border-white/[0.05]">
                      <th className="pb-2 font-medium w-8">#</th>
                      <th className="pb-2 font-medium">Ngành nghề</th>
                      <th className="pb-2 font-medium w-24 text-right">Lượt gợi ý</th>
                      <th className="pb-2 font-medium w-40">Tỉ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCareers.map((row, i) => (
                      <tr
                        key={row.name}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2 text-[0.7rem] text-white/30 font-mono">
                          {i + 1}
                        </td>
                        <td className="py-2 text-xs text-white/75">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{row.name}</span>
                            {row.trending && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30"
                                title={`Hot xu thế 2026: ${row.trending.reason}`}
                              >
                                🔥 Hot {row.trending.heat}/5
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-[0.7rem] text-white/50 text-right font-mono">
                          {row.count}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[hsl(35,90%,55%)] to-[hsl(35,90%,45%)]"
                                style={{ width: `${Math.max(4, row.percentage)}%` }}
                              />
                            </div>
                            <span className="text-[0.65rem] text-white/45 w-8 text-right">
                              {row.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent takers — những người đã làm bài gần đây */}
          {stats.recentTakers.length > 0 && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-cyan-500" />
                <h4 className="text-xs font-semibold text-white/80">
                  Học sinh đã hoàn thành gần đây
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[0.65rem] text-white/35 border-b border-white/[0.05]">
                      <th className="pb-2 font-medium">Học sinh</th>
                      <th className="pb-2 font-medium w-20">Năm sinh</th>
                      <th className="pb-2 font-medium w-24">MBTI</th>
                      <th className="pb-2 font-medium w-40">Kiểu tính cách</th>
                      <th className="pb-2 font-medium w-24">Holland</th>
                      <th className="pb-2 font-medium w-28 text-right">Thời điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTakers.map((row, i) => (
                      <tr
                        key={`${row.userName}-${i}`}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {row.userImage ? (
                              <img
                                src={row.userImage}
                                alt={row.userName}
                                className="w-6 h-6 rounded-full object-cover border border-white/[0.1]"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                                <UserIcon className="h-3 w-3 text-white/40" />
                              </div>
                            )}
                            <span className="text-xs text-white/75 truncate max-w-[10rem]">
                              {row.userName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-[0.7rem] text-white/55 font-mono">
                          {row.userYearOfBirth ?? '—'}
                        </td>
                        <td className="py-2">
                          <Badge className="bg-purple-400/10 text-purple-400 border border-purple-400/20 font-mono">
                            {row.mbtiType}
                          </Badge>
                        </td>
                        <td className="py-2 text-[0.7rem] text-white/55 truncate">
                          {row.personalityName}
                        </td>
                        <td className="py-2">
                          <Badge className="bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-mono">
                            {row.hollandCode}
                          </Badge>
                        </td>
                        <td className="py-2 text-[0.65rem] text-white/35 text-right">
                          {formatRelativeTime(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[0.65rem] text-white/30 italic">
                * Dữ liệu được ẩn danh hoặc hiển thị tên công khai theo lựa chọn của người học.
              </p>
            </div>
          )}

          {stats.updatedAt && (
            <p className="text-[0.65rem] text-white/25 text-right">
              Cập nhật: {formatRelativeTime(stats.updatedAt)}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: typeof Wrench
  label: string
  value: string
  sublabel?: string
  color: string
}) {
  return (
    <div
      className="rounded-xl border p-3 flex items-center gap-3"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}30`,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white/85 truncate">{value}</p>
        {sublabel && (
          <p className="text-[0.65rem] text-white/40 truncate">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
 * QR CODE CARD — Khối hiển thị QR nhỏ trên trang giới thiệu.
 * Dùng API public của qrserver.com để render PNG — không cần cài thêm
 * thư viện. Học sinh có thể quét QR bằng điện thoại để tự làm bài.
 * ═══════════════════════════════════════════════════════════════ */
function QrCodeCard({
  testUrl,
  qrImgUrl,
  onOpenFull,
}: {
  testUrl: string
  qrImgUrl: string
  onOpenFull: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(testUrl)
      setCopied(true)
      toast.success("Đã sao chép link bài test")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Không thể sao chép — hãy copy thủ công")
    }
  }

  return (
    <div className="bg-gradient-to-br from-[hsl(265,85%,18%)]/40 via-[hsl(245,60%,16%)]/40 to-[hsl(210,85%,18%)]/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* QR image */}
        <div className="shrink-0">
          <div className="p-3 bg-white rounded-2xl shadow-[0_0_40px_rgba(120,100,255,0.25)]">
            <img
              src={qrImgUrl}
              alt="Mã QR bài test hướng nghiệp"
              className="w-40 h-40 md:w-44 md:h-44 object-contain cursor-pointer"
              onClick={onOpenFull}
              loading="lazy"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <Smartphone className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-white/90">
              Làm bài trên điện thoại bằng mã QR
            </h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed mb-4">
            Dùng camera điện thoại quét mã QR — bất kỳ ai cũng có thể tự làm bài trắc nghiệm
            và xem kết quả ngay, không cần đăng nhập. Kết quả sẽ tự động được tổng hợp vào
            bảng thống kê cộng đồng ở cuối trang.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-center md:justify-start">
            <code className="flex-1 sm:flex-initial min-w-0 text-[0.7rem] font-mono text-white/60 bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 truncate">
              {testUrl}
            </code>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/70 hover:bg-white/[0.1] transition-all"
              >
                {copied ? (
                  <CheckCircle className="h-3.5 w-3.5 text-cyan-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Đã copy" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={onOpenFull}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-400/15 border border-purple-400/30 text-xs text-purple-300 hover:bg-purple-400/25 transition-all"
              >
                <QrCode className="h-3.5 w-3.5" />
                Phóng to QR
              </button>
              <a
                href={qrImgUrl.replace("size=360x360", "size=1024x1024")}
                download="inphysic-career-qr.png"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/70 hover:bg-white/[0.1] transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Tải PNG
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
 * QR CODE MODAL — Phóng to QR để học sinh dễ quét từ khoảng cách xa.
 * ═══════════════════════════════════════════════════════════════ */
function QrCodeModal({
  testUrl,
  qrImgUrl,
  onClose,
}: {
  testUrl: string
  qrImgUrl: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-[hsl(240,20%,12%)] border border-white/[0.08] rounded-3xl p-6 md:p-8 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 flex items-center justify-center transition-all"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <QrCode className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white/90">
              Quét để làm bài trên điện thoại
            </h3>
          </div>
          <p className="text-xs text-white/50">
            Mở camera điện thoại, hướng vào mã QR để bắt đầu.
          </p>
        </div>

        <div className="flex justify-center mb-5">
          <div className="p-4 bg-white rounded-2xl shadow-[0_0_60px_rgba(120,100,255,0.3)]">
            <img
              src={qrImgUrl}
              alt="Mã QR bài test hướng nghiệp (phóng to)"
              className="w-64 h-64 md:w-80 md:h-80 object-contain"
            />
          </div>
        </div>

        <div className="bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 mb-4">
          <p className="text-[0.65rem] uppercase text-white/40 tracking-wider mb-1">
            Link bài test
          </p>
          <code className="block text-xs font-mono text-white/80 break-all">
            {testUrl}
          </code>
        </div>

        <p className="text-[0.7rem] text-white/40 text-center leading-relaxed">
          Mỗi người làm bài sẽ được yêu cầu nhập <b>tên</b> và <b>năm sinh</b> để kết quả
          hiển thị ẩn danh trong bảng thống kê cộng đồng.
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
 * TAKER INFO GATE — Form bắt buộc nhập tên + năm sinh trước khi làm bài.
 * Đây là lớp gate để cả khách vãng lai (scan QR) đều có danh tính tối
 * thiểu cho thống kê, đồng thời không lộ thông tin nhạy cảm.
 * ═══════════════════════════════════════════════════════════════ */
function TakerInfoGate({
  name,
  yearOfBirth,
  error,
  onNameChange,
  onYearChange,
  onCancel,
  onConfirm,
}: {
  name: string
  yearOfBirth: string
  error: string | null
  onNameChange: (v: string) => void
  onYearChange: (v: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const currentYear = new Date().getFullYear()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-[hsl(240,20%,12%)] border border-white/[0.08] rounded-3xl p-6 md:p-8 max-w-md w-full">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 flex items-center justify-center transition-all"
          aria-label="Hủy"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(265,85%,60%)]/20 to-[hsl(175,80%,50%)]/20 border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
            <UserIcon className="h-5 w-5 text-purple-300" />
          </div>
          <h3 className="text-lg font-semibold text-white/90 mb-1">
            Một chút thông tin về bạn
          </h3>
          <p className="text-xs text-white/50">
            Dữ liệu này chỉ dùng để tổng hợp thống kê cộng đồng — không gửi email/SMS.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Họ và tên <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              autoFocus
              className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-purple-400/50 transition-colors"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Năm sinh <span className="text-purple-400">*</span>
            </label>
            <input
              type="number"
              value={yearOfBirth}
              onChange={(e) => onYearChange(e.target.value)}
              placeholder="Ví dụ: 2007"
              min={1940}
              max={currentYear}
              inputMode="numeric"
              className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-purple-400/50 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.08] transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(210,85%,55%)] text-white text-sm font-semibold hover:brightness-110 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Bắt đầu
          </button>
        </div>

        <p className="text-[0.65rem] text-white/30 text-center mt-4">
          Khi tiếp tục, bạn đồng ý để kết quả ẩn danh hiển thị trên bảng thống kê cộng đồng.
        </p>
      </div>
    </div>
  )
}

/* ─── VN Universities Section (cập nhật hằng năm) ───────── */
function VnUniversitiesSection({
  data,
}: {
  data: NonNullable<CareerDetail["universitiesVN"]>
}) {
  const tierColor = (t: string) => {
    switch (t) {
      case "Top đầu":
        return { bg: "bg-purple-400/15", text: "text-purple-400", border: "border-purple-400/25" }
      case "Top cao":
        return { bg: "bg-cyan-500/15", text: "text-cyan-500", border: "border-cyan-500/25" }
      case "Khá tốt":
        return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/25" }
      default:
        return { bg: "bg-white/[0.05]", text: "text-white/60", border: "border-white/[0.1]" }
    }
  }

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-white/90 flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-sky-400" />
            Trường Đại học Việt Nam phù hợp
          </h3>
          <p className="text-[0.65rem] text-white/40 mt-1">
            Dữ liệu lực học (điểm chuẩn tham khảo) & học phí — cập nhật {data.dataYear}
          </p>
        </div>
        <Badge className="bg-sky-400/10 text-sky-400 border border-sky-400/20 shrink-0">
          Cập nhật {data.dataYear}
        </Badge>
      </div>

      {data.note && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-start gap-2 text-xs text-[hsl(35,90%,70%)]/90 leading-relaxed">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{data.note}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.schools.map((s, i) => {
          const tc = tierColor(s.tier)
          return (
            <div
              key={i}
              className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white/90 leading-tight">
                      {s.name}
                    </h4>
                    {s.shortName && (
                      <span className="text-[0.6rem] font-mono uppercase text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                        {s.shortName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[0.65rem] text-white/40">
                    <MapPin className="h-3 w-3" />
                    {s.location}
                    {s.programName && (
                      <>
                        <span className="text-white/20 mx-1">•</span>
                        <span>{s.programName}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge className={`shrink-0 border ${tc.bg} ${tc.text} ${tc.border}`}>
                  {s.tier}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                {/* Lực học — Điểm chuẩn */}
                {s.minScore2026 && s.minScore2026.length > 0 && (
                  <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-2.5">
                    <div className="flex items-center gap-1.5 text-[0.6rem] text-white/40 mb-1.5">
                      <Target className="h-3 w-3 text-cyan-500" />
                      Lực học (điểm chuẩn tham khảo)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.minScore2026.map((ms, j) => (
                        <span
                          key={j}
                          className="text-[0.65rem] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded"
                        >
                          {ms.block} · {ms.score.toFixed(2).replace(/\.00$/, "")}
                        </span>
                      ))}
                    </div>
                    {s.admissionBlocks && s.admissionBlocks.length > 0 && (
                      <div className="text-[0.55rem] text-white/30 mt-1.5">
                        Khối xét tuyển: {s.admissionBlocks.join(", ")}
                      </div>
                    )}
                  </div>
                )}

                {/* Học phí 2026 */}
                <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-2.5">
                  <div className="flex items-center gap-1.5 text-[0.6rem] text-white/40 mb-1.5">
                    <Coins className="h-3 w-3 text-amber-500" />
                    Học phí {data.dataYear}
                  </div>
                  <div className="text-xs text-white/75 leading-snug">{s.tuitionPerYear}</div>
                  {s.tuitionNote && (
                    <div className="text-[0.55rem] text-white/35 mt-1 leading-relaxed">
                      {s.tuitionNote}
                    </div>
                  )}
                </div>
              </div>

              {/* Tiêu chí xét tuyển */}
              {s.admissionMethods && s.admissionMethods.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex items-center gap-1.5 text-[0.6rem] text-white/40 mb-1.5">
                    <ListChecks className="h-3 w-3 text-sky-400" />
                    Tiêu chí xét tuyển
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.admissionMethods.map((m, k) => (
                      <Badge
                        key={k}
                        className="bg-sky-400/10 text-sky-400 border border-sky-400/20 text-[0.6rem]"
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Điểm mạnh */}
              {s.strengths && s.strengths.length > 0 && (
                <div className="mt-2.5 text-[0.65rem] text-white/50 leading-relaxed">
                  <span className="text-purple-400">✦ Điểm mạnh: </span>
                  {s.strengths.join(" • ")}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[0.6rem] text-white/30 mt-4 leading-relaxed">
        * Điểm chuẩn và học phí là dữ liệu tham khảo cho kỳ {data.dataYear}, tổng hợp từ thông báo tuyển sinh năm trước. Học sinh nên kiểm tra website trường trước khi nộp hồ sơ.
      </p>
    </div>
  )
}

/* ─── Job Tasks Section — Công việc cụ thể: Làm gì? Ở đâu? ───────── */
function JobTasksSection({
  data,
}: {
  data: NonNullable<CareerDetail["jobTasks"]>
}) {
  return (
    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-white/90 flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-purple-400" />
          Công việc cụ thể — Làm gì? Ở đâu?
        </h3>
        <p className="text-[0.65rem] text-white/40 mt-1">
          Mô tả chi tiết đầu việc, nơi làm việc và các hướng chuyên môn sâu trong ngành
        </p>
      </div>

      {/* Làm gì? */}
      <div>
        <div className="flex items-center gap-2 text-xs text-cyan-400 mb-2">
          <ListChecks className="h-4 w-4" />
          <span className="font-medium">Làm gì hằng ngày?</span>
        </div>
        <div className="space-y-2">
          {data.responsibilities.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]"
            >
              <div className="w-5 h-5 rounded-md bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="h-3 w-3 text-cyan-500" />
              </div>
              <span className="text-xs text-white/65 leading-relaxed">{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ở đâu? */}
      <div>
        <div className="flex items-center gap-2 text-xs text-sky-400 mb-2">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">Làm ở đâu?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.workplaces.map((wp, i) => (
            <div
              key={i}
              className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-3"
            >
              <div className="flex items-start gap-2 mb-2">
                <Building className="h-3.5 w-3.5 text-sky-400 mt-0.5 shrink-0" />
                <h4 className="text-xs font-medium text-white/80 leading-tight">
                  {wp.type}
                </h4>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {wp.examples.map((ex, j) => (
                  <span
                    key={j}
                    className="text-[0.6rem] bg-white/[0.04] text-white/55 border border-white/[0.08] px-1.5 py-0.5 rounded"
                  >
                    {ex}
                  </span>
                ))}
              </div>
              {wp.note && (
                <p className="text-[0.6rem] text-white/40 leading-relaxed italic">
                  {wp.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chuyên môn sâu */}
      {data.specializations && data.specializations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs text-purple-400 mb-2">
            <Layers className="h-4 w-4" />
            <span className="font-medium">Các hướng chuyên môn sâu</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.specializations.map((sp, i) => (
              <div
                key={i}
                className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-3"
              >
                <div className="text-xs font-medium text-purple-400 mb-1">
                  {sp.name}
                </div>
                <p className="text-[0.65rem] text-white/55 leading-relaxed">
                  {sp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
