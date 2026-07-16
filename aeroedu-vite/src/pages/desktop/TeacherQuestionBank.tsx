/** 2g — Giáo viên · Ngân hàng câu hỏi & Tạo đề thi AI */
import { CSSProperties } from 'react'
import { C, ContentColumn, DesktopWindow, GhostBtn, Pill } from './ui'
import { teacherSidebar } from './sidebars'

const cardBox: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12 }

const subjectPills = [
  { label: 'Vật lí · 12', active: true },
  { label: 'Toán' }, { label: 'Hoá học' }, { label: 'Sinh học' }, { label: 'Tiếng Anh' },
]

const matrix = [
  { label: 'Nhận biết', v: '8/12', pct: 67, bar: 'linear-gradient(90deg,#34d399,#14b8a6)', fg: C.green },
  { label: 'Thông hiểu', v: '6/14', pct: 43, bar: 'linear-gradient(90deg,#60a5fa,#6366f1)', fg: C.blue },
  { label: 'Vận dụng', v: '3/10', pct: 30, bar: 'linear-gradient(90deg,#fbbf24,#f59e0b)', fg: C.amber },
  { label: 'Vận dụng cao', v: '1/4', pct: 25, bar: 'linear-gradient(90deg,#fb7185,#f43f5e)', fg: C.pink },
]

