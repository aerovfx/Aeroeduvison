import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { compileLatexAdvanced, getWorkerStats } from "@/lib/latex-compile-advanced"

const MAX_CONTENT_LENGTH = 500_000

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { projectId, content: rawContent, priority = 'normal' } = body

    let content: string
    if (projectId) {
      const { db } = await import("@/lib/db")
      const proj = await db.latexProject.findUnique({ where: { id: projectId } })
      if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 })
      content = proj.mainContent ?? ""
    } else if (typeof rawContent === "string") {
      content = rawContent
    } else {
      return NextResponse.json({ error: "Provide projectId or content" }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: "Content too long", maxLength: MAX_CONTENT_LENGTH }, { status: 400 })
    }

    const result = await compileLatexAdvanced(content, priority as 'high' | 'normal' | 'low')

    if (result.error) {
      const status = result.code === "COMPILE_NOT_AVAILABLE" ? 503 : 422
      return NextResponse.json({ error: result.error, code: result.code ?? "COMPILE_ERROR", log: result.log, cached: result.cached, compileTime: result.compileTime, workerId: result.workerId }, { status })
    }

    if (!result.pdf) {
      return NextResponse.json({ error: "No PDF produced", log: result.log }, { status: 422 })
    }

    return new NextResponse(result.pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="output.pdf"',
        "X-Compile-Time": (result.compileTime ?? 0).toString(),
        "X-Cache-Hit": result.cached ? "true" : "false",
        "X-Worker-Id": (result.workerId ?? 0).toString(),
      },
    })
  } catch (e: any) {
    console.error("[latex-projects/compile-advanced]", e)
    return NextResponse.json({ error: "Compilation failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const stats = await getWorkerStats()
    return NextResponse.json({ success: true, data: { queueLength: stats.queueLength, activeWorkers: stats.activeWorkers, totalJobs: stats.totalJobs, workerCount: stats.workerCount } })
  } catch (e: any) {
    console.error("[latex-projects/compile-advanced/get]", e)
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 })
  }
}
