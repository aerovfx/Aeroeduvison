/** 2a — Học sinh · Gia sư AI (chat + ngữ cảnh bài học) */
import { CSSProperties, ReactNode } from 'react'
import { C, DesktopWindow } from './ui'
import { studentSidebar } from './sidebars'

const col: CSSProperties = { borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }

const convos = [
  { title: 'Tổng hợp dao động', snip: 'Biên độ tổng hợp: A² = A₁² + A₂²…', meta: 'Vật lý 12 · vừa xong', active: true },
  { title: 'Đạo hàm hàm hợp', snip: "Quy tắc chuỗi: (f∘g)' = f'(g)·g'…", meta: 'Toán · hôm qua' },
  { title: 'Debug vòng lặp Python', snip: 'IndexError: list index out of range…', meta: 'Programming · 2 ngày' },
  { title: 'Quang phổ vạch phát xạ', snip: 'Nguyên tử H phát ra bước sóng…', meta: 'Vật lý 12 · 3 ngày' },
]

export default function DesktopStudentTutor() {
  return (
    <DesktopWindow sidebar={studentSidebar('tutor')}>
      {/* conversation list */}
      <div style={{ ...col, width: 264, flexShrink: 0 }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.t90, flex: 1 }}>Hội thoại</span>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, boxShadow: '0 0 14px rgba(124,58,237,0.4)' }}>+</span>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
          {convos.map((c, i) => (
            <div key={i} style={{ borderRadius: 10, padding: '11px 12px', ...(c.active ? { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.28)' } : { border: '1px solid rgba(255,255,255,0.05)' }) }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.active ? C.t90 : C.t75, marginBottom: 2 }}>{c.title}</div>
              <div style={{ fontSize: 10.5, color: c.active ? C.t40 : C.t35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.snip}</div>
              <div style={{ fontSize: 9.5, color: c.active ? C.violet : C.t30, marginTop: 4 }}>{c.meta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 16px rgba(124,58,237,0.35)', fontSize: 14 }}>✦</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.t90 }}>Gia sư AI — Tổng hợp dao động</span>
            <span style={{ display: 'block', fontSize: 10, color: C.green }}>● Trực tuyến · hiểu ngữ cảnh bài đang học</span>
          </span>
          <span style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', color: C.t50 }}>Chế độ Socratic</span>
          <span style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 99, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: C.violet }}>Giải chi tiết</span>
        </div>

        <div style={{ flex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ alignSelf: 'center', fontSize: 10, color: C.t30, padding: '3px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.03)' }}>Hôm nay · 18:42</div>

          <UserBubble>Hai dao động cùng phương x₁ = 4cos(10t) cm và x₂ = 3cos(10t + π/2) cm. Tìm biên độ dao động tổng hợp?</UserBubble>

          <AiBubble>
            Trước khi mình giải, bạn thử nghĩ xem: hai dao động này lệch pha bao nhiêu? Δφ = π/2 nghĩa là gì về mặt hình học? 🤔
            <div style={{ marginTop: 10, borderRadius: 10, padding: '12px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.violet, marginBottom: 6 }}>GỢI Ý — CÔNG THỨC</div>
              <div style={{ fontSize: 14, color: C.violetLt, fontFamily: 'Georgia, serif' }}>A² = A₁² + A₂² + 2A₁A₂cos(Δφ)</div>
            </div>
          </AiBubble>

          <UserBubble>Vuông pha! Vậy cos(π/2) = 0 → A = √(16+9) = 5 cm đúng không?</UserBubble>

          <AiBubble>
            Chính xác! 🎉 <b style={{ color: C.green }}>A = 5 cm</b>. Bạn đã nắm được trường hợp vuông pha. <b style={{ color: C.violet }}>+15 XP</b> cho lần tự giải này.
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <ChipBtn primary>Làm 3 câu tương tự</ChipBtn>
              <ChipBtn>Xem đồ thị vector</ChipBtn>
              <ChipBtn>Lưu vào ghi chú</ChipBtn>
            </div>
          </AiBubble>
        </div>

        <div style={{ padding: '16px 26px 18px' }}>
          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', padding: '12px 14px' }}>
            <div style={{ fontSize: 13, color: C.t35, marginBottom: 10 }}>Hỏi tiếp, dán đề bài, hoặc kéo ảnh bài làm vào đây…</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InputIcon>📎</InputIcon>
              <InputIcon>🎤</InputIcon>
              <InputIcon small>ƒx</InputIcon>
              <span style={{ flex: 1 }} />
              <span style={{ height: 30, padding: '0 16px', borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', gap: 7, color: '#fff', fontSize: 12, fontWeight: 600, boxShadow: '0 0 16px rgba(124,58,237,0.35)' }}>Gửi ↵</span>
            </div>
          </div>
        </div>
      </div>

      {/* context panel */}
      <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.012)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
        <PanelCard>
          <PanelTitle>Ngữ cảnh đang học</PanelTitle>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,rgba(139,92,246,0.35),rgba(59,130,246,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚛️</span>
            <span>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.t90 }}>Vật lý 12 — Chương 1</span>
              <span style={{ display: 'block', fontSize: 10.5, color: C.t40 }}>Bài 3: Tổng hợp dao động</span>
            </span>
          </div>
        </PanelCard>

        <PanelCard>
          <PanelTitle>Lỗ hổng AI phát hiện</PanelTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <GapRow dot={C.pink} label="Giao thoa sóng" pct="42%" fg={C.pink} />
            <GapRow dot={C.amber} label="Tổng hợp dao động" pct="61%" fg={C.amber} />
            <GapRow dot={C.green} label="Con lắc lò xo" pct="88%" fg={C.green} />
          </div>
        </PanelCard>

        <div style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'linear-gradient(160deg,rgba(124,58,237,0.12),rgba(59,130,246,0.06))', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.t85, marginBottom: 8 }}>📐 Bảng công thức chương này</div>
          <div style={{ fontSize: 11, color: C.t50, lineHeight: 1.6 }}>x = Acos(ωt + φ) · T = 2π/ω · W = ½kA²</div>
          <span style={{ display: 'inline-flex', marginTop: 10, fontSize: 11, fontWeight: 600, color: C.violet }}>Mở toàn bộ →</span>
        </div>

        <div style={{ marginTop: 'auto', border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 11, color: C.t55 }}>Phiên học 24 phút · +65 XP hôm nay</span>
        </div>
      </div>
    </DesktopWindow>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '60%', borderRadius: '14px 14px 4px 14px', padding: '12px 15px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', fontSize: 13, color: C.t88, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}

function AiBubble({ children }: { children: ReactNode }) {
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '72%', display: 'flex', gap: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}>✦</span>
      <div style={{ borderRadius: '4px 14px 14px 14px', padding: '13px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  )
}

function ChipBtn({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <span style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, ...(primary ? { background: C.purple, color: '#fff', fontWeight: 600 } : { border: '1px solid rgba(255,255,255,0.12)', color: C.t60 }) }}>{children}</span>
  )
}

function InputIcon({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <span style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.t50, fontSize: small ? 12 : 13 }}>{children}</span>
  )
}

function PanelCard({ children }: { children: ReactNode }) {
  return <div style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12, padding: 16 }}>{children}</div>
}
function PanelTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.t35, marginBottom: 12 }}>{children}</div>
}
function GapRow({ dot, label, pct, fg }: { dot: string; label: string; pct: string; fg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
      <span style={{ flex: 1, fontSize: 11.5, color: C.t70 }}>{label}</span>
      <span style={{ fontSize: 10, color: fg, fontWeight: 700 }}>{pct}</span>
    </div>
  )
}
