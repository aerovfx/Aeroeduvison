'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  MessageSquare, Send, Users, Bell, Brain, Mic, Video,
  Phone, Search, Filter, MoreVertical, Star, Clock,
  CheckCircle, AlertCircle, Smile, Zap, Sparkles, Plus,
  Image as ImageIcon, FileText, X
} from 'lucide-react';

interface Message {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  message: string;
  timestamp: string;
  type: 'student' | 'teacher' | 'ai';
  read: boolean;
}

interface AutoMessage {
  id: string;
  type: 'encouragement' | 'reminder' | 'congratulation' | 'warning';
  recipient: string | 'all';
  message: string;
  scheduledFor?: string;
  sent: boolean;
}

// AI Native Glass Card
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

// AI Native Badge
function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-[hsl(var(--warning)/0.3)]',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
    info: 'bg-[hsl(var(--info)/0.15)] text-blue-600 border-[hsl(var(--info)/0.3)]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant]}`}>
      {children}
    </span>
  );
}

export default function InteractionCenter() {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'chat' | 'notifications' | 'ai-copilot'>('chat');
  const [selectedStudent, setSelectedStudent] = useState<string | null>('student-1');
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [autoMessages] = useState<AutoMessage[]>([
    {
      id: 'auto-1',
      type: 'reminder',
      recipient: 'student-3',
      message: 'Lê Văn C, em chưa hoàn thành bài tập tuần này. Cố gắng lên nhé! 💪',
      scheduledFor: '2024-10-19 09:00',
      sent: false
    },
    {
      id: 'auto-2',
      type: 'congratulation',
      recipient: 'student-4',
      message: 'Phạm Thị D đạt 100% bài học hôm qua! Tuyệt vời! 🎉',
      sent: true
    }
  ]);

  const [chatHistory] = useState<Message[]>([
    {
      id: 'msg-1',
      studentId: 'student-1',
      studentName: 'Nguyễn Văn A',
      studentAvatar: '👨‍🎓',
      message: 'Thầy ơi, em không hiểu bài tập về đạo hàm hàm hợp.',
      timestamp: '10:30 AM',
      type: 'student',
      read: true
    },
    {
      id: 'msg-2',
      studentId: 'student-1',
      studentName: 'Giáo viên',
      studentAvatar: '👨‍🏫',
      message: 'Em xem lại video bài 5 nhé. Có ví dụ chi tiết.',
      timestamp: '10:32 AM',
      type: 'teacher',
      read: true
    },
    {
      id: 'msg-3',
      studentId: 'student-1',
      studentName: 'AI Copilot',
      studentAvatar: '🤖',
      message: 'Học sinh Nguyễn Văn A có thể cần giải thích thêm về quy tắc chuỗi. Đề xuất gửi link video hoặc tài liệu bổ sung.',
      timestamp: '10:31 AM',
      type: 'ai',
      read: true
    }
  ]);

  const students = [
    { id: 'student-1', name: 'Nguyễn Văn A', avatar: '👨‍🎓', online: true, unread: 1 },
    { id: 'student-2', name: 'Trần Thị B', avatar: '👩‍🎓', online: true, unread: 0 },
    { id: 'student-3', name: 'Lê Văn C', avatar: '👨‍🎓', online: false, unread: 3 },
    { id: 'student-4', name: 'Phạm Thị D', avatar: '👩‍🎓', online: true, unread: 0 },
  ];

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const currentChat = chatHistory.filter(m =>
    selectedStudent && (m.studentId === selectedStudent || m.studentId === 'student-1')
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'encouragement': return <AIBadge variant="success">Động viên</AIBadge>;
      case 'reminder': return <AIBadge variant="warning">Nhắc nhở</AIBadge>;
      case 'congratulation': return <AIBadge variant="info">Chúc mừng</AIBadge>;
      case 'warning': return <AIBadge className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Cảnh báo</AIBadge>;
      default: return <AIBadge>Thông báo</AIBadge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* AI Native Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600">Trung tâm Tương tác</h1>
                <p className="text-sm text-gray-600">Giao tiếp với học sinh và phụ huynh</p>
              </div>
            </div>
            <div className="flex gap-2 glass-panel rounded-xl px-3 py-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'chat'
                    ? 'ai-button-primary text-white'
                    : 'ai-button text-gray-900 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all relative ${
                  activeTab === 'notifications'
                    ? 'ai-button-primary text-white'
                    : 'ai-button text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Bell className="w-4 h-4" />
                {autoMessages.filter(m => !m.sent).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[hsl(var(--destructive))] rounded-full text-[10px] flex items-center justify-center text-white">
                    {autoMessages.filter(m => !m.sent).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('ai-copilot')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'ai-copilot'
                    ? 'ai-button-primary text-white'
                    : 'ai-button text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Brain className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          {/* Students List */}
          <GlassCard className="lg:col-span-1 flex flex-col overflow-hidden">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ai-input w-full pl-10 pr-3 py-2 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedStudent === student.id
                      ? 'bg-[hsl(var(--primary))/20] border border-purple-200'
                      : 'glass-panel hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] flex items-center justify-center text-lg">
                      {student.avatar}
                    </div>
                    {student.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[hsl(var(--success))] rounded-full border-2 border-[hsl(var(--card))]" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                    <p className="text-xs text-gray-600">
                      {student.online ? 'Trực tuyến' : 'Ngoại tuyến'}
                    </p>
                  </div>
                  {student.unread > 0 && (
                    <div className="w-5 h-5 bg-[hsl(var(--destructive))] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      {student.unread}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Chat Area */}
          <GlassCard className="lg:col-span-2 flex flex-col overflow-hidden">
            {selectedStudentData ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] flex items-center justify-center text-lg">
                      {selectedStudentData.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedStudentData.name}</h3>
                      <p className="text-xs text-gray-600">
                        {selectedStudentData.online ? '🟢 Trực tuyến' : '⚫ Ngoại tuyến'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="ai-button text-gray-900 p-2 rounded-xl">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="ai-button text-gray-900 p-2 rounded-xl">
                      <Video className="w-4 h-4" />
                    </button>
                    <button className="ai-button text-gray-900 p-2 rounded-xl">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {currentChat.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${msg.type === 'teacher' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] flex items-center justify-center text-sm">
                        {msg.studentAvatar}
                      </div>
                      <div className={`max-w-[70%] ${msg.type === 'teacher' ? 'items-end' : ''}`}>
                        <div
                          className={`p-3 rounded-2xl ${
                            msg.type === 'teacher'
                              ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white'
                              : msg.type === 'ai'
                              ? 'bg-[hsl(var(--primary))/10] border border-purple-200'
                              : 'glass-panel'
                          }`}
                        >
                          {msg.type === 'ai' && (
                            <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                              <Brain className="w-3 h-3" />
                              AI Copilot
                            </div>
                          )}
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 px-2">
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <button className="ai-button text-gray-900 p-2 rounded-xl">
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button className="ai-button text-gray-900 p-2 rounded-xl">
                      <FileText className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      className="ai-input flex-1 px-4 py-2.5 rounded-xl"
                      onKeyPress={(e) => e.key === 'Enter' && setMessageInput('')}
                    />
                    <button className="ai-button-primary text-white p-2.5 rounded-xl">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chọn học sinh để chat</h3>
                  <p className="text-sm text-gray-600">Chọn một học sinh từ danh sách bên trái</p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* AI Copilot / Notifications */}
          <GlassCard className="lg:col-span-1 overflow-y-auto">
            {activeTab === 'notifications' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Thông báo</h2>
                </div>
                <div className="space-y-3">
                  {autoMessages.map(msg => (
                    <div key={msg.id} className="p-4 rounded-xl glass-panel border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        {getTypeBadge(msg.type)}
                        <span className="text-xs text-gray-600">
                          {msg.sent ? 'Đã gửi' : 'Chờ gửi'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{msg.message}</p>
                      {msg.scheduledFor && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {msg.scheduledFor}
                        </p>
                      )}
                      {!msg.sent && (
                        <button className="ai-button-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold mt-2 flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          Gửi ngay
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai-copilot' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <Brain className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">AI Copilot</h2>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))/10] to-[hsl(var(--secondary))/10] border border-[hsl(var(--primary)/0.2)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">Gợi ý hôm nay</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      3 học sinh chưa hoàn thành bài tập tuần này. Nên gửi thông báo nhắc nhở.
                    </p>
                    <button className="ai-button-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold mt-3 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      Gửi nhắc nhở
                    </button>
                  </div>

                  <div className="p-4 rounded-xl glass-panel border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">Thành tích nổi bật</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Phạm Thị D đạt 100% hoàn thành bài học trong 5 ngày liên tiếp.
                    </p>
                    <button className="ai-button-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold mt-3 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Khen thưởng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Tác vụ nhanh</h2>
                </div>
                <div className="space-y-2">
                  <button className="w-full ai-button text-gray-900 p-3 rounded-xl flex items-center gap-3 text-sm">
                    <Bell className="w-4 h-4" />
                    Gửi thông báo cho tất cả
                  </button>
                  <button className="w-full ai-button text-gray-900 p-3 rounded-xl flex items-center gap-3 text-sm">
                    <FileText className="w-4 h-4" />
                    Tạo báo cáo tuần
                  </button>
                  <button className="w-full ai-button text-gray-900 p-3 rounded-xl flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4" />
                    Mời phụ huynh tham gia
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
