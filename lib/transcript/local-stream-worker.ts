import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import path from "path"

export interface LocalStreamSegment {
  original: string
  translated?: string
  language?: string
  isFinal: true
  startTime: number
  endTime: number
}

interface WorkerResult {
  segment: LocalStreamSegment | null
  provisional: string
}

type Resolver = () => void

class LocalStreamWorkerSession {
  private pythonProcess: ChildProcessWithoutNullStreams | null = null
  private ffmpegProcess: ChildProcessWithoutNullStreams | null = null
  private ffmpegMimeType: string | null = null
  private ffmpegPcmQueue: Buffer[] = []
  private ffmpegWaiters: Resolver[] = []
  private lineBuffer = ""
  private ready = false
  private initializing: Promise<void> | null = null
  private pendingSegments: LocalStreamSegment[] = []
  private provisionalText = ""
  private waiters: Resolver[] = []
  private shutdownTimer: NodeJS.Timeout | null = null
  private readonly idleMs = 45_000
  private readonly sourceLanguage: string
  private readonly targetLanguage: string
  private readonly scriptPath: string
  private readonly pythonPath: string

  constructor(sourceLanguage: string, targetLanguage: string) {
    this.sourceLanguage = sourceLanguage
    this.targetLanguage = targetLanguage

    const envDir = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      "Library",
      "Application Support",
      "Aeroeduvison",
      "mlx-env"
    )
    this.pythonPath = path.join(envDir, "bin", "python3")
    this.scriptPath = path.join(process.cwd(), "transcript-video", "scripts", "local_pipeline.py")
  }

  getConfigKey() {
    return `${this.sourceLanguage}::${this.targetLanguage}`
  }

  async pushPcmChunk(pcmChunk: Buffer) {
    await this.ensureStarted()
    this.bumpIdleTimer()

    if (!this.pythonProcess || !this.pythonProcess.stdin.writable) {
      throw new Error("Local stream worker is not writable")
    }

    if (!pcmChunk || pcmChunk.length === 0) {
      return
    }

    this.pythonProcess.stdin.write(pcmChunk)
  }

  async decodeChunkToPcm(encodedChunk: Buffer, mimeType: string): Promise<Buffer> {
    if (!encodedChunk || encodedChunk.length === 0) return Buffer.alloc(0)
    const normalizedMime = this.normalizeMimeType(mimeType)
    const inputFormat = this.mimeTypeToFfmpegFormat(normalizedMime)
    return await this.transcodeChunkWithFfmpeg(encodedChunk, inputFormat)
  }

  async drainResult(timeoutMs = 180): Promise<WorkerResult> {
    if (this.pendingSegments.length > 0) {
      return {
        segment: this.pendingSegments.shift() ?? null,
        provisional: this.provisionalText,
      }
    }

    await new Promise<void>((resolve) => {
      let waiter: Resolver = () => undefined
      const timer = setTimeout(() => {
        this.removeWaiter(waiter)
        resolve()
      }, timeoutMs)

      waiter = () => {
        clearTimeout(timer)
        this.removeWaiter(waiter)
        resolve()
      }
      this.waiters.push(waiter)
    })

    return {
      segment: this.pendingSegments.shift() ?? null,
      provisional: this.provisionalText,
    }
  }

  close() {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer)
      this.shutdownTimer = null
    }

    if (this.pythonProcess) {
      try {
        if (this.pythonProcess.stdin.writable) {
          this.pythonProcess.stdin.end()
        }
      } catch {
        // best effort
      }
      this.pythonProcess.kill("SIGTERM")
    }
    this.closeDecoder()

    this.pythonProcess = null
    this.initializing = null
    this.ready = false
    this.pendingSegments = []
    this.provisionalText = ""
    this.notifyWaiters()
  }

  private async ensureStarted() {
    if (this.pythonProcess && this.ready) return
    if (this.initializing) return this.initializing

    this.initializing = new Promise<void>((resolve, reject) => {
      const args = [
        this.scriptPath,
        "--asr-model",
        "whisper",
        "--source-lang",
        this.sourceLanguage,
        "--target-lang",
        this.targetLanguage,
        "--chunk-seconds",
        "3",
        "--stride-seconds",
        "1",
      ]

      const child = spawn(this.pythonPath, args, {
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      })
      this.pythonProcess = child
      this.ready = false

      const fail = (message: string) => {
        this.close()
        reject(new Error(message))
      }

      child.stdout.on("data", (chunk: Buffer) => {
        this.handleStdoutChunk(chunk)
        if (this.ready) resolve()
      })

      child.stderr.on("data", () => {
        // keep silent; route will fallback gracefully on timeout/error
      })

      child.on("error", (err) => {
        fail(`Failed to start local stream worker: ${err.message}`)
      })

      child.on("close", () => {
        const wasReady = this.ready
        this.pythonProcess = null
        this.ready = false
        this.initializing = null
        if (wasReady) {
          this.notifyWaiters()
        }
      })

      // Failsafe: worker startup timeout
      setTimeout(() => {
        if (!this.ready) {
          fail("Local stream worker startup timeout")
        }
      }, 20_000)
    }).finally(() => {
      this.initializing = null
    })

    return this.initializing
  }

  private async ensureDecoderStarted(mimeType: string) {
    const normalizedMime = this.normalizeMimeType(mimeType)
    if (this.ffmpegProcess && this.ffmpegMimeType === normalizedMime) {
      return
    }

    this.closeDecoder()

    const inputFormat = this.mimeTypeToFfmpegFormat(normalizedMime)
    const ffmpeg = spawn("ffmpeg", [
      "-loglevel",
      "error",
      "-fflags",
      "+nobuffer",
      "-f",
      inputFormat,
      "-i",
      "pipe:0",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "s16le",
      "pipe:1",
    ])

    this.ffmpegProcess = ffmpeg
    this.ffmpegMimeType = normalizedMime

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      this.ffmpegPcmQueue.push(chunk)
      this.notifyDecoderWaiters()
    })
    ffmpeg.stderr.on("data", () => undefined)
    ffmpeg.on("close", () => {
      this.ffmpegProcess = null
      this.ffmpegMimeType = null
      this.notifyDecoderWaiters()
    })
    ffmpeg.on("error", () => {
      this.ffmpegProcess = null
      this.ffmpegMimeType = null
      this.notifyDecoderWaiters()
    })
  }

  private async drainDecodedPcm(timeoutMs: number): Promise<Buffer> {
    if (this.ffmpegPcmQueue.length > 0) {
      return this.consumeDecoderQueue()
    }

    await new Promise<void>((resolve) => {
      let waiter: Resolver = () => undefined
      const timer = setTimeout(() => {
        this.removeDecoderWaiter(waiter)
        resolve()
      }, timeoutMs)

      waiter = () => {
        clearTimeout(timer)
        this.removeDecoderWaiter(waiter)
        resolve()
      }
      this.ffmpegWaiters.push(waiter)
    })

    return this.consumeDecoderQueue()
  }

  private consumeDecoderQueue(): Buffer {
    if (this.ffmpegPcmQueue.length === 0) return Buffer.alloc(0)
    const chunks = this.ffmpegPcmQueue.splice(0, this.ffmpegPcmQueue.length)
    return Buffer.concat(chunks)
  }

  private handleStdoutChunk(chunk: Buffer) {
    this.lineBuffer += chunk.toString("utf8")

    let newlineIndex = this.lineBuffer.indexOf("\n")
    while (newlineIndex >= 0) {
      const line = this.lineBuffer.slice(0, newlineIndex).trim()
      this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1)
      if (line) this.handleOutputLine(line)
      newlineIndex = this.lineBuffer.indexOf("\n")
    }
  }

  private handleOutputLine(line: string) {
    try {
      const data = JSON.parse(line)
      if (data?.type === "ready") {
        this.ready = true
        this.notifyWaiters()
        return
      }

      if (data?.type === "provisional" && typeof data.text === "string") {
        this.provisionalText = data.text.trim()
        this.notifyWaiters()
        return
      }

      if (data?.type === "result") {
        const original = String(data.original || "").trim()
        if (!original) return
        this.pendingSegments.push({
          original,
          translated: String(data.translated || "").trim() || undefined,
          language: String(data.language || data.lang || "").trim() || undefined,
          isFinal: true,
          startTime: Date.now(),
          endTime: Date.now(),
        })
        this.provisionalText = ""
        this.notifyWaiters()
      }
    } catch {
      // Ignore non-json lines
    }
  }

  private notifyWaiters() {
    const current = this.waiters.splice(0, this.waiters.length)
    current.forEach((fn) => fn())
  }

  private notifyDecoderWaiters() {
    const current = this.ffmpegWaiters.splice(0, this.ffmpegWaiters.length)
    current.forEach((fn) => fn())
  }

  private removeWaiter(waiter: Resolver) {
    const idx = this.waiters.indexOf(waiter)
    if (idx >= 0) this.waiters.splice(idx, 1)
  }

  private removeDecoderWaiter(waiter: Resolver) {
    const idx = this.ffmpegWaiters.indexOf(waiter)
    if (idx >= 0) this.ffmpegWaiters.splice(idx, 1)
  }

  private bumpIdleTimer() {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer)
    }
    this.shutdownTimer = setTimeout(() => this.close(), this.idleMs)
  }

  private closeDecoder() {
    if (this.ffmpegProcess) {
      try {
        if (this.ffmpegProcess.stdin.writable) {
          this.ffmpegProcess.stdin.end()
        }
      } catch {
        // best effort
      }
      this.ffmpegProcess.kill("SIGTERM")
    }
    this.ffmpegProcess = null
    this.ffmpegMimeType = null
    this.ffmpegPcmQueue = []
    this.notifyDecoderWaiters()
  }

  private async transcodeChunkWithFfmpeg(encodedChunk: Buffer, inputFormat: string): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-loglevel",
        "error",
        "-f",
        inputFormat,
        "-i",
        "pipe:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "s16le",
        "pipe:1",
      ])

      const out: Buffer[] = []
      let err = ""

      ffmpeg.stdout.on("data", (chunk: Buffer) => out.push(chunk))
      ffmpeg.stderr.on("data", (chunk: Buffer) => {
        err += chunk.toString()
      })
      ffmpeg.on("error", (e) => reject(e))
      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg chunk decode failed (${code}): ${err.slice(-300)}`))
          return
        }
        resolve(Buffer.concat(out))
      })

      ffmpeg.stdin.write(encodedChunk, (writeErr) => {
        if (writeErr) {
          reject(writeErr)
          return
        }
        ffmpeg.stdin.end()
      })
    })
  }

  private normalizeMimeType(mimeType: string): string {
    const base = String(mimeType || "").toLowerCase()
    return base.split(";")[0].trim() || "audio/webm"
  }

  private mimeTypeToFfmpegFormat(mimeType: string): string {
    if (mimeType.includes("webm")) return "webm"
    if (mimeType.includes("ogg")) return "ogg"
    if (mimeType.includes("wav")) return "wav"
    if (mimeType.includes("mp4")) return "mp4"
    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3"
    return "webm"
  }
}

class LocalStreamWorkerManager {
  private sessions = new Map<string, LocalStreamWorkerSession>()

  private getOrCreateSession(params: {
    sessionId: string
    sourceLanguage: string
    targetLanguage: string
  }) {
    const { sessionId, sourceLanguage, targetLanguage } = params
    const key = this.getSessionKey(sessionId)
    const configKey = `${sourceLanguage}::${targetLanguage}`

    let session = this.sessions.get(key)
    if (!session || session.getConfigKey() !== configKey) {
      session?.close()
      session = new LocalStreamWorkerSession(sourceLanguage, targetLanguage)
      this.sessions.set(key, session)
    }
    return session
  }

  async warmupSession(params: {
    sessionId: string
    sourceLanguage: string
    targetLanguage: string
    mimeType?: string
  }) {
    const session = this.getOrCreateSession(params)
    await session.pushPcmChunk(Buffer.alloc(0))
    const mimeType = params.mimeType?.trim()
    if (mimeType) {
      await session.decodeChunkToPcm(Buffer.alloc(0), mimeType).catch(() => Buffer.alloc(0))
    }
  }

  async pushChunk(params: {
    sessionId: string
    sourceLanguage: string
    targetLanguage: string
    encodedChunk: Buffer
    mimeType: string
  }): Promise<WorkerResult> {
    const { sourceLanguage, targetLanguage, encodedChunk, mimeType } = params
    const session = this.getOrCreateSession(params)

    let pcmChunk = encodedChunk
    if (!this.isPcmMimeType(mimeType)) {
      pcmChunk = await session.decodeChunkToPcm(encodedChunk, mimeType)
    }
    if (pcmChunk.length > 0) {
      await session.pushPcmChunk(pcmChunk)
    }
    return session.drainResult()
  }

  stopSession(sessionId: string) {
    const key = this.getSessionKey(sessionId)
    const session = this.sessions.get(key)
    if (!session) return
    session.close()
    this.sessions.delete(key)
  }

  private getSessionKey(sessionId: string) {
    return sessionId.trim() || "default"
  }

  private isPcmMimeType(mimeType: string) {
    const value = String(mimeType || "").toLowerCase()
    return value.includes("pcm") || value.includes("s16le")
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __localStreamWorkerManager: LocalStreamWorkerManager | undefined
}

export function getLocalStreamWorkerManager() {
  if (!globalThis.__localStreamWorkerManager) {
    globalThis.__localStreamWorkerManager = new LocalStreamWorkerManager()
  }
  return globalThis.__localStreamWorkerManager
}
