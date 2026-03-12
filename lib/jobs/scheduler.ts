/**
 * Background Jobs Scheduler
 * Runs periodic tasks for agents system
 */

import { db } from "@/lib/db"
import { studyPlanner } from "@/lib/agents/study-planner"
import { educationResearch } from "@/lib/agents/education-research"
import { analyticsReport } from "@/lib/agents/analytics-report"
import { systemMonitor } from "@/lib/agents/system-monitor"

export class JobScheduler {
  private static instance: JobScheduler
  private intervals: NodeJS.Timeout[] = []

  static getInstance(): JobScheduler {
    if (!this.instance) {
      this.instance = new JobScheduler()
    }
    return this.instance
  }

  /**
   * Start all background jobs
   */
  start(): void {
    console.log('🤖 Starting background jobs scheduler...')

    // Daily reminders at 7am
    this.scheduleDailyReminder()

    // Hourly health checks
    this.scheduleHealthCheck()

    // Weekly digest on Monday 8am
    this.scheduleWeeklyDigest()

    // Daily report at 6am
    this.scheduleDailyReport()

    console.log('✅ All background jobs started')
  }

  /**
   * Stop all background jobs
   */
  stop(): void {
    this.intervals.forEach(clearInterval)
    this.intervals = []
    console.log('⏹️  All background jobs stopped')
  }

  /**
   * Schedule daily study reminders (7am)
   */
  private scheduleDailyReminder(): void {
    const runReminder = async () => {
      try {
        console.log('📢 Running daily reminders...')
        
        const students = await db.user.findMany({
          where: { role: 'STUDENT' },
          select: { id: true, email: true },
        })

        let sentCount = 0

        for (const student of students) {
          const reminder = await studyPlanner.generateDailyReminders(student.id)
          
          if (reminder && reminder.sessions.length > 0) {
            await db.dailyReminder.create({
              data: {
                studentId: student.id,
                type: 'study',
                message: reminder.motivationalMessage,
                metadata: {
                  sessions: reminder.sessions,
                },
              },
            })

            // TODO: Send email/push notification
            console.log(`  📧 Reminder sent to ${student.email}`)
            sentCount++
          }
        }

        console.log(`✅ Daily reminders complete: ${sentCount} sent`)
      } catch (error) {
        console.error('❌ Daily reminder error:', error)
      }
    }

    // Run at 7am every day
    const now = new Date()
    const nextRun = new Date(now)
    nextRun.setHours(7, 0, 0, 0)
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1)

    const delay = nextRun.getTime() - now.getTime()
    console.log(`⏰ Next daily reminder in ${Math.round(delay / 1000 / 60)} minutes`)

    const interval = setInterval(runReminder, 24 * 60 * 60 * 1000)
    this.intervals.push(interval)

    // Run immediately for testing (remove in production)
    // runReminder()
  }

  /**
   * Schedule hourly health checks
   */
  private scheduleHealthCheck(): void {
    const runHealthCheck = async () => {
      try {
        console.log('❤️  Running health check...')
        
        const health = await systemMonitor.checkHealth()
        
        // Log health metrics
        await db.agentReport.create({
          data: {
            type: 'hourly',
            agentId: 'system-monitor',
            metrics: health,
            period: new Date().toISOString(),
            summary: `System ${health.status}`,
          },
        })

        // Check for alerts
        if (health.status !== 'healthy') {
          console.error('⚠️  System health issue detected:', health)
          // TODO: Send alert to admin
        }

        console.log(`✅ Health check complete: ${health.status}`)
      } catch (error) {
        console.error('❌ Health check error:', error)
      }
    }

    const interval = setInterval(runHealthCheck, 60 * 60 * 1000) // Every hour
    this.intervals.push(interval)

    console.log('⏰ Health check scheduled every hour')
  }

  /**
   * Schedule weekly research digest (Monday 8am)
   */
  private scheduleWeeklyDigest(): void {
    const runWeeklyDigest = async () => {
      try {
        console.log('📚 Generating weekly research digest...')
        
        const digest = await educationResearch.generateWeeklyDigest()
        
        // Save to database
        await db.agentReport.create({
          data: {
            type: 'weekly',
            agentId: 'education-research',
            metrics: digest,
            period: this.getWeekPeriod(),
            summary: 'Weekly education research digest',
          },
        })

        // TODO: Email to teachers
        console.log('✅ Weekly digest complete')
      } catch (error) {
        console.error('❌ Weekly digest error:', error)
      }
    }

    // Run every Monday at 8am
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
    const nextRun = new Date(now)
    nextRun.setDate(nextRun.getDate() + daysUntilMonday)
    nextRun.setHours(8, 0, 0, 0)

    const delay = nextRun.getTime() - now.getTime()
    console.log(`⏰ Next weekly digest in ${Math.round(delay / 1000 / 60 / 60)} hours`)

    const interval = setInterval(runWeeklyDigest, 7 * 24 * 60 * 60 * 1000)
    this.intervals.push(interval)
  }

  /**
   * Schedule daily analytics report (6am)
   */
  private scheduleDailyReport(): void {
    const runDailyReport = async () => {
      try {
        console.log('📊 Generating daily analytics report...')
        
        const report = await analyticsReport.generateDailyReport()
        
        // Save to database
        await db.agentReport.create({
          data: {
            type: 'daily',
            agentId: 'analytics-report',
            metrics: report,
            period: new Date().toISOString().split('T')[0],
            summary: `Daily report: ${report.totalStudents} students, ${report.activeUsers} active`,
          },
        })

        console.log('✅ Daily report complete')
      } catch (error) {
        console.error('❌ Daily report error:', error)
      }
    }

    // Run at 6am every day
    const now = new Date()
    const nextRun = new Date(now)
    nextRun.setHours(6, 0, 0, 0)
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1)

    const delay = nextRun.getTime() - now.getTime()
    console.log(`⏰ Next daily report in ${Math.round(delay / 1000 / 60)} minutes`)

    const interval = setInterval(runDailyReport, 24 * 60 * 60 * 1000)
    this.intervals.push(interval)
  }

  /**
   * Get current week period string
   */
  private getWeekPeriod(): string {
    const now = new Date()
    const weekNumber = this.getWeekNumber(now)
    return `${now.getFullYear()}-W${weekNumber}`
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }
}

// Export singleton
export const scheduler = JobScheduler.getInstance()
