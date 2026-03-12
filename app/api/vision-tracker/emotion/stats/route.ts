import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

type GroupBy = "minute" | "hour" | "day"

/** Lấy đầu khoảng (theo groupBy) từ timestamp */
function bucketStart(d: Date, groupBy: GroupBy): Date {
  const t = new Date(d)
  t.setUTCMilliseconds(0)
  t.setUTCSeconds(0, 0)
  if (groupBy === "minute") return t
  t.setUTCMinutes(0, 0, 0)
  if (groupBy === "hour") return t
  t.setUTCHours(0, 0, 0, 0)
  return t
}

/**
 * GET /api/vision-tracker/emotion/stats
 * Thống kê trung bình biểu cảm trong khoảng thời gian (dữ liệu đã gộp nên ít bản ghi).
 * Query: from (ISO), to (ISO), groupBy=minute|hour|day, limit (default 500)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const groupBy = (searchParams.get("groupBy") || "hour") as GroupBy
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)))

    const now = new Date()
    const to = toParam ? new Date(toParam) : now
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 24 * 60 * 60 * 1000)

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      return NextResponse.json(
        { error: "from, to phải là ISO date hợp lệ và from < to" },
        { status: 400 }
      )
    }

    const rows = await prisma.emotionCapture.findMany({
      where: {
        userId: session.user.id,
        windowStart: { gte: from, lte: to },
      },
      orderBy: { windowStart: "asc" },
      take: 5000,
    })

    // Gộp theo groupBy
    const bucketMap = new Map<
      string,
      { sampleCount: number; avgConfidenceSum: number; emotionCounts: Record<string, number> }
    >()
    for (const row of rows) {
      const start = bucketStart(new Date(row.windowStart), groupBy)
      const key = start.toISOString()
      const existing = bucketMap.get(key)
      const counts = (row.emotionCounts as Record<string, number>) || {}
      if (!existing) {
        bucketMap.set(key, {
          sampleCount: row.sampleCount,
          avgConfidenceSum: row.avgConfidence * row.sampleCount,
          emotionCounts: { ...counts },
        })
      } else {
        existing.sampleCount += row.sampleCount
        existing.avgConfidenceSum += row.avgConfidence * row.sampleCount
        for (const [k, v] of Object.entries(counts)) {
          existing.emotionCounts[k] = (existing.emotionCounts[k] || 0) + v
        }
      }
    }

    const buckets = Array.from(bucketMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-limit)
      .map(([periodStart, data]) => {
        const total = data.sampleCount
        const avgConfidence = total > 0 ? data.avgConfidenceSum / total : 0
        const dominant = Object.entries(data.emotionCounts).sort((a, b) => b[1] - a[1])[0]
        return {
          periodStart,
          periodEnd: new Date(new Date(periodStart).getTime() + (groupBy === "minute" ? 60000 : groupBy === "hour" ? 3600000 : 86400000)).toISOString(),
          sampleCount: total,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          dominantEmotion: dominant ? dominant[0] : null,
          dominantCount: dominant ? dominant[1] : 0,
          distribution: data.emotionCounts,
        }
      })

    // Tổng hợp toàn khoảng
    let totalSamples = 0
    let totalConfSum = 0
    const summaryCounts: Record<string, number> = {}
    for (const row of rows) {
      totalSamples += row.sampleCount
      totalConfSum += row.avgConfidence * row.sampleCount
      const c = (row.emotionCounts as Record<string, number>) || {}
      for (const [k, v] of Object.entries(c)) {
        summaryCounts[k] = (summaryCounts[k] || 0) + v
      }
    }
    const summary = {
      from: from.toISOString(),
      to: to.toISOString(),
      totalSamples,
      avgConfidence: totalSamples > 0 ? Math.round((totalConfSum / totalSamples) * 100) / 100 : 0,
      emotionDistribution: summaryCounts,
      dominantEmotion: Object.entries(summaryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }

    return NextResponse.json({
      success: true,
      groupBy,
      buckets,
      summary,
    })
  } catch (error: any) {
    console.error("Error fetching emotion stats:", error)
    return NextResponse.json(
      { error: error.message || "Lỗi lấy thống kê biểu cảm" },
      { status: 500 }
    )
  }
}
