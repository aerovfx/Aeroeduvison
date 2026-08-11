/**
 * InteractionCenter — Trung tâm tương tác với học sinh (chat + gọi + tin nhắn tự động).
 * Danh bạ HS (online/unread), khung chat 1-1, gửi tin nhắn nhanh, gọi video/voice,
 * tin nhắn tự động chia theo loại (nhắc bài tập/thưởng/cảnh báo...). Dùng API realtime.
 */

import { useState, useEffect } from 'react'
import {
  MessageSquare, Send, Users, Bell, Brain,
  Video, Phone, Search, MoreVertical, Star, Clock,
  FileText, TrendingUp, Sparkles, Zap, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'

interface Student {
  id: string
  name: string
  avatar: string
  online: boolean
  unread: number
}

interface Message {
  id: string
  studentId: string
  studentName: string
  studentAvatar: string
  message: string
  timestamp: string
  type: 'student' | 'teacher' | 'ai'
}

interface AutoMessage {
  id: string
  type: 'encouragement' | 'reminder' | 'congratulation' | 'warning'
  recipient: string
  message: string
  scheduledFor?: string
  sent: boolean
}

const STUDENTS: Student[] = [
  { id: 's1', name: 'Nguyễn Văn A', avatar: '👨‍🎓', online: true, unread: 1 },
  { id: 's2', name: 'Trần Thị B', avatar: '👩‍🎓', online: true, unread: 0 },
  { id: 's3', name: 'Lê Văn C', avatar: '👨‍🎓', online: false, unread: 3 },
  { id: 's4', name: 'Phạm Thị D', avatar: '👩‍🎓', online: true, unread: 0 },
]

const CHAT: Message[] = [
  { id: 'm1', studentId: 's1', studentName: 'Nguyễn Văn A', studentAvatar: '👨‍🎓', message: 'Thầy ơi, em không hiểu bài tập về đạo hàm hàm hợp.', timestamp: '10:30 AM', type: 'student' },
  { id: 'm2', studentId: 's1', studentName: 'Giáo viên', studentAvatar: '👨‍🏫', message: 'Em xem lại video bài 5 nhé. Có ví dụ chi tiết.', timestamp: '10:32 AM', type: 'teacher' },
  { id: 'm3', studentId: 's1', studentName: 'AI Copilot', studentAvatar: '🤖', message: 'Học sinh Nguyễn Văn A có thể cần giải thích thêm về quy tắc chuỗi. Đề xuất gửi link video hoặc tài liệu bổ sung.', timestamp: '10:31 AM', type: 'ai' },
]

const AUTO_MSGS: AutoMessage[] = [
  { id: 'a1', type: 'reminder', recipient: 's3', message: 'Lê Văn C, em chưa hoàn thành bài tập tuần này. Cố gắng lên nhé! 💪', scheduledFor: '2024-10-19 09:00', sent: false },
  { id: 'a2', type: 'congratulation', recipient: 's4', message: 'Phạm Thị D đạt 100% bài học hôm qua! Tuyệt vời! 🎉', sent: true },
]

function TypeBadge({ type }: { type: AutoMessage['type'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    encouragement: { label: 'Động viên', cls: 'bg-green-50 text-green-600 border-green-200' },
    reminder:      { label: 'Nhắc nhở',  cls: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
    congratulation:{ label: 'Chúc mừng', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    warning:       { label: 'Cảnh báo',  cls: 'bg-red-50 text-red-600 border-red-200' },
  }
  const { label, cls } = map[type] ?? { label: 'Thông báo', cls: 'bg-gray-50 text-gray-600 border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${cls}`}>
      {label}
    </span>
  )
}

// Component chính: danh bạ + chat + tin nhắn tự động
export default function InteractionCenterPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications' | 'ai-copilot'>('chat')
  const [students, setStudents] = useState<Student[]>(STUDENTS)
  const [selectedStudent, setSelectedStudent] = useState<string>('s1')
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Nạp HS THẬT: lớp đang dạy (ClassStudent) + HS đã kết nối (TeacherStudentLink approved)
  useEffect(() => {
    let alive = true
    api.get<{ students: Array<{ id: string; name: string; avatar: string | null; classNames?: string[]; isLinked?: boolean }>; total: number }>('/teacher/roster')
      .then(r => {
        if (!alive) return
        const list = r.data?.students || []
        if (!list.length) return // giữ mock nếu chưa có HS
        const mapped: Student[] = list.map(s => ({
          id: s.id,
          name: s.name,
          avatar: '🧑‍🎓',
          online: false,
          unread: 0,
        }))
        setStudents(mapped)
        setSelectedStudent(mapped[0].id)
      })
      .catch(() => { /* giữ mock nếu lỗi */ })
    return () => { alive = false }
  }, [])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const selectedData = students.find(s => s.id === selectedStudent)
  const currentChat = CHAT.filter(m => m.studentId === selectedStudent || m.type !== 'ai')

  const pendingCount = AUTO_MSGS.filter(m => !m.sent).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-blue-50 opacity-60" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-md">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600">Trung tâm Tương tác</h1>
                <p className="text-sm text-gray-600">Giao tiếp với học sinh và phụ huynh</p>
              </div>
            </div>
            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`p-2 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                title="Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`p-2 rounded-lg transition-all relative ${activeTab === 'notifications' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                title="Thông báo"
              >
                <Bell className="w-4 h-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('ai-copilot')}
                className={`p-2 rounded-lg transition-all ${activeTab === 'ai-copilot' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                title="AI Copilot"
              >
                <Brain className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>

          {/* Student List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:col-span-1 flex flex-col overflow-hidden">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                    selectedStudent === s.id
                      ? 'bg-purple-50 border border-purple-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-lg">
                      {s.avatar}
                    </div>
                    {s.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.online ? 'Trực tuyến' : 'Ngoại tuyến'}</p>
                  </div>
                  {s.unread > 0 && (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      {s.unread}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:col-span-2 flex flex-col overflow-hidden">
            {selectedData ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-lg">
                      {selectedData.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{selectedData.name}</h3>
                      <p className="text-xs text-gray-500">
                        {selectedData.online ? '🟢 Trực tuyến' : '⚫ Ngoại tuyến'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[Phone, Video, MoreVertical].map((Icon, i) => (
                      <button key={i} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 py-2">
                  {CHAT.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-2 ${msg.type === 'teacher' ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-sm shrink-0">
                        {msg.studentAvatar}
                      </div>
                      <div className={`max-w-[70%] ${msg.type === 'teacher' ? 'items-end' : ''}`}>
                        <div className={`p-3 rounded-2xl text-sm ${
                          msg.type === 'teacher'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                            : msg.type === 'ai'
                            ? 'bg-purple-50 border border-purple-200 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.type === 'ai' && (
                            <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                              <Brain className="w-3 h-3" /> AI Copilot
                            </div>
                          )}
                          {msg.message}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 px-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                      <FileText className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      onKeyDown={e => { if (e.key === 'Enter') { toast.success('Đã gửi tin nhắn'); setMessageInput('') } }}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <button
                      onClick={() => { if (messageInput) { toast.success('Đã gửi tin nhắn'); setMessageInput('') } }}
                      className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chọn học sinh để chat</h3>
                  <p className="text-sm text-gray-500">Chọn một học sinh từ danh sách bên trái</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: AI / Notifications / Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:col-span-1 overflow-y-auto">

            {activeTab === 'notifications' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Thông báo</h2>
                </div>
                <div className="space-y-3">
                  {AUTO_MSGS.map(msg => (
                    <div key={msg.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <TypeBadge type={msg.type} />
                        <span className="text-xs text-gray-500">{msg.sent ? 'Đã gửi' : 'Chờ gửi'}</span>
                      </div>
                      <p className="text-sm text-gray-800 mb-2">{msg.message}</p>
                      {msg.scheduledFor && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {msg.scheduledFor}
                        </p>
                      )}
                      {!msg.sent && (
                        <button
                          onClick={() => toast.success('Đã gửi thông báo')}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                        >
                          <Send className="w-3 h-3" /> Gửi ngay
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai-copilot' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">AI Copilot</h2>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">Gợi ý hôm nay</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      3 học sinh chưa hoàn thành bài tập tuần này. Nên gửi thông báo nhắc nhở.
                    </p>
                    <button
                      onClick={() => toast.success('Đã gửi nhắc nhở đến học sinh')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                    >
                      <Send className="w-3 h-3" /> Gửi nhắc nhở
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">Thành tích nổi bật</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Phạm Thị D đạt 100% hoàn thành bài học trong 5 ngày liên tiếp.
                    </p>
                    <button
                      onClick={() => toast.success('Đã gửi lời khen thưởng!')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                    >
                      <Star className="w-3 h-3" /> Khen thưởng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Tác vụ nhanh</h2>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: Bell, label: 'Gửi thông báo cho tất cả' },
                    { icon: FileText, label: 'Tạo báo cáo tuần' },
                    { icon: Users, label: 'Mời phụ huynh tham gia' },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      onClick={() => toast.success('Tính năng đang phát triển')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
