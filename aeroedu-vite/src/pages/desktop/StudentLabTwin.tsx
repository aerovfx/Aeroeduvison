/** 2c — Học sinh · LabTwin (phòng thí nghiệm ảo) */
import { CSSProperties, ReactNode } from 'react'
import { C, ContentColumn, DesktopWindow, GLOW_TEAL, GhostBtn, Pill, PrimaryBtn } from './ui'
import { studentSidebar } from './sidebars'

const cardBox: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12 }

const catalog = [
  { emoji: '⚗️', title: 'Chuẩn độ axit–bazơ', meta: 'Hóa học · 25 phút', foot: 'Đã làm 2 lần · 9.0đ', footColor: C.green },
  { emoji: '🧲', title: 'Cảm ứng điện từ', meta: 'Vật lý · 30 phút', foot: 'Chưa hoàn thành', footColor: C.amber },
  { emoji: '🔌', title: 'Mạch RLC nối tiếp', meta: 'Vật lý · 35 phút', foot: 'Mới', footColor: C.t35 },
  { emoji: '🧬', title: 'Quan sát nguyên phân', meta: 'Sinh học · 20 phút', foot: 'Mới', footColor: C.t35 },
]

const steps = [
  { n: '✓', label: 'Lắp đèn phóng điện Hydro', done: true },
  { n: '✓', label: 'Căn chỉnh chuẩn trực', done: true },
  { n: '3', label: 'Điều chỉnh khe hẹp, quan sát Hα', current: true },
  { n: '4', label: 'Đo góc lệch từng vạch' },
  { n: '5', label: 'Tính bước sóng theo cách tử' },
  { n: '6', label: 'So sánh với lý thuyết Rydberg' },
  { n: '7', label: 'Xuất báo cáo thí nghiệm' },
]

