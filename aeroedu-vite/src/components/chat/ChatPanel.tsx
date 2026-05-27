/**
 * ChatPanel — Realtime chat drawer (1-1 hoặc nhóm) qua /api/broker WebSocket.
 *
 * Topic convention:
 *   - DM 1-1:  chat:dm:<lowId>:<highId>     (lowId là id nhỏ hơn — canonical)
 *   - Group:   chat:group:<groupId>
 *
 * Persistence:
 *   - Tin nhắn cache vào sessionStorage để F5 không mất
 *   - TTL: phiên (đóng tab = xoá)
 *   - Lịch sử dài hạn cần backend DB (TODO Phase 2)
 *
 * Usage:
 *   <ChatPanel
 *     open={!!chatTarget}
 *     onClose={() => setChatTarget(null)}
 *     target={chatTarget}
 *   />
 *
 *   target có 2 dạng:
 *     { kind: 'dm', userId, name, avatar, avatarColor, online }
 *     { kind: 'group', groupId, name, icon }
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Send, Smile, Loader2, WifiOff, Users } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { tokenStore } from '@/services/api'
import { connectBroker, type BrokerClient, type BrokerMsg } from '@/lib/broker-client'

/* ─── Types ─────────────────────────────────────────────────── */
export type ChatTarget =
  | {
      kind: 'dm'
      userId: string         // peer userId
      name: string
      avatar?: string
      avatarColor?: string
      online?: boolean
    }
  | {
      kind: 'group'
      groupId: string
      name: string
      icon?: React.ReactNode
    }

interface ChatPayload {
  kind: 'chat' | 'typing' | 'join' | 'leave'
  text?: string
  senderName?: string
  senderAvatar?: string
  senderColor?: string
}

interface ChatMessage {
  id: string
  topic: string
  fromId: string
  fromMe: boolean
  senderName: string
  senderAvatar?: string
  senderColor?: string
  text: string
  ts: number
}

/* ─── Helpers ───────────────────────────────────────────────── */
function buildTopic(target: ChatTarget, myId: string): string {
  if (target.kind === 'group') return `chat:group:${target.groupId}`
  // canonical DM topic = sorted id pair
  const [a, b] = [myId, target.userId].sort()
  return `chat:dm:${a}:${b}`
}

function storageKey(topic: string): string {
  return `__aeroedu_chat__${topic}`
}

function loadHistory(topic: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(topic))
    return raw ? (JSON.parse(raw) as ChatMessage[]).slice(-200) : []
  } catch {
    return []
  }
}

