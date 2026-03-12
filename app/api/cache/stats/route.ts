import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redisClient } from "@/lib/redis/client"
import { latexCache } from "@/lib/redis/cache-latex"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [redisStats, latexStats] = await Promise.all([
      redisClient.getStats(),
      latexCache.getStats(),
    ])

    const latexHitRate = latexStats.count > 0 
      ? ((latexStats.cacheHits / latexStats.count) * 100).toFixed(1)
      : '0'

    return NextResponse.json({
      success: true,
      data: {
        redis: {
          connected: redisStats.connected,
          dbSize: redisStats.dbSize,
          memoryUsage: redisStats.memoryUsage ? `${(redisStats.memoryUsage / 1024 / 1024).toFixed(2)} MB` : 'N/A',
        },
        latex: {
          totalCompiles: latexStats.count,
          cacheHits: latexStats.cacheHits,
          hitRate: `${latexHitRate}%`,
        },
      },
    })
  } catch (error: any) {
    console.error("[cache/stats]", error)
    return NextResponse.json({ error: error.message || "Failed to get cache stats" }, { status: 500 })
  }
}
