import { db } from "@/lib/db"

export interface StudyPlan {
  id: string
  studentId: string
  goal: string
  targetScore: number
  deadline: Date
  weeklyHours: number
  subjects: StudySubject[]
  createdAt: Date
  updatedAt: Date
}

export interface StudySubject {
  subject: string
  currentLevel: number
  targetLevel: number
  topics: StudyTopic[]
  weeklySessions: StudySession[]
}

export interface StudyTopic {
  name: string
  priority: 'high' | 'medium' | 'low'
  estimatedHours: number
  completed: boolean
}

export interface StudySession {
  id: string
  date: Date
  timeSlot: string
  subject: string
  topic: string
  duration: number // minutes
  completed: boolean
  notes?: string
}

export interface StudyGoal {
  id: string
  studentId: string
  title: string
  description: string
  deadline: Date
  progress: number
  status: 'active' | 'completed' | 'failed'
  createdAt: Date
}

export class StudyPlannerAgent {
  /**
   * Tạo study plan từ mục tiêu của học sinh
   */
  async createStudyPlan(
    studentId: string,
    goal: string,
    targetScore: number,
    deadline: Date,
    availableHoursPerWeek: number
  ): Promise<StudyPlan> {
    // Phân tích mục tiêu và tạo plan với AI
    const planDetails = await this.generatePlanWithAI(
      goal,
      targetScore,
      deadline,
      availableHoursPerWeek
    )

    // Lấy thông tin học sinh để cá nhân hóa
    const student = await db.user.findUnique({
      where: { id: studentId },
      include: {
        ClassStudents: true,
      },
    })

    // Tạo study plan
    const plan: StudyPlan = {
      id: `plan-${Date.now()}`,
      studentId,
      goal,
      targetScore,
      deadline,
      weeklyHours: availableHoursPerWeek,
      subjects: planDetails.subjects,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Lưu vào database (TODO: Create study_plans table)
    // await db.studyPlan.create({ data: plan })

    return plan
  }

  /**
   * Generate plan chi tiết với AI
   */
  private async generatePlanWithAI(
    goal: string,
    targetScore: number,
    deadline: Date,
    weeklyHours: number
  ): Promise<{ subjects: StudySubject[] }> {
    try {
      const response = await fetch('/api/agents/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Bạn là chuyên gia lập kế hoạch học tập.

Nhiệm vụ: Tạo lộ trình học tập chi tiết dựa trên mục tiêu của học sinh.

Output JSON:
{
  "subjects": [
    {
      "subject": "Toán",
      "currentLevel": 6,
      "targetLevel": 8,
      "topics": [
        {
          "name": "Đại số",
          "priority": "high",
          "estimatedHours": 10,
          "completed": false
        }
      ],
      "weeklySessions": [
        {
          "date": "2026-03-10",
          "timeSlot": "19:00-20:30",
          "subject": "Toán",
          "topic": "Đại số",
          "duration": 90,
          "completed": false
        }
      ]
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Mục tiêu: ${goal}
Điểm mục tiêu: ${targetScore}/10
Thời hạn: ${deadline.toISOString().split('T')[0]}
Giờ học mỗi tuần: ${weeklyHours} giờ

Hãy tạo lộ trình học tập chi tiết với các môn học cần thiết, chủ đề ưu tiên, và lịch học cụ thể.`
            }
          ],
          config: { model: 'gpt-4o-mini', temperature: 0.7 }
        }),
      })

      if (!response.ok) throw new Error('AI plan generation failed')

      const data = await response.json()
      return JSON.parse(data.content)
    } catch (error) {
      console.error('Study plan generation error:', error)
      // Return fallback plan
      return this.generateFallbackPlan(goal, weeklyHours)
    }
  }

  /**
   * Fallback plan khi AI fails
   */
  private generateFallbackPlan(goal: string, weeklyHours: number): { subjects: StudySubject[] } {
    const hoursPerDay = Math.floor(weeklyHours / 5) // 5 days/week
    
    return {
      subjects: [
        {
          subject: 'Toán',
          currentLevel: 5,
          targetLevel: 8,
          topics: [
            { name: 'Đại số', priority: 'high', estimatedHours: 15, completed: false },
            { name: 'Hình học', priority: 'medium', estimatedHours: 10, completed: false },
          ],
          weeklySessions: this.generateWeeklySessions('Toán', 'Đại số', hoursPerDay),
        },
        {
          subject: 'Văn',
          currentLevel: 6,
          targetLevel: 8,
          topics: [
            { name: 'Đọc hiểu', priority: 'high', estimatedHours: 12, completed: false },
            { name: 'Viết văn', priority: 'medium', estimatedHours: 10, completed: false },
          ],
          weeklySessions: this.generateWeeklySessions('Văn', 'Đọc hiểu', hoursPerDay),
        },
        {
          subject: 'Anh',
          currentLevel: 5,
          targetLevel: 7,
          topics: [
            { name: 'Ngữ pháp', priority: 'high', estimatedHours: 12, completed: false },
            { name: 'Từ vựng', priority: 'medium', estimatedHours: 10, completed: false },
          ],
          weeklySessions: this.generateWeeklySessions('Anh', 'Ngữ pháp', hoursPerDay),
        },
      ],
    }
  }

  private generateWeeklySessions(subject: string, topic: string, hoursPerDay: number): StudySession[] {
    const sessions: StudySession[] = []
    const today = new Date()

    for (let i = 0; i < 5; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      sessions.push({
        id: `session-${subject}-${i}`,
        date,
        timeSlot: '19:00-20:30',
        subject,
        topic,
        duration: hoursPerDay * 60,
        completed: false,
      })
    }

    return sessions
  }

  /**
   * Get study plan cho học sinh
   */
  async getStudyPlan(studentId: string): Promise<StudyPlan | null> {
    // TODO: Fetch from database
    // For now, return mock data
    return {
      id: 'plan-1',
      studentId,
      goal: 'Đạt 9.0 IELTS trong 6 tháng',
      targetScore: 9,
      deadline: new Date('2026-09-10'),
      weeklyHours: 15,
      subjects: [
        {
          subject: 'Anh',
          currentLevel: 6,
          targetLevel: 9,
          topics: [
            { name: 'Listening', priority: 'high', estimatedHours: 20, completed: false },
            { name: 'Reading', priority: 'high', estimatedHours: 20, completed: false },
            { name: 'Writing', priority: 'medium', estimatedHours: 15, completed: false },
            { name: 'Speaking', priority: 'medium', estimatedHours: 15, completed: false },
          ],
          weeklySessions: [],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Update progress của session
   */
  async updateSessionProgress(
    sessionId: string,
    completed: boolean,
    notes?: string
  ): Promise<void> {
    // TODO: Update in database
    console.log(`Session ${sessionId} completed: ${completed}, notes: ${notes}`)
  }

  /**
   * Generate daily reminders
   */
  async generateDailyReminders(studentId: string): Promise<{
    sessions: StudySession[]
    motivationalMessage: string
  } | null> {
    const today = new Date()
    const dayOfWeek = today.getDay()

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return null

    const plan = await this.getStudyPlan(studentId)
    if (!plan) return null

    // Get today's sessions
    const todaySessions = plan.subjects
      .flatMap(s => s.weeklySessions)
      .filter(s => {
        const sessionDate = new Date(s.date)
        return sessionDate.toDateString() === today.toDateString()
      })

    if (todaySessions.length === 0) return null

    // Generate motivational message
    const messages = [
      "💪 Hôm nay là một ngày tuyệt vời để học tập! Bạn đã sẵn sàng chưa?",
      "🎯 Mỗi bước nhỏ hôm nay là một bước gần hơn đến mục tiêu!",
      "📚 Học tập là chìa khóa của thành công. Cố gắng lên!",
      "⭐ Bạn làm được mà! Hãy bắt đầu với session đầu tiên!",
      "🚀 Ngày mới tốt lành! Thời gian học đã đến rồi!",
    ]

    const motivationalMessage = messages[Math.floor(Math.random() * messages.length)]

    return {
      sessions: todaySessions,
      motivationalMessage,
    }
  }

  /**
   * Adjust plan based on progress
   */
  async adjustPlan(studentId: string, completedSessions: number, totalSessions: number): Promise<StudyPlan | null> {
    const completionRate = completedSessions / totalSessions
    const plan = await this.getStudyPlan(studentId)
    
    if (!plan) return null

    // Nếu completion rate < 50%, giảm khối lượng
    if (completionRate < 0.5) {
      // Adjust weekly hours down
      plan.weeklyHours = Math.max(plan.weeklyHours - 2, 5)
      // Add encouragement message
    } 
    // Nếu completion rate > 90%, tăng độ khó
    else if (completionRate > 0.9) {
      plan.weeklyHours = Math.min(plan.weeklyHours + 2, 30)
      // Add challenge topics
    }

    plan.updatedAt = new Date()
    return plan
  }

  /**
   * Background job: Send daily reminders at 7am
   */
  async runDailyReminders(): Promise<{
    totalStudents: number
    remindersSent: number
  }> {
    const students = await db.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, email: true },
    })

    let remindersSent = 0

    for (const student of students) {
      const reminder = await this.generateDailyReminders(student.id)
      if (reminder && reminder.sessions.length > 0) {
        // TODO: Send email/push notification
        console.log(`Sending reminder to ${student.email}:`, reminder.motivationalMessage)
        remindersSent++
      }
    }

    return {
      totalStudents: students.length,
      remindersSent,
    }
  }

  /**
   * Get study statistics
   */
  async getStudyStats(studentId: string): Promise<{
    totalSessions: number
    completedSessions: number
    completionRate: number
    totalHours: number
    streak: number
  }> {
    const plan = await this.getStudyPlan(studentId)
    if (!plan) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        totalHours: 0,
        streak: 0,
      }
    }

    const allSessions = plan.subjects.flatMap(s => s.weeklySessions)
    const completedSessions = allSessions.filter(s => s.completed)
    const totalHours = completedSessions.reduce((sum, s) => sum + s.duration / 60, 0)

    // Calculate streak (consecutive days with completed sessions)
    const streak = this.calculateStreak(completedSessions)

    return {
      totalSessions: allSessions.length,
      completedSessions: completedSessions.length,
      completionRate: Math.round((completedSessions.length / allSessions.length) * 100),
      totalHours: Math.round(totalHours * 10) / 10,
      streak,
    }
  }

  private calculateStreak(completedSessions: StudySession[]): number {
    if (completedSessions.length === 0) return 0

    const dates = completedSessions
      .map(s => new Date(s.date).toDateString())
      .filter((d, i, arr) => arr.indexOf(d) === i) // Unique dates
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())

    if (dates.length === 0) return 0

    let streak = 1
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if most recent session is today or yesterday
    const mostRecent = dates[0]
    const diffDays = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > 1) return 0 // Streak broken

    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1]
      const currDate = dates[i]
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  }
}

// Export singleton
export const studyPlanner = new StudyPlannerAgent()
