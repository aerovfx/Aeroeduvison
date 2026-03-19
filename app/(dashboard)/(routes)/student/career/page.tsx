"use client"

import { useState } from "react"
import { Briefcase, Target, TrendingUp, Users, MapPin, DollarSign, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { PageHeader } from "@/components/layout/page-header"

interface CareerRecommendation {
  career: string
  matchScore: number
  reasons: string[]
  universities: string[]
  salaryRange: string
  demandLevel: 'high' | 'medium' | 'low'
}

export default function CareerAdvisorPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    recommendations: CareerRecommendation[]
    actionPlan: string[]
  } | null>(null)

  const getRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/agents/career-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      })
      const data = await response.json()
      if (data.success) {
        setResult(data.data)
        toast.success('Đã phân tích xong!')
      }
    } catch {
      toast.error('Không thể phân tích')
    } finally {
      setLoading(false)
    }
  }

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-[hsl(175,80%,55%)] bg-[hsl(175,80%,50%)]/10 border-[hsl(175,80%,50%)]/20'
      case 'medium': return 'text-[hsl(35,90%,55%)] bg-[hsl(35,90%,55%)]/10 border-[hsl(35,90%,55%)]/20'
      case 'low': return 'text-white/40 bg-white/[0.04] border-white/[0.08]'
    }
  }

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-[hsl(175,80%,55%)]'
    if (score >= 70) return 'text-[hsl(210,90%,65%)]'
    if (score >= 50) return 'text-[hsl(35,90%,55%)]'
    return 'text-[hsl(0,80%,65%)]'
  }

  if (result) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Kết Quả Tư Vấn Hướng Nghiệp"
          description="Các ngành nghề phù hợp với bạn"
          actions={
            <Button variant="outline" onClick={() => setResult(null)} className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
              Phân Tích Lại
            </Button>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Top Recommendation */}
            {result.recommendations[0] && (
              <div className="bg-gradient-to-r from-[hsl(245,85%,55%)]/10 to-[hsl(280,75%,55%)]/10 backdrop-blur-xl rounded-2xl border border-[hsl(245,85%,65%)]/20 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white/90">{result.recommendations[0].career}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Target className="h-4 w-4" />
                      <span>Độ phù hợp: </span>
                      <span className={`text-2xl font-bold ${getMatchColor(result.recommendations[0].matchScore)}`}>
                        {result.recommendations[0].matchScore}%
                      </span>
                    </div>
                  </div>
                  <Badge className={`${getDemandColor(result.recommendations[0].demandLevel)} border`}>
                    Nhu cầu: {result.recommendations[0].demandLevel === 'high' ? 'Cao' : result.recommendations[0].demandLevel === 'medium' ? 'Trung bình' : 'Thấp'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-white/80 mb-3 flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                      Lý do phù hợp
                    </h3>
                    <ul className="space-y-2">
                      {result.recommendations[0].reasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2 text-white/50 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(245,85%,65%)] mt-1.5 flex-shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/80 mb-3 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-[hsl(175,80%,55%)]" />
                      Trường ĐH đào tạo
                    </h3>
                    <ul className="space-y-2">
                      {result.recommendations[0].universities.map((uni, i) => (
                        <li key={i} className="flex items-start gap-2 text-white/50 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(175,80%,55%)] mt-1.5 flex-shrink-0" />
                          <span>{uni}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-white/40 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>Mức lương: <strong className="text-white/70">{result.recommendations[0].salaryRange}</strong></span>
                </div>
              </div>
            )}

            {/* Other Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.slice(1).map((rec, i) => (
                <div key={i} className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-white/[0.1]">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white/90">{rec.career}</h3>
                    <Badge className={`${getDemandColor(rec.demandLevel)} border text-[0.65rem]`}>
                      {rec.demandLevel === 'high' ? 'Cao' : rec.demandLevel === 'medium' ? 'TB' : 'Thấp'}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-white/40 text-xs">Độ phù hợp</span>
                      <span className={`font-bold ${getMatchColor(rec.matchScore)}`}>{rec.matchScore}%</span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          rec.matchScore >= 90 ? 'bg-[hsl(175,80%,50%)]' :
                          rec.matchScore >= 70 ? 'bg-[hsl(210,90%,60%)]' :
                          rec.matchScore >= 50 ? 'bg-[hsl(35,90%,55%)]' : 'bg-[hsl(0,80%,60%)]'
                        }`}
                        style={{ width: `${rec.matchScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-white/40">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{rec.salaryRange}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <Users className="h-3.5 w-3.5" />
                      <span>{rec.universities.length} trường ĐH</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Plan */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[hsl(175,80%,55%)]" />
                Kế Hoạch Hành Động
              </h3>
              <ol className="space-y-3">
                {result.actionPlan.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[hsl(245,85%,65%)]/15 text-[hsl(245,85%,75%)] flex items-center justify-center font-bold flex-shrink-0 text-xs border border-[hsl(245,85%,65%)]/20">
                      {i + 1}
                    </div>
                    <span className="pt-1 text-white/60 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Tư Vấn Hướng Nghiệp" description="Khám phá ngành nghề phù hợp với bạn" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-[hsl(245,85%,55%)]/15 to-[hsl(280,75%,55%)]/15 backdrop-blur-xl rounded-2xl border border-[hsl(245,85%,65%)]/20 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(120,100,255,0.3)]">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white/90 mb-2">Bạn muốn trở thành ai?</h2>
            <p className="text-sm text-white/40 mb-6">
              AI sẽ phân tích sở thích, năng lực và đề xuất ngành nghề phù hợp nhất
            </p>
            <Button
              size="lg"
              onClick={getRecommendations}
              disabled={loading}
              className="bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] border-0 text-white shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.35)] hover:brightness-110"
            >
              {loading ? 'Đang phân tích...' : 'Phân Tích Ngay'}
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <Target className="h-10 w-10 text-[hsl(210,90%,60%)] mx-auto mb-3" />
              <h3 className="font-semibold text-white/85 text-sm mb-1">Phân Tích Cá Nhân</h3>
              <p className="text-xs text-white/40">Dựa trên sở thích, điểm mạnh và kết quả học tập</p>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <TrendingUp className="h-10 w-10 text-[hsl(175,80%,55%)] mx-auto mb-3" />
              <h3 className="font-semibold text-white/85 text-sm mb-1">Thị Trường Lao Động</h3>
              <p className="text-xs text-white/40">Cập nhật nhu cầu nhân lực và mức lương</p>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <Users className="h-10 w-10 text-[hsl(280,75%,65%)] mx-auto mb-3" />
              <h3 className="font-semibold text-white/85 text-sm mb-1">Trường ĐH Phù Hợp</h3>
              <p className="text-xs text-white/40">Danh sách các trường đào tạo ngành nghề</p>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
            <h3 className="font-semibold text-white/90 mb-4 text-sm">Quy Trình Tư Vấn</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: 1, label: 'Phân tích', sub: 'Hồ sơ cá nhân' },
                { step: 2, label: 'Đề xuất', sub: 'Ngành nghề' },
                { step: 3, label: 'Chi tiết', sub: 'Thông tin' },
                { step: 4, label: 'Hành động', sub: 'Kế hoạch' },
              ].map(({ step, label, sub }) => (
                <div key={step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[hsl(245,85%,65%)]/15 text-[hsl(245,85%,75%)] border border-[hsl(245,85%,65%)]/20 flex items-center justify-center font-bold mx-auto mb-2 text-sm">
                    {step}
                  </div>
                  <div className="text-xs font-medium text-white/70">{label}</div>
                  <div className="text-[0.65rem] text-white/30">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
