/**
 * UserProfile — Trang cá nhân tùy biến (decoratable profile)
 *
 * Mở rộng User với các trường thẩm mỹ (banner, frame avatar, theme color,
 * skills, social links, showcase, visibility toggles). Lưu ở bảng UserProfile
 * (1-1 với User) để không làm phình User table chính.
 */

export type BannerStyle =
  | 'gradient-purple'
  | 'gradient-blue'
  | 'gradient-sunset'
  | 'gradient-aurora'
  | 'gradient-ocean'
  | 'gradient-forest'
  | 'gradient-mono'
  | 'custom-image'

export type AvatarFrame =
  | 'none'
  | 'gold'
  | 'neon'
  | 'polaroid'
  | 'hexagon'
  | 'animated'

export type ThemeColor =
  | 'purple'
  | 'blue'
  | 'green'
  | 'red'
  | 'pink'
  | 'amber'
  | 'cyan'
  | 'slate'

export interface ProfileSocials {
  facebook?: string
  youtube?: string
  github?: string
  website?: string
}

export interface ProfileShowcaseItem {
  title: string
  description?: string
  url?: string
  image?: string
}

export interface ProfileVisibility {
  bio?: boolean
  stats?: boolean
  skills?: boolean
  socials?: boolean
  achievements?: boolean
  showcase?: boolean
}

export interface UserProfile {
  id: string
  userId: string
  bio?: string
  bannerStyle?: BannerStyle
  bannerImageUrl?: string
  avatarFrame?: AvatarFrame
  themeColor?: ThemeColor
  skills?: string[]
  socials?: ProfileSocials
  showcase?: ProfileShowcaseItem[]
  visibility?: ProfileVisibility
  updatedAt?: string
}

/** Stats hiển thị cho học sinh */
export interface StudentProfileStats {
  xp: number
  level: number
  completedCourses: number
  streak?: number
}

/** Stats hiển thị cho giáo viên */
export interface TeacherProfileStats {
  coursesTaught: number
  studentsCount: number
  yearsExperience: number
  rating?: number
}

/** Achievement / badge hiển thị trên trang cá nhân */
export interface ProfileAchievement {
  id: string
  title: string
  description?: string
  icon?: string
  earnedAt?: string
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
}

/** Response shape khi GET /api/users/:userId/profile (public) */
export interface PublicProfileResponse {
  user: {
    id: string
    name: string | null
    image: string | null
    role: 'STUDENT' | 'TEACHER' | 'ADMIN'
    createdAt: string
  }
  profile: UserProfile | null
  stats: StudentProfileStats | TeacherProfileStats | null
  achievements: ProfileAchievement[]
}
