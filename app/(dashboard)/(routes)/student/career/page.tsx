"use client"

import { useState, useEffect } from "react"
import { Briefcase, Target, TrendingUp, Users, MapPin, DollarSign, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    } catch (error) {
      toast.error('Không thể phân tích')
    } finally {
      setLoading(false)
    }
  }

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-gray-600 bg-gray-100'
    }
  }

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (result) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <PageHeader
          title="Kết Quả Tư Vấn Hướng Nghiệp"
          description="Các ngành nghề phù hợp với bạn"
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              Phân Tích Lại
            </Button>
          }
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top Recommendation */}
            {result.recommendations[0] && (
              <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Briefcase className="h-8 w-8 text-blue-600" />
                        <h2 className="text-3xl font-bold">{result.recommendations[0].career}</h2>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>Độ phù hợp: </span>
                        <span className={`text-2xl font-bold ${getMatchColor(result.recommendations[0].matchScore)}`}>
                          {result.recommendations[0].matchScore}%
                        </span>
                      </div>
                    </div>
                    <Badge className={getDemandColor(result.recommendations[0].demandLevel)}>
                      Nhu cầu: {result.recommendations[0].demandLevel === 'high' ? 'Cao' : result.recommendations[0].demandLevel === 'medium' ? 'Trung bình' : 'Thấp'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-600" />
                        Lý do phù hợp
                      </h3>
                      <ul className="space-y-2">
                        {result.recommendations[0].reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        Trường ĐH đào tạo
                      </h3>
                      <ul className="space-y-2">
                        {result.recommendations[0].universities.map((uni, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2" />
                            <span>{uni}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-5 w-5" />
                    <span>Mức lương: <strong>{result.recommendations[0].salaryRange}</strong></span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.slice(1).map((rec, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">{rec.career}</h3>
                      <Badge className={getDemandColor(rec.demandLevel)}>
                        {rec.demandLevel === 'high' ? 'Cao' : rec.demandLevel === 'medium' ? 'TB' : 'Thấp'}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Độ phù hợp</span>
                        <span className={`font-bold ${getMatchColor(rec.matchScore)}`}>
                          {rec.matchScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            rec.matchScore >= 90 ? 'bg-green-500' :
                            rec.matchScore >= 70 ? 'bg-blue-500' :
                            rec.matchScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${rec.matchScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{rec.salaryRange}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{rec.universities.length} trường ĐH</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Plan */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Kế Hoạch Hành Động
                </h3>
                <ol className="space-y-3">
                  {result.actionPlan.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <span className="pt-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <PageHeader
        title="Tư Vấn Hướng Nghiệp"
        description="Khám phá ngành nghề phù hợp với bạn"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Hero Section */}
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardContent className="p-8 text-center">
              <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-90" />
              <h2 className="text-3xl font-bold mb-2">Bạn muốn trở thành ai?</h2>
              <p className="text-lg opacity-90 mb-6">
                AI sẽ phân tích sở thích, năng lực và đề xuất ngành nghề phù hợp nhất
              </p>
              <Button
                size="lg"
                onClick={getRecommendations}
                disabled={loading}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                {loading ? 'Đang phân tích...' : 'Phân Tích Ngay'}
              </Button>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Phân Tích Cá Nhân</h3>
                <p className="text-sm text-muted-foreground">
                  Dựa trên sở thích, điểm mạnh và kết quả học tập
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Thị Trường Lao Động</h3>
                <p className="text-sm text-muted-foreground">
                  Cập nhật nhu cầu nhân lực và mức lương
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Trường ĐH Phù Hợp</h3>
                <p className="text-sm text-muted-foreground">
                  Danh sách các trường đào tạo ngành nghề
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Quy Trình Tư Vấn</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mx-auto mb-2">
                    1
                  </div>
                  <div className="text-sm font-medium">Phân tích</div>
                  <div className="text-xs text-muted-foreground">Hồ sơ cá nhân</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mx-auto mb-2">
                    2
                  </div>
                  <div className="text-sm font-medium">Đề xuất</div>
                  <div className="text-xs text-muted-foreground">Ngành nghề</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mx-auto mb-2">
                    3
                  </div>
                  <div className="text-sm font-medium">Chi tiết</div>
                  <div className="text-xs text-muted-foreground">Thông tin</div>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mx-auto mb-2">
                    4
                  </div>
                  <div className="text-sm font-medium">Hành động</div>
                  <div className="text-xs text-muted-foreground">Kế hoạch</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
