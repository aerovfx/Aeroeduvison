/**
 * KnowledgeUnitPicker — Cascading dropdown để pick Chương → Bài → Đơn vị KT
 *
 * 4 cấp cascade (theo catalog):
 *   Subject (đã truyền từ ngoài qua prop)
 *     → Grade (đã truyền)
 *       → Chapter (dropdown 1)
 *         → Lesson (dropdown 2)
 *           → Knowledge Unit (dropdown 3, optional)
 *
 * Khi user pick:
 *   - Chapter → reset Lesson + Unit
 *   - Lesson → reset Unit
 *   - Tự fill `topic` (label đơn vị KT), `chapter`, `lesson` về form
 *
 * Dùng khi GV tạo/sửa câu hỏi trong QuestionBank để đảm bảo metadata
 * thống nhất → search/filter chính xác hơn nhiều so với tự gõ.
 */
import { useMemo } from 'react'
import { ChevronRight, FolderTree } from 'lucide-react'
import {
  getChapters, getLessons, getUnits,
  type Chapter, type Lesson, type KnowledgeUnit,
} from '@/lib/knowledge-units-catalog'

interface Props {
  subject: string
  grade: string                // "Khối 10" / "Khối 11" / ... — sẽ parse số
  chapter: string              // chapter code (VD: "VL-G11-CH1")
  lesson: string               // lesson code
  unitCode?: string            // knowledge unit code (optional)
  onChange: (v: {
    chapter: string
    lesson: string
    unitCode?: string
    topic: string             // label của đơn vị KT (hoặc bài) để fill vào form
  }) => void
}

function gradeNumber(g: string): number {
  const m = g.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

export function KnowledgeUnitPicker({
  subject, grade, chapter, lesson, unitCode, onChange,
}: Props) {
  const gNum = gradeNumber(grade)

  const chapters: Chapter[] = useMemo(
    () => getChapters(subject, gNum),
    [subject, gNum]
  )
  const lessons: Lesson[] = useMemo(
    () => chapter ? getLessons(subject, gNum, chapter) : [],
    [subject, gNum, chapter]
  )
  const units: KnowledgeUnit[] = useMemo(
    () => (chapter && lesson) ? getUnits(subject, gNum, chapter, lesson) : [],
    [subject, gNum, chapter, lesson]
  )

  const hasCatalog = chapters.length > 0

  if (!hasCatalog) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground bg-muted/30">
        <div className="flex items-start gap-2">
          <FolderTree className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground/85">Chưa có danh mục cho {subject} {grade}</p>
            <p className="mt-0.5">Có thể bổ sung tại <code className="px-1 rounded bg-muted">src/lib/knowledge-units-catalog.ts</code> hoặc dùng ô "Chủ đề" bên dưới để gõ tay.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
        <FolderTree className="w-3.5 h-3.5" />
        <span>Danh mục đơn vị kiến thức</span>
        <span className="text-muted-foreground font-normal ml-1">(theo Bộ GD&ĐT 2018)</span>
      </div>

      {/* Cascade row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Chapter */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Chương
          </label>
          <select
            value={chapter}
            onChange={e => {
              const newChapter = e.target.value
              onChange({ chapter: newChapter, lesson: '', unitCode: '', topic: '' })
            }}
            className="w-full px-2.5 py-2 border rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">— Chọn chương —</option>
            {chapters.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Lesson */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Bài
          </label>
          <select
            value={lesson}
            onChange={e => {
              const newLesson = e.target.value
              const les = lessons.find(l => l.code === newLesson)
              onChange({
                chapter,
                lesson: newLesson,
                unitCode: '',
                topic: les?.label ?? '',
              })
            }}
            disabled={!chapter}
            className="w-full px-2.5 py-2 border rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{chapter ? '— Chọn bài —' : '(Chọn chương trước)'}</option>
            {lessons.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Knowledge Unit (optional) */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Đơn vị KT <span className="font-normal normal-case">(tuỳ chọn)</span>
          </label>
          <select
            value={unitCode ?? ''}
            onChange={e => {
              const u = units.find(x => x.code === e.target.value)
              const les = lessons.find(l => l.code === lesson)
              onChange({
                chapter,
                lesson,
                unitCode: u?.code,
                topic: u?.label ?? les?.label ?? '',
              })
            }}
            disabled={!lesson || units.length === 0}
            className="w-full px-2.5 py-2 border rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {!lesson
                ? '(Chọn bài trước)'
                : units.length === 0
                  ? '(Bài này chưa có đơn vị KT)'
                  : '— Chọn đơn vị KT —'}
            </option>
            {units.map(u => (
              <option key={u.code} value={u.code}>
                {u.label}
                {u.bloom ? ` · ${u.bloom}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Breadcrumb preview */}
      {(chapter || lesson || unitCode) && (
        <div className="flex items-center gap-1 flex-wrap pt-1 border-t text-[11px] text-muted-foreground">
          <span className="font-semibold">Đường dẫn:</span>
          <span className="text-foreground/85">{subject} {grade}</span>
          {chapter && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground/85">{chapters.find(c => c.code === chapter)?.label}</span>
            </>
          )}
          {lesson && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground/85">{lessons.find(l => l.code === lesson)?.label}</span>
            </>
          )}
          {unitCode && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                {units.find(u => u.code === unitCode)?.label}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default KnowledgeUnitPicker
