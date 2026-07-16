/** 3a — Admin · Quản lý người dùng (duyệt GV, phân quyền) */
import { CSSProperties } from 'react'
import { C, ContentColumn, DesktopWindow, GhostBtn, Pill, PrimaryBtn } from './ui'
import { adminSidebar } from './sidebars'

const card: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.surface,
  borderRadius: 12,
}

type Row = {
  initials: string
  grad: string
  name: string
  email: string
  role: string
  plan: JSX.Element
  activity: JSX.Element
  status: JSX.Element
  rowBg?: string
  faded?: boolean
}

const statusPill = (text: string, fg: string, bg: string) => <Pill fg={fg} bg={bg}>{text}</Pill>

const rows: Row[] = [
  {
    initials: 'LT', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', name: 'Lê Thu', email: 'lethu.gv@gmail.com',
    role: 'Giáo viên · Hóa', plan: <span style={{ color: C.t50 }}>—</span>, activity: <span style={{ color: C.t50 }}>22 phút</span>,
    status: statusPill('Chờ duyệt', C.amber, 'rgba(251,191,36,0.15)'), rowBg: 'rgba(251,191,36,0.04)',
  },
  {
    initials: 'MA', grad: 'linear-gradient(135deg,#7c3aed,#3b82f6)', name: 'Minh Anh', email: 'minhanh@aeroedu.vn',
    role: 'Học sinh · 12A3', plan: statusPill('Premium', C.violet, 'rgba(124,58,237,0.15)'), activity: <span style={{ color: C.t50 }}>Đang online</span>,
    status: statusPill('Hoạt động', C.green, 'rgba(52,211,153,0.12)'),
  },
  {
    initials: 'TH', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', name: 'Trần Hoàng', email: 'tranhoang@aeroedu.vn',
    role: 'Giáo viên · Vật lý', plan: statusPill('Pro', C.blue, 'rgba(96,165,250,0.15)'), activity: <span style={{ color: C.t50 }}>1 giờ</span>,
    status: statusPill('Hoạt động', C.green, 'rgba(52,211,153,0.12)'),
  },
  {
    initials: 'VN', grad: 'linear-gradient(135deg,#10b981,#14b8a6)', name: 'Vũ Hải Nam', email: 'hainam2008@gmail.com',
    role: 'Học sinh · 12A3', plan: <span style={{ color: C.t50 }}>Free</span>, activity: <span style={{ color: C.pink }}>14 ngày</span>,
    status: statusPill('Nguy cơ', C.pink, 'rgba(251,113,133,0.12)'),
  },
  {
    initials: 'QA', grad: 'linear-gradient(135deg,#ec4899,#f43f5e)', name: 'Phạm Quỳnh Anh', email: 'quynhanh@gmail.com',
    role: 'Học sinh · 12A1', plan: statusPill('Premium', C.violet, 'rgba(124,58,237,0.15)'), activity: <span style={{ color: C.t50 }}>3 giờ</span>,
    status: statusPill('Hoạt động', C.green, 'rgba(52,211,153,0.12)'),
  },
  {
    initials: 'NM', grad: 'linear-gradient(135deg,#60a5fa,#6366f1)', name: 'Ngô Minh', email: 'ngominh@aeroedu.vn',
    role: 'Giáo viên · Toán', plan: statusPill('Pro', C.blue, 'rgba(96,165,250,0.15)'), activity: <span style={{ color: C.t50 }}>Hôm qua</span>,
    status: statusPill('Hoạt động', C.green, 'rgba(52,211,153,0.12)'),
  },
  {
    initials: 'HB', grad: 'rgba(255,255,255,0.08)', name: 'Hoàng Gia Bảo', email: 'giabao@gmail.com',
    role: 'Học sinh · 12A3', plan: <span style={{ color: C.t50 }}>Free</span>, activity: <span style={{ color: C.t50 }}>2 ngày</span>,
    status: statusPill('Tạm khóa', C.t50, 'rgba(255,255,255,0.06)'), faded: true,
  },
]

const GRID = '1.6fr 1fr .7fr .7fr .8fr'

