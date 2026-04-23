/**
 * Analytics Service — thay thế Server Action getAnalytics
 */
import api from './api'
import type { DashboardStats, ActivityData } from '@/types'

export const analyticsService = {
  /** GET /api/analytics/dashboard — thay Server Action getAnalytics */
  getDashboard: () =>
    api.get<DashboardStats>('/analytics/dashboard').then((r) => r.data),

  /** GET /api/analytics/activity?days=30 */
  getActivity: (days = 30) =>
    api.get<ActivityData[]>('/analytics/activity', { params: { days } }).then((r) => r.data),

  /** GET /api/analytics/courses */
  getCourseStats: () =>
    api.get('/analytics/courses').then((r) => r.data),

  /** GET /api/analytics/students — Admin/Teacher */
  getStudentStats: (classId?: string) =>
    api.get('/analytics/students', { params: { classId } }).then((r) => r.data),
}
