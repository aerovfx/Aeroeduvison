"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, AlertCircle, BookOpen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

interface ProgressData {
  completionRate: number
  accuracyTrend: number[]
  timeSpent: number
  engagementScore: number
  riskLevel: 'low' | 'medium' | 'high'
  predictedScore: number
  struggleTopics: string[]
}

export function ProgressDashboard({ studentId }: { studentId: string }) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [studentId])

  const loadProgress = async () => {
    try {
      const response = await fetch(`/api/agents/progress-tracker?studentId=${studentId}`)
      const data = await response.json()
      if (data.success) {
        setProgress(data.data.progress)
      }
    } catch (error) {
      toast.error("Không thể tải tiến độ")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!progress) return null

  const getRiskBadge = () => {
    switch (progress.riskLevel) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Nguy cơ cao</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Cần quan tâm</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Ổn định</Badge>
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}p`
  }

  const accuracyTrendUp = progress.accuracyTrend.length >= 2 && 
    progress.accuracyTrend[progress.accuracyTrend.length - 1] > progress.accuracyTrend[0]

  return (
    <div className="space-y-6">
      {/* Risk Level Banner */}
      <Card className={
        progress.riskLevel === 'high' ? 'border-red-300 bg-red-50' :
        progress.riskLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' :
        'border-green-300 bg-green-50'
      }>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {progress.riskLevel === 'high' ? (
              <AlertCircle className="h-6 w-6 text-red-600" />
            ) : progress.riskLevel === 'medium' ? (
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-600" />
            )}
            <div>
              <div className="font-semibold">
                {progress.riskLevel === 'high' ? 'Nguy cơ cao tụt lại' :
                 progress.riskLevel === 'medium' ? 'Cần được quan tâm' :
                 'Tiến độ tốt'}
              </div>
              <div className="text-sm text-muted-foreground">
                Điểm dự đoán: <strong className="text-primary">{progress.predictedScore}/10</strong>
              </div>
            </div>
          </div>
          {getRiskBadge()}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Hoàn thành</span>
            </div>
            <div className="text-2xl font-bold">{progress.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Bài đã nộp</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {accuracyTrendUp ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className="text-xs text-muted-foreground">Chính xác</span>
            </div>
            <div className="text-2xl font-bold">
              {progress.accuracyTrend[progress.accuracyTrend.length - 1].toFixed(0)}%
            </div>
            <div className="text-xs text-green-600">
              {accuracyTrendUp ? '↑ Đang tăng' : '↓ Đang giảm'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thời gian học</span>
            </div>
            <div className="text-2xl font-bold">{formatTime(progress.timeSpent)}</div>
            <div className="text-xs text-muted-foreground">Tuần này</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Engagement</span>
            </div>
            <div className="text-2xl font-bold">{progress.engagementScore}%</div>
            <div className="text-xs text-muted-foreground">Mức độ tương tác</div>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Trend Chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Xu hướng chính xác (7 ngày)</h3>
          <div className="flex items-end gap-2 h-32">
            {progress.accuracyTrend.map((accuracy, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className={`w-full rounded-t ${
                    accuracy >= 85 ? 'bg-green-500' :
                    accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${accuracy}%` }}
                />
                <span className="text-xs text-muted-foreground">
                  Ngày {index + 1}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Struggle Topics */}
      {progress.struggleTopics.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Chủ đề cần cải thiện
            </h3>
            <div className="flex flex-wrap gap-2">
              {progress.struggleTopics.map((topic, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
