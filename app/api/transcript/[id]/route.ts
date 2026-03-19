import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  deleteTranscriptRecord,
  updateTranscriptRecord,
} from "@/lib/transcript/transcript-repository"

interface RouteParams {
  params: {
    id: string
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const deleted = await deleteTranscriptRecord({
      id: params.id,
      userId: session.user.id,
    })

    if (!deleted) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete transcript error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete transcript" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : undefined
    const summary = typeof body?.summary === "string" ? body.summary : undefined

    if (typeof title === "undefined" && typeof summary === "undefined") {
      return NextResponse.json(
        { error: "Missing fields: title or summary" },
        { status: 400 }
      )
    }

    const updated = await updateTranscriptRecord({
      id: params.id,
      userId: session.user.id,
      title,
      summary,
    })

    if (!updated) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("Update transcript error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to update transcript" },
      { status: 500 }
    )
  }
}