export default function DesktopTeacherQuestionBank() {
  return (
    <DesktopWindow sidebar={teacherSidebar('question-bank')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Ngân hàng câu hỏi</span>
            <span style={{ fontSize: 11, color: C.t40 }}>2,847 câu · 12 môn</span>
            <span style={{ flex: 1 }} />
            <GhostBtn>⇪ Nhập từ file</GhostBtn>
            <span style={{ height: 30, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.1)', display: 'inline-flex', alignItems: 'center', gap: 7, color: C.violetLt, fontSize: 12, fontWeight: 600 }}>✦ Sinh câu hỏi AI</span>
            <span style={{ height: 30, padding: '0 14px', borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', gap: 7, color: '#fff', fontSize: 12, fontWeight: 600, boxShadow: '0 0 18px rgba(124,58,237,0.35)' }}>🪄 Tạo đề thi</span>
          </>
        }
      >
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {/* filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {subjectPills.map((s, i) => (
              <span key={i} style={{ height: 30, padding: '0 14px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', fontSize: 11.5, ...(s.active ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: C.violetLt, fontWeight: 600 } : { border: '1px solid rgba(255,255,255,0.08)', color: C.t50 }) }}>{s.label}</span>
            ))}
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
            <DropPill>Chương: Sóng cơ ▾</DropPill>
            <DropPill>Loại: Tất cả ▾</DropPill>
            <DropPill>Độ khó: Tất cả ▾</DropPill>
            <span style={{ flex: 1 }} />
            <span style={{ width: 230, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: 11.5, color: C.t35 }}>Tìm trong 412 câu Vật lí…</span>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, minHeight: 0 }}>
            {/* question list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              {/* Q1 — selected MCQ */}
              <div style={{ border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.05)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.t90, lineHeight: 1.6 }}>Một sóng cơ truyền dọc theo trục Ox với phương trình u = 4cos(20πt − πx/2) (mm). Tốc độ truyền sóng là:</span>
                  <Pill fg={C.amber} bg="rgba(251,191,36,0.15)" style={{ flexShrink: 0 }}>Trung bình</Pill>
                  <Pill fg={C.violet} bg="rgba(124,58,237,0.15)" style={{ flexShrink: 0 }}>✦ AI</Pill>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, paddingLeft: 26 }}>
                  <Opt>A. 20 m/s</Opt>
                  <Opt correct>B. 40 m/s ✓</Opt>
                  <Opt>C. 10 m/s</Opt>
                  <Opt>D. 80 m/s</Opt>
                </div>
                <QFoot meta="Sóng cơ · Bài 8 · dùng trong 3 đề" actions={['✎ Sửa', '⧉ Nhân bản']} />
              </div>

              {/* Q2 — true/false */}
              <div style={{ ...cardBox, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ flex: 1, fontSize: 13, color: C.t85, lineHeight: 1.6 }}>Trong thí nghiệm giao thoa sóng trên mặt nước, hai nguồn kết hợp A, B dao động cùng pha. Xét các phát biểu sau (Đúng/Sai):</span>
                  <Pill fg={C.pink} bg="rgba(251,113,133,0.15)" style={{ flexShrink: 0 }}>Khó</Pill>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 26 }}>
                  <span style={{ fontSize: 11.5, color: C.t60 }}>a) Trung điểm AB luôn là cực đại giao thoa <span style={{ color: C.green, fontWeight: 700 }}>Đ</span></span>
                  <span style={{ fontSize: 11.5, color: C.t60 }}>b) Số cực đại trên AB luôn là số lẻ <span style={{ color: C.green, fontWeight: 700 }}>Đ</span></span>
                  <span style={{ fontSize: 11.5, color: C.t60 }}>c) Khoảng cách giữa 2 cực đại liền kề là λ <span style={{ color: C.pink, fontWeight: 700 }}>S</span></span>
                </div>
                <QFoot meta="Đúng/Sai nhiều ý · Giao thoa sóng · Bài 8" actions={['✎ Sửa', '⧉ Nhân bản']} />
              </div>

              {/* Q3 — short answer */}
              <div style={{ ...cardBox, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ flex: 1, fontSize: 13, color: C.t85, lineHeight: 1.6 }}>Sóng dừng trên dây dài 1,2 m với hai đầu cố định, có 4 bụng sóng. Bước sóng bằng bao nhiêu? (Trả lời ngắn)</span>
                  <Pill fg={C.green} bg="rgba(52,211,153,0.15)" style={{ flexShrink: 0 }}>Dễ</Pill>
                </div>
                <QFoot meta="Trả lời ngắn · Đáp án: 0,6 m · Sóng dừng · Bài 9" actions={[]} />
              </div>
            </div>

            {/* exam composer */}
            <div style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'linear-gradient(170deg,rgba(124,58,237,0.08),rgba(255,255,255,0.015) 40%)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '15px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 14 }}>🪄</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.t90 }}>Đề đang soạn — Giữa kỳ 2</span>
                  <span style={{ display: 'block', fontSize: 10, color: C.t40 }}>Theo ma trận: 40 câu · 90 phút</span>
                </span>
                <Pill fg={C.violetLt} bg="rgba(124,58,237,0.2)" style={{ padding: '3px 8px' }}>18/40 câu</Pill>
              </div>
              <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {matrix.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: C.t60 }}>{m.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.fg }}>{m.v}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', width: `${m.pct}%`, height: '100%', background: m.bar }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 4, borderRadius: 10, border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.07)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: C.t65, lineHeight: 1.6 }}>✦ AI: còn thiếu <b style={{ color: C.amber }}>7 câu Vận dụng</b> chương Sóng cơ. Để AI tự sinh theo ma trận và độ khó còn thiếu?</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <span style={{ flex: 1, height: 28, borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>✦ Sinh 7 câu còn thiếu</span>
                    <span style={{ height: 28, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', color: C.t60, fontSize: 11 }}>Chọn tay</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
                <span style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.t65, fontSize: 11.5 }}>Xem trước PDF</span>
                <span style={{ flex: 1, height: 32, borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11.5, fontWeight: 600, boxShadow: '0 0 16px rgba(124,58,237,0.3)' }}>Xuất đề + 4 mã</span>
              </div>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function DropPill({ children }: { children: React.ReactNode }) {
  return <span style={{ height: 30, padding: '0 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.08)', color: C.t55, fontSize: 11.5 }}>{children}</span>
}

function Opt({ children, correct }: { children: React.ReactNode; correct?: boolean }) {
  return <span style={{ fontSize: 11.5, padding: '7px 11px', borderRadius: 8, ...(correct ? { border: '1px solid rgba(52,211,153,0.45)', background: 'rgba(52,211,153,0.08)', color: C.green, fontWeight: 600 } : { border: '1px solid rgba(255,255,255,0.07)', color: C.t60 }) }}>{children}</span>
}

function QFoot({ meta, actions }: { meta: string; actions: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingLeft: 26, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: C.t35 }}>{meta}</span>
      <span style={{ flex: 1 }} />
      {actions.map((a, i) => (
        <span key={i} style={{ fontSize: 10.5, color: C.t50 }}>{a}</span>
      ))}
      <span style={{ fontSize: 10.5, color: C.violet, fontWeight: 600 }}>+ Thêm vào đề</span>
    </div>
  )
}
