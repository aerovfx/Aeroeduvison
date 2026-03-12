"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, CheckCircle, Plus, Trash2, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

interface StudySession {
  id: string
  date: Date
  timeSlot: string
  subject: string
  topic: string
  duration: number
  completed: boolean
}

interface StudyStats {
  totalSessions: number
  completedSessions: number
  completionRate: number
  totalHours: number
  streak: number
}

export function StudyCalendar({ studentId }: { studentId: string }) {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudyData()
  }, [studentId])

  const loadStudyData = async () => {
    try {
      const [planRes, statsRes] = await Promise.all([
        fetch('/api/agents/study-planner'),
        fetch('/api/agents/study-planner?action=stats'),
      ])

      const planData = await planRes.json()
      const statsData = await statsRes.json()

      if (planData.success) {
        const allSessions = planData.data.plan.subjects.flatMap((s: any) => s.weeklySessions)
        setSessions(allSessions)
      }

      if (statsData.success) {
        setStats(statsData.data)
      }
    } catch (error) {
      toast.error("Không thể tải dữ liệu học tập")
    } finally {
      setLoading(false)
    }
  }

  const markComplete = async (sessionId: string) => {
    try {
      await fetch('/api/agents/study-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-session',
          sessionId,
          completed: true,
        }),
      })
      toast.success('Đã đánh dấu hoàn thành!')
      loadStudyData()
    } catch (error) {
      toast.error('Không thể cập nhật')
    }
  }

  const getTodaySessions = () => {
    const today = new Date().toDateString()
    return sessions.filter(s => new Date(s.date).toDateString() === today)
  }

  const getUpcomingSessions = () => {
    const today = new Date()
    return sessions.filter(s => new Date(s.date) > today).slice(0, 5)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const todaySessions = getTodaySessions()
  const upcomingSessions = getUpcomingSessions()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Tổng sessions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.completedSessions}</div>
              <div className="text-xs text-muted-foreground">Đã hoàn thành</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <div className="text-xs text-muted-foreground">Tổng giờ học</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{stats.streak}</span>
              </div>
              <div className="text-xs text-muted-foreground">Ngày liên tiếp</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Sessions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hôm nay
            </h3>
            <Badge>{todaySessions.length} sessions</Badge>
          </div>

          {todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Không có lịch học hôm nay. Hãy nghỉ ngơi nhé! 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    session.completed ? 'bg-green-50 border-green-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      session.subject === 'Toán' ? 'bg-blue-100' :
                      session.subject === 'Văn' ? 'bg-green-100' :
                      session.subject === 'Anh' ? 'bg-purple-100' :
                      'bg-gray-100'
                    }`}>
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{session.subject} - {session.topic}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.timeSlot} • {session.duration} phút
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.completed ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Hoàn thành
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => markComplete(session.id)}
                      >
                        Hoàn thành
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Sắp tới</h3>
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <div className="font-medium">{session.subject} - {session.topic}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString('vi-VN')} • {session.timeSlot}
                  </div>
                </div>
                <Badge variant="outline">{session.duration}p</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
