/** 2h — Admin · Tổng quan hệ thống */
import { CSSProperties, ReactNode } from 'react'
import { C, ContentColumn, DesktopWindow, GhostBtn } from './ui'
import { adminSidebar } from './sidebars'

const cardBox: CSSProperties = { border: `1px solid ${C.border}`, background: C.surface, borderRadius: 12 }

const services = [
  { name: 'Web App', sub: '99.98% uptime', ok: true },
  { name: 'AI Backend', sub: '42ms p50', ok: true },
  { name: 'OCR chấm bài', sub: 'queue: 12', ok: true },
  { name: 'LaTeX Compiler', sub: 'tải cao · 2.1s p50', ok: false },
  { name: 'Vector Search', sub: '8ms p50', ok: true },
  { name: 'IoT Hub', sub: '86 thiết bị online', ok: true },
]

const activity = [
  { icon: '💳', bg: 'rgba(251,113,133,0.12)', text: '3 thanh toán gói Premium chờ duyệt — tổng ₫4.2M', time: '5 phút trước' },
  { icon: '👤', bg: 'rgba(96,165,250,0.12)', text: 'GV Lê Thu đăng ký mới — chờ xác minh chứng chỉ', time: '22 phút trước' },
  { icon: '📰', bg: 'rgba(251,191,36,0.12)', text: '2 bài tin tức chờ kiểm duyệt nội dung', time: '1 giờ trước' },
  { icon: '🚀', bg: 'rgba(52,211,153,0.12)', text: 'Cập nhật mô hình chấm tự luận v2.4 — độ chính xác +3.1%', time: 'Hôm qua' },
]

export default function DesktopAdminOverview() {
  return (
    <DesktopWindow sidebar={adminSidebar('overview')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Tổng quan hệ thống</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: C.green }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, animation: 'aeroPulse 1.6s infinite' }} />
              Tất cả dịch vụ hoạt động
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: C.t40 }}>Cập nhật 10 giây trước</span>
            <GhostBtn>↓ Báo cáo tháng</GhostBtn>
          </>
        }
      >
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <Kpi label="Người dùng hoạt động" value="12,483" delta="↑ 8.2%" sub="1,240 đang trực tuyến" />
            <Kpi label="Giáo viên" value="348" delta="↑ 12" sub="18 chờ duyệt hồ sơ" />
            <Kpi label="Doanh thu tháng 7" value="₫186M" valueColor={C.violet} delta="↑ 14%" sub="3 thanh toán chờ duyệt" />
            <Kpi label="HS nguy cơ bỏ học (AI)" value="27" valueColor={C.pink} delta="↑ 4 tuần này" deltaColor={C.pink} sub="Cần liên hệ phụ huynh" warn />
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, minHeight: 0 }}>
            {/* left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
              <div style={{ ...cardBox, flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>Người dùng trực tuyến — 24 giờ</span>
                  <span style={{ fontSize: 10.5, color: C.t35 }}>đỉnh 3,420 lúc 20:00</span>
                </div>
                <svg viewBox="0 0 600 160" style={{ flex: 1, width: '100%' }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="adminFill2h" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(96,165,250,0.3)" />
                      <stop offset="100%" stopColor="rgba(96,165,250,0)" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="80" x2="600" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <path d="M0 140 L50 138 L100 130 L150 120 L200 125 L250 100 L300 90 L350 95 L400 60 L450 35 L500 45 L550 70 L600 95 L600 160 L0 160 Z" fill="url(#adminFill2h)" />
                  <path d="M0 140 L50 138 L100 130 L150 120 L200 125 L250 100 L300 90 L350 95 L400 60 L450 35 L500 45 L550 70 L600 95" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.t30, marginTop: 6 }}>
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                </div>
              </div>

              <div style={{ ...cardBox, padding: '16px 20px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Tình trạng dịch vụ</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {services.map((s, i) => (
                    <div key={i} style={{ borderRadius: 9, padding: '11px 13px', background: s.ok ? 'rgba(52,211,153,0.05)' : 'rgba(251,191,36,0.05)', border: `1px solid ${s.ok ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.2)'}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.ok ? C.green : C.amber }} />
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.t85 }}>{s.name}</span>
                        <span style={{ display: 'block', fontSize: 9.5, color: s.ok ? C.t35 : C.amber }}>{s.sub}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
              <div style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'linear-gradient(160deg,rgba(124,58,237,0.1),rgba(59,130,246,0.05))', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.t85, marginBottom: 10 }}>✦ AI Insights tuần này</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Insight>· Tỷ lệ hoàn thành bài tập <b style={{ color: C.green }}>tăng 11%</b> sau khi bật gợi ý Daily AI</Insight>
                  <Insight>· Khối 12 học muộn nhất — đỉnh <b style={{ color: C.violet }}>21:30–23:00</b>, cân nhắc giờ mở phòng thi</Insight>
                  <Insight>· <b style={{ color: C.pink }}>27 HS nguy cơ</b>: 19 em giảm hoạt động &gt; 60% trong 2 tuần</Insight>
                </div>
              </div>

              <div style={{ ...cardBox, flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.t85, marginBottom: 12 }}>Hoạt động gần đây</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {activity.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{a.icon}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 11, color: C.t75, lineHeight: 1.45 }}>{a.text}</span>
                        <span style={{ display: 'block', fontSize: 9.5, color: C.t30 }}>{a.time}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 600, color: C.violet }}>Xem tất cả →</span>
              </div>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function Kpi({ label, value, valueColor = C.t92, delta, deltaColor = C.green, sub, warn }: { label: string; value: string; valueColor?: string; delta: string; deltaColor?: string; sub: string; warn?: boolean }) {
  return (
    <div style={{ border: `1px solid ${warn ? 'rgba(251,113,133,0.2)' : C.border}`, background: warn ? 'rgba(251,113,133,0.04)' : C.surface, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: C.t40, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: valueColor }}>{value}</span>
        <span style={{ fontSize: 10.5, color: deltaColor }}>{delta}</span>
      </div>
      <div style={{ fontSize: 10, color: C.t35, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function Insight({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, color: C.t60, lineHeight: 1.55 }}>{children}</div>
}
