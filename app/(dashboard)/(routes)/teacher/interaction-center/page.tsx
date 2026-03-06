'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  MessageSquare, Send, Users, Bell, Brain, Mic, Video,
  Phone, Search, Filter, MoreVertical, Star, Clock,
  CheckCircle, AlertCircle, Smile, Zap, Sparkles, Plus
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

export default function InteractionCenter() {
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications' | 'ai-copilot'>('chat');
  const [selectedStudent, setSelectedStudent] = useState<string | null>('student-1');
  const [messageInput, setMessageInput] = useState('');
  const [autoMessages, setAutoMessages] = useState<AutoMessage[]>([
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

  const [chatHistory, setChatHistory] = useState<Message[]>([
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
      studentName: t('emotion.teacher'),
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

  const handlePhoneCall = () => {
    const student = students.find(s => s.id === selectedStudent);
    console.log(`📞 [Chat] Initiating phone call with: ${student?.name}`);
    alert(`📞 Tính năng gọi điện sẽ được triển khai!\n\nGọi cho: ${student?.name}`);
  };

  const handleVideoCall = () => {
    const student = students.find(s => s.id === selectedStudent);
    console.log(`📹 [Chat] Initiating video call with: ${student?.name}`);
    alert(`📹 Tính năng video call sẽ được triển khai!\n\nVideo call với: ${student?.name}`);
  };

  const handleVoiceMessage = () => {
    console.log(`🎤 [Chat] Recording voice message...`);
    alert('🎤 Tính năng ghi âm sẽ được triển khai!');
  };

  const handleNewNotification = () => {
    console.log(`➕ [Notifications] Creating new auto notification...`);
    alert('➕ Tính năng tạo thông báo tự động sẽ được triển khai!');
  };

  const handleTemplateSelect = (type: 'encouragement' | 'reminder' | 'congratulation') => {
    const templates = {
      encouragement: 'Hôm nay em làm tốt lắm! Cố gắng giữ vững phong độ nhé! 💪',
      reminder: 'Em nhớ hoàn thành bài tập trước hạn chót ngày mai nhé! ⏰',
      congratulation: 'Chúc mừng em đã đạt thành tích xuất sắc! Thầy rất tự hào! 🎉'
    };
    
    setMessageInput(templates[type]);
    console.log(`📋 [Chat] Template selected: ${type}`);
  };

  const handleAIFollowup = () => {
    console.log(`🤖 [AI] Sending AI-generated follow-up messages...`);
    alert('🤖 AI đang tạo tin nhắn follow-up tự động cho 3 học sinh!');
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedStudent) return;

    const selectedStudentData = students.find(s => s.id === selectedStudent);
    
    console.log(`💬 [Chat] Sending message to: ${selectedStudentData?.name}`);
    console.log(`📝 [Chat] Message: ${messageInput.substring(0, 50)}...`);

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      studentId: selectedStudent,
      studentName: t('emotion.teacher'),
      studentAvatar: '👨‍🏫',
      message: messageInput,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'teacher',
      read: true
    };

    try {
      // TODO: Save to database
      // await fetch('/api/chat/send', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     recipientId: selectedStudent,
      //     message: messageInput
      //   })
      // });

      // Update local state
      setChatHistory([...chatHistory, newMessage]);
      setMessageInput('');

      console.log(`✅ [Chat] Message sent successfully to ${selectedStudentData?.name}`);
      
      // Show visual feedback
      const studentName = selectedStudentData?.name || 'học sinh';
      setTimeout(() => {
        alert(`✅ Tin nhắn đã gửi đến ${studentName}!\n\n"${messageInput}"`);
      }, 100);

    } catch (error) {
      console.error('❌ [Chat] Error sending message:', error);
      alert('❌ Lỗi khi gửi tin nhắn. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💬 Interaction Center
          </h1>
          <p className="text-gray-600">
            Tương tác trực tiếp với học sinh • AI Copilot hỗ trợ 24/7
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'chat' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'notifications' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bell className="h-4 w-4 inline mr-2" />
            Auto Notifications
          </button>
          <button
            onClick={() => setActiveTab('ai-copilot')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ai-copilot' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Brain className="h-4 w-4 inline mr-2" />
            AI Copilot
          </button>
        
              </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Student List */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="mb-4">
                <input
                  type="search"
                  placeholder="Search students..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-2">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      selectedStudent === student.id
                        ? 'bg-purple-100 border-2 border-purple-600'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="relative">
                      <span className="text-2xl">{student.avatar}</span>
                      {student.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                      <p className="text-xs text-gray-600">
                        {student.online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    {student.unread > 0 && (
                      <div className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {student.unread}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg flex flex-col" style={{ height: '600px' }}>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {students.find(s => s.id === selectedStudent)?.avatar}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {students.find(s => s.id === selectedStudent)?.name}
                    </p>
                    <p className="text-sm text-green-600">Online</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handlePhoneCall}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Gọi điện"
                  >
                    <Phone className="h-5 w-5 text-gray-600" />
                  </button>
                  <button 
                    onClick={handleVideoCall}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Video call"
                  >
                    <Video className="h-5 w-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.filter(m => m.studentId === selectedStudent).map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'teacher' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${
                      message.type === 'teacher' ? 'order-2' : ''
                    }`}>
                      <div className="flex items-end space-x-2">
                        {message.type !== 'teacher' && (
                          <span className="text-2xl">{message.studentAvatar}</span>
                        )}
                        <div>
                          <div className={`rounded-lg p-3 ${
                            message.type === 'teacher'
                              ? 'bg-purple-600 text-white'
                              : message.type === 'ai'
                              ? 'bg-blue-100 text-blue-900 border-2 border-blue-300'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {message.type === 'ai' && (
                              <p className="text-xs font-semibold mb-1 flex items-center">
                                <Brain className="h-3 w-3 mr-1" />
                                AI Suggestion
                              </p>
                            )}
                            <p className="text-sm">{message.message}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button 
                    onClick={handleVoiceMessage}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                    title="Ghi âm"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Scheduled Messages */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📅 Scheduled Messages
                  </h3>
                  <button 
                    onClick={handleNewNotification}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 flex items-center transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
                  </button>
                </div>

                <div className="space-y-4">
                  {autoMessages.map((msg) => (
                    <div key={msg.id} className={`border-l-4 rounded-lg p-4 ${
                      msg.type === 'encouragement' ? 'border-green-500 bg-green-50' :
                      msg.type === 'reminder' ? 'border-orange-500 bg-orange-50' :
                      msg.type === 'congratulation' ? 'border-blue-500 bg-blue-50' :
                      'border-red-500 bg-red-50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {msg.type === 'encouragement' && '💪'}
                            {msg.type === 'reminder' && '⏰'}
                            {msg.type === 'congratulation' && '🎉'}
                            {msg.type === 'warning' && '⚠️'}
                            {' '}{msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          msg.sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {msg.sent ? 'Sent' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{msg.message}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          To: {msg.recipient === 'all' ? 'All students' : msg.recipient}
                        </p>
                        {msg.scheduledFor && (
                          <p className="text-xs text-gray-600">
                            Schedule: {msg.scheduledFor}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  ⚡ Quick Templates
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleTemplateSelect('encouragement')}
                    className="w-full text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1">💪 Encouragement</p>
                    <p className="text-xs text-gray-600">&quot;Hôm nay em làm tốt lắm!&quot;</p>
                  </button>
                  <button 
                    onClick={() => handleTemplateSelect('reminder')}
                    className="w-full text-left p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1">⏰ Reminder</p>
                    <p className="text-xs text-gray-600">&quot;Nhắc hoàn thành bài tập&quot;</p>
                  </button>
                  <button 
                    onClick={() => handleTemplateSelect('congratulation')}
                    className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1">🎉 Congratulation</p>
                    <p className="text-xs text-gray-600">&quot;Chúc mừng đạt thành tích!&quot;</p>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center mb-4">
                  <Sparkles className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold">AI Tips</h3>
                </div>
                <p className="text-sm opacity-90 mb-3">
                  &quot;3 học sinh chưa trả lời tin nhắn của thầy. AI gợi ý gửi follow-up sau 24h.&quot;
                </p>
                <button 
                  onClick={handleAIFollowup}
                  className="text-sm bg-white text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  Send Follow-up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Copilot Tab */}
        {activeTab === 'ai-copilot' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Brain className="h-5 w-5 text-purple-600 mr-2" />
              AI Copilot - Trợ lý Giáo viên Thông minh
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">🤖 Auto-response to Students</h4>
                <p className="text-sm text-gray-700 mb-4">
                  AI Copilot tự động trả lời câu hỏi học sinh khi thầy không online. 
                  Thầy sẽ được thông báo và có thể can thiệp bất cứ lúc nào.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Status:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">💡 Smart Suggestions</h4>
                <p className="text-sm text-gray-700 mb-4">
                  AI phân tích cuộc hội thoại và đề xuất tài liệu, bài tập phù hợp với vấn đề của học sinh.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Status:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">📊 Conversation Analytics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total messages:</span>
                    <span className="font-semibold">127</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg response time:</span>
                    <span className="font-semibold">2.5 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI handled:</span>
                    <span className="font-semibold">45%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">⚠️ Alerts</h4>
                <p className="text-sm text-gray-700">
                  AI sẽ cảnh báo khi phát hiện học sinh gặp khó khăn hoặc có dấu hiệu bỏ học.
                </p>
                <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-2">
                  <p className="text-xs text-red-800">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    2 học sinh cần được quan tâm
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

