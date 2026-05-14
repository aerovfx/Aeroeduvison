/**
 * Teacher ↔ Student Link service
 *
 * Quản lý kết nối giữa GV và HS:
 *  - HS gửi request kết nối GV (cần GV duyệt)
 *  - GV mời HS (cần HS duyệt)
 *  - Auto-approved khi HS đăng ký với email đã được GV import
 *
 * Backend endpoints: /api/teacher-student-link/* + /api/{teacher,student}/my-*
 */
import { api } from './api'

export type LinkStatus = 'pending' | 'approved' | 'rejected'
export type LinkInitiator = 'student' | 'teacher' | 'auto'

export interface TeacherStudentLink {
  id: string
  teacherId: string
  studentId: string
  status: LinkStatus
  initiatedBy: LinkInitiator
  message: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
  // Enriched fields từ JOIN User
  otherEmail?: string
  otherName?: string
  otherImage?: string | null
}

export interface LinkedUser {
  linkId: string
  initiatedBy: LinkInitiator
  approvedAt: string | null
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface SearchUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
}

export const teacherStudentLinkService = {
  /** HS gửi request tới GV (theo email hoặc id) */
  async request(payload: { teacherEmail?: string; teacherId?: string; message?: string }) {
    const r = await api.post<{ ok: boolean; linkId: string }>('/teacher-student-link/request', payload)
    return r.data
  },

  /** GV mời HS (theo email) */
  async invite(payload: { studentEmail: string; message?: string }) {
    const r = await api.post<{ ok: boolean; linkId: string }>('/teacher-student-link/invite', payload)
    return r.data
  },

  /** Người nhận đồng ý */
  async approve(linkId: string) {
    const r = await api.post<{ ok: boolean }>(`/teacher-student-link/${linkId}/approve`)
    return r.data
  },

  /** Người nhận từ chối */
  async reject(linkId: string) {
    const r = await api.post<{ ok: boolean }>(`/teacher-student-link/${linkId}/reject`)
    return r.data
  },

  /** Inbox: { incoming, outgoing } pending */
  async pending() {
    const r = await api.get<{ incoming: TeacherStudentLink[]; outgoing: TeacherStudentLink[] }>(
      '/teacher-student-link/pending'
    )
    return r.data
  },

  /** GV: list HS approved */
  async myStudents() {
    const r = await api.get<{ students: LinkedUser[] }>('/teacher/my-students')
    return r.data?.students || []
  },

  /** HS: list GV approved */
  async myTeachers() {
    const r = await api.get<{ teachers: LinkedUser[] }>('/student/my-teachers')
    return r.data?.teachers || []
  },

  /** Disconnect — giữ data cũ */
  async disconnect(linkId: string) {
    const r = await api.delete<{ ok: boolean }>(`/teacher-student-link/${linkId}`)
    return r.data
  },

  /** Search user theo email/name (cho UI link modal) */
  async searchUsers(q: string, role?: 'TEACHER' | 'STUDENT') {
    const params: Record<string, string> = { q }
    if (role) params.role = role
    const r = await api.get<{ users: SearchUser[] }>('/users/search', { params })
    return r.data?.users || []
  },
}
