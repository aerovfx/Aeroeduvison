/**
 * ArkAssistant — Floating chat panel kết nối ByteDance/BytePlus Ark Bot.
 *
 * Bot: bot-202505141114-mfrvj-procode-preset (ap-southeast-1)
 *   - Built-in knowledge base (RAG)
 *   - Function calling preset
 *   - Role-aware (HS/GV/Admin)
 *
 * UI:
 *   - Floating bubble góc dưới-phải toàn site
 *   - Click → expand chat panel
 *   - Stream response via SSE
 *   - Persist conversation trong session
 *
 * Khác AI Tutor (Claude direct):
 *   - Ark có knowledge base + function calls
 *   - Phù hợp tư vấn / customer support / hỏi nhanh
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Trash2 } from 'lucide-react'
import { api, tokenStore } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const LS_KEY = 'ark:chat:history:v1'
const MAX_HISTORY = 20  // Giữ 20 messages trong session

export default function ArkAssistant() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Mascot Aero bấm vào → mở trợ lý
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('aero:open-assistant', onOpen)
    return () => window.removeEventListener('aero:open-assistant', onOpen)
  }, [])

  // Load history từ LS
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
    } catch { /* ignore */ }
  }, [messages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-focus input khi open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Welcome greeting nếu chưa có message nào
  const greeting = (() => {
    if (messages.length > 0) return null
    const role = user?.role || 'STUDENT'
    if (role === 'TEACHER') {
      return `Xin chào thầy/cô ${user?.name || ''}! 👋\nEm là trợ lý AeroEdu. Em có thể giúp:\n• Tư vấn phương pháp giảng dạy\n• Soạn giáo án nhanh (gợi ý mở /teacher/lesson-plans)\n• Phân tích kết quả học sinh\n\nThầy/cô cần hỗ trợ gì ạ?`
    }
    if (role === 'ADMIN') {
      return `Xin chào Admin! 👋\nEm là trợ lý AeroEdu. Em có thể giúp:\n• Quản lý khoá học / giáo viên / học sinh\n• Phân tích báo cáo hệ thống\n• Workflow + quy trình vận hành\n\nAnh/chị cần gì ạ?`
    }
    return `Xin chào ${user?.name || 'bạn'}! 👋\nMình là trợ lý AeroEdu. Mình có thể giúp:\n• Giải bài tập + giải thích kiến thức\n• Gợi ý lộ trình học\n• Tư vấn nghề nghiệp\n\nBạn muốn hỏi gì? 🌟`
  })()

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    setStreamingContent('')

    // Abort previous request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      // Build conversation history (last 10 + current)
      const conversationMessages = [
        ...messages.slice(-9).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ]

      const baseURL = '/api'
      const token = tokenStore.getAccessToken() || ''
      const resp = await fetch(`${baseURL}/ark-bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: conversationMessages,
          stream: true,
          role: user?.role || 'STUDENT',
        }),
        signal: abortRef.current.signal,
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
        // Special handling for 429 quota exceeded
        if (resp.status === 429) {
          throw new Error(err.message || 'Đã hết quota AI hôm nay — Đăng ký Pro để dùng không giới hạn')
        }
        throw new Error(err.message || err.error || `HTTP ${resp.status}`)
      }

      if (!resp.body) throw new Error('No response body')

      // Read SSE stream
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process SSE chunks: `data: {...}\n\n`
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''  // last incomplete line back to buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            const delta = json.choices?.[0]?.delta?.content
              || json.choices?.[0]?.message?.content
              || ''
            if (delta) {
              accumulated += delta
              setStreamingContent(accumulated)
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      // Final assistant message
      if (accumulated) {
        setMessages(m => [...m, {
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
        }])
      }
      setStreamingContent('')
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Lỗi gửi tin nhắn')
        setStreamingContent('')
      }
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleClearHistory = () => {
    if (!confirm('Xoá toàn bộ lịch sử chat?')) return
    setMessages([])
    localStorage.removeItem(LS_KEY)
    toast.success('Đã xoá lịch sử')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating bubble button (bottom-right) — bottom-20 mobile (above tab bar) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{ touchAction: 'manipulation' }}
          className="fixed bottom-20 md:bottom-5 right-5 z-40
                     w-14 h-14 rounded-full
                     bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500
                     shadow-2xl border-2 border-white/20
                     flex items-center justify-center
                     hover:scale-110 transition active:scale-95
                     animate-pulse hover:animate-none"
          title="Trợ lý AI AeroEdu"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500
                             border-2 border-zinc-950 text-white text-[10px] font-bold
                             flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-5 right-3 md:right-5 z-50
                        w-[calc(100vw-24px)] max-w-md
                        h-[70vh] max-h-[600px]
                        bg-zinc-950 border-2 border-purple-500/40
                        rounded-2xl shadow-2xl
                        flex flex-col overflow-hidden
                        animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800
                          bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-amber-900/30
                          flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white">Trợ lý AeroEdu</h3>
              <p className="text-[10px] text-purple-200/70 truncate">
                Ark Bot · {user?.role === 'TEACHER' ? 'Giáo viên' : user?.role === 'ADMIN' ? 'Admin' : 'Học sinh'}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                title="Xoá lịch sử"
                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{ touchAction: 'manipulation' }}
              className="p-2 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3"
               style={{ WebkitOverflowScrolling: 'touch' }}>
            {greeting && (
              <div className="flex gap-2 items-start">
                <div className="p-1.5 rounded-full bg-purple-500/20 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                </div>
                <div className="flex-1 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-400/20
                                text-xs text-purple-100 whitespace-pre-line">
                  {greeting}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}

            {streamingContent && (
              <MessageBubble role="assistant" content={streamingContent} streaming />
            )}

            {loading && !streamingContent && (
              <div className="flex gap-2 items-center text-zinc-500 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang nghĩ...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 bg-zinc-900/50 p-2">
            <div className="flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi gì cũng được... (Enter để gửi, Shift+Enter xuống dòng)"
                rows={1}
                maxLength={2000}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700
                           focus:border-purple-500 text-xs text-white placeholder-zinc-600
                           resize-none max-h-32 outline-none"
                style={{ minHeight: 36 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                style={{ touchAction: 'manipulation' }}
                className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500
                           hover:from-purple-400 hover:to-pink-400 disabled:opacity-30
                           disabled:cursor-not-allowed
                           text-white shadow-lg hover:scale-105 transition active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[9px] text-zinc-600 mt-1 px-1 flex justify-between">
              <span>Powered by BytePlus Ark Bot</span>
              <span>{input.length}/2000</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ──────────────── Message bubble ──────────────── */

function MessageBubble({ role, content, streaming }: {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`p-1.5 rounded-full shrink-0 ${
        isUser ? 'bg-cyan-500/20' : 'bg-purple-500/20'
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-cyan-300" />
          : <Bot className="w-3.5 h-3.5 text-purple-300" />}
      </div>
      <div className={`flex-1 px-3 py-2 rounded-lg border max-w-[80%] ${
        isUser
          ? 'bg-cyan-500/10 border-cyan-400/20 text-cyan-50'
          : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-100'
      }`}>
        <div className="text-xs whitespace-pre-wrap break-words leading-relaxed">
          {content}
          {streaming && <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse" />}
        </div>
      </div>
    </div>
  )
}
