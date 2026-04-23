import api from './api'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type AchievementCategory = 'learning' | 'streak' | 'skill' | 'social' | 'special'

export interface Achievement {
  id: number
  title: string
  description: string
  icon: string
  category: AchievementCategory
  earned: boolean
  earnedDate?: string
  progress?: number
  maxProgress?: number
  xp: number
  rarity: Rarity
}

export interface AchievementsResponse {
  achievements: Achievement[]
  totalXP: number
  earnedCount: number
  totalCount: number
  level: number
  currentXP: number
  nextLevelXP: number
  streak: number
}

export const achievementsService = {
  getAll: () =>
    api.get<AchievementsResponse>('/achievements').then((r) => r.data),
}
