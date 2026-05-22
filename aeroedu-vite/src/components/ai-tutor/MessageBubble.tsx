/**
 * MessageBubble — render 1 message (user hoặc assistant) trong AI Tutor chat.
 *
 * Tách khỏi pages/student/AiTutor.tsx (file > 360 LOC) để:
 *   - Dễ test riêng (props rõ ràng)
 *   - Tái sử dụng cho /dashboard/AiTutor và các chat UI khác
 *   - Hot reload nhanh hơn khi tinh chỉnh style bubble
 *
 * Render MathText cho support công thức LaTeX trong câu trả lời AI.
 */
import { Bot, User } from 'lucide-react'
import { MathText } from '@/components/common/MathText'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/** Color tokens — đồng bộ với AiTutor.tsx parent (avoid prop drilling) */
const D = {
  card2: '#161728',
  border: 'rgba(255,255,255,0.07)',
  text: '#f1f5f9',
  muted: '#94a3b8',
} as const

export function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(124,58,237,0.3)',
          }}
        >
          <Bot style={{ width: 18, height: 18, color: '#fff' }} />
        </div>
      )}
      <div
        style={{
          maxWidth: '72%',
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : D.card2,
          border: isUser ? 'none' : `1px solid ${D.border}`,
          color: D.text,
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser ? '0 0 16px rgba(124,58,237,0.2)' : 'none',
        }}
      >
        <MathText as="span">{msg.content}</MathText>
        <div
          style={{
            fontSize: 10,
            color: isUser ? 'rgba(255,255,255,0.5)' : D.muted,
            marginTop: 4,
            textAlign: 'right',
          }}
        >
          {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: D.card2,
            border: `1px solid ${D.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User style={{ width: 18, height: 18, color: D.muted }} />
        </div>
      )}
    </div>
  )
}
