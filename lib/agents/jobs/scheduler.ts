/**
 * Background Jobs Scheduler
 * Handles automated tasks for agents system
 */

import { db } from "@/lib/db"
import { studyPlanner } from "../study-planner"
import { educationResearch } from "../education-research"
import { analyticsReport } from "../admin-analytics"
import { systemMonitor } from "../system-monitor"

export class JobScheduler {
  private static instance: JobScheduler
  private intervals: NodeJS.Timeout[] = []
  private running = false

  static getInstance(): JobScheduler {
    if (!this.instance) {
      this.instance = new JobScheduler()
    }
    return this.instance
  }

  start(): void {
    if (this.running) return
    this.running = true
    console.log('🤖 Starting background jobs scheduler...')
    this.scheduleDailyReminders()
    this.scheduleHealthChecks()
    this.scheduleWeeklyDigest()
    this.scheduleDailyReports()
    this.scheduleCleanup()
    console.log('✅ All background jobs started')
  }

  stop(): void {
    this.intervals.forEach(clearInterval)
    this.intervals = []
    this.running = false
    console.log('⏹️ Background jobs stopped')
  }

  private scheduleDailyReminders(): void {
    const run = async () => {
      console.log('📢 Running daily reminders...')
      const students = await db.user.findMany({ where: { role: 'STUDENT' }, select: { id: true, email: true } })
      let count = 0
      for (const s of students) {
        const reminder = await studyPlanner.generateDailyReminders(s.id)
        if (reminder?.sessions.length) {
          await db.dailyReminder.create({ data: { studentId: s.id, type: 'study', message: reminder.motivationalMessage } })
          count++
        }
      }
      console.log(`✅ Sent ${count} reminders`)
    }
    const now = new Date()
    const next = new Date(now)
    next.setHours(7, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    this.intervals.push(setInterval(run, 24 * 60 * 60 * 1000))
  }

  private scheduleHealthChecks(): void {
    const run = async () => {
      const health = await systemMonitor.checkHealth()
      await db.agentReport.create({ data: { type: 'hourly', agentId: 'system-monitor', metrics: health, period: new Date().toISOString(), summary: `System ${health.status}` } })
      console.log(`❤️ Health: ${health.status}`)
    }
    this.intervals.push(setInterval(run, 60 * 60 * 1000))
  }

  private scheduleWeeklyDigest(): void {
    const run = async () => {
      const digest = await educationResearch.generateWeeklyDigest()
      await db.agentReport.create({ data: { type: 'weekly', agentId: 'education-research', metrics: digest, period: this.getWeekPeriod(), summary: 'Weekly digest' } })
      console.log('📚 Weekly digest complete')
    }
    this.intervals.push(setInterval(run, 7 * 24 * 60 * 60 * 1000))
  }

  private scheduleDailyReports(): void {
    const run = async () => {
      const report = await analyticsReport.generateDailyReport()
      await db.agentReport.create({ data: { type: 'daily', agentId: 'analytics-report', metrics: report, period: new Date().toISOString().split('T')[0], summary: `Daily: ${report.totalStudents} students` } })
      console.log('📊 Daily report complete')
    }
    this.intervals.push(setInterval(run, 24 * 60 * 60 * 1000))
  }

  private scheduleCleanup(): void {
    const run = async () => {
      const r = await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } })
      const s = await db.agentSession.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } })
      console.log(`🧹 Cleanup: ${r.count} rate limits, ${s.count} sessions`)
    }
    this.intervals.push(setInterval(run, 24 * 60 * 60 * 1000))
  }

  private getWeekPeriod(): string {
    const now = new Date()
    const week = this.getWeekNumber(now)
    return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }
}

export const scheduler = JobScheduler.getInstance()
