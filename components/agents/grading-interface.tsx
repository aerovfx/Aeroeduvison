"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

interface GradingInterfaceProps {
  examRoomId: string
  studentId?: string
  onGradingComplete?: (result: any) => void
}

export function GradingInterface({ examRoomId, studentId, onGradingComplete }: GradingInterfaceProps) {
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleGrade = async () => {
    setGrading(true)
    try {
      const response = await fetch('/api/agents/auto-grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examRoomId, studentId }),
      })

      const data = await response.json()
      if (data.success) {
        setResult(data.data)
        toast.success('Đã chấm bài xong!')
        onGradingComplete?.(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể chấm bài')
    } finally {
      setGrading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleGrade} 
        disabled={grading}
        className="w-full"
      >
        {grading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang chấm...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Chấm bài tự động
          </>
        )}
      </Button>

      {result && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Overall Score */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {result.percentage}%
              </div>
              <div className="text-muted-foreground">
                {result.totalScore}/{result.maxScore} điểm
              </div>
              <div className="mt-2">
                <Badge className={
                  result.percentage >= 80 ? 'bg-green-100 text-green-800' :
                  result.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {result.feedback}
                </Badge>
              </div>
            </div>

            {/* Question Results */}
            <div className="space-y-2">
              <h4 className="font-semibold">Chi tiết:</h4>
              {result.results.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    {r.isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Câu {i + 1}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {r.points}/{r.maxPoints}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
