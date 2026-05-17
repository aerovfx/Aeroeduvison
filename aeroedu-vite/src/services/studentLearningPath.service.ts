/**
 * Student Learning Path service
 *
 * Lấy lộ trình học mà GIÁO VIÊN đã phân công cho học sinh hiện tại.
 * Backend: GET /api/student/learning-paths
 *
 * Logic gốc:
 *   - Mỗi GV tạo LearningPath (modules tự sắp xếp)
 *   - GV assign cho HS qua LearningPathAssignment (theo studentId hoặc email)
 *   - HS đăng nhập → endpoint trả về full path + module list + tiến độ
 *
 * Trường hợp HS chưa có GV nào hoặc chưa được assign → trả mảng rỗng.
 */
import { api } from './api'

export type StudentPathStatus = 'assigned' | 'in_progress' | 'completed'
export type StudentPathDifficulty = 'easy' | 'medium' | 'hard'

export interface StudentLearningPathModule {
  id: string
  type: 'lesson' | 'quiz' | 'video' | 'challenge' | 'reading' | 'assignment'
  title: string
  description?: string
  duration?: number  // phút
  xpReward?: number
  order?: number
  // Tham chiếu — frontend sẽ dùng để mở đúng resource
  resourceId?: string
  resourceUrl?: string
}

export interface StudentLearningPath {
  // Assignment-level
  assignmentId: string
  status: StudentPathStatus
  progressPct: number
  /** Map moduleId → 'completed' | 'in_progress' | undefined (chưa làm) */
  moduleStatus: Record<string, 'completed' | 'in_progress'>
  assignedAt: string
  completedAt: string | null
  lastActivityAt: string | null
  // Path-level (snapshot khi assign)
  id: string
  name: string
  description: string
  subject: string | null
  difficulty: StudentPathDifficulty | string
  modules: StudentLearningPathModule[]
  estimatedDays: number | null
  totalXP: number | null
  totalDuration: number | null
  createdAt: string
  // Teacher info — nguồn gốc của lộ trình
  teacher: {
    id: string | null
    name: string | null
    email: string | null
  }
}

export const studentLearningPathService = {
  /** GET /api/student/learning-paths — toàn bộ path từ các GV đã đăng ký */
  async getMine(): Promise<StudentLearningPath[]> {
    try {
      const r = await api.get<{ paths: StudentLearningPath[]; count: number }>(
        '/student/learning-paths'
      )
      return r.data?.paths ?? []
    } catch {
      return []
    }
  },
}

export default studentLearningPathService
