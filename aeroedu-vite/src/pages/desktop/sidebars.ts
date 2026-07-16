/**
 * Dữ liệu sidebar cho 3 vai trò — Học sinh · Giáo viên · Quản trị.
 * Mỗi màn truyền `active` bằng cách gọi helper với id mục đang chọn.
 */
import { badge, NavBadge, SidebarModel } from './ui'

const c = badge

/* ── STUDENT ───────────────────────────────────────────────────── */
export function studentSidebar(active: string): SidebarModel {
  const on = (id: string) => id === active
  // 2e đổi nhóm cuối thành "Cài đặt / Trợ giúp"; các màn khác dùng "Labs & Công cụ"
  const settingsVariant = active === 'settings' || active === 'contacts'
  const learningTools = settingsVariant
    ? [
        { title: 'Cài đặt', items: [
          { label: 'Cài đặt', active: on('settings') },
          { label: 'Danh bạ', active: on('contacts') },
        ] },
        { title: 'Trợ giúp', items: [
          { label: 'Tài liệu' },
          { label: 'Tin tức' },
        ] },
      ]
    : [
        { title: 'Labs & Công cụ', items: [
          { label: 'LabTwin', active: on('labtwin'), badge: on('labtwin') ? { text: 'Lab', fg: '#6ee7b7', bg: 'rgba(52,211,153,0.2)' } as NavBadge : c.lab },
          { label: 'IoT Lab', badge: c.iot },
          { label: 'Dự án STEM', badge: c.stem },
          { label: 'Cây tri thức', badge: c.ai },
        ] },
      ]
  return {
    brandSub: 'Học sinh · Lớp 12A3',
    sections: [
      {
        title: 'Tổng quan',
        items: [
          { label: 'Bảng điều khiển', active: on('dashboard') },
          { label: 'Phân tích', active: on('analytics') },
          { label: 'Thành tích', active: on('achievements') },
        ],
      },
      {
        title: 'Học tập',
        items: [
          { label: 'Dành cho bạn', active: on('foryou'), badge: c.ai },
          { label: 'Gia sư AI', active: on('tutor') },
          { label: 'Khóa học của tôi', active: on('courses'), badge: on('courses') ? c.moi : c.lms },
          { label: 'Luyện thi', active: on('exam') },
          { label: 'Phòng thi', badge: c.live },
        ],
      },
      ...learningTools,
    ],
    user: {
      initials: 'MA',
      gradient: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
      name: 'Minh Anh',
      sub: 'Lv.8 · 13,210 XP',
    },
  }
}

/* ── TEACHER ───────────────────────────────────────────────────── */
export function teacherSidebar(active: string): SidebarModel {
  const on = (id: string) => id === active
  return {
    brandSub: 'Giáo viên · Vật lý',
    sections: [
      {
        title: 'Tổng quan',
        items: [
          { label: 'AI Dashboard', active: on('dashboard'), accent: true },
          { label: 'Sprint', badge: c.ai },
          { label: 'Quản lý lớp' },
          { label: 'Bản đồ cảm xúc' },
        ],
      },
      {
        title: 'Đề thi',
        items: [
          { label: 'Tạo đề thi AI', active: on('exam-ai'), accent: true },
          { label: 'Ma trận đề' },
          { label: 'Ngân hàng câu hỏi', active: on('question-bank') },
          { label: 'Phòng thi online' },
        ],
      },
      {
        title: 'Chấm điểm',
        items: [
          { label: 'Chấm bài thi', active: on('grading'), badge: on('grading') ? { text: 'AI', fg: '#c4b5fd', bg: 'rgba(124,58,237,0.2)' } as NavBadge : c.ai },
          { label: 'Báo cáo điểm thi' },
          { label: 'Sổ điểm' },
        ],
      },
      {
        title: 'Nội dung',
        items: [
          { label: 'Số hóa tài liệu', badge: c.ai },
          { label: 'Tài liệu LaTeX' },
          { label: 'Giáo án' },
        ],
      },
    ],
    user: {
      initials: 'TH',
      gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
      name: 'Trần Hoàng',
      sub: 'GV Vật lý · 4 lớp',
    },
  }
}

/* ── ADMIN ─────────────────────────────────────────────────────── */
export function adminSidebar(active: string): SidebarModel {
  const on = (id: string) => id === active
  const pay: NavBadge = {
    text: '3',
    fg: '#fda4af',
    bg: 'rgba(251,113,133,0.25)',
    count: true,
    border: '1px solid rgba(251,113,133,0.4)',
  }
  return {
    brandSub: 'Quản trị hệ thống',
    sections: [
      {
        title: 'Hệ thống',
        items: [
          { label: 'Tổng quan', active: on('overview') },
          { label: 'Phân tích', badge: c.live },
          { label: 'Insights', badge: c.ai },
          { label: 'Người dùng', active: on('users'), badge: on('users') ? c.moi : undefined },
          { label: 'Học sinh' },
          { label: 'Giáo viên' },
          { label: 'HS nguy cơ' },
        ],
      },
      {
        title: 'Giám sát',
        items: [
          { label: 'Camera lớp học', badge: c.live },
          { label: 'Thiết bị IoT', badge: c.hub },
          { label: 'Nội dung' },
        ],
      },
      {
        title: 'Vận hành',
        items: on('overview')
          ? [
              { label: 'Thanh toán', badge: pay },
              { label: 'Mô hình AI' },
              { label: 'Tích hợp API', badge: c.mcp },
              { label: 'Cài đặt hệ thống' },
            ]
          : [
              { label: 'Thanh toán', badge: pay },
              { label: 'Mô hình AI' },
              { label: 'Cài đặt hệ thống' },
            ],
      },
    ],
    user: {
      initials: 'QT',
      gradient: 'linear-gradient(135deg,#10b981,#0891b2)',
      name: 'Quản trị viên',
      sub: 'admin@aeroedu.vn',
    },
  }
}
