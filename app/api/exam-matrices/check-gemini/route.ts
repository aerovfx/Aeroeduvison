import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GeminiService } from "@/lib/ai/services/gemini-service"

/**
 * GET /api/exam-matrices/check-gemini
 * Check if Gemini API key is configured and working
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    const hasKey = !!geminiApiKey && geminiApiKey.trim().length > 0
    
    // Check for placeholder
    const isPlaceholder = hasKey && (
      geminiApiKey === "your-gemini-api-key-here" ||
      geminiApiKey === "your-gemini-api-key" ||
      geminiApiKey.includes("your-") ||
      geminiApiKey.includes("placeholder")
    )
    
    // Check format
    const isValidFormat = hasKey && geminiApiKey.startsWith("AIza")
    
    // Test API availability
    let isAvailable = false
    let apiError: string | null = null
    
    if (hasKey && !isPlaceholder) {
      try {
        isAvailable = await GeminiService.isAvailable()
      } catch (error: any) {
        apiError = error.message
      }
    }

    return NextResponse.json({
      configured: hasKey,
      isPlaceholder,
      isValidFormat,
      isAvailable,
      apiError,
      keyPrefix: hasKey && !isPlaceholder ? geminiApiKey.substring(0, 10) + "..." : null,
      keyLength: hasKey ? geminiApiKey.length : 0,
      message: !hasKey
        ? "GEMINI_API_KEY chưa được cấu hình"
        : isPlaceholder
        ? "GEMINI_API_KEY chứa giá trị placeholder"
        : !isValidFormat
        ? "GEMINI_API_KEY có format không hợp lệ (nên bắt đầu với 'AIza')"
        : !isAvailable
        ? `Gemini API không khả dụng: ${apiError || "Unknown error"}`
        : "Gemini API đã sẵn sàng",
      helpUrl: "https://aistudio.google.com/app/apikey",
    })
  } catch (error: any) {
    console.error("Check Gemini error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to check Gemini API",
        configured: false,
        isAvailable: false,
      },
      { status: 500 }
    )
  }
}
