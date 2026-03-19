import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

// POST /api/transcript/local/transcribe - Full audio file transcription
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const sourceLanguage = (formData.get('sourceLanguage') || 'auto') as string
    const targetLanguage = (formData.get('targetLanguage') || 'vi') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Convert Blob to Buffer
    const buffer = await audioFile.arrayBuffer()

    // Persist upload to a temp file for ffmpeg to read.
    // Use extension based on mime-type so ffmpeg can auto-detect container.
    const mime = audioFile.type || ""
    let ext = "dat"
    if (mime.includes("webm")) ext = "webm"
    else if (mime.includes("wav")) ext = "wav"
    else if (mime.includes("mp3")) ext = "mp3"
    else if (mime.includes("mpeg")) ext = "mp3"
    else if (mime.includes("ogg")) ext = "ogg"

    const audioPath = path.join("/tmp", `audio-${Date.now()}.${ext}`)

    // Write audio to temporary file
    const fs = require("fs").promises
    await fs.writeFile(audioPath, Buffer.from(buffer))

    // Get Python venv path
    const envDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      'Library',
      'Application Support',
      'Aeroeduvison',
      'mlx-env'
    )

    const pythonPath = path.join(envDir, 'bin', 'python3')
    const scriptPath = path.join(process.cwd(), 'transcript-video', 'scripts', 'local_pipeline.py')

    // Run transcription pipeline (NO shell to avoid spaces-in-path issues).
    // local_pipeline expects: raw PCM s16le @16kHz mono via stdin.
    //
    // We use ffmpeg to convert whatever was uploaded (webm/mp3/etc.) to the PCM format,
    // then stream that PCM into the Python pipeline's stdin.
    const ffmpeg = spawn("ffmpeg", [
      "-loglevel",
      "error",
      "-i",
      audioPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "s16le",
      "-",
    ])

    const python = spawn(pythonPath, [
      scriptPath,
      "--asr-model",
      "whisper",
      "--source-lang",
      sourceLanguage,
      "--target-lang",
      targetLanguage,
    ], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    })

    let stdout = ""
    let stderr = ""

    ffmpeg.stderr.on("data", (d) => {
      stderr += d.toString()
    })

    python.stdout.on("data", (d) => {
      stdout += d.toString()
    })
    python.stderr.on("data", (d) => {
      stderr += d.toString()
    })

    // Pipe PCM output to python stdin
    ffmpeg.stdout.pipe(python.stdin)

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (err?: Error) => {
        if (settled) return
        settled = true
        err ? reject(err) : resolve()
      }

      ffmpeg.on("error", (err) => finish(err))
      python.on("error", (err) => finish(err))

      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          finish(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-400)}`))
        }
      })

      python.on("close", (code) => {
        if (code === 0) finish()
        else finish(new Error(`local_pipeline exited with code ${code}: ${stderr.slice(-400)}`))
      })
    })

    // Parse pipeline output (JSON lines)
    const segments: any[] = []
    const lines = stdout.trim() ? stdout.trim().split('\n') : []

    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        if (data.type === 'result') {
          segments.push({
            original: data.original,
            translated: data.translated,
            language: data.lang,
          })
        }
      } catch (e) {
        // Skip non-JSON lines (logs, etc.)
      }
    }

    // Cleanup
    await fs.unlink(audioPath).catch(() => {})

    return NextResponse.json({ segments })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}
