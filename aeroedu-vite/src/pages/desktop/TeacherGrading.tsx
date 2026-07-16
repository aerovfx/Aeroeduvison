/** 2f — Giáo viên · Chấm bài thi (OMR + AI) */
import { CSSProperties, ReactNode } from 'react'
import { C, ContentColumn, DesktopWindow, GhostBtn, Pill } from './ui'
import { teacherSidebar } from './sidebars'

const cardBox: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12 }

// bubble sheet: câu → chỉ số đáp án đã tô (0..3). -1 nghĩa chưa. câu 9 tô đôi (0,1)
const answers: { n: number; filled: number; dbl?: boolean }[] = [
  { n: 1, filled: 0 }, { n: 2, filled: 2 }, { n: 3, filled: 1 }, { n: 4, filled: 3 }, { n: 5, filled: 0 }, { n: 6, filled: 1 },
  { n: 7, filled: 2 }, { n: 8, filled: 0 }, { n: 9, filled: -1, dbl: true }, { n: 10, filled: 1 }, { n: 11, filled: 3 }, { n: 12, filled: 0 },
  { n: 13, filled: 1 }, { n: 14, filled: 2 }, { n: 15, filled: 0 }, { n: 16, filled: 1 }, { n: 17, filled: 2 }, { n: 18, filled: 0 },
]

type Result = {
  no: string; name: string; sbd: string; correct: string; score: string
  scoreColor: string; status: [string, string, string]; hl?: boolean
}

const results: Result[] = [
  { no: '01', name: 'Nguyễn An Khang', sbd: '120001', correct: '38/40', score: '9.5', scoreColor: C.green, status: ['✓ Hoàn tất', C.green, 'rgba(52,211,153,0.12)'] },
  { no: '02', name: 'Trần Thu Hà', sbd: '120002', correct: '35/40', score: '8.8', scoreColor: C.green, status: ['✓ Hoàn tất', C.green, 'rgba(52,211,153,0.12)'] },
  { no: '03', name: 'Nguyễn Văn Bình ←', sbd: '120034', correct: '—', score: '…', scoreColor: C.violet, status: ['Đang quét', C.violetLt, 'rgba(124,58,237,0.15)'], hl: true },
  { no: '04', name: 'Lê Minh Đức', sbd: '120004', correct: '29/40', score: '7.3', scoreColor: C.blue, status: ['✓ Hoàn tất', C.green, 'rgba(52,211,153,0.12)'] },
  { no: '05', name: 'Phạm Quỳnh Anh', sbd: '120005', correct: '31/40', score: '7.8', scoreColor: C.blue, status: ['⚠ Xem lại C9', C.amber, 'rgba(251,191,36,0.12)'] },
  { no: '06', name: 'Hoàng Gia Bảo', sbd: '120006', correct: '22/40', score: '5.5', scoreColor: C.amber, status: ['✓ Hoàn tất', C.green, 'rgba(52,211,153,0.12)'] },
  { no: '07', name: 'Vũ Hải Nam', sbd: '120007', correct: '17/40', score: '4.3', scoreColor: C.pink, status: ['Dưới TB', C.pink, 'rgba(251,113,133,0.12)'] },
]

const RGRID = '44px 1.4fr .8fr .6fr .6fr .8fr'