export default function DesktopAdminUsers() {
  return (
    <DesktopWindow sidebar={adminSidebar('users')}>
      <ContentColumn
        topbar={
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t90 }}>Quản lý người dùng</span>
            <span style={{ fontSize: 11, color: C.t40 }}>12,831 tài khoản</span>
            <span style={{ flex: 1 }} />
            <span
              style={{
                width: 250, height: 30, borderRadius: 8, border: `1px solid rgba(255,255,255,0.08)`,
                background: 'rgba(255,255,255,0.03)', display: 'inline-flex', alignItems: 'center',
                padding: '0 10px', gap: 8, fontSize: 11.5, color: C.t35,
              }}
            >
              Tìm theo tên, email, SĐT…
              <span style={{ marginLeft: 'auto', fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: C.t45 }}>⌘K</span>
            </span>
            <GhostBtn>↓ Xuất CSV</GhostBtn>
            <PrimaryBtn>+ Thêm người dùng</PrimaryBtn>
          </>
        }
      >
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {/* filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilterPill active>Tất cả · 12,831</FilterPill>
            <FilterPill>Học sinh · 12,105</FilterPill>
            <FilterPill>Giáo viên · 348</FilterPill>
            <FilterPill>Phụ huynh · 371</FilterPill>
            <span
              style={{
                height: 30, padding: '0 14px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6,
                border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', color: C.amber,
                fontSize: 11.5, fontWeight: 600,
              }}
            >
              ⚠ Chờ duyệt · 18
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: C.t40 }}>Vai trò ▾ · Trạng thái ▾ · Gói ▾</span>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, minHeight: 0 }}>
            {/* table */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: GRID, padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', color: C.t35,
                }}
              >
                <span>Người dùng</span><span>Vai trò</span><span>Gói</span><span>Hoạt động</span><span>Trạng thái</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {rows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: GRID, padding: '10px 16px',
                      borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                      fontSize: 12, alignItems: 'center', background: r.rowBg,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: r.grad, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: r.faded ? C.t50 : '#fff', fontSize: 9.5, fontWeight: 700,
                        }}
                      >
                        {r.initials}
                      </span>
                      <span>
                        <span style={{ display: 'block', color: r.faded ? C.t70 : C.t88, fontWeight: 600 }}>{r.name}</span>
                        <span style={{ display: 'block', fontSize: 10, color: C.t35 }}>{r.email}</span>
                      </span>
                    </span>
                    <span style={{ color: C.t60 }}>{r.role}</span>
                    <span>{r.plan}</span>
                    <span>{r.activity}</span>
                    <span>{r.status}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '11px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', fontSize: 11, color: C.t40 }}>
                <span>Hiển thị 1–7 / 12,831</span>
                <span style={{ flex: 1 }} />
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <PageNum active>1</PageNum><PageNum>2</PageNum><PageNum>3</PageNum><PageNum>›</PageNum>
                </span>
              </div>
            </div>

            {/* detail: pending teacher */}
            <div
              style={{
                border: '1px solid rgba(251,191,36,0.25)',
                background: 'linear-gradient(170deg,rgba(251,191,36,0.05),rgba(255,255,255,0.015) 45%)',
                borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>LT</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.t92 }}>Lê Thu</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: C.t40 }}>Đăng ký Giáo viên · 22 phút trước</span>
                </span>
                <Pill fg={C.amber} bg="rgba(251,191,36,0.15)" style={{ padding: '3px 9px' }}>Chờ duyệt</Pill>
              </div>
              <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Môn dạy" value="Hoá học · THPT" />
                  <Field label="Kinh nghiệm" value="8 năm · THPT Lê Quý Đôn" />
                  <Field label="Email" value="lethu.gv@gmail.com" />
                  <Field label="SĐT" value="09xx 384 xxx" />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: 9.5, color: C.t35, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Hồ sơ đính kèm</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FileRow name="Bằng cử nhân Sư phạm Hoá.pdf" />
                    <FileRow name="Chứng chỉ nghiệp vụ.pdf" />
                  </div>
                </div>
                <div style={{ borderRadius: 10, border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.07)', padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, color: C.t65, lineHeight: 1.6 }}>
                    ✦ AI kiểm tra: hồ sơ hợp lệ, tên bằng cấp khớp CMND, không trùng tài khoản. Độ tin cậy <b style={{ color: C.green }}>96%</b>.
                  </span>
                </div>
              </div>
              <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
                <span style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(251,113,133,0.35)', display: 'inline-flex', alignItems: 'center', color: C.pink, fontSize: 11.5, fontWeight: 600 }}>Từ chối</span>
                <span style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', color: C.t60, fontSize: 11.5 }}>Yêu cầu bổ sung</span>
                <span style={{ flex: 1, height: 32, borderRadius: 8, background: C.greenDeep, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11.5, fontWeight: 600, boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}>✓ Duyệt làm Giáo viên</span>
              </div>
            </div>
          </div>
        </div>
      </ContentColumn>
    </DesktopWindow>
  )
}

function FilterPill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      style={{
        height: 30, padding: '0 14px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', fontSize: 11.5,
        ...(active
          ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: C.violetLt, fontWeight: 600 }
          : { border: '1px solid rgba(255,255,255,0.08)', color: C.t50 }),
      }}
    >
      {children}
    </span>
  )
}

function PageNum({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      style={{
        width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...(active ? { background: 'rgba(124,58,237,0.2)', color: C.violetLt, fontWeight: 700 } : { border: '1px solid rgba(255,255,255,0.08)' }),
      }}
    >
      {children}
    </span>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: 9.5, color: C.t35, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.t85 }}>{value}</span>
    </div>
  )
}

function FileRow({ name }: { name: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)', background: C.surface }}>
      <span style={{ fontSize: 13 }}>📄</span>
      <span style={{ flex: 1, fontSize: 11.5, color: C.t75 }}>{name}</span>
      <span style={{ fontSize: 10, color: C.violet, fontWeight: 600 }}>Xem</span>
    </span>
  )
}