function saveHistory(topic: string, msgs: ChatMessage[]) {
  try {
    sessionStorage.setItem(storageKey(topic), JSON.stringify(msgs.slice(-200)))
  } catch { /* private mode */ }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

function avatarLetter(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?'
}

const QUICK_EMOJIS = ['👍', '❤️', '😄', '😂', '🎉', '🔥', '💯', '🤔']

/* ─── Component ─────────────────────────────────────────────── */
interface ChatPanelProps {
  open: boolean
  onClose: () => void
  target: ChatTarget | null
}

export default function ChatPanel({ open, onClose, target }: ChatPanelProps) {
  const { user } = useAuthContext()
  const token = tokenStore.getAccessToken()

  const myId = user?.id || ''
  const myName = user?.name || user?.email || 'Bạn'

  const topic = useMemo(
    () => (target && myId ? buildTopic(target, myId) : ''),
    [target, myId],
  )

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed')
  const [peerTyping, setPeerTyping] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  const clientRef = useRef<BrokerClient | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const peerTypingTimeoutRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Bootstrap WS connection only khi open + có token + có target
  useEffect(() => {
    if (!open || !token || !topic) {
      setStatus('closed')
      return
    }
    // Load history
    setMessages(loadHistory(topic))
    setStatus('connecting')

    const b = connectBroker({ token })
    clientRef.current = b

    const offWelcome = b.on('welcome', () => {
      b.subscribe([topic])
    })
    const offOpen = b.on('open', () => setStatus('open'))
    const offClose = b.on('close', () => setStatus('closed'))
    const offError = b.on('error', () => setStatus('error'))

    const offMsg = b.on('msg', (envelope) => {
      const m = envelope as BrokerMsg<ChatPayload>
      if (m.topic !== topic) return
      const payload = m.payload || {}
      if (payload.kind === 'typing') {
        if (m.from && m.from !== myId) {
          setPeerTyping(payload.senderName || 'Ai đó')
          if (peerTypingTimeoutRef.current) window.clearTimeout(peerTypingTimeoutRef.current)
          peerTypingTimeoutRef.current = window.setTimeout(() => setPeerTyping(null), 3000)
        }
        return
      }
      if (payload.kind === 'chat' && payload.text) {
        const fromMe = m.from === myId
        const newMsg: ChatMessage = {
          id: `${m.ts}-${m.from || 'x'}-${Math.random().toString(36).slice(2, 6)}`,
          topic: m.topic,
          fromId: m.from || 'unknown',
          fromMe,
          senderName: payload.senderName || (fromMe ? myName : 'Bạn học'),
          senderAvatar: payload.senderAvatar,
          senderColor: payload.senderColor,
          text: payload.text,
          ts: m.ts,
        }
        setMessages((prev) => {
          const next = [...prev, newMsg].slice(-200)
          saveHistory(topic, next)
          return next
        })
      }
    })

    return () => {
      offWelcome(); offOpen(); offClose(); offError(); offMsg()
      b.close()
      clientRef.current = null
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
      if (peerTypingTimeoutRef.current) window.clearTimeout(peerTypingTimeoutRef.current)
    }
  }, [open, token, topic, myId, myName])

  // Auto-scroll on new message
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [messages, peerTyping])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  if (!open || !target) return null

  const sendMessage = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !clientRef.current?.isOpen()) return
    clientRef.current.publish<ChatPayload>(topic, {
      kind: 'chat',
      text: trimmed,
      senderName: myName,
    })
    setDraft('')
    setShowEmoji(false)
  }

  const sendTyping = () => {
    if (!clientRef.current?.isOpen()) return
    if (typingTimeoutRef.current) return // throttle 1.5s
    clientRef.current.publish<ChatPayload>(topic, {
      kind: 'typing',
      senderName: myName,
    })
    typingTimeoutRef.current = window.setTimeout(() => {
      typingTimeoutRef.current = null
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(draft)
    } else {
      sendTyping()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Drawer right */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] bg-[hsl(225,15%,9%)] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        style={{ maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          {target.kind === 'dm' ? (
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${target.avatarColor || 'from-violet-500 to-purple-600'} flex items-center justify-center text-base font-bold text-white`}
              >
                {target.avatar || avatarLetter(target.name)}
              </div>
              {target.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(225,15%,9%)]" />
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-300 shrink-0">
              {target.icon || <Users className="w-5 h-5" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{target.name}</p>
            <div className="flex items-center gap-1.5 text-[0.7rem] text-white/40">
              {status === 'connecting' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang kết nối…
                </>
              )}
              {status === 'open' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Realtime sẵn sàng
                </>
              )}
              {status === 'closed' && (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" /> Đang kết nối lại…
                </>
              )}
              {status === 'error' && (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400" /> Lỗi kết nối
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-3 py-4 space-y-2 [scrollbar-width:thin]"
        >
          {messages.length === 0 ? (
            <div className="text-center text-white/30 py-12">
              <Smile className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Chưa có tin nhắn nào.</p>
              <p className="text-xs mt-1">Hãy gửi tin nhắn đầu tiên 👋</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1]
              const showSender =
                !m.fromMe && (!prev || prev.fromId !== m.fromId || m.ts - prev.ts > 60_000)
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  showSender={showSender}
                />
              )
            })
          )}

          {peerTyping && (
            <div className="flex items-center gap-2 text-xs text-white/40 pl-2">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '240ms' }} />
              </span>
              <span>{peerTyping} đang gõ…</span>
            </div>
          )}
        </div>

        {/* Quick emoji */}
        {showEmoji && (
          <div className="flex gap-1 px-3 py-2 border-t border-white/10 bg-white/[0.02]">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => sendMessage(e)}
                className="text-lg p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${showEmoji ? 'text-violet-400 bg-violet-500/10' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.06]'}`}
              aria-label="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status === 'open' ? 'Gõ tin nhắn…' : 'Đang kết nối…'}
              disabled={status !== 'open'}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/40 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={() => sendMessage(draft)}
              disabled={!draft.trim() || status !== 'open'}
              className="p-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Gửi"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[0.65rem] text-white/25 mt-1.5 px-1">
            Tin nhắn được mã hoá truyền (TLS) qua broker realtime. Lịch sử lưu tạm trên thiết bị bạn.
          </p>
        </div>
      </div>
    </>
  )
}

/* ─── Message Bubble ────────────────────────────────────────── */
function MessageBubble({ msg, showSender }: { msg: ChatMessage; showSender: boolean }) {
  if (msg.fromMe) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          <div className="px-3.5 py-2 rounded-2xl rounded-br-md bg-violet-600 text-white text-sm break-words shadow-sm">
            {msg.text}
          </div>
          <p className="text-[0.6rem] text-white/30 text-right mt-0.5 px-1">{formatTime(msg.ts)}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-2 items-end">
      <div
        className={`w-7 h-7 rounded-lg bg-gradient-to-br ${msg.senderColor || 'from-cyan-500 to-blue-600'} flex items-center justify-center text-xs font-bold text-white shrink-0`}
      >
        {msg.senderAvatar || avatarLetter(msg.senderName)}
      </div>
      <div className="max-w-[78%]">
        {showSender && (
          <p className="text-[0.65rem] text-white/40 pl-1 mb-0.5">{msg.senderName}</p>
        )}
        <div className="px-3.5 py-2 rounded-2xl rounded-bl-md bg-white/[0.07] text-white/90 text-sm break-words border border-white/[0.05]">
          {msg.text}
        </div>
        <p className="text-[0.6rem] text-white/30 mt-0.5 px-1">{formatTime(msg.ts)}</p>
      </div>
    </div>
  )
}
