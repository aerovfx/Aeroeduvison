/**
 * TeacherScrumboard — /teacher/scrumboard
 *
 * Kanban board công việc giảng dạy: kéo thả task giữa các cột
 * Cần làm → Đang thực hiện → Chờ duyệt → Hoàn thành.
 *
 * Subjects: 7 nhóm công việc đặc thù của GV
 *   (Soạn bài / Chấm bài / Quản lý lớp / Họp / Báo cáo / Đào tạo / Khác)
 *
 * Storage: localStorage key 'inphysic_scrumboard_teacher_v1' (tách hoàn toàn
 * khỏi student board, mỗi GV có dữ liệu riêng theo browser).
 */
import {
  BookOpen, ClipboardCheck, Users, MessageCircle, FileBarChart,
  GraduationCap, MoreHorizontal,
} from 'lucide-react'
import ScrumboardCore, {
  type ScrumboardConfig, type Task, type ColKey,
} from '@/components/scrumboard/ScrumboardCore'

const TEACHER_SUBJECTS = [
  { key: 'lesson-plan', label: 'Soạn bài',     icon: <BookOpen        className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
  { key: 'grading',     label: 'Chấm bài',     icon: <ClipboardCheck  className="w-3.5 h-3.5" />, color: 'text-rose-400' },
  { key: 'class-mgmt',  label: 'Quản lý lớp',  icon: <Users           className="w-3.5 h-3.5" />, color: 'text-violet-400' },
  { key: 'meeting',     label: 'Họp / Sinh hoạt', icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-blue-400' },
  { key: 'report',      label: 'Báo cáo',      icon: <FileBarChart    className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  { key: 'training',    label: 'Bồi dưỡng',    icon: <GraduationCap   className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  { key: 'other',       label: 'Khác',         icon: <MoreHorizontal  className="w-3.5 h-3.5" />, color: 'text-white/40' },
]

const TEACHER_COLS = [
  { key: 'todo'       as ColKey, title: 'Cần làm',         color: 'border-t-white/20',    accent: 'text-white/50' },
  { key: 'inprogress' as ColKey, title: 'Đang thực hiện',  color: 'border-t-blue-500',    accent: 'text-blue-400' },
  { key: 'review'     as ColKey, title: 'Chờ duyệt',       color: 'border-t-amber-500',   accent: 'text-amber-400' },
  { key: 'done'       as ColKey, title: 'Hoàn thành ✓',    color: 'border-t-emerald-500', accent: 'text-emerald-400' },
]

const NOW = new Date().toISOString()
const TEACHER_DEMO: Record<ColKey, Task[]> = {
  todo: [
    { id: 'tt1', title: 'Soạn giáo án bài Động lượng — lớp 10A1', desc: 'Theo CV2345, 4 tiết, có công thức + bài tập áp dụng', subject: 'lesson-plan', priority: 'high',   dueDate: '', tags: ['lớp-10a1', 'tuần-4'],   xp: 200, createdAt: NOW },
    { id: 'tt2', title: 'Chấm 42 bài kiểm tra giữa kỳ — lớp 11B2', desc: 'Sử dụng OCR + AI grading qua /teacher/exam-grading',    subject: 'grading',     priority: 'high',   dueDate: '', tags: ['gấp', 'lớp-11b2'],     xp: 250, createdAt: NOW },
    { id: 'tt3', title: 'Chuẩn bị PowerPoint chương Sóng cơ',     desc: '',                                                       subject: 'lesson-plan', priority: 'medium', dueDate: '', tags: ['lớp-12'],              xp: 150, createdAt: NOW },
    { id: 'tt4', title: 'Báo cáo tiến độ chương trình tháng',      desc: 'Gửi tổ trưởng qua email trước thứ 6',                    subject: 'report',      priority: 'medium', dueDate: '', tags: ['hành-chính'],          xp: 100, createdAt: NOW },
  ],
  inprogress: [
    { id: 'tt5', title: 'Theo dõi nhóm học sinh yếu lớp 10A1',    desc: 'Liên hệ phụ huynh + lên lộ trình phụ đạo',               subject: 'class-mgmt',  priority: 'high',   dueDate: '', tags: ['hỗ-trợ'],              xp: 180, createdAt: NOW },
    { id: 'tt6', title: 'Soạn ma trận đề kiểm tra cuối kỳ I',      desc: 'Dùng /teacher/exam-matrix — phân bổ 16 MCQ + 2 TL',     subject: 'lesson-plan', priority: 'high',   dueDate: '', tags: ['cuối-kỳ'],             xp: 220, createdAt: NOW },
  ],
  review: [
    { id: 'tt7', title: 'Đề kiểm tra 15 phút — chương Cơ học',    desc: 'Đã soạn xong, chờ tổ trưởng duyệt',                      subject: 'lesson-plan', priority: 'medium', dueDate: '', tags: ['chờ-tổ-trưởng'],       xp: 130, createdAt: NOW },
  ],
  done: [
    { id: 'tt8', title: 'Họp tổ chuyên môn tuần 3',                desc: 'Đã tham dự, lấy biên bản',                                subject: 'meeting',     priority: 'medium', dueDate: '', tags: ['xong'],                xp: 80,  createdAt: NOW },
    { id: 'tt9', title: 'Tham gia tập huấn AI giáo dục',           desc: 'Nhận chứng chỉ + áp dụng vào lớp',                       subject: 'training',    priority: 'low',    dueDate: '', tags: ['tập-huấn', 'AI'],      xp: 120, createdAt: NOW },
  ],
}

const CONFIG: ScrumboardConfig = {
  storageKey: 'inphysic_scrumboard_teacher_v1',
  pageTitle: 'Scrumboard giảng dạy',
  pageSubtitle: 'Lên kế hoạch công việc của bạn — kéo thả task giữa các cột',
  subjects: TEACHER_SUBJECTS,
  cols: TEACHER_COLS,
  demo: TEACHER_DEMO,
  xpLabel: 'điểm',
}

export default function TeacherScrumboard() {
  return <ScrumboardCore config={CONFIG} />
}
