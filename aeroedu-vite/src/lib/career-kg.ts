/**
 * career-kg.ts — Helper biến dữ liệu careerDetails thành KG 4-category
 *
 * Mỗi nghề trong careerDetails có cấu trúc:
 *   skills.technical[] · skills.soft[] · skills.tools[] · importantSubjects[]
 * → 4 category nodes cho KG view (`ProfessionalKG.tsx`).
 *
 * Một người có thể chọn nhiều nghề → mỗi nghề có KG riêng, có liên kết qua
 * các "skill bridge" — skill cùng label xuất hiện ở nhiều nghề.
 */
import type React from 'react'
import { BookOpen, Brain, Wrench, Sparkles } from 'lucide-react'
import { careerDetails } from './career-detail-data'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KGSkill {
  /** Unique stable id: `${careerId}__${category}__${slug}` */
  id: string
  label: string
  description: string
  tags?: string[]
  /** Other career IDs sharing this label (for cross-career bridge highlighting) */
  sharedWith?: string[]
}

export interface KGCategory {
  /** e.g., 'technical', 'soft', 'tools', 'subjects' */
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  skills: KGSkill[]
}

export interface CareerSummary {
  id: string
  name: string
  icon: string
  category: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Slugify Vietnamese string thành ASCII a-z0-9-… để làm stable id.
 * Dùng regex Unicode escape ̀-ͯ thay vì literal để tránh trip linter
 * khi paste sang JSON / hỗn hợp encoding.
 */
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Normalize label cho việc match skill chéo giữa các nghề. */
function normLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Build KG cho 1 nghề ───────────────────────────────────────────────────────

/**
 * Build 4-category KG từ careerDetails[careerId].
 * - Kỹ năng chuyên môn (technical)  → purple
 * - Kỹ năng mềm        (soft)       → blue
 * - Công cụ            (tools)      → emerald
 * - Môn học liên quan  (subjects)   → amber
 */
export function buildCareerKG(careerId: string): KGCategory[] {
  const career = careerDetails[careerId]
  if (!career) return []

  return [
    {
      id: 'technical',
      label: 'Kỹ năng chuyên môn',
      description: 'Các kỹ năng kỹ thuật / chuyên môn cốt lõi của nghề',
      icon: Brain,
      color: 'purple',
      skills: (career.skills?.technical || []).map((s) => ({
        id: `${careerId}__technical__${slug(s.name)}`,
        label: s.name,
        description: `Mức độ yêu cầu: ${s.level}`,
        tags: [s.level],
      })),
    },
    {
      id: 'soft',
      label: 'Kỹ năng mềm',
      description: 'Giao tiếp, hợp tác, làm việc nhóm, EQ, leadership',
      icon: Sparkles,
      color: 'blue',
      skills: (career.skills?.soft || []).map((s) => ({
        id: `${careerId}__soft__${slug(s)}`,
        label: s,
        description: 'Kỹ năng mềm quan trọng cho nghề này',
      })),
    },
    {
      id: 'tools',
      label: 'Công cụ & Phần mềm',
      description: 'Phần mềm, framework, công cụ vật lý cần thành thạo',
      icon: Wrench,
      color: 'emerald',
      skills: (career.skills?.tools || []).map((s) => ({
        id: `${careerId}__tools__${slug(s)}`,
        label: s,
        description: 'Công cụ thiết yếu cho công việc',
      })),
    },
    {
      id: 'subjects',
      label: 'Môn học liên quan',
      description: 'Kiến thức nền tảng học vấn THPT/Đại học',
      icon: BookOpen,
      color: 'amber',
      skills: (career.importantSubjects || []).map((s) => ({
        id: `${careerId}__subjects__${slug(s.name)}`,
        label: s.name,
        description: `Mức độ quan trọng: ${s.importance}`,
        tags: [s.importance],
      })),
    },
  ]
}

// ── Bridges chéo nghề ──────────────────────────────────────────────────────────

export interface CareerBridge {
  label: string          // tên gốc hiển thị
  category: string       // 'technical' | 'soft' | 'tools' | 'subjects'
  careerIds: string[]    // các nghề cùng có skill này
}

/**
 * Tìm skill được CHIA SẺ giữa ≥2 nghề. Match theo label đã normalize.
 * Sắp theo số nghề giảm dần (skill phổ thông nhất ở đầu).
 */
export function findCrossCareerBridges(careerIds: string[]): CareerBridge[] {
  const labelMap = new Map<string, { label: string; category: string; careers: Set<string> }>()

  for (const careerId of careerIds) {
    const career = careerDetails[careerId]
    if (!career) continue
    const allSkills: Array<{ label: string; category: string }> = [
      ...(career.skills?.technical || []).map((s) => ({ label: s.name, category: 'technical' })),
      ...(career.skills?.soft       || []).map((s) => ({ label: s,      category: 'soft' })),
      ...(career.skills?.tools      || []).map((s) => ({ label: s,      category: 'tools' })),
      ...(career.importantSubjects  || []).map((s) => ({ label: s.name, category: 'subjects' })),
    ]
    for (const { label, category } of allSkills) {
      const key = `${category}::${normLabel(label)}`
      if (!labelMap.has(key)) {
        labelMap.set(key, { label, category, careers: new Set() })
      }
      labelMap.get(key)!.careers.add(careerId)
    }
  }

  return Array.from(labelMap.values())
    .filter((b) => b.careers.size >= 2)
    .map((b) => ({ label: b.label, category: b.category, careerIds: Array.from(b.careers) }))
    .sort((a, b) => b.careerIds.length - a.careerIds.length || a.label.localeCompare(b.label, 'vi'))
}

/**
 * Annotate KG với sharedWith — đánh dấu skill nào xuất hiện ở nghề khác.
 * Trả về NEW array (không mutate input).
 */
export function annotateWithBridges(
  kg: KGCategory[],
  currentCareerId: string,
  otherCareerIds: string[],
): KGCategory[] {
  if (!otherCareerIds.length) return kg

  // Pre-compute label → set of other career IDs có cùng label trong CÙNG category
  const other = new Map<string, Set<string>>()
  for (const ocid of otherCareerIds) {
    if (ocid === currentCareerId) continue
    const career = careerDetails[ocid]
    if (!career) continue
    const skills: Array<{ label: string; category: string }> = [
      ...(career.skills?.technical || []).map((s) => ({ label: s.name, category: 'technical' })),
      ...(career.skills?.soft       || []).map((s) => ({ label: s,      category: 'soft' })),
      ...(career.skills?.tools      || []).map((s) => ({ label: s,      category: 'tools' })),
      ...(career.importantSubjects  || []).map((s) => ({ label: s.name, category: 'subjects' })),
    ]
    for (const { label, category } of skills) {
      const key = `${category}::${normLabel(label)}`
      if (!other.has(key)) other.set(key, new Set())
      other.get(key)!.add(ocid)
    }
  }

  return kg.map((cat) => ({
    ...cat,
    skills: cat.skills.map((sk) => {
      const key = `${cat.id}::${normLabel(sk.label)}`
      const sharedWith = other.get(key)
      if (sharedWith && sharedWith.size > 0) {
        return { ...sk, sharedWith: Array.from(sharedWith) }
      }
      return sk
    }),
  }))
}

// ── Career meta lookup ─────────────────────────────────────────────────────────

/** Lấy tên + emoji của 1 nghề, trả null nếu không tồn tại. */
export function getCareerLabel(careerId: string): { name: string; icon: string } | null {
  const c = careerDetails[careerId]
  return c ? { name: c.name, icon: c.icon } : null
}

/** Danh sách tóm tắt 25 nghề (cho picker UI). */
export function getAllCareers(): CareerSummary[] {
  return Object.values(careerDetails).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    category: c.category,
  }))
}

/** Danh sách category để group trong picker. */
export function getCareerCategories(): string[] {
  const set = new Set<string>()
  for (const c of Object.values(careerDetails)) set.add(c.category)
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
}

/** Tổng số skill (tất cả category) của 1 nghề — dùng cho progress %. */
export function countCareerSkills(careerId: string): number {
  const career = careerDetails[careerId]
  if (!career) return 0
  return (
    (career.skills?.technical?.length || 0) +
    (career.skills?.soft?.length || 0) +
    (career.skills?.tools?.length || 0) +
    (career.importantSubjects?.length || 0)
  )
}
