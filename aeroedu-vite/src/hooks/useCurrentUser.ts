/**
 * useCurrentUser — drop-in replacement cho hook cùng tên trong Next.js project
 *
 * // Next.js cũ (hooks/use-current-user.ts):
 * const user = useCurrentUser() // dùng useSession()
 *
 * // Vite mới — interface giữ nguyên
 */
import { useAuth } from './useAuth'
import type { User } from '@/types'

export function useCurrentUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useCurrentRole() {
  const user = useCurrentUser()
  return user?.role
}
