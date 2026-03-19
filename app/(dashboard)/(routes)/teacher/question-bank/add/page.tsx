"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AddQuestionRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/teacher/question-bank/create")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Đang chuyển hướng...</p>
      </div>
    </div>
  )
}
