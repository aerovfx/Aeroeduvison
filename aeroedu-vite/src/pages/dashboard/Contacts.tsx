/**
 * Contacts — /dashboard/contacts
 * Danh bạ bạn học: kết bạn, nhóm học, tìm kiếm học sinh.
 * Dữ liệu demo (không cần backend).
 */
import { useState, useMemo } from 'react'
import {
  Search, UserPlus, MessageCircle, Users, UserCheck,
  Clock, Star, Zap, Trophy, Atom, Calculator, FlaskConical,
  Globe, MoreHorizontal, Check, X, Filter, ChevronDown,
  GraduationCap, Flame,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// Types & Data
// ─────────────────────────────────────────────────────────────────
type FriendStatus = 'friend' | 'pending_sent' | 'pending_received' | 'none'
type Tab = 'friends' | 'discover' | 'requests' | 'groups'

interface Student {
  id: string
  name: string
  username: string
  avatar: string
  avatarColor: string
  grade: string
  school: string
  subjects: string[]
  xp: number
  streak: number
  achievements: number
  status: FriendStatus
  online: boolean
  lastSeen?: string
  bio: string
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-cyan-600',
  'from-fuchsia-500 to-violet-600',
]

const STUDENTS: Student[] = [
  {
    id: 's1', name: 'Trần Minh Khoa', username: 'minhkhoa',
    avatar: 'K', avatarColor: AVATAR_COLORS[0],
    grade: '12', school: 'THPT Lê Quý Đôn', subjects: ['Vật lý', 'Toán học'],
    xp: 7240, streak: 21, achievements: 11, status: 'friend', online: true,
    bio: 'Mê Vật lý, thích mô phỏng và thực nghiệm số',
  },
  {
    id: 's2', name: 'Nguyễn Thị Mai', username: 'mai.nguyen',
    avatar: 'M', avatarColor: AVATAR_COLORS[4],
    grade: '11', school: 'THPT Trần Phú', subjects: ['Hóa học', 'Sinh học'],
    xp: 5830, streak: 14, achievements: 8, status: 'friend', online: true,
    bio: 'Yêu hóa hữu cơ, đang ôn thi ĐH khối B',
  },
  {
    id: 's3', name: 'Lê Hoàng Phúc', username: 'hphuc',
    avatar: 'P', avatarColor: AVATAR_COLORS[2],
    grade: '12', school: 'THPT Chu Văn An', subjects: ['Toán học', 'Lập trình'],
    xp: 9120, streak: 35, achievements: 13, status: 'friend', online: false, lastSeen: '2 giờ trước',
    bio: 'Python + Math lover. Đam mê AI và khoa học dữ liệu',
  },
  {
    id: 's4', name: 'Phạm Quỳnh Như', username: 'quynhnhu',
    avatar: 'N', avatarColor: AVATAR_COLORS[7],
    grade: '11', school: 'THPT Nguyễn Du', subjects: ['Vật lý', 'Toán học'],
    xp: 4210, streak: 7, achievements: 6, status: 'pending_received', online: true,
    bio: 'Mới bắt đầu học Vật lý lượng tử cơ bản',
  },
  {
    id: 's5', name: 'Đặng Hữu Nghĩa', username: 'hnghia',
    avatar: 'N', avatarColor: AVATAR_COLORS[1],
    grade: '12', school: 'THPT Bình Chánh', subjects: ['Vật lý', 'Hóa học'],
    xp: 6540, streak: 18, achievements: 9, status: 'pending_sent', online: false, lastSeen: '1 ngày trước',
    bio: 'Ôn thi THPTQG, mục tiêu ĐH Bách Khoa',
  },
  {
    id: 's6', name: 'Võ Thị Thanh Hà', username: 'thanhha',
    avatar: 'H', avatarColor: AVATAR_COLORS[5],
    grade: '10', school: 'THPT Lê Hồng Phong', subjects: ['Sinh học', 'Hóa học'],
    xp: 2890, streak: 5, achievements: 4, status: 'none', online: true,
    bio: 'Yêu sinh học và muốn trở thành bác sĩ',
  },
  {
    id: 's7', name: 'Bùi Thanh Tùng', username: 'btung',
    avatar: 'T', avatarColor: AVATAR_COLORS[3],
    grade: '12', school: 'THPT Hùng Vương', subjects: ['Lập trình', 'Toán học'],
    xp: 11200, streak: 60, achievements: 14, status: 'none', online: true,
    bio: 'Top 5 bảng xếp hạng. Chuyên lập trình thi Olympic',
  },
  {
    id: 's8', name: 'Hoàng Khánh Linh', username: 'khanhlinh',
    avatar: 'L', avatarColor: AVATAR_COLORS[6],
    grade: '11', school: 'THPT Gia Định', subjects: ['Vật lý', 'Toán học', 'Lập trình'],
    xp: 5670, streak: 12, achievements: 7, status: 'none', online: false, lastSeen: '3 giờ trước',
    bio: 'Đang học cơ học lượng tử và Python scientific',
  },
]

const GROUPS = [
  { id: 'g1', name: 'Vật lý 12 — Ôn thi THPTQG', members: 24, subject: 'Vật lý', icon: <Atom className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', joined: true },
  { id: 'g2', name: 'Toán Olympic & HSG', members: 15, subject: 'Toán học', icon: <Calculator className="w-4 h-4" />, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', joined: true },
  { id: 'g3', name: 'Python cho Khoa học', members: 38, subject: 'Lập trình', icon: <Globe className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', joined: false },
  { id: 'g4', name: 'Hóa hữu cơ nâng cao', members: 19, subject: 'Hóa học', icon: <FlaskConical className="w-4 h-4" />, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20', joined: false },
]

// ─────────────────────────────────────────────────────────────────
// StudentCard
// ─────────────────────────────────────────────────────────────────
function StudentCard({ student, onAction }: { student: Student; onAction: (id: string, action: 'add' | 'cancel' | 'accept' | 'reject' | 'message') => void }) {
  const [expanded, setExpanded] = useState(false)

  const actionBtn = () => {
    switch (student.status) {
      case 'friend':
        return (
          <button onClick={() => onAction(student.id, 'message')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-semibold hover:bg-violet-500/25 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> Nhắn tin
          </button>
        )
      case 'pending_sent':
        return (
          <button onClick={() => onAction(student.id, 'cancel')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.10] text-white/50 text-xs hover:bg-white/[0.08] transition-colors">
            <Clock className="w-3.5 h-3.5" /> Đã gửi
          </button>
        )
      case 'pending_received':
        return (
          <div className="flex gap-1.5">
            <button onClick={() => onAction(student.id, 'accept')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold transition-colors">
              <Check className="w-3.5 h-3.5" /> Đồng ý
            </button>
            <button onClick={() => onAction(student.id, 'reject')} className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.10] text-white/40 text-xs hover:bg-white/[0.08] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      default:
        return (
          <button onClick={() => onAction(student.id, 'add')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.10] text-white/60 text-xs font-semibold hover:bg-white/[0.08] hover:text-white transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Kết bạn
          </button>
        )
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-white/[0.07] p-4 hover:border-white/15 transition-all">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${student.avatarColor} flex items-center justify-center text-lg font-bold text-white`}>
            {student.avatar}
          </div>
          {student.online && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(225,15%,11%)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-white/90 truncate">{student.name}</p>
            {student.status === 'friend' && <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          </div>
          <p className="text-[0.7rem] text-white/35">@{student.username} · Lớp {student.grade}</p>
          <p className="text-[0.7rem] text-white/30 truncate">{student.school}</p>
        </div>

        {actionBtn()}
      </div>

      {/* Subjects */}
      <div className="flex flex-wrap gap-1 mt-3">
        {student.subjects.map(s => (
          <span key={s} className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/40 border border-white/[0.06]">{s}</span>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-3 text-[0.65rem] text-white/35">
        <span className="flex items-center gap-1 text-yellow-400/60"><Zap className="w-3 h-3" />{student.xp.toLocaleString()}</span>
        <span className="flex items-center gap-1 text-orange-400/60"><Flame className="w-3 h-3" />{student.streak} ngày</span>
        <span className="flex items-center gap-1 text-violet-400/60"><Trophy className="w-3 h-3" />{student.achievements}</span>
        <span className="ml-auto text-white/20">{student.online ? 'Đang online' : student.lastSeen}</span>
      </div>

      {student.bio && (
        <p className="text-[0.7rem] text-white/40 mt-2 italic leading-relaxed">"{student.bio}"</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [students, setStudents] = useState<Student[]>(STUDENTS)
  const [groups, setGroups]     = useState(GROUPS)
  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const [search, setSearch]       = useState('')
  const [filterSubject, setFilterSubject] = useState('all')

  const handleAction = (id: string, action: 'add' | 'cancel' | 'accept' | 'reject' | 'message') => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s
      if (action === 'add')    return { ...s, status: 'pending_sent' }
      if (action === 'cancel') return { ...s, status: 'none' }
      if (action === 'accept') return { ...s, status: 'friend' }
      if (action === 'reject') return { ...s, status: 'none' }
      return s
    }))
  }

  const toggleGroup = (id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, joined: !g.joined } : g))
  }

  const q = search.toLowerCase()
  const filtered = useMemo(() => students.filter(s => {
    if (q && !s.name.toLowerCase().includes(q) && !s.username.includes(q) && !s.school.toLowerCase().includes(q)) return false
    if (filterSubject !== 'all' && !s.subjects.includes(filterSubject)) return false
    return true
  }), [students, q, filterSubject])

  const friends   = filtered.filter(s => s.status === 'friend')
  const discover  = filtered.filter(s => s.status === 'none')
  const requests  = students.filter(s => s.status === 'pending_received' || s.status === 'pending_sent')

  const listMap: Record<Tab, Student[]> = {
    friends: friends, discover, requests, groups: [],
  }
  const list = listMap[activeTab]

  const TABS_DEF: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'friends',  label: 'Bạn bè',   icon: <UserCheck className="w-4 h-4" />, count: friends.length },
    { key: 'discover', label: 'Khám phá', icon: <Users className="w-4 h-4" />,     count: discover.length },
    { key: 'requests', label: 'Lời mời',  icon: <UserPlus className="w-4 h-4" />,  count: requests.length },
    { key: 'groups',   label: 'Nhóm học', icon: <GraduationCap className="w-4 h-4" /> },
  ]

  const ALL_SUBJECTS = ['Vật lý', 'Toán học', 'Hóa học', 'Sinh học', 'Lập trình']

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-violet-400" /> Bạn học</h1>
            <p className="text-white/40 text-sm mt-0.5">Kết nối, học cùng và chia sẻ với bạn bè</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
              {friends.length} bạn
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              {students.filter(s => s.online && s.status === 'friend').length} đang online
            </span>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, username hoặc trường…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/75 placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/60 focus:outline-none focus:border-violet-500/40 transition-colors"
          >
            <option value="all">Tất cả môn</option>
            {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {TABS_DEF.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-violet-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
            >
              {t.icon}{t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20' : 'bg-white/[0.08]'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab !== 'groups' ? (
          list.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.map(s => <StudentCard key={s.id} student={s} onAction={handleAction} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-white/25">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">
                {activeTab === 'friends'  ? 'Chưa có bạn bè nào. Hãy khám phá và kết bạn!' :
                 activeTab === 'discover' ? 'Không tìm thấy học sinh phù hợp' :
                                           'Không có lời mời kết bạn nào'}
              </p>
            </div>
          )
        ) : (
          /* Groups */
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all">
                <div className={`p-3 rounded-xl border ${g.bg} ${g.color} shrink-0`}>{g.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/85 truncate">{g.name}</p>
                  <p className="text-xs text-white/35 mt-0.5">{g.members} thành viên · {g.subject}</p>
                </div>
                <button
                  onClick={() => toggleGroup(g.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${g.joined ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400' : 'bg-white/[0.05] border border-white/[0.10] text-white/60 hover:bg-white/[0.08]'}`}
                >
                  {g.joined ? <><Check className="w-3.5 h-3.5" /> Đã tham gia</> : <><UserPlus className="w-3.5 h-3.5" /> Tham gia</>}
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
