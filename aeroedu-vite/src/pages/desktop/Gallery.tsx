/**
 * Desktop Gallery — trang chỉ mục 9 màn hình desktop app (bộ UI standalone).
 * Route: /desktop
 */
import { Link } from 'react-router-dom'
import { C } from './ui'

type Item = { id: string; path: string; role: string; roleColor: string; title: string; emoji: string }

const items: Item[] = [
  { id: '2a', path: '/desktop/student/tutor', role: 'Học sinh', roleColor: C.violet, title: 'Gia sư AI', emoji: '✦' },
  { id: '2b', path: '/desktop/student/courses', role: 'Học sinh', roleColor: C.violet, title: 'Khóa học của tôi (LMS)', emoji: '⚛️' },
  { id: '2c', path: '/desktop/student/labtwin', role: 'Học sinh', roleColor: C.violet, title: 'LabTwin — Lab ảo', emoji: '🔬' },
  { id: '2d', path: '/desktop/student/analytics', role: 'Học sinh', roleColor: C.violet, title: 'Phân tích học tập', emoji: '📊' },
  { id: '2e', path: '/desktop/student/settings', role: 'Học sinh', roleColor: C.violet, title: 'Cài đặt', emoji: '⚙️' },
  { id: '2f', path: '/desktop/teacher/grading', role: 'Giáo viên', roleColor: C.amber, title: 'Chấm bài thi (OMR + AI)', emoji: '📝' },
  { id: '2g', path: '/desktop/teacher/question-bank', role: 'Giáo viên', roleColor: C.amber, title: 'Ngân hàng câu hỏi', emoji: '🪄' },
  { id: '3a', path: '/desktop/admin/users', role: 'Quản trị', roleColor: C.green, title: 'Quản lý người dùng', emoji: '👥' },
  { id: '2h', path: '/desktop/admin/overview', role: 'Quản trị', roleColor: C.green, title: 'Tổng quan hệ thống', emoji: '📡' },
]

export default function DesktopGallery() {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: C.fontStack, color: C.t85, padding: 48 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>A</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.t92 }}>AeroEdu Vision — Desktop App</div>
            <div style={{ fontSize: 13, color: C.t45 }}>Bộ 9 màn hình — dark glassmorphism · tím indigo</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 18 }}>
          {items.map((it) => (
            <Link
              key={it.id}
              to={it.path}
              style={{
                textDecoration: 'none',
                border: `1px solid ${C.borderStrong}`,
                background: C.screenBg,
                borderRadius: 14,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 320px 200px at 50% 0%, rgba(120,100,255,0.08) 0%, transparent 70%)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, borderRadius: 8, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.45)', color: C.violetLt, fontSize: 12, fontWeight: 700 }}>{it.id}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: it.roleColor }}>{it.role}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{it.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.t90 }}>{it.title}</span>
              </div>
              <span style={{ position: 'relative', fontSize: 12, fontWeight: 600, color: C.violet }}>Mở màn hình →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
