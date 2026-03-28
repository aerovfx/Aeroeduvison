"use client"

import "@/styles/neumorphic-theme.css"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Send, Bot, User, Sparkles, Trash2, BookOpen, Settings } from "lucide-react"
import { toast } from "react-hot-toast"

// Neumorphic Card Component
function NeuCard({ children, className = "", hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`${className} transition-all duration-400`}
      style={{
        background: "var(--neu-card-bg)",
        borderRadius: "24px",
        padding: "24px",
        boxShadow: `
          10px 10px 20px var(--neu-shadow-dark),
          -10px -10px 20px var(--neu-shadow-light),
          inset 1px 1px 2px var(--neu-shadow-inset-dark)
        `,
        border: "1px solid var(--neu-border)",
        ...(hover && {
          cursor: "pointer",
        }),
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.transform = "translateY(-6px) scale(1.01)"
          e.currentTarget.style.background = "var(--neu-card-hover-bg)"
          e.currentTarget.style.boxShadow = `
            14px 14px 28px var(--neu-shadow-dark),
            -14px -14px 28px var(--neu-shadow-light)
          `
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.transform = "translateY(0) scale(1)"
          e.currentTarget.style.background = "var(--neu-card-bg)"
          e.currentTarget.style.boxShadow = `
            10px 10px 20px var(--neu-shadow-dark),
            -10px -10px 20px var(--neu-shadow-light),
            inset 1px 1px 2px var(--neu-shadow-inset-dark)
          `
        }
      }}
    >
      {children}
    </div>
  )
}

// Neumorphic Badge Component
function NeuBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "empty" | "danger" | "info" }) {
  const variants = {
    default: { bg: "rgba(102, 126, 234, 0.15)", color: "var(--neu-accent-primary)", border: "rgba(102, 126, 234, 0.3)" },
    success: { bg: "rgba(72, 187, 120, 0.15)", color: "var(--neu-accent-success)", border: "rgba(72, 187, 120, 0.3)" },
    warning: { bg: "rgba(237, 137, 54, 0.15)", color: "var(--neu-accent-warning)", border: "rgba(237, 137, 54, 0.3)" },
    empty: { bg: "rgba(160, 174, 192, 0.15)", color: "var(--neu-text-muted)", border: "rgba(160, 174, 192, 0.3)" },
    danger: { bg: "rgba(245, 101, 101, 0.15)", color: "var(--neu-accent-danger)", border: "rgba(245, 101, 101, 0.3)" },
    info: { bg: "rgba(66, 153, 225, 0.15)", color: "var(--neu-accent-info)", border: "rgba(66, 153, 225, 0.3)" },
  }

  return (
    <span
      className="px-3 py-1 rounded-lg text-xs font-bold"
      style={{
        background: variants[variant].bg,
        color: variants[variant].color,
        border: `1px solid ${variants[variant].border}`,
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px var(--glass-border)",
      }}
    >
      {children}
    </span>
  )
}

// Neumorphic Button Component
function NeuButton({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled = false,
  size = "default",
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "primary" | "success" | "danger"
  className?: string
  disabled?: boolean
  size?: "default" | "sm"
}) {
  const variants = {
    default: {
      bg: "var(--neu-button-bg)",
      color: "var(--neu-text-primary)",
      shadow: "var(--neu-shadow-dark)",
    },
    primary: {
      bg: "var(--neu-button-primary-bg)",
      color: "var(--neu-text-inverse)",
      shadow: "rgba(102, 126, 234, 0.4)",
    },
    success: {
      bg: "var(--neu-button-success-bg)",
      color: "var(--neu-text-inverse)",
      shadow: "rgba(72, 187, 120, 0.4)",
    },
    danger: {
      bg: "var(--neu-button-danger-bg)",
      color: "var(--neu-text-inverse)",
      shadow: "rgba(245, 101, 101, 0.4)",
    },
  }

  const sizeStyles = {
    default: { padding: "14px 28px", fontSize: "0.9rem" },
    sm: { padding: "10px 20px", fontSize: "0.8rem" },
  }

  return (
    <button
      className={`${className} transition-all duration-300`}
      style={{
        background: disabled ? "var(--neu-bg-secondary)" : variants[variant].bg,
        color: disabled ? "var(--neu-text-muted)" : variants[variant].color,
        border: "none",
        borderRadius: "16px",
        padding: sizeStyles[size].padding,
        fontSize: sizeStyles[size].fontSize,
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : `8px 8px 16px ${variants[variant].shadow}, -6px -6px 12px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)`,
        opacity: disabled ? 0.6 : 1,
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-2px)"
          e.currentTarget.style.boxShadow = `
            10px 10px 20px ${variants[variant].shadow},
            -8px -8px 16px var(--neu-shadow-light)
          `
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = `
            8px 8px 16px ${variants[variant].shadow},
            -6px -6px 12px var(--neu-shadow-light),
            inset 2px 2px 4px rgba(0, 0, 0, 0.1)
          `
        }
      }}
    >
      {children}
    </button>
  )
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

