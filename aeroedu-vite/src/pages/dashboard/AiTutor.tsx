/**
 * AI Tutor Page — thay thế app/(dashboard)/(routes)/ai-tutor/page.tsx
 * Streaming response dùng fetch ReadableStream thay StreamingTextResponse của Next.js
 * WebSocket giữ nguyên socket.io-client
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Brain, Send, Sparkles, RefreshCw, Lightbulb, ThumbsUp, ThumbsDown,
  Bot, User, Loader2, Zap
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { AiSubscriptionGate } from '@/components/common/AiSubscriptionGate'
import { MathText } from '@/components/common/MathText'

interface Message {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

const QUICK_PROMPTS = [
  'Giải thích định luật Newton thứ 2',
  'Công thức tính lực điện trường',
  'Sự khác biệt giữa quang hợp và hô hấp',
  'Giải phương trình bậc 2 bằng công thức',
]

export default function AiTutorPage() {
  return (
    <AiSubscriptionGate
      feature="ai_tutor"
      featureLabel="AI Tutor"
      description="AI Tutor là gia sư AI 24/7 — giải thích bài tập, hướng dẫn từng bước, hỗ trợ mọi môn học."
    >
      <AiTutorPageInner />
    </AiSubscriptionGate>
  )
}

function AiTutorPageInner() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'bot',
      content: `Xin chào! Tôi là **AI Tutor** của AeroEduVision. Tôi có thể giúp bạn:\n\n- Giải thích các khái niệm khoa học\n- Hướng dẫn giải bài tập từng bước\n- Tạo kế hoạch ôn thi cá nhân hóa\n- Trả lời câu hỏi về bất kỳ môn học nào\n\nBạn muốn hỏi gì hôm nay? 😊`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Stream AI response từ Rust AI service
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    }
    const botMsgId = (Date.now() + 1).toString()
    const botMsg: Message = {
      id: botMsgId,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, botMsg])
    setInput('')
    setIsStreaming(true)

    try {
      // Non-streaming JSON endpoint exposed by server.cjs (Anthropic-backed).
      // Path must be /api/ai-tutor/chat — /api/ai/chat does not exist and
      // falls through to the Rust backend proxy which returns 503.
      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-6).map((m) => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      })

      const data = await response.json().catch(() => null) as
        | { reply?: string; message?: string; content?: string; error?: string }
        | null

      if (!response.ok) {
        // Prefer the server-provided Vietnamese reply if present
        const fallback = data?.reply || data?.message
          || (response.status === 503
            ? 'Dịch vụ AI hiện chưa sẵn sàng. Vui lòng thử lại sau.'
            : 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, content: fallback, isStreaming: false } : m,
          ),
        )
        return
      }

      const reply = data?.reply || data?.message || data?.content
        || 'Xin lỗi, tôi chưa tạo được câu trả lời. Bạn thử đặt lại câu hỏi nhé.'

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, content: reply, isStreaming: false } : m,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.', isStreaming: false }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--ai-page-bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)] flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-foreground">AI Tutor</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,76%,36%)] inline-block" />
            Đang hoạt động
          </p>
        </div>
        <button
          onClick={() => setMessages([{ id: '0', type: 'bot', content: 'Cuộc trò chuyện mới bắt đầu! Bạn muốn hỏi gì?', timestamp: new Date() }])}
          className="ml-auto p-2 rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
          title="Cuộc trò chuyện mới"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3 animate-fade-in', msg.type === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold',
                msg.type === 'bot'
                  ? 'bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)]'
                  : 'bg-gradient-to-br from-[hsl(142,76%,36%)] to-[hsl(175,80%,40%)]',
              )}
            >
              {msg.type === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
                msg.type === 'bot'
                  ? 'bg-card border border-border rounded-tl-sm'
                  : 'bg-[hsl(262,83%,58%)] text-white rounded-tr-sm',
              )}
            >
              <div className="leading-relaxed">
                <MathText as="span">{msg.content}</MathText>
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>
              {msg.type === 'bot' && !msg.isStreaming && msg.content && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                  <button className="text-muted-foreground hover:text-emerald-600 transition">
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button className="text-muted-foreground hover:text-destructive transition">
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="flex items-center gap-1.5 text-xs bg-card border border-border rounded-full px-3 py-1.5 hover:border-indigo-500/50 hover:text-indigo-500 transition"
            >
              <Lightbulb className="w-3 h-3" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-end gap-2 bg-background border border-border rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-ring transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi bất cứ điều gì... (Enter để gửi)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground resize-none outline-none max-h-32 py-1.5"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-9 h-9 rounded-xl bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          Shift+Enter để xuống dòng
        </p>
      </div>
    </div>
  )
}
