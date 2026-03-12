"use client"

import "@/styles/neumorphic-theme.css"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, Calendar, User, PlayCircle, CheckCircle, XCircle } from "lucide-react"

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
function NeuBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "empty" | "danger" }) {
  const variants = {
    default: { bg: "rgba(102, 126, 234, 0.15)", color: "var(--neu-accent-primary)", border: "rgba(102, 126, 234, 0.3)" },
    success: { bg: "rgba(72, 187, 120, 0.15)", color: "var(--neu-accent-success)", border: "rgba(72, 187, 120, 0.3)" },
    warning: { bg: "rgba(237, 137, 54, 0.15)", color: "var(--neu-accent-warning)", border: "rgba(237, 137, 54, 0.3)" },
    empty: { bg: "rgba(160, 174, 192, 0.15)", color: "var(--neu-text-muted)", border: "rgba(160, 174, 192, 0.3)" },
    danger: { bg: "rgba(245, 101, 101, 0.15)", color: "var(--neu-accent-danger)", border: "rgba(245, 101, 101, 0.3)" },
  }

  return (
    <span
      className="px-3 py-1 rounded-lg text-xs font-bold"
      style={{
        background: variants[variant].bg,
        color: variants[variant].color,
        border: `1px solid ${variants[variant].border}`,
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)",
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
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "primary" | "success" | "danger"
  className?: string
  disabled?: boolean
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

  return (
    <button
      className={`${className} transition-all duration-300`}
      style={{
        background: disabled ? "var(--neu-bg-secondary)" : variants[variant].bg,
        color: disabled ? "var(--neu-text-muted)" : variants[variant].color,
        border: "none",
        borderRadius: "16px",
        padding: "14px 28px",
        fontSize: "0.9rem",
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

interface ExamRoom {
  id: string
  name: string
  description: string
  startTime: string
  endTime: string
  duration: number
  status: string
  isPublic: boolean
  accessCode: string | null
  teacher: { name: string | null }
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  active: "Đang diễn ra",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
}

export default function StudentExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<ExamRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const response = await fetch("/api/student/exams")
      const data = await response.json()
      if (data.success) setExams(data.data.exams)
    } catch (error) { console.error("Load error:", error) } finally { setLoading(false) }
  }

  const getStatusBadge = (exam: ExamRoom) => {
    const now = new Date()
    const start = new Date(exam.startTime)
    const end = new Date(exam.endTime)

    if (exam.status === "completed") return <NeuBadge variant="empty">Hoàn tất</NeuBadge>
    if (exam.status === "cancelled") return <NeuBadge variant="danger">Đã hủy</NeuBadge>
    if (now < start) return <NeuBadge variant="default">Sắp diễn ra</NeuBadge>
    if (now >= start && now <= end) return <NeuBadge variant="success">Đang mở</NeuBadge>
    return <NeuBadge variant="empty">Đã đóng</NeuBadge>
  }

  const canTakeExam = (exam: ExamRoom) => {
    const now = new Date()
    const start = new Date(exam.startTime)
    const end = new Date(exam.endTime)
    return exam.status === "active" && now >= start && now <= end
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
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
      {/* Header */}
      <div
        className="px-6 py-6"
        style={{
          borderBottom: "1px solid var(--neu-border)",
          background: "var(--neu-card-bg)",
          boxShadow: "4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)",
        }}
      >
        <div className="container mx-auto">
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
              <Calendar className="h-6 w-6" style={{ color: "var(--neu-text-inverse)" }} />
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
                Kỳ thi của tôi
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--neu-text-secondary)", fontWeight: "500" }}>
                Danh sách các kỳ thi đã tham gia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          {loading ? (
            <NeuCard hover={false} className="flex items-center justify-center py-16">
              <div
                className="rounded-full h-12 w-12 border-4"
                style={{
                  borderTopColor: "var(--neu-accent-primary)",
                  borderRightColor: "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor: "transparent",
                  animation: "spin 1s linear infinite",
                }}
              />
            </NeuCard>
          ) : exams.length === 0 ? (
            <NeuCard hover={false} className="text-center">
              <div className="flex flex-col items-center justify-center py-12">
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    background: "linear-gradient(145deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.05) 100%)",
                    borderRadius: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                  }}
                >
                  <PlayCircle className="h-10 w-10" style={{ color: "var(--neu-accent-primary)" }} />
                </div>
                <p
                  className="text-lg font-bold mb-2"
                  style={{
                    background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Bạn chưa tham gia kỳ thi nào
                </p>
                <p className="text-sm mb-6" style={{ color: "var(--neu-text-secondary)" }}>
                  Tham gia kỳ thi đầu tiên để bắt đầu làm bài
                </p>
                <NeuButton variant="primary" onClick={() => router.push("/student/exams/join")}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Tham gia kỳ thi
                </NeuButton>
              </div>
            </NeuCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <NeuCard
                  key={exam.id}
                  hover={canTakeExam(exam)}
                  className={canTakeExam(exam) ? "" : ""}
                >
                  <div
                    onClick={() => canTakeExam(exam) && router.push(`/student/exam/${exam.id}`)}
                    style={{ cursor: canTakeExam(exam) ? "pointer" : "default" }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <NeuBadge variant="default">{exam.status === "active" ? "active" : "completed"}</NeuBadge>
                      {getStatusBadge(exam)}
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
                      {exam.name}
                    </h3>
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--neu-text-secondary)" }}>
                      {exam.description}
                    </p>

                    <div className="space-y-3 mb-4">
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{
                          background: "rgba(102, 126, 234, 0.08)",
                          boxShadow: "inset 2px 2px 4px rgba(102, 126, 234, 0.1), inset -2px -2px 4px rgba(255,255,255,0.5)",
                        }}
                      >
                        <User className="h-4 w-4" style={{ color: "var(--neu-accent-primary)" }} />
                        <span className="text-sm" style={{ color: "var(--neu-text-secondary)" }}>
                          GV: {exam.teacher.name || "Không rõ"}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{
                          background: "rgba(72, 187, 120, 0.08)",
                          boxShadow: "inset 2px 2px 4px rgba(72, 187, 120, 0.1), inset -2px -2px 4px rgba(255,255,255,0.5)",
                        }}
                      >
                        <Clock className="h-4 w-4" style={{ color: "var(--neu-accent-success)" }} />
                        <span className="text-sm" style={{ color: "var(--neu-text-secondary)" }}>
                          {exam.duration} phút
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{
                          background: "rgba(237, 137, 54, 0.08)",
                          boxShadow: "inset 2px 2px 4px rgba(237, 137, 54, 0.1), inset -2px -2px 4px rgba(255,255,255,0.5)",
                        }}
                      >
                        <Calendar className="h-4 w-4" style={{ color: "var(--neu-accent-warning)" }} />
                        <span className="text-sm" style={{ color: "var(--neu-text-secondary)" }}>
                          {formatDateTime(exam.startTime)}
                        </span>
                      </div>
                    </div>

                    {canTakeExam(exam) ? (
                      <NeuButton variant="success" className="w-full" onClick={() => router.push(`/student/exam/${exam.id}`)}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Vào thi ngay
                      </NeuButton>
                    ) : exam.status === "completed" ? (
                      <NeuButton variant="default" className="w-full" disabled>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Đã hoàn tất
                      </NeuButton>
                    ) : (
                      <NeuButton variant="default" className="w-full" disabled>
                        <XCircle className="h-4 w-4 mr-2" />
                        Chưa mở
                      </NeuButton>
                    )}
                  </div>
                </NeuCard>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
