"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "react-hot-toast"

interface Question {
  id: string
  position: number
  questionType: string
  content: string
  options: string[]
  points: number
}

interface ExamRoom {
  id: string
  name: string
  description: string
  duration: number
  status: string
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Nhiều lựa chọn",
  TRUE_FALSE: "Đúng - Sai",
  SHORT_ANSWER: "Trả lời ngắn",
  ESSAY: "Tự luận",
}

export default function ExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [examRoom, setExamRoom] = useState<ExamRoom | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => { loadExamRoom() }, [params.id])

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) { handleSubmit(); return 0 }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeRemaining])

  const loadExamRoom = async () => {
    try {
      const response = await fetch(`/api/online-exam-room/${params.id}/take`)
      const data = await response.json()
      if (data.success) {
        setExamRoom(data.data.examRoom)
        setQuestions(data.data.questions)
        setTimeRemaining(data.data.examRoom.duration * 60)
        setParticipantId(data.data.participantId)
        await fetch(`/api/online-exam-room/${params.id}/start`, { method: "POST" })
      }
    } catch (error) {
      toast.error("Không thể tải đề thi")
      router.push("/student/exams")
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    saveAnswer(questionId, answer)
  }

  const saveAnswer = async (questionId: string, answer: string) => {
    try {
      await fetch(`/api/online-exam-room/${params.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer, participantId }),
      })
    } catch (error) { console.error("Save error:", error) }
  }

  const handleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) newSet.delete(questionId)
      else newSet.add(questionId)
      return newSet
    })
  }

  const handleNavigate = (index: number) => {
    setCurrentQuestionIndex(index)
    questionRefs.current[index]?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (!confirm("Nộp bài thi? Bạn sẽ không thể làm lại.")) return
    setIsSubmitting(true)
    try {
      const answeredCount = Object.keys(answers).length
      const unansweredCount = questions.length - answeredCount
      if (unansweredCount > 0 && !confirm(`Bạn còn ${unansweredCount} câu chưa làm. Vẫn nộp bài?`)) {
        setIsSubmitting(false)
        return
      }
      await fetch(`/api/online-exam-room/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      })
      toast.success("Đã nộp bài thi!")
      router.push("/student/exams")
    } catch (error) { toast.error("Không thể nộp bài") } finally { setIsSubmitting(false) }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const getQuestionStatus = (question: Question) => {
    const isAnswered = !!answers[question.id]
    const isFlagged = flaggedQuestions.has(question.id)
    const isCurrent = questions[currentQuestionIndex]?.id === question.id
    if (isCurrent) return "current"
    if (isFlagged) return "flagged"
    if (isAnswered) return "answered"
    return "unanswered"
  }

  if (!examRoom || questions.length === 0) {
    return (<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Đang tải đề thi...</p></div>)
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{examRoom.name}</h1>
          <p className="text-sm text-muted-foreground">{examRoom.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
            <Clock className="h-5 w-5" />
            <span className="text-lg font-bold font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />Nộp bài
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                Câu {currentQuestion.position} • {QUESTION_TYPE_LABELS[currentQuestion.questionType]}
              </Badge>
              <Button variant={flaggedQuestions.has(currentQuestion.id) ? "default" : "outline"} size="sm" onClick={() => handleFlag(currentQuestion.id)}>
                <Flag className="h-4 w-4 mr-1" />{flaggedQuestions.has(currentQuestion.id) ? "Đã đánh dấu" : "Đánh dấu"}
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="text-lg font-medium mb-6" dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
                {(currentQuestion.questionType === "MCQ" || currentQuestion.questionType === "TRUE_FALSE") ? (
                  <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)} className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${answers[currentQuestion.id] === option ? "border-primary bg-blue-50" : "hover:bg-gray-50"}`} onClick={() => handleAnswerChange(currentQuestion.id, option)}>
                        <RadioGroupItem value={option} id={`option-${index}`} className="h-5 w-5" />
                        <label htmlFor={`option-${index}`} className="flex-1 cursor-pointer font-medium" dangerouslySetInnerHTML={{ __html: option }} />
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <textarea className="w-full min-h-[200px] p-4 border rounded-lg focus:ring-2 focus:ring-primary" placeholder="Nhập câu trả lời..." value={answers[currentQuestion.id] || ""} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => handleNavigate(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />Câu trước
              </Button>
              <Button variant="outline" onClick={() => handleNavigate(currentQuestionIndex + 1)} disabled={currentQuestionIndex === questions.length - 1}>
                Câu tiếp<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <div className="w-80 bg-white border-l overflow-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Phiếu trả lời</h2>
            <div className="text-sm text-muted-foreground mt-1">Đã trả lời: <strong>{Object.keys(answers).length}</strong>/{questions.length}</div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500"></div><span>Đã trả lời</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500"></div><span>Đánh dấu</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-primary"></div><span>Câu hiện tại</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-100 border"></div><span>Chưa trả lời</span></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const status = getQuestionStatus(question)
                return (
                  <button key={question.id} ref={(el) => (questionRefs.current[index] = el)} onClick={() => handleNavigate(index)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${status === "answered" ? "bg-green-500 text-white" : status === "flagged" ? "bg-yellow-500 text-white" : status === "current" ? "border-2 border-primary bg-white" : "bg-gray-100 border hover:bg-gray-200"}`}>
                    {question.position}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="p-4 border-t mt-auto">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 p-3 rounded">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div><p className="font-medium text-amber-800">Lưu ý:</p><p>Bài thi sẽ tự động nộp khi hết giờ.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