const TUTOR_SYSTEM_BASE = `Bạn là Gia Sư AI (AI Tutor) của Aeroeduvison.

Nhiệm vụ của bạn:
- Giúp học sinh hiểu khái niệm qua giải thích rõ ràng, dễ hiểu
- Điều chỉnh độ khó dựa trên trình độ học sinh
- Khuyến khích và động viên học sinh
- Sử dụng ví dụ thực tế để minh họa

Phong cách:
- Thân thiện, kiên nhẫn
- Giải thích từ dễ đến khó
- Kiểm tra hiểu biết sau mỗi phần
- Sử dụng emoji để tạo không khí vui vẻ

Bạn có thể giúp:
- Giải bài tập Toán, Lý, Hóa, Sinh, Văn, Anh
- Giải thích khái niệm
- Ôn thi
- Học từ vựng
- Và nhiều môn học khác.`

function buildTutorSystemPrompt(opts: {
  useSocraticMethod?: boolean
  explanationDepth?: string
  learningStyle?: string
}) {
  let extra = ""
  if (opts.useSocraticMethod !== false) {
    extra += "\n- Sử dụng phương pháp Socratic: đặt câu hỏi gợi mở thay vì đưa đáp án ngay."
  }
  if (opts.explanationDepth === "short") {
    extra += "\n- Trả lời ngắn gọn, đi thẳng vào ý chính."
  } else if (opts.explanationDepth === "detailed") {
    extra += "\n- Giải thích chi tiết, nhiều bước và ví dụ."
  }
  if (opts.learningStyle === "visual") {
    extra += "\n- Ưu tiên mô tả hình ảnh, sơ đồ, so sánh trực quan."
  } else if (opts.learningStyle === "auditory") {
    extra += "\n- Ưu tiên giải thích bằng ngôn từ, lặp lại ý quan trọng."
  } else if (opts.learningStyle === "kinesthetic") {
    extra += "\n- Gợi ý bài tập thực hành, bước làm cụ thể."
  }
  return TUTOR_SYSTEM_BASE + extra
}

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("Toán")
  const [agentConfig, setAgentConfig] = useState<{
    temperature: number
    maxTokens: number
    useSocraticMethod: boolean
    explanationDepth: string
    learningStyle: string
    defaultSubject: string
  }>({
    temperature: 0.7,
    maxTokens: 2048,
    useSocraticMethod: true,
    explanationDepth: "medium",
    learningStyle: "mixed",
    defaultSubject: "Toán",
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetch("/api/student/agent-settings")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const at = (data.settings || {})["ai-tutor"] as Record<string, unknown> | undefined
        if (at) {
          setAgentConfig((prev) => ({
            temperature: typeof at.temperature === "number" ? at.temperature : prev.temperature,
            maxTokens: typeof at.maxTokens === "number" ? at.maxTokens : prev.maxTokens,
            useSocraticMethod: at.useSocraticMethod !== false,
            explanationDepth: (at.explanationDepth as string) || prev.explanationDepth,
            learningStyle: (at.learningStyle as string) || prev.learningStyle,
            defaultSubject: (at.defaultSubject as string) || prev.defaultSubject,
          }))
          setSubject((at.defaultSubject as string) || "Toán")
        }
      })
      .catch(() => {})
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    const systemPrompt = buildTutorSystemPrompt({
      useSocraticMethod: agentConfig.useSocraticMethod,
      explanationDepth: agentConfig.explanationDepth,
      learningStyle: agentConfig.learningStyle,
    })

    try {
      const response = await fetch("/api/agents/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: `Môn học: ${subject}\nCâu hỏi: ${input}` }
          ],
          config: {
            model: "gpt-4o-mini",
            temperature: agentConfig.temperature,
            maxTokens: agentConfig.maxTokens,
          },
        }),
      })

      if (!response.ok) {
        // Try to parse error response as JSON
        let data: any = {}
        try {
          data = await response.json()
        } catch {
          data = { error: `Server error: ${response.status} ${response.statusText}` }
        }

        // Handle subscription required error
        if (response.status === 403 && data.error === "SUBSCRIPTION_REQUIRED") {
          const subscriptionMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Yêu cầu đăng ký gói dịch vụ**\n\n${data.message}\n\n👉 [Đăng ký ngay tại đây](/dashboard/billing) để sử dụng AI Tutor và các tính năng AI khác.`,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, subscriptionMessage])
          toast.error("Bạn cần đăng ký gói hàng tháng để sử dụng AI")
          return
        }
        throw new Error(data.error || "Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error("[AI_TUTOR] Error:", error)
      const errorMsg = error.message || "Unknown error"
      // Show error as assistant message so user sees what happened
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Không thể kết nối AI**\n\n${
          errorMsg.includes("SUBSCRIPTION")
            ? "Bạn cần đăng ký gói dịch vụ để sử dụng AI Tutor."
            : errorMsg.includes("Cannot connect") || errorMsg.includes("fetch")
            ? "Không thể kết nối đến dịch vụ AI. Hãy kiểm tra:\n- Ollama đang chạy (`ollama serve`)\n- Hoặc OPENROUTER_API_KEY trong .env.local"
            : `Lỗi: ${errorMsg}`
        }\n\nHãy thử lại sau hoặc kiểm tra cấu hình server.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error("Không thể kết nối với Gia Sư AI")
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    toast.success("Đã xóa lịch sử chat")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "linear-gradient(135deg, var(--neu-bg-gradient-start) 0%, var(--neu-bg-gradient-mid) 50%, var(--neu-bg-gradient-end) 100%)",
        backgroundSize: "200% 200%",
        animation: "gradientShift 15s ease infinite",
      }}
    >
      {/* Neumorphic Header */}
      <div
        className="px-6 py-6"
        style={{
          borderBottom: "1px solid var(--neu-border)",
          background: "var(--neu-card-bg)",
          boxShadow: "4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)",
        }}
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px var(--neu-shadow-light)",
                }}
              >
                <Bot className="h-6 w-6" style={{ color: "var(--neu-text-inverse)" }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Gia Sư AI
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--neu-text-secondary)", fontWeight: "500" }}>
                  Gia sư 1-1 cho từng môn học
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Subject Selector */}
              <div
                style={{
                  background: "var(--neu-input-bg)",
                  borderRadius: "16px",
                  padding: "4px 16px",
                  boxShadow: "inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)",
                  border: "1px solid var(--neu-border)",
                }}
              >
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--neu-text-primary)",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    padding: "10px 8px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <option value="Toán">Toán</option>
                  <option value="Lý">Vật Lý</option>
                  <option value="Hóa">Hóa Học</option>
                  <option value="Sinh">Sinh Học</option>
                  <option value="Văn">Ngữ Văn</option>
                  <option value="Anh">Tiếng Anh</option>
                </select>
              </div>
              <Link
                href="/student/agent-settings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: "var(--neu-input-bg)",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                  border: "1px solid var(--neu-border)",
                }}
              >
                <Settings className="h-4 w-4" />
                Cài đặt
              </Link>
              <NeuButton variant="danger" size="sm" onClick={clearChat}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa chat
              </NeuButton>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <NeuCard hover={false}>
                <div className="p-12 text-center">
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                      borderRadius: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                      boxShadow: "6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px var(--neu-shadow-light)",
                    }}
                  >
                    <Bot className="h-10 w-10" style={{ color: "var(--neu-text-inverse)" }} />
                  </div>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{
                      background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Chào bạn! Mình là Gia Sư AI 👋
                  </h3>
                  <p className="text-muted-foreground mb-6" style={{ color: "var(--neu-text-secondary)" }}>
                    Mình có thể giúp bạn học Toán, Lý, Hóa, Sinh, Văn, Anh...
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
                    {/* Welcome Card 1: Giải thích khái niệm */}
                    <div
                      onClick={() => setInput("Giải thích khái niệm về đạo hàm")}
                      className="transition-all duration-400"
                      style={{
                        background: "linear-gradient(145deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.05) 100%)",
                        borderRadius: "20px",
                        padding: "20px",
                        cursor: "pointer",
                        boxShadow: `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--glass-border)
                        `,
                        border: "1px solid var(--neu-border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.1) 100%)"
                        e.currentTarget.style.boxShadow = `
                          12px 12px 24px var(--neu-shadow-dark),
                          -12px -12px 24px var(--neu-shadow-light)
                        `
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)"
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.05) 100%)"
                        e.currentTarget.style.boxShadow = `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--glass-border)
                        `
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "12px",
                          boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.3), -2px -2px 4px var(--neu-shadow-light)",
                        }}
                      >
                        <BookOpen className="h-5 w-5" style={{ color: "var(--neu-text-inverse)" }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: "var(--neu-text-primary)", marginBottom: "4px" }}>
                        Giải thích khái niệm
                      </p>
                      <p className="text-xs" style={{ color: "var(--neu-text-secondary)" }}>
                        Ví dụ: đạo hàm, tích phân...
                      </p>
                    </div>

                    {/* Welcome Card 2: Giải bài tập */}
                    <div
                      onClick={() => setInput("Giúp mình giải bài toán này")}
                      className="transition-all duration-400"
                      style={{
                        background: "linear-gradient(145deg, rgba(72, 187, 120, 0.15) 0%, rgba(56, 161, 105, 0.05) 100%)",
                        borderRadius: "20px",
                        padding: "20px",
                        cursor: "pointer",
                        boxShadow: `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--glass-border)
                        `,
                        border: "1px solid var(--neu-border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(72, 187, 120, 0.25) 0%, rgba(56, 161, 105, 0.1) 100%)"
                        e.currentTarget.style.boxShadow = `
                          12px 12px 24px var(--neu-shadow-dark),
                          -12px -12px 24px var(--neu-shadow-light)
                        `
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)"
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(72, 187, 120, 0.15) 0%, rgba(56, 161, 105, 0.05) 100%)"
                        e.currentTarget.style.boxShadow = `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--glass-border)
                        `
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          background: "linear-gradient(135deg, var(--neu-accent-success) 0%, var(--neu-accent-success) 100%)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "12px",
                          boxShadow: "4px 4px 8px rgba(72, 187, 120, 0.3), -2px -2px 4px var(--neu-shadow-light)",
                        }}
                      >
                        <Sparkles className="h-5 w-5" style={{ color: "var(--neu-text-inverse)" }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: "var(--neu-text-primary)", marginBottom: "4px" }}>
                        Giải bài tập
                      </p>
                      <p className="text-xs" style={{ color: "var(--neu-text-secondary)" }}>
                        Toán, Lý, Hóa...
                      </p>
                    </div>

                    {/* Welcome Card 3: Ôn thi */}
                    <div
                      onClick={() => setInput("Ôn thi học kỳ cùng mình")}
                      className="transition-all duration-400"
                      style={{
                        background: "linear-gradient(145deg, rgba(66, 153, 225, 0.15) 0%, rgba(50, 120, 180, 0.05) 100%)",
                        borderRadius: "20px",
                        padding: "20px",
                        cursor: "pointer",
                        boxShadow: `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--glass-border)
                        `,
                        border: "1px solid var(--neu-border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(66, 153, 225, 0.25) 0%, rgba(50, 120, 180, 0.1) 100%)"
                        e.currentTarget.style.boxShadow = `
                          12px 12px 24px var(--neu-shadow-dark),
                          -12px -12px 24px var(--neu-shadow-light)
                        `
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)"
                        e.currentTarget.style.background = "linear-gradient(145deg, rgba(66, 153, 225, 0.15) 0%, rgba(50, 120, 180, 0.05) 100%)"
                        e.currentTarget.style.boxShadow = `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--glass-border)
                        `
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          background: "linear-gradient(135deg, var(--neu-accent-info) 0%, var(--neu-accent-info) 100%)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "12px",
                          boxShadow: "4px 4px 8px rgba(66, 153, 225, 0.3), -2px -2px 4px var(--neu-shadow-light)",
                        }}
                      >
                        <Bot className="h-5 w-5" style={{ color: "var(--neu-text-inverse)" }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: "var(--neu-text-primary)", marginBottom: "4px" }}>
                        Ôn thi
                      </p>
                      <p className="text-xs" style={{ color: "var(--neu-text-secondary)" }}>
                        Học kỳ, cuối năm...
                      </p>
                    </div>
                  </div>
                </div>
              </NeuCard>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                        boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4), -2px -2px 4px var(--neu-shadow-light)",
                      }}
                    >
                      <Bot className="h-5 w-5" style={{ color: "var(--neu-text-inverse)" }} />
                    </div>
                  )}
                  <div
                    className={`p-4 max-w-[80%] transition-all duration-300`}
                    style={{
                      background: message.role === "user"
                        ? "var(--neu-button-primary-bg)"
                        : "var(--neu-card-bg)",
                      borderRadius: "20px",
                      boxShadow: message.role === "user"
                        ? "8px 8px 16px rgba(102, 126, 234, 0.4), -6px -6px 12px var(--neu-shadow-light)"
                        : `
                          8px 8px 16px var(--neu-shadow-dark),
                          -8px -8px 16px var(--neu-shadow-light),
                          inset 1px 1px 2px var(--neu-shadow-inset-dark)
                        `,
                      border: message.role === "user" ? "none" : "1px solid var(--neu-border)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === "user" ? (
                        <User className="h-4 w-4" style={{ color: "var(--neu-text-inverse)" }} />
                      ) : (
                        <NeuBadge variant="info">Gia Sư AI</NeuBadge>
                      )}
                      <span className="text-xs" style={{ color: message.role === "user" ? "hsl(var(--foreground) / 0.8)" : "var(--neu-text-muted)" }}>
                        {message.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap" style={{ color: message.role === "user" ? "var(--neu-text-inverse)" : "var(--neu-text-primary)" }}>
                      {message.content}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "var(--neu-bg-secondary)",
                        boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                      }}
                    >
                      <User className="h-5 w-5" style={{ color: "var(--neu-text-secondary)" }} />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                    boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4), -2px -2px 4px var(--neu-shadow-light)",
                  }}
                >
                  <Bot className="h-5 w-5" style={{ color: "var(--neu-text-inverse)" }} />
                </div>
                <NeuCard hover={false} className="py-4 px-6">
                  <div className="flex gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "var(--neu-accent-primary)",
                        animation: "bounce 1s infinite",
                        animationDelay: "0ms",
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "var(--neu-accent-primary)",
                        animation: "bounce 1s infinite",
                        animationDelay: "150ms",
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "var(--neu-accent-primary)",
                        animation: "bounce 1s infinite",
                        animationDelay: "300ms",
                      }}
                    />
                  </div>
                </NeuCard>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div
        className="border-t"
        style={{
          borderColor: "var(--neu-border)",
          background: "var(--neu-card-bg)",
          boxShadow: "4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)",
        }}
      >
        <div className="max-w-4xl mx-auto p-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={loading}
            className="flex-1 transition-all duration-300"
            style={{
              background: "var(--neu-input-bg)",
              border: "1px solid var(--neu-border)",
              borderRadius: "16px",
              padding: "14px 20px",
              fontSize: "0.9rem",
              color: "var(--neu-text-primary)",
              boxShadow: "inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)",
              outline: "none",
              opacity: loading ? 0.6 : 1,
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = `
                inset 8px 8px 16px var(--neu-shadow-inset-dark),
                inset -8px -8px 16px var(--neu-shadow-inset-light),
                0 0 0 3px var(--neu-input-focus-ring)
              `
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = `
                inset 6px 6px 12px var(--neu-shadow-inset-dark),
                inset -6px -6px 12px var(--neu-shadow-inset-light)
              `
            }}
          />
          <NeuButton
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            variant="primary"
          >
            <Send className="h-4 w-4" />
          </NeuButton>
        </div>
      </div>
    </div>
  )
}
