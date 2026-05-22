/**
 * useAccountType — phân biệt UI Phụ huynh vs Giáo viên
 *
 * Backend chỉ có 2 role: STUDENT và TEACHER. Phụ huynh dùng CHUNG tài khoản
 * với Giáo viên (cùng quyền theo dõi tiến độ, xem điểm, nhận thông báo) —
 * khác biệt chỉ ở label hiển thị + một số tính năng UI-only:
 *
 * - "Phụ huynh" thấy label & dashboard hướng đến theo dõi con
 * - "Giáo viên" thấy module soạn đề, ma trận, quản lý lớp
 *
 * Sub-type được lưu trong localStorage khi đăng ký (Register.tsx).
 * Hook này trả về account type "thực sự" cho UI (STUDENT / TEACHER / PARENT).
 */
import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

export type AccountType = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | null

export function useAccountType(): AccountType {
  const { user } = useAuth()
  const [subType, setSubType] = useState<string | null>(null)

  useEffect(() => {
    try { setSubType(localStorage.getItem('userSubType')) } catch { /* ignore */ }
  }, [user?.id])

  if (!user) return null
  // Ưu tiên accountType từ server (UserProfile bền qua thiết bị)
  // Sau đó mới fallback localStorage subType (chỉ trên trình duyệt hiện tại)
  const serverType = (user.accountType as AccountType) || null
  if (serverType === 'PARENT') return 'PARENT'

  if (user.role === 'STUDENT') return 'STUDENT'
  if (user.role === 'ADMIN')   return 'ADMIN'
  if (user.role === 'TEACHER') {
    if (serverType === 'TEACHER') return 'TEACHER'
    return subType === 'PARENT' ? 'PARENT' : 'TEACHER'
  }
  return null
}

/** Tiện ích: true nếu user hiện tại đăng ký dưới dạng "Phụ huynh" */
export function useIsParent(): boolean {
  return useAccountType() === 'PARENT'
}

/** Trả về label hiển thị tiếng Việt cho vai trò hiện tại */
export function useRoleLabel(): string {
  const t = useAccountType()
  switch (t) {
    case 'STUDENT': return 'Học sinh'
    case 'TEACHER': return 'Giáo viên'
    case 'PARENT':  return 'Phụ huynh'
    case 'ADMIN':   return 'Quản trị viên'
    default:        return 'Khách'
  }
}
