import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ExportMenu } from '@/components/common/ExportMenu'
import type { SheetData } from '@/lib/exportReport'
import { adminUsersService, type AdminUser } from '@/services/adminUsers.service'
import {
  Users, Award, Calendar, TrendingUp, Sparkles, BarChart3,
  Bell, Search, Plus, Edit, Trash2, Eye, Mail, Phone,
  Briefcase, GraduationCap, Star, Clock, CheckCircle, AlertCircle,
  Download, UserCheck, Lock,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type TeacherTab = 'profiles' | 'licensing' | 'scheduling' | 'performance' | 'ai-recommendations' | 'analytics'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  department: string
  specialization: string
  position: string
  status: 'active' | 'inactive' | 'on_leave'
  hireDate: string
  totalStudents: number
  avgXPGain: number
  feedbackScore: number
  responseTime: number
  interventions: number
}

interface License {
  id: string
  teacherId: string
  teacherName: string
  type: string
  name: string
  issueDate: string
  expiryDate: string
  status: 'valid' | 'expiring_soon' | 'expired'
  issuingAuthority: string
}

interface Schedule {
  id: string
  teacherId: string
  teacherName: string
  date: string
  shift: 'morning' | 'afternoon' | 'evening'
  classes: string[]
  isOverloaded: boolean
}

/* ─────────────────────────────────────────────────────────────
   Primitive UI helpers
───────────────────────────────────────────────────────────── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 transition-all ${className}`}>
      {children}
    </div>
  )
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const cls: Record<BadgeVariant, string> = {
    default: 'bg-white/[0.06] text-white/70 border-white/[0.08]',
    success: 'bg-green-500/15 text-green-300 border-green-500/25',
    warning: 'bg-orange-400/15 text-orange-300 border-orange-400/25',
    danger:  'bg-red-500/15 text-red-300 border-red-500/25',
    info:    'bg-blue-500/15 text-blue-300 border-blue-500/25',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${cls[variant]}`}>
      {children}
    </span>
  )
}

type BtnVariant = 'default' | 'primary' | 'danger' | 'success'
function Btn({
  children, onClick, variant = 'default', size = 'default', className = '',
}: {
  children: React.ReactNode; onClick?: () => void
  variant?: BtnVariant; size?: 'default' | 'sm' | 'icon'; className?: string
}) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'icon' ? 'p-2.5' : 'px-4 py-2.5 text-sm'
  const variantClass =
    variant === 'primary' ? 'text-white hover:opacity-90' :
    variant === 'danger'  ? 'bg-red-500/80 text-white hover:bg-red-500' :
    variant === 'success' ? 'bg-emerald-500/80 text-white hover:bg-emerald-500' :
    'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white/90 hover:bg-white/[0.08]'
  const gradientStyle = variant === 'primary'
    ? { background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' } as React.CSSProperties
    : undefined
  return (
    <button
      type="button" onClick={onClick}
      style={gradientStyle}
      className={`${sizeClass} ${variantClass} ${className} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all`}
    >
      {children}
    </button>
  )
}

/* Mini stat tile used inside cards */
function StatTile({ icon: Icon, iconColor, value, label }: { icon: React.ElementType; iconColor: string; value: string | number; label: string }) {
  return (
    <div className="text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: iconColor }} />
      <p className="text-sm font-bold text-white/90">{value}</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  )
}

