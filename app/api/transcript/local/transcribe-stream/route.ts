import { NextRequest, NextResponse } from "next/server"
import { getLocalStreamWorkerManager } from "@/lib/transcript/local-stream-worker"

export const runtime = "nodejs"

// POST /api/transcript/local/transcribe-stream - Streaming transcription chunks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sessionId = "default",
      stop = false,
      warmup = false,
      audio,
      mimeType = "audio/webm",
      sourceLanguage = "auto",
      targetLanguage = "vi",
    } = body

    const manager = getLocalStreamWorkerManager()

    if (stop) {
      manager.stopSession(String(sessionId))
      return NextResponse.json({ stopped: true })
    }

    if (warmup) {
      await manager.warmupSession({
        sessionId: String(sessionId),
        sourceLanguage: String(sourceLanguage),
        targetLanguage: String(targetLanguage),
        mimeType: String(mimeType || "audio/webm"),
      })
      return NextResponse.json({ warmed: true })
    }

    if (!audio) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 })
    }

    // Decode base64 audio
    const cleanBase64 = String(audio).replace(/^data:audio\/[^;]+;base64,/, "")
    const audioBuffer = Buffer.from(cleanBase64, "base64")
    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: "Invalid audio payload" }, { status: 400 })
    }

    const result = await manager.pushChunk({
      sessionId: String(sessionId),
      sourceLanguage: String(sourceLanguage),
      targetLanguage: String(targetLanguage),
      encodedChunk: audioBuffer,
      mimeType: String(mimeType || "audio/webm"),
    })

    return NextResponse.json({
      segment: result.segment,
      provisional: result.provisional,
    })
  } catch (error: any) {
    console.error('Streaming transcription error:', error)
    return NextResponse.json(
      { error: error.message || 'Streaming transcription failed' },
      { status: 500 }
    )
  }
}
