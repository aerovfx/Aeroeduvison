import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  createTranscriptRecord,
  listTranscriptRecords,
  TranscriptType,
} from "@/lib/transcript/transcript-repository"

// GET /api/transcript/history - Get user's transcript history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20

    const normalizedType: TranscriptType | undefined =
      type === "lecture" || type === "meeting" ? type : undefined

    const transcripts = await listTranscriptRecords({
      userId: session.user.id,
      type: normalizedType,
      limit,
    })

    return NextResponse.json({
      success: true,
      transcripts,
      data: {
        transcripts,
        pagination: {
          limit,
          total: transcripts.length,
        }
      }
    })
  } catch (error: any) {
    console.error("Error fetching transcript history:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch transcript history" },
      { status: 500 }
    )
  }
}

// POST /api/transcript/history - Create new transcript
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const title = String(body?.title || "").trim()
    const typeValue = body?.type || body?.sourceType
    const transcriptFromSegments = Array.isArray(body?.segments)
      ? body.segments
          .map((segment: any) =>
            typeof segment === "string"
              ? segment
              : segment?.translatedText || segment?.originalText || segment?.text || ""
          )
          .join("\n")
      : ""
    const transcript = String(body?.transcript || transcriptFromSegments || "").trim()
    const summary = body?.summary ? String(body.summary) : ""
    const duration = Number.isFinite(body?.duration) ? Number(body.duration) : 0

    if (!title || (typeValue !== "lecture" && typeValue !== "meeting") || !transcript) {
      return NextResponse.json(
        { error: "Missing required fields: title, type/sourceType, transcript" },
        { status: 400 }
      )
    }

    const transcriptRecord = await createTranscriptRecord({
      userId: session.user.id,
      title,
      type: typeValue as TranscriptType,
      transcript,
      summary,
      duration,
    })

    return NextResponse.json({
      success: true,
      transcript: transcriptRecord,
      data: {
        transcript: transcriptRecord
      }
    })
  } catch (error: any) {
    console.error("Error creating transcript:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create transcript" },
      { status: 500 }
    )
  }
}