/* Avatar initials circle */
function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const dim = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-14 h-14 text-lg'
  return (
    <div
      className={`${dim} rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}
    >
      {initials}
    </div>
  )
}

/* Spinner */
function Spinner() {
  return (
    <svg className="animate-spin w-10 h-10 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Status badges
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Teacher['status'] }) {
  if (status === 'active')   return <Badge variant="success"><CheckCircle className="w-3 h-3" /> Đang làm việc</Badge>
  if (status === 'inactive') return <Badge variant="danger">Nghỉ việc</Badge>
  return <Badge variant="warning"><Clock className="w-3 h-3" /> Nghỉ phép</Badge>
}

function LicenseBadge({ status }: { status: License['status'] }) {
  if (status === 'valid')          return <Badge variant="success"><CheckCircle className="w-3 h-3" /> Hiệu lực</Badge>
  if (status === 'expiring_soon')  return <Badge variant="warning"><AlertCircle className="w-3 h-3" /> Sắp hết hạn</Badge>
  return <Badge variant="danger"><AlertCircle className="w-3 h-3" /> Hết hạn</Badge>
}

/* ─────────────────────────────────────────────────────────────
   Tab renderers
───────────────────────────────────────────────────────────── */
function ProfilesTab({ teachers, searchQuery, setSearchQuery }: {
  teachers: Teacher[]; searchQuery: string; setSearchQuery: (v: string) => void
}) {
  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Tìm kiếm giáo viên..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03]
              text-white/85 placeholder-white/30 text-sm outline-none
              focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <Btn variant="primary"><Plus className="w-4 h-4" /> Thêm giáo viên</Btn>
          <Btn><Download className="w-4 h-4" /> Xuất danh sách</Btn>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(teacher => (
          <Card key={teacher.id} className="hover:border-violet-500/25">
            <div className="flex items-start gap-4">
              <Avatar name={teacher.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white/90">{teacher.name}</h3>
                    <p className="text-sm text-white/45">{teacher.position} • {teacher.department}</p>
                    <p className="text-xs text-white/30 mt-0.5">{teacher.specialization}</p>
                  </div>
                  <StatusBadge status={teacher.status} />
                </div>
                <div className="flex flex-wrap gap-3 mb-3">
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Mail className="w-3 h-3" /> {teacher.email}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Phone className="w-3 h-3" /> {teacher.phone}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <StatTile icon={Users}     iconColor="#9f7aea" value={teacher.totalStudents} label="Học sinh" />
                  <StatTile icon={TrendingUp} iconColor="#48bb78" value={teacher.avgXPGain}    label="XP TB" />
                  <StatTile icon={Star}       iconColor="#ed8936" value={teacher.feedbackScore} label="Đánh giá" />
                  <StatTile icon={Clock}      iconColor="#4299e1" value={`${teacher.responseTime}h`} label="Phản hồi" />
                </div>
                <div className="flex gap-2">
                  <Btn size="sm"><Eye className="w-3 h-3" /> Xem chi tiết</Btn>
                  <Btn size="sm"><Edit className="w-3 h-3" /> Sửa</Btn>
                  <Btn size="sm" variant="danger"><Trash2 className="w-3 h-3" /> Xóa</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function LicensingTab({ licenses }: { licenses: License[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white/90">Danh sách chứng chỉ &amp; giấy phép</h2>
        <Btn variant="primary"><Plus className="w-4 h-4" /> Thêm chứng chỉ</Btn>
      </div>
      <div className="space-y-3">
        {licenses.map(license => (
          <Card key={license.id} className="hover:border-violet-500/25">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white/90">{license.name}</h3>
                  <p className="text-sm text-white/45">{license.teacherName} • {license.issuingAuthority}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-white/35">
                    <span>Cấp: {new Date(license.issueDate).toLocaleDateString('vi-VN')}</span>
                    <span>Hết hạn: {new Date(license.expiryDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LicenseBadge status={license.status} />
                <Btn size="sm"><Edit className="w-3 h-3" /></Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SchedulingTab({ schedules }: { schedules: Schedule[] }) {
  const shiftLabel = (s: Schedule['shift']) =>
    s === 'morning' ? 'Sáng' : s === 'afternoon' ? 'Chiều' : 'Tối'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white/90">Lịch dạy &amp; Phân ca</h2>
        <Btn variant="primary"><Plus className="w-4 h-4" /> Tạo lịch mới</Btn>
      </div>
      <div className="space-y-3">
        {schedules.map(schedule => (
          <Card
            key={schedule.id}
            className={schedule.isOverloaded
              ? 'border-orange-400/30 bg-orange-400/[0.04]'
              : 'hover:border-violet-500/25'}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 bg-blue-600/80">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white/90">{schedule.teacherName}</h3>
                  <p className="text-sm text-white/45">
                    {new Date(schedule.date).toLocaleDateString('vi-VN')} • Ca {shiftLabel(schedule.shift)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {schedule.classes.map((cls, i) => (
                      <Badge key={i} variant="info">{cls}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {schedule.isOverloaded && (
                  <Badge variant="warning"><AlertCircle className="w-3 h-3" /> Quá tải</Badge>
                )}
                <Btn size="sm"><Edit className="w-3 h-3" /></Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PerformanceTab({ teachers }: { teachers: Teacher[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white/90">Hiệu suất &amp; KPI giáo viên</h2>
      <div className="grid grid-cols-1 gap-4">
        {teachers.map(teacher => {
          const overall = Math.round(
            (teacher.avgXPGain / 300 * 40 + teacher.feedbackScore * 4 + (10 - teacher.responseTime) * 2) / 3
          )
          return (
            <Card key={teacher.id} className="hover:border-violet-500/25">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Avatar name={teacher.name} size="md" />
                  <div>
                    <h3 className="text-lg font-bold text-white/90">{teacher.name}</h3>
                    <p className="text-sm text-white/45">{teacher.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                    {overall}/100
                  </p>
                  <p className="text-xs text-white/35">Điểm tổng thể</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <StatTile icon={TrendingUp} iconColor="#48bb78" value={teacher.avgXPGain}             label="XP TB" />
                <StatTile icon={Star}       iconColor="#ed8936" value={teacher.feedbackScore}         label="Đánh giá" />
                <StatTile icon={Clock}      iconColor="#4299e1" value={`${teacher.responseTime}h`}    label="Phản hồi" />
                <StatTile icon={Users}      iconColor="#9f7aea" value={teacher.interventions}          label="Tương tác" />
                <StatTile icon={Briefcase}  iconColor="#a78bfa" value={teacher.totalStudents}         label="Học sinh" />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function AIRecommendationsTab() {
  const cards = [
    {
      icon: AlertCircle,
      iconColor: '#ed8936',
      title: 'Quá tải lịch dạy',
      border: 'border-orange-400/25 bg-orange-400/[0.04]',
      desc: (<>Giáo viên <span className="font-semibold text-white/85">Trần Văn Minh</span> đang dạy 4 lớp/ca, vượt quá ngưỡng khuyến nghị (3 lớp/ca).</>),
      actions: [{ label: 'Tái phân công', variant: 'primary' as BtnVariant }, { label: 'Bỏ qua', variant: 'default' as BtnVariant }],
    },
    {
      icon: Sparkles,
      iconColor: '#4299e1',
      title: 'Giáo viên xuất sắc',
      border: 'border-blue-500/25 bg-blue-500/[0.04]',
      desc: (<><span className="font-semibold text-white/85">Lê Thị Hoa</span> đạt 9.5/10 đánh giá và 278 XP trung bình. Đề xuất khen thưởng.</>),
      actions: [{ label: 'Khen thưởng', variant: 'success' as BtnVariant }, { label: 'Xem chi tiết', variant: 'default' as BtnVariant }],
    },
    {
      icon: CheckCircle,
      iconColor: '#48bb78',
      title: 'Tối ưu phân ca',
      border: 'border-green-500/25 bg-green-500/[0.04]',
      desc: 'AI đã tối ưu lịch dạy tuần sau, giảm 15% ca quá tải và tăng 8% hiệu suất tổng thể.',
      actions: [{ label: 'Áp dụng', variant: 'primary' as BtnVariant }, { label: 'Xem chi tiết', variant: 'default' as BtnVariant }],
    },
    {
      icon: Bell,
      iconColor: '#f56565',
      title: 'Chứng chỉ sắp hết hạn',
      border: 'border-red-500/25 bg-red-500/[0.04]',
      desc: '3 giáo viên có chứng chỉ CME hết hạn trong 30 ngày tới. Cần gia hạn để duy trì hoạt động.',
      actions: [{ label: 'Nhắc nhở ngay', variant: 'primary' as BtnVariant }, { label: 'Xem danh sách', variant: 'default' as BtnVariant }],
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white/90 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-violet-400" />
        AI Đề Xuất &amp; Cảnh Báo
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <div key={i} className={`rounded-2xl border p-6 transition-all ${card.border}`}>
            <div className="flex items-start gap-3">
              <card.icon className="w-6 h-6 flex-shrink-0" style={{ color: card.iconColor }} />
              <div>
                <h3 className="font-bold text-white/90 mb-1">{card.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{card.desc}</p>
                <div className="flex gap-2 mt-3">
                  {card.actions.map(a => (
                    <Btn key={a.label} size="sm" variant={a.variant}>{a.label}</Btn>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsTab({ teachers }: { teachers: Teacher[] }) {
  const activeCount = teachers.filter(t => t.status === 'active').length
  const avgFeedback = teachers.length
    ? Math.round(teachers.reduce((s, t) => s + t.feedbackScore, 0) / teachers.length * 10) / 10
    : 0
  const avgXP = teachers.length
    ? Math.round(teachers.reduce((s, t) => s + t.avgXPGain, 0) / teachers.length)
    : 0

  const departments = ['Toán học', 'Vật lý', 'Hóa học', 'Ngữ văn']

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white/90">Phân Tích Tổng Quan</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,     color: '#9f7aea', value: teachers.length, label: 'Tổng giáo viên' },
          { icon: UserCheck, color: '#48bb78', value: activeCount,      label: 'Đang làm việc' },
          { icon: Star,      color: '#ed8936', value: avgFeedback,      label: 'Đánh giá TB' },
          { icon: TrendingUp,color: '#4299e1', value: avgXP,            label: 'XP TB' },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <s.icon className="w-8 h-8 mx-auto mb-2" style={{ color: s.color }} />
            <p className="text-3xl font-bold text-white/90">{s.value}</p>
            <p className="text-sm text-white/40">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Department breakdown */}
      <Card>
        <h3 className="text-lg font-bold text-white/90 mb-4">Phân bổ theo bộ môn</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {departments.map(dept => {
            const count = teachers.filter(t => t.department === dept).length
            return (
              <div key={dept} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className="text-2xl font-bold text-white/90">{count}</p>
                <p className="text-sm text-white/40">{dept}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Performance bars */}
      <Card>
        <h3 className="text-lg font-bold text-white/90 mb-4">XP trung bình theo giáo viên</h3>
        <div className="space-y-3">
          {[...teachers].sort((a, b) => b.avgXPGain - a.avgXPGain).map(t => (
            <div key={t.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/70">{t.name}</span>
                <span className="text-sm font-bold text-white/85">{t.avgXPGain} XP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.05]">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, t.avgXPGain / 300 * 100)}%`,
                    background: 'linear-gradient(90deg,#667eea 0%,#764ba2 100%)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Real data mapping
───────────────────────────────────────────────────────────── */

/**
 * Map AdminUser (từ DB) → Teacher (interface UI cũ).
 * Field analytics (totalStudents, avgXPGain, feedbackScore...) chưa có
 * trên backend → placeholder. Sprint sau bổ sung endpoint
 * /api/admin/teachers/:id/stats để tính thực.
 */
function mapUserToTeacher(u: AdminUser): Teacher {
  // Status: banned → inactive, không login >30 ngày → on_leave, default active
  let status: Teacher['status'] = 'active'
  if (u.banned) status = 'inactive'
  else if (u.lastLoginAt) {
    const days = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
    if (days > 30) status = 'on_leave'
  } else if (!u.lastLoginAt) {
    // Chưa đăng nhập bao giờ — có thể vừa đăng ký xong
    status = 'inactive'
  }
  return {
    id: u.id,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    phone: '',                          // backend chưa lưu phone
    department: 'Chưa cập nhật',        // sẽ lấy từ CareerSurvey.primarySubject sau
    specialization: 'Chưa cập nhật',
    position: 'Giáo viên',
    status,
    hireDate: u.createdAt.slice(0, 10),
    totalStudents: 0,
    avgXPGain: 0,
    feedbackScore: 0,
    responseTime: 0,
    interventions: 0,
  }
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function Teachers() {
  const [activeTab, setActiveTab] = useState<TeacherTab>('profiles')
  const [searchQuery, setSearchQuery] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch GV thật từ /api/admin/users — chỉ accountType=TEACHER (loại trừ PARENT)
    setLoading(true)
    adminUsersService.list({ accountType: 'TEACHER', limit: 500, sortBy: 'createdAt', sortOrder: 'desc' })
      .then(({ users }) => {
        const mapped: Teacher[] = users.map(u => mapUserToTeacher(u))
        setTeachers(mapped)
      })
      .catch(err => {
        console.error('[admin:teachers] load failed', err)
      })
      .finally(() => setLoading(false))

    setLicenses([
      {
        id: 'l1', teacherId: 't1', teacherName: 'Nguyễn Thị Lan', type: 'teaching_certificate',
        name: 'Chứng chỉ Nghiệp vụ Sư phạm', issueDate: '2020-06-15', expiryDate: '2025-06-15',
        status: 'valid', issuingAuthority: 'Bộ GD&ĐT',
      },
      {
        id: 'l2', teacherId: 't2', teacherName: 'Trần Văn Minh', type: 'cme',
        name: 'CME Vật lý Hiện đại', issueDate: '2023-01-10', expiryDate: '2024-01-10',
        status: 'expiring_soon', issuingAuthority: 'ĐH Sư phạm',
      },
      {
        id: 'l3', teacherId: 't3', teacherName: 'Lê Thị Hoa', type: 'specialization',
        name: 'Chuyên gia Hóa học', issueDate: '2021-08-20', expiryDate: '2026-08-20',
        status: 'valid', issuingAuthority: 'Bộ GD&ĐT',
      },
    ])

    setSchedules([
      {
        id: 's1', teacherId: 't1', teacherName: 'Nguyễn Thị Lan', date: '2024-10-21',
        shift: 'morning', classes: ['9A1', '9A2', '10B1'], isOverloaded: false,
      },
      {
        id: 's2', teacherId: 't2', teacherName: 'Trần Văn Minh', date: '2024-10-21',
        shift: 'afternoon', classes: ['11C1', '12D1', '10B2', '9A3'], isOverloaded: true,
      },
    ])
    // Licenses + Schedules vẫn dùng mock (chưa có endpoint backend) —
    // sẽ migrate sang real data trong sprint sau.
  }, [])

  /** Build export sheets — 3 dataset chính */
  const getTeachersSheets = useCallback((): SheetData[] => {
    const sheets: SheetData[] = []
    if (teachers.length > 0) {
      sheets.push({
        name: `Hồ sơ GV (${teachers.length})`,
        columns: [
          { key: 'name',            label: 'Họ tên' },
          { key: 'email',           label: 'Email' },
          { key: 'phone',           label: 'Số điện thoại' },
          { key: 'department',      label: 'Bộ môn' },
          { key: 'specialization',  label: 'Chuyên môn' },
          { key: 'position',        label: 'Vị trí' },
          { key: 'status',          label: 'Trạng thái' },
          { key: 'hireDate',        label: 'Ngày vào',     type: 'date' },
          { key: 'totalStudents',   label: 'Số HS phụ trách', type: 'number' },
          { key: 'avgXPGain',       label: 'XP gain TB',   type: 'number' },
          { key: 'feedbackScore',   label: 'Điểm phản hồi', type: 'number' },
          { key: 'responseTime',    label: 'Time phản hồi (h)', type: 'number' },
          { key: 'interventions',   label: 'Lượt can thiệp', type: 'number' },
        ],
        rows: teachers,
      })
    }
    if (licenses.length > 0) {
      sheets.push({
        name: 'Chứng chỉ',
        columns: [
          { key: 'teacherName',      label: 'GV' },
          { key: 'type',             label: 'Loại' },
          { key: 'name',             label: 'Tên chứng chỉ' },
          { key: 'issuingAuthority', label: 'Đơn vị cấp' },
          { key: 'issueDate',        label: 'Ngày cấp',  type: 'date' },
          { key: 'expiryDate',       label: 'Ngày hết hạn', type: 'date' },
          { key: 'status',           label: 'Trạng thái' },
        ],
        rows: licenses,
      })
    }
    if (schedules.length > 0) {
      sheets.push({
        name: 'Lịch dạy',
        columns: [
          { key: 'teacherName',  label: 'GV' },
          { key: 'date',         label: 'Ngày',     type: 'date' },
          { key: 'shift',        label: 'Ca' },
          { key: 'classes',      label: 'Lớp dạy' },
          { key: 'isOverloaded', label: 'Quá tải' },
        ],
        rows: schedules.map(s => ({
          ...s,
          classes: Array.isArray(s.classes) ? s.classes.join(', ') : s.classes,
          isOverloaded: s.isOverloaded ? 'Có' : 'Không',
        })),
      })
    }
    return sheets
  }, [teachers, licenses, schedules])

  const TABS: { id: TeacherTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'profiles',          label: 'Hồ Sơ Giáo Viên',      icon: Users,     description: 'Quản lý thông tin, năng lực, lịch sử công tác' },
    { id: 'licensing',         label: 'Chứng Chỉ & Giấy Phép', icon: Award,     description: 'Theo dõi CCHN, CME, quyền chuyên môn' },
    { id: 'scheduling',        label: 'Phân Ca & Lịch Dạy',    icon: Calendar,  description: 'Lịch dạy, phân ca tự động, cảnh báo quá tải' },
    { id: 'performance',       label: 'Hiệu Suất & KPI',       icon: TrendingUp,description: 'Đánh giá chuyên môn, XP gain, phản hồi' },
    { id: 'ai-recommendations',label: 'AI Đề Xuất',            icon: Sparkles,  description: 'Gợi ý phân công, dự đoán quá tải, tối ưu' },
    { id: 'analytics',         label: 'Phân Tích Tổng Quan',   icon: BarChart3, description: 'Dashboard cho lãnh đạo, thống kê' },
  ]

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] p-6 md:p-8">

      {/* Header banner */}
      <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 mb-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent"
                style={{ letterSpacing: '-0.5px' }}>
                Quản Lý Nhân Sự Giáo Viên
              </h1>
              <p className="text-sm text-white/40">
                Dữ liệu thật từ DB · {teachers.length} GV đã đăng ký · {teachers.filter(t => t.status === 'inactive').length} bị khoá / chưa active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                <span className="text-lg font-bold text-white/90">{teachers.length}</span>
                <span className="text-sm text-white/40">Giáo viên</span>
              </div>
            </div>
            <Link
              to="/admin/users?accountType=TEACHER"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              Quản lý (ban/reset)
            </Link>
            <ExportMenu
              filename={`teachers-${new Date().toISOString().slice(0, 10)}`}
              getSheets={getTeachersSheets}
              meta={{
                title: 'Quản lý Nhân sự Giáo viên',
                subtitle: `Profiles + Licenses + Schedules — AeroEduVision`,
                authorName: 'Admin HRM',
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              className={`px-4 py-2.5 flex items-center gap-2 rounded-xl transition-all whitespace-nowrap text-sm font-semibold flex-shrink-0 ${
                active
                  ? 'text-white'
                  : 'bg-white/[0.03] border border-white/[0.07] text-white/55 hover:text-white/80 hover:bg-white/[0.06]'
              }`}
              style={active ? { background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' } : undefined}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          {activeTab === 'profiles'           && <ProfilesTab teachers={teachers} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
          {activeTab === 'licensing'          && <LicensingTab licenses={licenses} />}
          {activeTab === 'scheduling'         && <SchedulingTab schedules={schedules} />}
          {activeTab === 'performance'        && <PerformanceTab teachers={teachers} />}
          {activeTab === 'ai-recommendations' && <AIRecommendationsTab />}
          {activeTab === 'analytics'          && <AnalyticsTab teachers={teachers} />}
        </>
      )}
    </div>
  )
}
