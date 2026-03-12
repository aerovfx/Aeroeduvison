import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { latexCache } from "@/lib/redis/cache-latex"
import { questionCache } from "@/lib/redis/cache-questions"
import { agentCache } from "@/lib/redis/cache-agents"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { type } = body
    let cleared = 0

    if (type === 'all' || !type) {
      await Promise.all([latexCache.clear(), questionCache.clear(), agentCache.clear()])
      cleared = 3
    } else {
      if (type === 'latex') { await latexCache.clear(); cleared++ }
      if (type === 'questions') { await questionCache.clear(); cleared++ }
      if (type === 'agents') { await agentCache.clear(); cleared++ }
    }

    return NextResponse.json({ success: true, message: `Cleared ${cleared} cache type(s)` })
  } catch (error: any) {
    console.error("[cache/clear]", error)
    return NextResponse.json({ error: error.message || "Failed to clear cache" }, { status: 500 })
  }
}
