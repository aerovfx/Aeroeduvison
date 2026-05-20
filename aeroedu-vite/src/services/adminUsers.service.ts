/**
 * Admin Users Service
 *
 * Endpoints (admin only):
 *  - list(params)       → paginated user list w/ filters
 *  - stats()            → counts by role/accountType + activity metrics
 *  - get(id)            → user detail (profile + careerSurvey + recent activity)
 *  - update(id, data)   → partial update (name/email/role/accountType/banned)
 *  - resetPassword(id)  → admin-set new password
 *  - ban(id, reason)    → convenience wrapper around update
 *  - unban(id)          → convenience wrapper around update
 *  - delete(id)         → soft delete (sets banned=true)
 */
import { api } from './api'

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type AccountType = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN'

export interface AdminUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: UserRole
  accountType: AccountType
  emailVerified: boolean
  twoFactorEnabled: boolean
  createdAt: string
  lastLoginAt: string | null
  banned: boolean
  bannedReason: string | null
  bannedAt: string | null
}

export interface AdminUserDetail extends AdminUser {
  dateOfBirth?: string | null
  gender?: string | null
  lastLoginIp?: string | null
  profile?: {
    bio: string | null
    skills: unknown
    socials: Record<string, unknown>
    themeColor: string | null
    bannerStyle: string | null
  }
  careerSurvey?: unknown
  recentActivity?: Array<{
    id: string
    action: string
    title: string | null
    courseId: string | null
    occurredAt: string
  }>
}

export interface AdminUserStats {
  total: number
  students: number
  teachers: number
  parents: number
  admins: number
  activeLast7d: number
  newThisMonth: number
  twoFactorEnabledCount: number
  bannedCount: number
}

export interface ListUsersParams {
  accountType?: AccountType
  role?: UserRole
  search?: string
  status?: 'active' | 'banned'
  page?: number
  limit?: number
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ListUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  role?: UserRole
  accountType?: AccountType
  banned?: boolean
  bannedReason?: string | null
}

export const adminUsersService = {
  list: (params?: ListUsersParams) =>
    api.get<ListUsersResponse>('/admin/users', { params }).then(r => r.data),

  stats: () =>
    api.get<AdminUserStats>('/admin/users/stats').then(r => r.data),

  get: (id: string) =>
    api.get<AdminUserDetail>(`/admin/users/${id}`).then(r => r.data),

  update: (id: string, data: UpdateUserPayload) =>
    api.patch<AdminUser>(`/admin/users/${id}`, data).then(r => r.data),

  resetPassword: (id: string, newPassword: string) =>
    api.post<{ ok: true }>(`/admin/users/${id}/reset-password`, { newPassword }).then(r => r.data),

  ban: (id: string, reason: string) =>
    api.patch<AdminUser>(`/admin/users/${id}`, { banned: true, bannedReason: reason }).then(r => r.data),

  unban: (id: string) =>
    api.patch<AdminUser>(`/admin/users/${id}`, { banned: false, bannedReason: null }).then(r => r.data),

  delete: (id: string) =>
    api.delete<{ ok: true }>(`/admin/users/${id}`).then(r => r.data),
}
