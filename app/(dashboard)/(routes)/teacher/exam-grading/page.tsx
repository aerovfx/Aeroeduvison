"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * Chấm thi — redirect to main grading page so sidebar link works.
 */
export default function ExamGradingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/teacher/grading")
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Đang chuyển đến trang Chấm thi...</p>
    </div>
  )
}
