import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Trash2, BookOpen, Settings, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { tokenStore } from '@/services/api'
import { AiSubscriptionGate } from '@/components/common/AiSubscriptionGate'
import { MathText } from '@/components/common/MathText'

const D = {
  bg: '#0d0e17',
  card: '#10111e',
  card2: '#161728',
  border: 'rgba(255,255,255,0.07)',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
  purpleL: '#a78bfa',
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  subject: string
  createdAt: Date
}

const SUBJECTS = ['Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử', 'Địa Lý']

const QUICK_PROMPTS = [
  'Giải thích khái niệm đạo hàm',
  'Phân tích bài thơ',
  'Tóm tắt chương vừa học',
  'Giải bài tập mẫu',
  'Kiểm tra kiến thức của tôi',
  'Tạo sơ đồ tư duy',
]

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
      {!isUser && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 12px rgba(124,58,237,0.3)' }}>
          <Bot style={{ width: 18, height: 18, color: '#fff' }} />
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : D.card2,
        border: isUser ? 'none' : `1px solid ${D.border}`,
        color: D.text,
        fontSize: 14,
        lineHeight: 1.6,
        boxShadow: isUser ? '0 0 16px rgba(124,58,237,0.2)' : 'none',
      }}>
        <MathText as="span">{msg.content}</MathText>
        <div style={{ fontSize: 10, color: isUser ? 'rgba(255,255,255,0.5)' : D.muted, marginTop: 4, textAlign: 'right' }}>
          {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: D.card2, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User style={{ width: 18, height: 18, color: D.muted }} />
        </div>
      )}
    </div>
  )
}

export default function AiTutor() {
  return (
    <AiSubscriptionGate
      feature="ai_tutor"
      featureLabel="Gia Sư AI"
      description="Gia Sư AI là trợ lý AI 24/7 — giải bài tập, giải thích khái niệm, ôn tập mọi môn học."
    >
      <AiTutorInner />
    </AiSubscriptionGate>
  )
}

function AiTutorInner() {
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Xin chào! Tôi là Gia Sư AI của AeroEdu. Tôi có thể giúp bạn giải thích khái niệm, làm bài tập, hoặc ôn tập bất kỳ môn học nào. Bạn muốn học gì hôm nay?',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('Toán')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Load conversation history
    const headers: HeadersInit = tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}
    fetch('/api/ai-tutor/conversations', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false))
  }, [])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}),
      }
      const res = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: trimmed, subject: selectedSubject, history: messages.slice(-10) }),
      })
      const data = await res.json()
      const reply = data.reply || data.message || data.content || 'Xin lỗi, tôi không hiểu câu hỏi của bạn.'
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date(),
      }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Cuộc trò chuyện mới bắt đầu. Tôi có thể giúp gì cho bạn?',
      timestamp: new Date(),
    }])
  }

  return (
    <div style={{ height: '100%', display: 'flex', background: D.bg, overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse-dot { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        textarea::-webkit-scrollbar{width:4px}
        textarea::-webkit-scrollbar-track{background:transparent}
        textarea::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .chat-scroll::-webkit-scrollbar{width:4px}
        .chat-scroll::-webkit-scrollbar-track{background:transparent}
        .chat-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        .quick-btn:hover{background:rgba(124,58,237,0.15)!important;border-color:rgba(124,58,237,0.4)!important;color:#a78bfa!important}
        .conv-item:hover{background:rgba(255,255,255,0.04)!important}
      `}</style>

      {/* Sidebar */}
      {showSidebar && (
        <div style={{ width: 260, background: D.card, borderRight: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Sidebar header */}
          <div style={{ padding: '20px 16px', borderBottom: `1px solid ${D.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(124,58,237,0.3)' }}>
                <Sparkles style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: D.text }}>Gia Sư AI</span>
            </div>
            <button
              onClick={clearChat}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              + Cuộc trò chuyện mới
            </button>
          </div>

          {/* Subject selector */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Môn học</div>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              style={{ width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, color: D.text, outline: 'none' }}
            >
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Conversation history */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 6px' }}>Lịch sử</div>
            {loadingConvs ? (
              <div style={{ textAlign: 'center', padding: '20px', color: D.muted, fontSize: 13 }}>Đang tải...</div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: D.muted, fontSize: 13 }}>Chưa có cuộc trò chuyện</div>
            ) : (
              conversations.slice(0, 20).map(conv => (
                <div key={conv.id} className="conv-item" style={{ padding: '8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, transition: 'background 0.15s' }}>
                  <div style={{ fontSize: 13, color: D.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.title || 'Cuộc trò chuyện'}
                  </div>
                  <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>{conv.subject}</div>
                </div>
              ))
            )}
          </div>

          {/* Bottom actions */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${D.border}`, display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/student/agent-settings')}
              style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'transparent', border: `1px solid ${D.border}`, color: D.muted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <Settings style={{ width: 14, height: 14 }} /> Cài đặt
            </button>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${D.border}`, background: D.card, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button
            onClick={() => setShowSidebar(v => !v)}
            style={{ width: 32, height: 32, borderRadius: 8, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 14, color: D.text, fontWeight: 600 }}>Gia Sư AI — {selectedSubject}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={clearChat}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Xóa cuộc trò chuyện"
          >
            <Trash2 style={{ width: 15, height: 15 }} />
          </button>
          <button
            onClick={() => navigate('/student/agent-settings')}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${D.border}`, color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <BookOpen style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {sending && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <div style={{ padding: '14px 18px', background: D.card2, border: `1px solid ${D.border}`, borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: D.purpleL, animation: `pulse-dot 1.4s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        <div style={{ padding: '8px 20px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, borderTop: `1px solid ${D.border}` }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              className="quick-btn"
              onClick={() => setInput(p)}
              style={{ padding: '5px 12px', borderRadius: 20, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 20px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 14, padding: '10px 10px 10px 16px' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Hỏi về ${selectedSubject}... (Enter để gửi, Shift+Enter xuống dòng)`}
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: D.text, fontSize: 14, lineHeight: 1.6, resize: 'none',
                maxHeight: 120, overflowY: 'auto',
              }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                background: input.trim() && !sending ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
                boxShadow: input.trim() && !sending ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              {sending
                ? <Loader2 style={{ width: 16, height: 16, color: D.muted, animation: 'spin 1s linear infinite' }} />
                : <Send style={{ width: 16, height: 16, color: input.trim() ? '#fff' : D.muted }} />}
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(148,163,184,0.5)', marginTop: 8 }}>
            AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
          </div>
        </div>
      </div>
    </div>
  )
}
