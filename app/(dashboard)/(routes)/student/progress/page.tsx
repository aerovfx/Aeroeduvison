"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ProgressDashboard } from "@/components/agents/progress-dashboard"
import { BookOpen, Award, Target } from "lucide-react"
import "@/styles/neumorphic-theme.css"

export default function StudentProgressPage() {
  const { data: session } = useSession()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      setStudentId(session.user.id)
    }
  }, [session])

  // NeuCard component for neumorphic styling
  const NeuCard = ({ children, className = "", hover = true }: { children: React.ReactNode, className?: string, hover?: boolean }) => (
    <div
      className={`
        relative
        bg-[linear-gradient(145deg,var(--neu-card-bg)_0%,var(--neu-bg-secondary)_100%)]
        rounded-[24px]
        border border-[var(--neu-border)]
        transition-all duration-300 ease-in-out
        ${hover ? 'hover:translate-y-[-4px] hover:shadow-[12px_12px_24px_var(--neu-shadow-dark),-12px_-12px_24px_var(--neu-shadow-light)]' : ''}
        shadow-[10px_10px_20px_var(--neu-shadow-dark),-10px_-10px_20px_var(--neu-shadow-light),inset_1px_1px_2px_var(--neu-shadow-inset-dark)]
        ${className}
      `}
    >
      {children}
    </div>
  )

  return (
    <div className="neumorphic-theme flex flex-col h-full min-h-screen">
      {/* Custom Neumorphic Header */}
      <div className="neu-header px-6 pt-8 pb-6">
        <div className="flex items-center gap-4 justify-center">
          <div className="p-4 rounded-[16px] bg-[linear-gradient(135deg,var(--neu-accent-primary)_0%,var(--neu-accent-secondary)_100%)] shadow-[6px_6px_12px_rgba(102,126,234,0.4),-4px_-4px_8px_var(--neu-shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-110 hover:shadow-[8px_8px_16px_rgba(102,126,234,0.5),-6px_-6px_12px_var(--neu-shadow-light)]">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text tracking-tight">
            Tiến Độ Học Tập
          </h1>
        </div>
        <p className="text-base mt-3 font-medium">
          Theo dõi tiến độ và kết quả học tập của bạn
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="neu-container px-6 py-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bài đã học */}
            <NeuCard>
              <div className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-[16px] bg-[linear-gradient(135deg,var(--neu-accent-info)_0%,var(--neu-accent-primary)_100%)] shadow-[6px_6px_12px_rgba(66,153,225,0.4),-4px_-4px_8px_var(--neu-shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-110">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--neu-text-secondary)] uppercase tracking-wide">
                    Bài đã học
                  </div>
                  <div className="text-3xl font-bold text-[var(--neu-text-primary)] mt-1">
                    12
                  </div>
                </div>
              </div>
            </NeuCard>

            {/* Điểm trung bình */}
            <NeuCard>
              <div className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-[16px] bg-[linear-gradient(135deg,var(--neu-accent-success)_0%,var(--neu-accent-info)_100%)] shadow-[6px_6px_12px_rgba(72,187,120,0.4),-4px_-4px_8px_var(--neu-shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-110">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--neu-text-secondary)] uppercase tracking-wide">
                    Điểm trung bình
                  </div>
                  <div className="text-3xl font-bold text-[var(--neu-text-primary)] mt-1">
                    8.5
                  </div>
                </div>
              </div>
            </NeuCard>

            {/* Mục tiêu tuần */}
            <NeuCard>
              <div className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-[16px] bg-[linear-gradient(135deg,var(--neu-accent-secondary)_0%,var(--neu-accent-primary)_100%)] shadow-[6px_6px_12px_rgba(118,75,162,0.4),-4px_-4px_8px_var(--neu-shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-110">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--neu-text-secondary)] uppercase tracking-wide">
                    Mục tiêu tuần
                  </div>
                  <div className="text-3xl font-bold text-[var(--neu-text-primary)] mt-1">
                    3/5
                  </div>
                </div>
              </div>
            </NeuCard>
          </div>

          {/* Progress Dashboard */}
          <NeuCard hover={false} className="p-6">
            {studentId && <ProgressDashboard studentId={studentId} />}
          </NeuCard>
        </div>
      </div>
    </div>
  )
}
