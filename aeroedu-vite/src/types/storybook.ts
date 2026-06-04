/** Kiểu dữ liệu cho module Flipbook có audio dành cho thiếu nhi. */

export interface StorybookPage {
  id: string
  imageUrl: string
  caption?: string
  /** Mode 'perPage': audio kể riêng cho trang này. */
  audioUrl?: string
  /** Mode 'narration': mốc thời gian (giây) trong file kể chuyện để LẬT TỚI trang này. */
  flipAtSec?: number | null
}

/** Tông giọng đọc theo cảm xúc của hồi (truyền cho Google TTS). */
export type StoryTone = 'gentle' | 'warm' | 'excited' | 'suspense' | 'sad'

/** Một "hồi" trong cấu trúc 3 hồi (mở đầu · cao trào · kết thúc). */
export interface StorybookAct {
  id: string
  title: string
  description?: string
  /** Trang bắt đầu hồi (index, inclusive). Hồi kéo dài tới trước startPage của hồi kế. */
  startPage: number
  /** Giọng đọc cho các trang trong hồi này. */
  tone?: StoryTone
}

export interface Storybook {
  id: string
  title: string
  description?: string
  coverUrl?: string
  /** 'perPage' = mỗi trang 1 đoạn audio · 'narration' = 1 file kể chuyện + mốc lật theo thời gian. */
  mode: 'perPage' | 'narration'
  narrationUrl?: string
  /** perPage: tự sang trang khi audio trang kết thúc. */
  autoAdvance: boolean
  pages: StorybookPage[]
  /** Cấu trúc 3 hồi (tuỳ chọn). Không có = truyện phẳng như cũ. */
  acts?: StorybookAct[] | null
  published: boolean
  ownerId?: string
  ownerName?: string
  createdAt?: string
  updatedAt?: string
}