export default function DesktopStudentLabTwin() {
  return (
    <DesktopWindow sidebar={studentSidebar('labtwin')} glow={GLOW_TEAL}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>LabTwin — Phòng thí nghiệm ảo</span>
            <Pill fg={C.green} bg="rgba(52,211,153,0.15)" style={{ padding: '3px 8px' }}>Digital Twin</Pill>
            <span style={{ flex: 1 }} />
            <GhostBtn>🎥 Xem lại phiên trước</GhostBtn>
            <PrimaryBtn>+ Phiên lab mới</PrimaryBtn>
          </>
        }
      >
        <div style={{ flex: 1, padding: '22px 24px', display: 'flex', gap: 16, minHeight: 0 }}>
          {/* left: viewport + catalog */}
          <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{ flex: 1.4, borderRadius: 14, border: '1px solid rgba(52,211,153,0.2)', background: 'linear-gradient(160deg,rgba(6,40,35,0.9),rgba(10,14,22,0.95))', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 400px 260px at 60% 40%, rgba(52,211,153,0.14) 0%, transparent 70%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-60%)', textAlign: 'center' }}>
                <div style={{ fontSize: 64, filter: 'drop-shadow(0 0 30px rgba(52,211,153,0.4))' }}>🔬</div>
                <div style={{ fontSize: 10.5, color: C.t35, marginTop: 6 }}>[ Khung nhìn 3D — mô hình quang phổ kế ]</div>
              </div>
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(52,211,153,0.2)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.35)' }}>ĐANG CHẠY</span>
                <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(0,0,0,0.4)', color: C.t60 }}>Vật lý · Chương 6</span>
              </div>
              <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
                <ViewportBtn>⟲</ViewportBtn>
                <ViewportBtn>⛶</ViewportBtn>
                <ViewportBtn small>AR</ViewportBtn>
              </div>
              <div style={{ position: 'relative', padding: '16px 18px', background: 'linear-gradient(180deg,transparent,rgba(0,0,0,0.55))', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>Thí nghiệm: Quang phổ vạch phát xạ Hydro</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: C.t50 }}>Bước 3/7 — Điều chỉnh khe hẹp và quan sát vạch Hα · nhóm 3 người đang trong phiên</span>
                </span>
                <span style={{ display: 'flex' }}>
                  <Avatar grad="linear-gradient(135deg,#f59e0b,#f97316)">TL</Avatar>
                  <Avatar grad="linear-gradient(135deg,#10b981,#14b8a6)" overlap>HP</Avatar>
                  <Avatar grad="linear-gradient(135deg,#7c3aed,#3b82f6)" overlap>MA</Avatar>
                </span>
                <span style={{ height: 34, padding: '0 18px', borderRadius: 9, background: C.greenDeep, display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 12.5, fontWeight: 600, boxShadow: '0 0 20px rgba(16,185,129,0.35)' }}>▶ Tiếp tục phiên</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, minHeight: 0 }}>
              {catalog.map((c, i) => (
                <div key={i} style={{ ...cardBox, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{c.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.t88 }}>{c.title}</span>
                  <span style={{ fontSize: 10, color: C.t35 }}>{c.meta}</span>
                  <span style={{ marginTop: 'auto', fontSize: 10, fontWeight: 700, color: c.footColor }}>{c.foot}</span>
                </div>
              ))}
            </div>
          </div>

          {/* right: instruments */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            <div style={{ ...cardBox, padding: 16 }}>
              <PanelTitle>Thông số đo — trực tiếp</PanelTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Metric label="Bước sóng Hα" val="656.3" unit="nm" color={C.green} bg="rgba(52,211,153,0.06)" bd="rgba(52,211,153,0.15)" />
                <Metric label="Hβ" val="486.1" unit="nm" color={C.blue} bg="rgba(96,165,250,0.06)" bd="rgba(96,165,250,0.15)" />
                <Metric label="Hγ" val="434.0" unit="nm" color={C.violet} bg="rgba(167,139,250,0.06)" bd="rgba(167,139,250,0.15)" />
                <Metric label="Sai số" val="±0.4%" color={C.t75} bg={C.surface} bd={C.border} />
              </div>
              <div style={{ marginTop: 12, height: 44, borderRadius: 8, background: '#05070b', border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 0, bottom: 0, left: '18%', width: 3, background: C.violet, boxShadow: `0 0 8px ${C.violet}` }} />
                <span style={{ position: 'absolute', top: 0, bottom: 0, left: '34%', width: 3, background: C.blue, boxShadow: `0 0 8px ${C.blue}` }} />
                <span style={{ position: 'absolute', top: 0, bottom: 0, left: '72%', width: 4, background: '#f87171', boxShadow: '0 0 10px #f87171' }} />
                <span style={{ position: 'absolute', bottom: 3, right: 6, fontSize: 8.5, color: C.t30 }}>quang phổ vạch H</span>
              </div>
            </div>

            <div style={{ ...cardBox, padding: 16, flex: 1 }}>
              <PanelTitle>Các bước thí nghiệm</PanelTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                    <span style={stepDot(s)}>{s.n}</span>
                    <span style={{ fontSize: 11.5, ...(s.done ? { color: C.t40, textDecoration: 'line-through' } : s.current ? { color: C.t90, fontWeight: 600 } : { color: C.t50 }) }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'linear-gradient(160deg,rgba(124,58,237,0.12),rgba(59,130,246,0.06))', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>✦</span>
              <span style={{ fontSize: 11, color: C.t65, lineHeight: 1.5 }}>Gia sư AI: "Vạch đỏ bạn thấy chính là Hα — electron nhảy từ n=3 về n=2."</span>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function stepDot(s: { done?: boolean; current?: boolean }): CSSProperties {
  const base: CSSProperties = { width: 18, height: 18, borderRadius: '50%', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  if (s.done) return { ...base, background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.5)', color: C.green }
  if (s.current) return { ...base, background: 'rgba(124,58,237,0.25)', border: '1px solid #7c3aed', color: C.violetLt, fontWeight: 700 }
  return { ...base, border: '1px solid rgba(255,255,255,0.15)', color: C.t35 }
}

function ViewportBtn({ children, small }: { children: ReactNode; small?: boolean }) {
  return <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.t60, fontSize: small ? 11 : 12 }}>{children}</span>
}

function Avatar({ children, grad, overlap }: { children: ReactNode; grad: string; overlap?: boolean }) {
  return <span style={{ width: 26, height: 26, borderRadius: '50%', background: grad, border: '2px solid #0c0d14', marginLeft: overlap ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>{children}</span>
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.t35, marginBottom: 12 }}>{children}</div>
}

function Metric({ label, val, unit, color, bg, bd }: { label: string; val: string; unit?: string; color: string; bg: string; bd: string }) {
  return (
    <div style={{ borderRadius: 9, padding: '11px 12px', background: bg, border: `1px solid ${bd}` }}>
      <span style={{ display: 'block', fontSize: 9.5, color: C.t40 }}>{label}</span>
      <span style={{ display: 'block', fontSize: 17, fontWeight: 700, color }}>{val}{unit && <span style={{ fontSize: 10 }}> {unit}</span>}</span>
    </div>
  )
}
