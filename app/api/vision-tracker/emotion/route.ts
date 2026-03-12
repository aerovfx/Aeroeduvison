import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

/** Làm tròn timestamp về đầu phút (UTC) */
function roundToMinute(d: Date): Date {
  const t = new Date(d)
  t.setUTCSeconds(0, 0)
  t.setUTCMilliseconds(0)
  return t
}

/**
 * POST /api/vision-tracker/emotion
 * Ghi biểu cảm (đã gộp theo cửa sổ 1 phút để giảm tải).
 * Body: { emotionType: string, confidence: number } hoặc
 *       { samples: [{ emotionType, confidence }] } (batch trong cùng phút)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const userId = session.user.id
    const now = new Date()
    const windowStart = roundToMinute(now)

    let samples: { emotionType: string; confidence: number }[] = []
    if (body.samples && Array.isArray(body.samples)) {
      samples = body.samples.map((s: any) => ({
        emotionType: String(s.emotionType || s.emotion || "neutral"),
        confidence: Number(s.confidence ?? 0),
      }))
    } else if (body.emotionType != null || body.emotion != null) {
      samples = [
        {
          emotionType: String(body.emotionType ?? body.emotion ?? "neutral"),
          confidence: Number(body.confidence ?? 0),
        },
      ]
    }

    if (samples.length === 0) {
      return NextResponse.json(
        { error: "Cần emotionType và confidence hoặc mảng samples" },
        { status: 400 }
      )
    }

    // Giới hạn batch để tránh spam (tối đa 60 mẫu/lần = 1 sample/giây trong 1 phút)
    const trimmed = samples.slice(0, 60)

    const emotionCounts: Record<string, number> = {}
    let totalConf = 0
    for (const s of trimmed) {
      const key = s.emotionType || "neutral"
      emotionCounts[key] = (emotionCounts[key] || 0) + 1
      totalConf += s.confidence
    }
    const avgConfidence = trimmed.length > 0 ? totalConf / trimmed.length : 0
    const sampleCount = trimmed.length

    const existing = await prisma.emotionCapture.findUnique({
      where: { userId_windowStart: { userId, windowStart } },
    })

    if (existing) {
      const existingCounts = (existing.emotionCounts as Record<string, number>) || {}
      const merged: Record<string, number> = { ...existingCounts }
      for (const [k, v] of Object.entries(emotionCounts)) {
        merged[k] = (merged[k] || 0) + v
      }
      const newCount = existing.sampleCount + sampleCount
      const newAvg =
        newCount > 0
          ? (existing.avgConfidence * existing.sampleCount + avgConfidence * sampleCount) / newCount
          : existing.avgConfidence
      await prisma.emotionCapture.update({
        where: { userId_windowStart: { userId, windowStart } },
        data: {
          sampleCount: newCount,
          avgConfidence: newAvg,
          emotionCounts: merged,
          updatedAt: new Date(),
        },
      })
    } else {
      await prisma.emotionCapture.create({
        data: {
          userId,
          windowStart,
          sampleCount,
          avgConfidence,
          emotionCounts: emotionCounts,
          sessionId: body.sessionId ?? null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      windowStart: windowStart.toISOString(),
      sampleCount,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    })
  } catch (error: any) {
    console.error("Error recording emotion:", error)
    return NextResponse.json(
      { error: error.message || "Lỗi ghi biểu cảm" },
      { status: 500 }
    )
  }
}
