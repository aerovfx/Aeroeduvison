/**
 * User Profile Service — Trang cá nhân tùy biến
 *
 * Endpoints:
 *   GET   /api/users/:userId/profile  → public
 *   GET   /api/users/me/profile       → own
 *   PATCH /api/users/me/profile       → upsert decoration
 */
import { api } from './api'
import type { PublicProfileResponse, UserProfile } from '@/types/profile'

export const userProfileService = {
  /** GET /api/users/:userId/profile — public view (yêu cầu login) */
  getProfile: (userId: string) =>
    api.get<PublicProfileResponse>(`/users/${encodeURIComponent(userId)}/profile`)
      .then((r) => r.data),

  /** GET /api/users/me/profile — own profile (full) */
  getMyProfile: () =>
    api.get<PublicProfileResponse>('/users/me/profile').then((r) => r.data),

  /** PATCH /api/users/me/profile — partial update các field decoration */
  updateMyProfile: (patch: Partial<UserProfile>) =>
    api.patch<{ ok: boolean; profile: UserProfile }>('/users/me/profile', patch)
      .then((r) => r.data),
}
