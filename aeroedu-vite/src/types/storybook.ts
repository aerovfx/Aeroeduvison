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
  published: boolean
  ownerId?: string
  ownerName?: string
  createdAt?: string
  updatedAt?: string
}
