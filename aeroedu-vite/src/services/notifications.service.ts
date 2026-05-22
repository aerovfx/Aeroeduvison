/**
 * Notifications service — in-app notification queue
 * GET /api/notifications              → list + unreadCount
 * PATCH /api/notifications/:id/read   → mark single read
 * POST /api/notifications/read-all    → mark all read
 */
import { api } from './api'

export interface Notification {
  id: string
  userId: string
  fromUserId: string | null
  type: 'assignment' | 'message' | 'system' | string
  title: string
  body: string | null
  link: string | null
  metadata: Record<string, unknown>
  read: boolean
  createdAt: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  unreadCount: number
}

export const notificationsService = {
  async list(opts?: { unread?: boolean; limit?: number }): Promise<NotificationListResponse> {
    const params: Record<string, string | number> = {}
    if (opts?.unread) params.unread = '1'
    if (opts?.limit)  params.limit  = opts.limit
    const res = await api.get<NotificationListResponse>('/notifications', { params })
    return res.data || { notifications: [], unreadCount: 0 }
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<{ marked: number }> {
    const res = await api.post<{ marked: number }>('/notifications/read-all')
    return res.data || { marked: 0 }
  },
}
