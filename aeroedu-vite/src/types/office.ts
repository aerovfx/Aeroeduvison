/** Kiểu dữ liệu cho bộ công cụ Văn phòng online (Văn bản · Trình chiếu · Bảng tính). */

export type OfficeKind = 'doc' | 'sheet' | 'slides' | 'pcb'

export interface DocData { html: string }
export interface SheetData { rows: number; cols: number; cells: Record<string, string> } // cells key = "r:c"
export interface Slide { id: string; title: string; body: string; bg: string }
export interface SlidesData { slides: Slide[] }

export interface OfficeDoc {
  id: string
  kind: OfficeKind
  title: string
  data: DocData | SheetData | SlidesData | Record<string, unknown>
  ownerId?: string
  ownerName?: string
  createdAt?: string
  updatedAt?: string
}
