import { useState, useEffect, useRef } from 'react'
import {
  Bot, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Play, Square, Send,
} from 'lucide-react'

interface AgentTemplate {
  id: string
  name: string
  category: string
  description: string
}

interface OpenFangStatus {
  running: boolean
  pid?: number
  url: string
}

const TEMPLATES: AgentTemplate[] = [
  { id: 'tutor-general', name: 'Tutor', category: 'General', description: 'A patient educational agent that explains concepts step-by-step and adapts to the learner\'s level.' },
  { id: 'lesson-planner', name: 'Lesson Planner', category: 'Subject', description: 'Helps design lesson plans, learning objectives, and classroom activities aligned with your syllabus.' },
  { id: 'assessment-designer', name: 'Assessment Designer', category: 'Assessment', description: 'Assists in creating quizzes and exams, suggesting question types and difficulty levels.' },
  { id: 'feedback-writer', name: 'Feedback Writer', category: 'Support', description: 'Generates constructive feedback for students based on their performance and progress.' },
  { id: 'parent-communicator', name: 'Parent Communicator', category: 'Support', description: 'Drafts clear, professional messages to parents about student progress and classroom updates.' },
  { id: 'general-assistant', name: 'General Assistant', category: 'General', description: 'A versatile conversational agent that helps with everyday teaching tasks and quick questions.' },
]

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentTemplate>(TEMPLATES[0])
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([])
  const [sending, setSending] = useState(false)
  const [openFangStatus, setOpenFangStatus] = useState<OpenFangStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [controlling, setControlling] = useState(false)
  const [serviceMsg, setServiceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkStatus()
    const iv = setInterval(checkStatus, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkStatus = async () => {
    try {
      setCheckingStatus(true)
      const res = await fetch('/api/openfang-service')
      const data = await res.json()
      setOpenFangStatus(data)
      setServiceMsg(null)
    } catch {
      // ignore
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleControl = async (action: 'start' | 'stop') => {
    setControlling(true)
    setServiceMsg(null)
    try {
      const res = await fetch('/api/openfang-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await res.json()
      if (result.success) {
        setServiceMsg({
          type: 'success',
          text: action === 'start' ? '✅ OpenFang Agent OS đã khởi động thành công!' : '⏹️ OpenFang Agent OS đã dừng.',
        })
        await checkStatus()
      } else {
        setServiceMsg({ type: 'error', text: `❌ ${result.error || 'Không thể điều khiển service'}` })
      }
    } catch (err) {
      setServiceMsg({ type: 'error', text: `❌ Lỗi kết nối` })
    } finally {
      setControlling(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    if (!openFangStatus?.running) {
      setServiceMsg({ type: 'error', text: '❌ AI chưa được khởi động. Nhấn "Start OpenFang" để bắt đầu.' })
      return
    }
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)
    try {
      const res = await fetch('/api/openfang-service/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent.id, message: text }),
      })
      const data = await res.json()
      const reply = data.reply || data.content || data.message || 'Trợ giảng đang xử lý yêu cầu của bạn.'
      setMessages(prev => [...prev, { role: 'agent', text: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', text: `❌ Lỗi kết nối. Vui lòng kiểm tra OpenFang và thử lại.` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-0 min-h-screen bg-[#0d0e17]">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-3 border-r border-[#1e2033] bg-[#10111e]">
        <div className="p-4 border-b border-[#1e2033]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Agents</h2>
              <p className="text-[10px] text-gray-500">Teaching assistants</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3 px-2">
            Available Agents
          </div>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => setSelectedAgent(tpl)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                selectedAgent.id === tpl.id
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedAgent.id === tpl.id
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                  : 'bg-white/5'
              }`}>
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{tpl.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{tpl.category}</div>
              </div>
              {selectedAgent.id === tpl.id && (
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat */}
      <main className="col-span-12 md:col-span-9 flex flex-col h-screen">
        {/* Service Control */}
        <div className="border-b border-[#1e2033] bg-[#10111e] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${openFangStatus?.running ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
              <div>
                <div className="text-xs font-semibold text-white">OpenFang Agent OS</div>
                <div className="text-[10px]">
                  {openFangStatus?.running
                    ? <span className="text-green-400">● Online - AI thực tế đang chạy</span>
                    : <span className="text-gray-500">● Offline - Nhấn Start để kích hoạt AI</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!openFangStatus?.running ? (
                <button
                  onClick={() => handleControl('start')}
                  disabled={controlling}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-green-500 to-blue-500 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  {controlling ? 'Starting...' : 'Start OpenFang'}
                </button>
              ) : (
                <button
                  onClick={() => handleControl('stop')}
                  disabled={controlling}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 disabled:opacity-50 flex items-center gap-2"
                >
                  <Square className="w-3 h-3" />
                  {controlling ? 'Stopping...' : 'Stop OpenFang'}
                </button>
              )}
              <button
                onClick={checkStatus}
                disabled={checkingStatus}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {serviceMsg && (
            <div className={`mt-3 p-2 rounded-lg text-xs flex items-center gap-2 ${
              serviceMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {serviceMsg.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {serviceMsg.text}
            </div>
          )}

          {!openFangStatus?.running && (
            <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              <span><strong>OpenFang đang tắt</strong> — Nhấn &quot;Start OpenFang&quot; để kích hoạt AI thực tế.</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                {openFangStatus?.running ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/30">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">🤖 AI thực tế đã sẵn sàng!</h3>
                    <p className="text-xs text-gray-400">Hỏi trợ giảng AI bất kỳ câu hỏi nào về giảng dạy, soạn bài, thiết kế đề thi, v.v.</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-[#1a1b2e] flex items-center justify-center mx-auto mb-4 border border-[#2a2b3d]">
                      <AlertCircle className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">💤 OpenFang đang tắt</h3>
                    <p className="text-xs text-gray-400 mb-1">Nhấn &quot;Start OpenFang&quot; ở trên để kích hoạt AI thực tế.</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md shadow-purple-900/30'
                    : 'bg-[#1a1b2e] text-white border border-[#2a2b3d]'
                }`}>
                  <div className="text-xs whitespace-pre-wrap">{m.text}</div>
                  {m.role === 'agent' && (
                    <div className="text-[9px] text-gray-500 mt-2 flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> AI Assistant
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#1e2033] bg-[#10111e] p-4">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Nhập câu hỏi cho trợ giảng AI..."
              disabled={!openFangStatus?.running || sending}
              className="flex-1 bg-[#1a1b2e] border border-[#2a2b3d] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!openFangStatus?.running || sending || !input.trim()}
              className="px-6 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white disabled:opacity-50 flex items-center gap-2 shadow-md shadow-purple-900/30 transition-all"
            >
              {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
