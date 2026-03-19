"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ProgressDashboard } from "@/components/agents/progress-dashboard"
import { BookOpen, Award, Target } from "lucide-react"

export default function StudentProgressPage() {
  const { data: session } = useSession()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      setStudentId(session.user.id)
    }
  }, [session])

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="text-center py-8 px-6 animate-[fadeIn_0.6s_ease-out]">
        <div className="flex items-center gap-4 justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-[0_0_20px_rgba(120,100,255,0.3)] hover:shadow-[0_0_30px_rgba(120,100,255,0.5)] transition-shadow">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(245,85%,75%)] via-[hsl(175,80%,55%)] to-[hsl(280,75%,70%)] bg-clip-text text-transparent">
            Tiến Độ Học Tập
          </h1>
        </div>
        <p className="text-sm mt-2 text-white/40">
          Theo dõi tiến độ và kết quả học tập của bạn
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-5">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bài đã học */}
            <div className="group bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),0_0_20px_rgba(66,153,225,0.08)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(210,90%,60%)] to-[hsl(245,85%,65%)] flex items-center justify-center shadow-[0_0_16px_rgba(66,153,225,0.3)]">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[0.7rem] font-semibold text-white/40 uppercase tracking-wider">
                  Bài đã học
                </div>
                <div className="text-2xl font-bold text-white/90 mt-0.5">12</div>
              </div>
            </div>

            {/* Điểm trung bình */}
            <div className="group bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),0_0_20px_rgba(0,210,180,0.08)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(175,80%,45%)] to-[hsl(210,90%,60%)] flex items-center justify-center shadow-[0_0_16px_rgba(0,210,180,0.3)]">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[0.7rem] font-semibold text-white/40 uppercase tracking-wider">
                  Điểm trung bình
                </div>
                <div className="text-2xl font-bold text-white/90 mt-0.5">8.5</div>
              </div>
            </div>

            {/* Mục tiêu tuần */}
            <div className="group bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),0_0_20px_rgba(120,100,255,0.08)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(280,75%,60%)] to-[hsl(245,85%,65%)] flex items-center justify-center shadow-[0_0_16px_rgba(120,100,255,0.3)]">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[0.7rem] font-semibold text-white/40 uppercase tracking-wider">
                  Mục tiêu tuần
                </div>
                <div className="text-2xl font-bold text-white/90 mt-0.5">3/5</div>
              </div>
            </div>
          </div>

          {/* Progress Dashboard */}
          <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
            {studentId && <ProgressDashboard studentId={studentId} />}
          </div>
        </div>
      </div>
    </div>
  )
}