export default function DesktopTeacherGrading() {
  return (
    <DesktopWindow sidebar={teacherSidebar('grading')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Chấm bài thi — Giữa kỳ 2 · Vật lý 12A3</span>
            <Pill fg={C.violet} bg="rgba(124,58,237,0.15)" style={{ padding: '3px 8px' }}>Mã đề 132</Pill>
            <span style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{ padding: '6px 14px', fontSize: 11.5, background: 'rgba(124,58,237,0.15)', color: C.violetLt, fontWeight: 600 }}>Quét OMR</span>
              <span style={{ padding: '6px 14px', fontSize: 11.5, color: C.t50 }}>Chấm hàng loạt</span>
              <span style={{ padding: '6px 14px', fontSize: 11.5, color: C.t50 }}>Tự luận AI</span>
            </span>
            <GhostBtn>↓ Xuất Excel</GhostBtn>
          </>
        }
      >
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          {/* stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <Stat icon="✓" iconBg="rgba(52,211,153,0.12)" iconBd="rgba(52,211,153,0.2)" value="32/45" valueColor={C.green} label="Đã chấm xong" />
            <Stat icon="📊" iconBg="rgba(96,165,250,0.12)" iconBd="rgba(96,165,250,0.2)" value="7.2" valueColor={C.blue} label="Điểm trung bình" />
            <Stat icon="⚠️" iconBg="rgba(251,191,36,0.12)" iconBd="rgba(251,191,36,0.25)" value="5" valueColor={C.amber} label="Cần GV xem lại" warn />
            <Stat icon="✦" iconBg="rgba(124,58,237,0.12)" iconBd="rgba(124,58,237,0.25)" value="98.4%" valueColor={C.violet} label="Độ tin cậy OCR" />
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 16, minHeight: 0 }}>
            {/* scan preview */}
            <div style={{ ...cardBox, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>Phiếu đang quét — Nguyễn Văn Bình</span>
                <Pill fg={C.green} bg="rgba(52,211,153,0.15)">SBD 120034</Pill>
              </div>
              <div style={{ flex: 1, borderRadius: 10, background: C.scanPaper, position: 'relative', overflow: 'hidden', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#333', letterSpacing: '.05em' }}>PHIẾU TRẢ LỜI TRẮC NGHIỆM</span>
                  <span style={{ width: 34, height: 34, background: '#111', borderRadius: 2, opacity: 0.85 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, flex: 1 }}>
                  {[answers.slice(0, 6), answers.slice(6, 12), answers.slice(12, 18)].map((group, gi) => (
                    <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {group.map((a) => (
                        <span key={a.n} style={{ display: 'flex', gap: 4, alignItems: 'center', ...(a.dbl ? { outline: '2px solid #f59e0b', outlineOffset: 2, borderRadius: 3 } : {}) }}>
                          <span style={{ fontSize: 8, color: '#555', width: 12 }}>{a.n}</span>
                          {[0, 1, 2, 3].map((opt) => {
                            const on = a.dbl ? opt <= 1 : a.filled === opt
                            return (
                              <span key={opt} style={{ width: 9, height: 9, borderRadius: '50%', ...(on ? { background: a.dbl ? '#666' : '#222' } : { border: '1px solid #999' }) }} />
                            )
                          })}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <span style={{ position: 'absolute', left: 0, right: 0, top: '44%', height: 2, background: 'rgba(124,58,237,0.85)', boxShadow: '0 0 12px rgba(124,58,237,0.8)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: C.amber }}>⚠ Câu 9: tô 2 đáp án — cần GV xác nhận</span>
                <span style={{ flex: 1 }} />
                <span style={{ height: 28, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', color: C.t60, fontSize: 11 }}>Bỏ qua</span>
                <span style={{ height: 28, padding: '0 12px', borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>Sửa thủ công</span>
              </div>
            </div>

            {/* results table */}
            <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: RGRID, padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t35 }}>
                <span>#</span><span>Học sinh</span><span>SBD</span><span>Đúng</span><span>Điểm</span><span>Trạng thái</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: RGRID, padding: '11px 16px', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined, fontSize: 12, alignItems: 'center', background: r.hl ? 'rgba(124,58,237,0.06)' : undefined }}>
                    <span style={{ color: C.t35 }}>{r.no}</span>
                    <span style={{ color: r.hl ? C.t92 : C.t85, fontWeight: 600 }}>{r.name}</span>
                    <span style={{ color: C.t50 }}>{r.sbd}</span>
                    <span style={{ color: C.t70 }}>{r.correct}</span>
                    <span style={{ fontWeight: 700, color: r.scoreColor }}>{r.score}</span>
                    <span><Pill fg={r.status[1]} bg={r.status[2]} style={{ fontSize: 10, padding: '2px 8px' }}>{r.status[0]}</Pill></span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(124,58,237,0.04)' }}>
                <span style={{ fontSize: 12 }}>✦</span>
                <span style={{ flex: 1, fontSize: 11, color: C.t60, lineHeight: 1.5 }}>AI: 62% lớp sai câu 23 (giao thoa sóng) — gợi ý tạo bài ôn tập nhóm cho 12 HS yếu phần này.</span>
                <span style={{ height: 28, padding: '0 12px', borderRadius: 8, background: C.purple, display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>Tạo bài ôn</span>
              </div>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function Stat({ icon, iconBg, iconBd, value, valueColor, label, warn }: { icon: ReactNode; iconBg: string; iconBd: string; value: string; valueColor: string; label: string; warn?: boolean }) {
  return (
    <div style={{ border: `1px solid ${warn ? 'rgba(251,191,36,0.2)' : C.border}`, background: warn ? 'rgba(251,191,36,0.04)' : C.surface, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, border: `1px solid ${iconBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 19, fontWeight: 700, color: valueColor }}>{value}</span>
        <span style={{ display: 'block', fontSize: 10.5, color: C.t40 }}>{label}</span>
      </span>
    </div>
  )
}
