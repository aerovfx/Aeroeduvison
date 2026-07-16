/** 2e — Học sinh · Cài đặt */
import { CSSProperties } from 'react'
import { C, ContentColumn, DesktopWindow } from './ui'
import { studentSidebar } from './sidebars'

const cardBox: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12 }

const settingsNav = [
  'Giao diện & Ngôn ngữ', 'Hồ sơ cá nhân', 'Thông báo', 'Gia sư AI & Quyền riêng tư',
  'Dữ liệu & Offline', 'Bảo mật & 2FA', 'Phím tắt',
]

const toggles = [
  { title: 'Hiệu ứng glassmorphism & glow', sub: 'Tắt nếu máy yếu để tăng hiệu năng', on: true },
  { title: 'Nhạc nền tập trung khi làm bài', sub: 'Lo-fi tự động khi vào phòng thi', on: false },
  { title: 'Giám sát tư thế ngồi (AI camera)', sub: 'Nhắc nhở khi ngồi sai tư thế > 5 phút', on: true },
  { title: 'Tải bài học để dùng offline', sub: 'Tự động tải khóa đang học qua Wi-Fi · đã dùng 1.2 GB', on: true },
]

export default function DesktopStudentSettings() {
  return (
    <DesktopWindow sidebar={studentSidebar('settings')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Cài đặt</span>
            <span style={{ flex: 1 }} />
            <span style={{ height: 30, padding: '0 16px', borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>Lưu thay đổi</span>
          </>
        }
      >
        <div style={{ flex: 1, padding: '22px 24px', display: 'flex', gap: 20, minHeight: 0 }}>
          {/* settings nav */}
          <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {settingsNav.map((s, i) => (
              <span key={i} style={{ padding: '9px 12px', borderRadius: 9, fontSize: 12.5, ...(i === 0 ? { background: 'rgba(124,58,237,0.12)', color: C.violet, fontWeight: 600 } : { color: C.t55 }) }}>{s}</span>
            ))}
          </div>

          {/* form */}
          <div style={{ flex: 1, maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
            <div style={{ ...cardBox, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t85, marginBottom: 14 }}>Chủ đề giao diện</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ border: '1.5px solid #7c3aed', borderRadius: 11, padding: 10, background: 'rgba(124,58,237,0.06)', boxShadow: '0 0 16px rgba(124,58,237,0.15)' }}>
                  <div style={{ height: 64, borderRadius: 7, background: '#0c0d14', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, padding: 8, display: 'flex', gap: 5 }}>
                    <span style={{ width: 18, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ flex: 1, borderRadius: 3, background: 'rgba(124,58,237,0.2)' }} />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: C.violetLt, textAlign: 'center' }}>Dark ✓</div>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: 10 }}>
                  <div style={{ height: 64, borderRadius: 7, background: '#f4f6fa', marginBottom: 8, padding: 8, display: 'flex', gap: 5 }}>
                    <span style={{ width: 18, borderRadius: 3, background: 'rgba(0,0,0,0.08)' }} />
                    <span style={{ flex: 1, borderRadius: 3, background: 'rgba(124,58,237,0.15)' }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: C.t50, textAlign: 'center' }}>Light</div>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: 10 }}>
                  <div style={{ height: 64, borderRadius: 7, background: 'linear-gradient(100deg,#0c0d14 50%,#f4f6fa 50%)', marginBottom: 8 }} />
                  <div style={{ fontSize: 11.5, color: C.t50, textAlign: 'center' }}>Theo hệ thống</div>
                </div>
              </div>
            </div>

            <div style={{ ...cardBox, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t85, marginBottom: 14 }}>Ngôn ngữ</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ flex: 1, border: '1.5px solid #7c3aed', borderRadius: 10, padding: '12px 14px', background: 'rgba(124,58,237,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🇻🇳</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.t90 }}>Tiếng Việt</span>
                    <span style={{ display: 'block', fontSize: 10, color: C.t40 }}>Mặc định</span>
                  </span>
                  <span style={{ color: C.violet, fontSize: 13 }}>✓</span>
                </span>
                <span style={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🇬🇧</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 12.5, color: C.t70 }}>English</span>
                    <span style={{ display: 'block', fontSize: 10, color: C.t35 }}>Song ngữ khả dụng</span>
                  </span>
                </span>
              </div>
            </div>

            <div style={{ ...cardBox, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t85 }}>Trải nghiệm học</div>
              {toggles.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 12.5, color: C.t85 }}>{t.title}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: C.t40 }}>{t.sub}</span>
                  </span>
                  <Toggle on={t.on} />
                </div>
              ))}
            </div>
          </div>

          {/* preview column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'linear-gradient(160deg,rgba(124,58,237,0.1),rgba(59,130,246,0.05))', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.t85, marginBottom: 8 }}>✦ Gia sư AI — mức cá nhân hóa</div>
              <div style={{ fontSize: 11, color: C.t50, lineHeight: 1.6, marginBottom: 12 }}>AI dùng lịch sử học + cảm xúc để gợi ý. Bạn kiểm soát dữ liệu nào được dùng.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CheckRow checked label="Lịch sử làm bài & điểm số" />
                <CheckRow checked label="Thời gian & nhịp học" />
                <CheckRow label="Dữ liệu cảm xúc từ camera" />
              </div>
            </div>

            <div style={{ ...cardBox, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.t85, marginBottom: 10 }}>Đồng bộ & lưu trữ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                <span style={{ fontSize: 11.5, color: C.t65 }}>Đã đồng bộ 2 phút trước</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 6 }}>
                <span style={{ display: 'block', width: '24%', height: '100%', background: 'linear-gradient(90deg,#7c3aed,#3b82f6)' }} />
              </div>
              <div style={{ fontSize: 10.5, color: C.t40 }}>1.2 GB / 5 GB bộ nhớ offline</div>
            </div>

            <div style={{ ...cardBox, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.t85, marginBottom: 10 }}>Phím tắt hay dùng</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ShortcutRow label="Bảng lệnh nhanh" keys="⌘K" />
                <ShortcutRow label="Hỏi Gia sư AI" keys="⌘J" />
                <ShortcutRow label="Ghi chú nhanh" keys="⌘⇧N" />
              </div>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{ width: 40, height: 22, borderRadius: 99, background: on ? C.purple : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 18, height: 18, borderRadius: '50%', background: on ? '#fff' : 'rgba(255,255,255,0.6)' } as CSSProperties} />
    </span>
  )
}

function CheckRow({ checked, label }: { checked?: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      {checked ? (
        <span style={{ width: 14, height: 14, borderRadius: 4, background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9 }}>✓</span>
      ) : (
        <span style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)' }} />
      )}
      <span style={{ fontSize: 11, color: checked ? C.t70 : C.t50 }}>{label}</span>
    </div>
  )
}

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ flex: 1, fontSize: 11, color: C.t55 }}>{label}</span>
      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.07)', color: C.t60 }}>{keys}</span>
    </div>
  )
}
