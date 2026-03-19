"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Mic, Square, Play, Pause, Loader2, BookOpen, Monitor, Smartphone
} from "lucide-react"
import { sonioxClient, TranscriptSegment } from "@/lib/transcript/soniox-client"
import { toast } from "react-hot-toast"

export type RecorderAudioSource = "microphone" | "system" | "both"
export type RecorderTranslationMode = "local" | "soniox" | "elevenlabs"

interface AudioRecorderProps {
  translationMode?: RecorderTranslationMode
  apiKey?: string
  elevenLabsApiKey?: string
  sourceLanguage?: string
  targetLanguage?: string
  audioSource?: RecorderAudioSource
  onSegmentsChange?: (segments: TranscriptSegment[]) => void
  onProvisionalChange?: (text: string) => void
}

export function AudioRecorder({
  translationMode = "local",
  apiKey,
  elevenLabsApiKey,
  sourceLanguage = "auto",
  targetLanguage = "vi",
  audioSource = "microphone",
  onSegmentsChange,
  onProvisionalChange,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState("disconnected")
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [provisionalText, setProvisionalText] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const mixedAudioContextRef = useRef<AudioContext | null>(null)
  const localStreamQueueRef = useRef<Array<{ blob: Blob; mimeType: string }>>([])
  const localStreamInFlightRef = useRef(false)
  const localStreamingActiveRef = useRef(false)
  const localStreamSessionIdRef = useRef<string>("")
  const recordingStartedAtRef = useRef<Date | null>(null)
  const segmentsRef = useRef<TranscriptSegment[]>([])
  const audioMonitorFrameRef = useRef<number | null>(null)
  const LOCAL_STREAM_MAX_QUEUE = 24

  // Notify parent when segments or provisional change
  useEffect(() => {
    onSegmentsChange?.(segments)
    segmentsRef.current = segments
  }, [segments, onSegmentsChange])
  useEffect(() => {
    onProvisionalChange?.(provisionalText)
  }, [provisionalText, onProvisionalChange])

  useEffect(() => {
    if (translationMode !== "soniox") return

    sonioxClient.onSegment = (segment) => {
      setSegments(prev => [...prev, segment])
      setProvisionalText("")
    }

    sonioxClient.onProvisional = (text) => {
      setProvisionalText(text)
    }

    sonioxClient.onStatusChange = (newStatus) => {
      setStatus(newStatus)
      if (newStatus === "connected") {
        toast.success("Connected to transcription service")
      } else if (newStatus === "error") {
        // Don't show toast here, wait for onError
      }
    }

    sonioxClient.onError = (error) => {
      console.error("Soniox error:", error)
      if (error.includes('balance') || error.includes('exhausted')) {
        toast.error(
          <div>
            <p className="font-semibold">API Key Balance Exhausted</p>
            <p className="text-sm mt-1">
              Please get a new API key from{' '}
              <a href="https://console.soniox.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
                soniox.com
              </a>
            </p>
          </div>,
          { duration: 10000 }
        )
      } else {
        toast.error(error)
      }
    }

    return () => {
      sonioxClient.disconnect()
    }
  }, [translationMode])

  const stopLocalStreamSession = useCallback((sessionId: string) => {
    if (!sessionId) return
    fetch("/api/transcript/local/transcribe-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stop: true }),
      keepalive: true,
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    return () => {
      localStreamingActiveRef.current = false
      if (audioMonitorFrameRef.current !== null) {
        cancelAnimationFrame(audioMonitorFrameRef.current)
        audioMonitorFrameRef.current = null
      }
      stopLocalStreamSession(localStreamSessionIdRef.current)
    }
  }, [stopLocalStreamSession])

  useEffect(() => {
    if (isRecording && !isPaused) {
      timeIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }
  }, [isRecording, isPaused])

  const stopAudioMonitor = useCallback(() => {
    if (audioMonitorFrameRef.current !== null) {
      cancelAnimationFrame(audioMonitorFrameRef.current)
      audioMonitorFrameRef.current = null
    }
  }, [])

  const monitorAudioLevel = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    stopAudioMonitor()
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    const updateLevel = () => {
      if (!isRecording || isPaused) return
      const currentAnalyser = analyserRef.current
      if (!currentAnalyser) {
        stopAudioMonitor()
        return
      }

      currentAnalyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setAudioLevel(Math.min(100, (average / 255) * 100))
      
      audioMonitorFrameRef.current = requestAnimationFrame(updateLevel)
    }
    
    updateLevel()
  }, [isPaused, isRecording, stopAudioMonitor])

  useEffect(() => {
    if (isRecording && !isPaused) {
      monitorAudioLevel()
    } else {
      stopAudioMonitor()
      if (analyserRef.current) {
        analyserRef.current.disconnect()
      }
    }
  }, [isRecording, isPaused, monitorAudioLevel, stopAudioMonitor])

  const getSupportedMimeType = () => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus"
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm"
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4"
    return ""
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || "")
        resolve(result.includes(",") ? result.split(",")[1] : result)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const normalizeTranscriptText = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase()
  const createStreamSessionId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
    return `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  }

  const formatRecordingTitle = (startAt: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0")
    const yyyy = startAt.getFullYear()
    const mm = pad(startAt.getMonth() + 1)
    const dd = pad(startAt.getDate())
    const hh = pad(startAt.getHours())
    const min = pad(startAt.getMinutes())
    const ss = pad(startAt.getSeconds())
    return `Transcript ${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
  }

  const saveTranscriptToLibrary = async (
    finalSegments: TranscriptSegment[],
    startAt: Date | null,
    durationSeconds: number
  ) => {
    const transcriptText = finalSegments
      .map((segment) => (segment.translatedText || segment.originalText || "").trim())
      .filter(Boolean)
      .join("\n")
      .trim()

    if (!transcriptText) return

    const title = startAt ? formatRecordingTitle(startAt) : formatRecordingTitle(new Date())

    try {
      const response = await fetch("/api/transcript/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          summary: "",
          type: "lecture",
          title,
          duration: durationSeconds,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload?.error || "Không thể lưu transcript")
      }

      toast.success("Đã lưu transcript vào thư viện")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể lưu transcript"
      console.error("Save transcript failed:", error)
      toast.error(message)
    }
  }

  const flushLocalStreamQueue = useCallback(async () => {
    if (localStreamInFlightRef.current) return
    localStreamInFlightRef.current = true

    try {
      while (localStreamQueueRef.current.length > 0) {
        if (!localStreamingActiveRef.current) {
          localStreamQueueRef.current = []
          break
        }
        const current = localStreamQueueRef.current.shift()
        if (!current) continue
        const base64 = await blobToBase64(current.blob)
        if (!base64) continue

        const res = await fetch("/api/transcript/local/transcribe-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64,
            mimeType: current.mimeType,
            sourceLanguage,
            targetLanguage,
            sessionId: localStreamSessionIdRef.current || "default",
          }),
        })

        if (!res.ok) continue
        const data = await res.json().catch(() => ({}))
        if (!localStreamingActiveRef.current) continue

        const segmentOriginal = String(data?.segment?.original || "").trim()
        const segmentTranslated = String(data?.segment?.translated || "").trim()
        const provisional = String(data?.provisional || "").trim()

        if (segmentOriginal) {
          setSegments((prev) => {
            const normalizedNew = normalizeTranscriptText(segmentOriginal)
            const last = prev[prev.length - 1]
            if (last && normalizeTranscriptText(last.originalText) === normalizedNew) {
              return prev
            }
            const next: TranscriptSegment[] = [
              ...prev,
              {
                speaker: undefined,
                originalText: segmentOriginal,
                translatedText: segmentTranslated || undefined,
                startTime: Date.now(),
                endTime: Date.now(),
                isFinal: true,
              },
            ]
            return next
          })

          setProvisionalText("")
        } else if (provisional) {
          setProvisionalText(provisional)
        }
      }
    } catch (error) {
      console.warn("Local stream chunk failed:", error)
    } finally {
      localStreamInFlightRef.current = false
    }
  }, [sourceLanguage, targetLanguage])

  const enqueueLocalStreamingChunk = useCallback(
    async (blob: Blob) => {
      if (!localStreamingActiveRef.current) return
      try {
        localStreamQueueRef.current.push({
          blob,
          mimeType: blob.type || "audio/webm",
        })
        if (localStreamQueueRef.current.length > LOCAL_STREAM_MAX_QUEUE) {
          localStreamQueueRef.current.splice(
            0,
            localStreamQueueRef.current.length - LOCAL_STREAM_MAX_QUEUE
          )
        }
        void flushLocalStreamQueue()
      } catch (error) {
        console.warn("Queue local chunk failed:", error)
      }
    },
    [flushLocalStreamQueue]
  )

  const stopStream = (stream: MediaStream | null) => {
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
  }

  const cleanupCaptureResources = async () => {
    stopAudioMonitor()
    stopStream(microphoneStreamRef.current)
    stopStream(systemStreamRef.current)

    microphoneStreamRef.current = null
    systemStreamRef.current = null
    mediaRecorderRef.current = null
    analyserRef.current = null

    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }

    if (mixedAudioContextRef.current) {
      await mixedAudioContextRef.current.close().catch(() => undefined)
      mixedAudioContextRef.current = null
    }
  }

  const getMicrophoneStream = async () => {
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    microphoneStreamRef.current = micStream
    return micStream
  }

  const getSystemAudioStream = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Trình duyệt chưa hỗ trợ ghi âm hệ thống")
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    })

    const audioTracks = displayStream.getAudioTracks()
    if (audioTracks.length === 0) {
      stopStream(displayStream)
      throw new Error("Chưa có âm thanh hệ thống. Hãy bật Share tab audio khi chia sẻ màn hình/tab.")
    }

    systemStreamRef.current = displayStream
    return new MediaStream(audioTracks)
  }

  const createRecordingStream = async () => {
    if (audioSource === "microphone") {
      return await getMicrophoneStream()
    }

    if (audioSource === "system") {
      return await getSystemAudioStream()
    }

    const micStream = await getMicrophoneStream()
    const systemAudioStream = await getSystemAudioStream()
    const mixedContext = new AudioContext({ sampleRate: 16000 })
    mixedAudioContextRef.current = mixedContext

    const destination = mixedContext.createMediaStreamDestination()
    mixedContext.createMediaStreamSource(micStream).connect(destination)
    mixedContext.createMediaStreamSource(systemAudioStream).connect(destination)

    return destination.stream
  }

  const startRecording = async () => {
    if (translationMode === "soniox" && !apiKey) {
      toast.error("Vui lòng nhập Soniox API key trong Cài đặt")
      return
    }
    if (translationMode === "elevenlabs" && !elevenLabsApiKey) {
      toast.error("Vui lòng nhập ElevenLabs API key trong Cài đặt")
      return
    }

    try {
      const stream = await createRecordingStream()

      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      const mimeType = getSupportedMimeType()
      mediaRecorderRef.current = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream)

      chunksRef.current = []
      localStreamQueueRef.current = []
      localStreamInFlightRef.current = false
      localStreamingActiveRef.current = translationMode === "local"
      localStreamSessionIdRef.current = createStreamSessionId()

      if (translationMode === "local") {
        fetch("/api/transcript/local/transcribe-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: localStreamSessionIdRef.current,
            warmup: true,
            sourceLanguage,
            targetLanguage,
            mimeType: mimeType || "audio/webm",
          }),
        }).catch(() => undefined)
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          if (translationMode === "soniox") {
            event.data.arrayBuffer().then(buffer => sonioxClient.sendAudio(buffer))
          } else if (translationMode === "local") {
            void enqueueLocalStreamingChunk(event.data)
          }
        }
      }

      mediaRecorderRef.current.start(translationMode === "local" ? 700 : 1000)

      if (translationMode === "soniox") {
        sonioxClient.connect({
          apiKey: apiKey!,
          sourceLanguage,
          targetLanguage,
        })
      } else {
        setStatus("recording")
      }

      setIsRecording(true)
      setIsPaused(false)
      setSegments([])
      segmentsRef.current = []
      setProvisionalText("")
      setRecordingTime(0)
      recordingStartedAtRef.current = new Date()

      toast.success(
        translationMode !== "soniox"
          ? `Đang ghi âm (${audioSource === "microphone" ? "Microphone" : audioSource === "system" ? "System Audio" : "Micro + System"})`
          : "Recording started"
      )
    } catch (error) {
      console.error("Failed to start recording:", error)
      const message = error instanceof Error ? error.message : "Không thể bắt đầu ghi âm"
      toast.error(message)
      await cleanupCaptureResources()
    }
  }

  const stopRecording = async () => {
    localStreamingActiveRef.current = false
    const localStreamSessionId = localStreamSessionIdRef.current
    const recordingStartAt = recordingStartedAtRef.current
    const recordingDuration = recordingTime
    let finalSegments = [...segmentsRef.current]

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        const handleStop = () => {
          recorder.removeEventListener("stop", handleStop)
          resolve()
        }
        recorder.addEventListener("stop", handleStop)
        recorder.stop()
      })
    }

    await cleanupCaptureResources()

    if (translationMode === "soniox") {
      sonioxClient.disconnect()
    }

    setIsRecording(false)
    setIsPaused(false)
    setAudioLevel(0)
    localStreamQueueRef.current = []
    localStreamInFlightRef.current = false
    localStreamSessionIdRef.current = ""
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current)
    }

    if (translationMode === "local" && localStreamSessionId) {
      stopLocalStreamSession(localStreamSessionId)
    }

    if ((translationMode === "local" || translationMode === "elevenlabs") && chunksRef.current.length > 0) {
      setIsTranscribing(true)
      setProvisionalText("")
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const form = new FormData()
        form.append("audio", blob, "recording.webm")
        form.append("sourceLanguage", sourceLanguage)
        form.append("targetLanguage", targetLanguage)
        if (translationMode === "elevenlabs") {
          form.append("apiKey", elevenLabsApiKey || "")
        }
        const endpoint =
          translationMode === "elevenlabs"
            ? "/api/transcript/elevenlabs/transcribe"
            : "/api/transcript/local/transcribe"
        const res = await fetch(endpoint, {
          method: "POST",
          body: form,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || "Transcribe thất bại")
        }
        const data = await res.json()
        const newSegments: TranscriptSegment[] = (data.segments || []).map(
          (s: { original?: string; translated?: string }, i: number) => ({
            speaker: undefined,
            originalText: s.original ?? "",
            translatedText: s.translated ?? undefined,
            startTime: i * 1000,
            endTime: (i + 1) * 1000,
          })
        )
        setSegments(newSegments)
        segmentsRef.current = newSegments
        finalSegments = newSegments
        onSegmentsChange?.(newSegments)
        toast.success(translationMode === "elevenlabs" ? "Transcribe xong (ElevenLabs)" : "Transcribe xong (MLX Local)")
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lỗi transcribe"
        toast.error(msg)
      } finally {
        setIsTranscribing(false)
      }
    }

    await saveTranscriptToLibrary(finalSegments, recordingStartAt, recordingDuration)
    recordingStartedAtRef.current = null

    toast.success(translationMode === "soniox" ? "Recording stopped" : "Đã dừng ghi âm")
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      toast("Recording paused")
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      toast("Recording resumed")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const exportTranscript = (format: 'txt' | 'srt') => {
    if (segments.length === 0) {
      toast.error("No transcript to export")
      return
    }

    let content = ""
    let filename = `transcript-${new Date().toISOString().slice(0, 10)}`

    if (format === 'txt') {
      content = segments.map((seg, i) => {
        const time = new Date(seg.startTime).toISOString().substr(11, 8)
        return `[${time}] ${seg.speaker ? seg.speaker + ': ' : ''}${seg.translatedText || seg.originalText}`
      }).join('\n')
      filename += '.txt'
    } else if (format === 'srt') {
      content = segments.map((seg, i) => {
        const start = formatSrtTime(seg.startTime)
        const end = formatSrtTime(seg.endTime || Date.now())
        const text = seg.translatedText || seg.originalText
        return `${i + 1}\n${start} --> ${end}\n${text}\n`
      }).join('\n')
      filename += '.srt'
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success(`Exported as ${format.toUpperCase()}`)
  }

  const formatSrtTime = (ms: number): string => {
    const date = new Date(ms)
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    const seconds = date.getUTCSeconds().toString().padStart(2, '0')
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${seconds},${milliseconds}`
  }

  const sourceLabel =
    audioSource === "microphone" ? "Microphone" : audioSource === "system" ? "System Audio" : "Micro + System"
  const isLiveConnected = status === "connected" || ((translationMode === "local" || translationMode === "elevenlabs") && isRecording)
  const transcribingLabel =
    translationMode === "elevenlabs" ? "Đang transcribe (ElevenLabs)..." : "Đang transcribe (MLX)..."

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Nguồn âm thanh đang chọn</p>
            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {audioSource === "microphone" ? <Smartphone className="w-4 h-4 text-blue-600" /> : <Monitor className="w-4 h-4 text-purple-600" />}
              <span>{sourceLabel}</span>
            </div>
            {audioSource !== "microphone" && (
              <p className="text-xs text-amber-700">
                Khi bấm Record, hãy chọn tab/video đang phát và bật tùy chọn Share tab audio.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={status === "connecting" || isTranscribing}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  {status === "connecting" || isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isTranscribing ? "Đang transcribe..." : status === "connecting" ? "Connecting..." : "Record"}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <Button onClick={resumeRecording} variant="outline" size="icon">
                      <Play className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={pauseRecording} variant="outline" size="icon">
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  <Button onClick={stopRecording} variant="destructive" size="icon">
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant={isLiveConnected ? "default" : "secondary"}>
                  {isTranscribing ? transcribingLabel : isLiveConnected ? "🔴 Recording" : status}
                </Badge>
                <span className="text-2xl font-mono font-bold">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Audio Level Meter */}
          {isRecording && (
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  audioLevel > 80 ? 'bg-red-500' : audioLevel > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Transcript sẽ hiện trong sidebar bên phải
            </p>
            <p className="text-xs mt-2">
              {audioSource === "microphone"
                ? "Nói vào micro để bắt đầu transcribe"
                : audioSource === "system"
                  ? "Phát video/phim trên máy để lấy transcript từ âm thanh hệ thống"
                  : "Có thể vừa nói vào micro, vừa lấy âm thanh từ video/phim"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
