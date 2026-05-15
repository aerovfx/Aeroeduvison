import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Play, Pause, Loader2, BookOpen, Monitor, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { sonioxClient, type TranscriptSegment } from '@/lib/transcript/soniox-client'

/* ── Dark palette ── */
const D = {
  bg: '#0d0e17',
  card: '#10111e',
  card2: '#161728',
  border: '#1e2033',
  border2: '#2a2b3d',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
} as const

export type RecorderAudioSource = 'microphone' | 'system' | 'both'
export type RecorderTranslationMode = 'local' | 'soniox' | 'elevenlabs'

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
  translationMode = 'local',
  apiKey,
  elevenLabsApiKey,
  sourceLanguage = 'auto',
  targetLanguage = 'vi',
  audioSource = 'microphone',
  onSegmentsChange,
  onProvisionalChange,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState('disconnected')
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [provisionalText, setProvisionalText] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const mixedAudioContextRef = useRef<AudioContext | null>(null)
  const localStreamQueueRef = useRef<Array<{ blob: Blob; mimeType: string }>>([])
  const localStreamInFlightRef = useRef(false)
  const localStreamingActiveRef = useRef(false)
  const localStreamSessionIdRef = useRef<string>('')
  const recordingStartedAtRef = useRef<Date | null>(null)
  const segmentsRef = useRef<TranscriptSegment[]>([])
  const audioMonitorFrameRef = useRef<number | null>(null)
  const LOCAL_STREAM_MAX_QUEUE = 24

  useEffect(() => {
    onSegmentsChange?.(segments)
    segmentsRef.current = segments
  }, [segments, onSegmentsChange])

  useEffect(() => {
    onProvisionalChange?.(provisionalText)
  }, [provisionalText, onProvisionalChange])

  useEffect(() => {
    if (translationMode !== 'soniox') return

    sonioxClient.onSegment = (segment) => {
      setSegments(prev => [...prev, segment])
      setProvisionalText('')
    }
    sonioxClient.onProvisional = (text) => {
      setProvisionalText(text)
    }
    sonioxClient.onStatusChange = (newStatus) => {
      setStatus(newStatus)
      if (newStatus === 'connected') {
        toast.success('Connected to transcription service')
      }
    }
    sonioxClient.onError = (error) => {
      console.error('Soniox error:', error)
      if (error.includes('balance') || error.includes('exhausted')) {
        toast.error('API Key Balance Exhausted. Lấy key mới tại soniox.com', { duration: 10000 })
      } else {
        toast.error(error)
      }
    }

    return () => { sonioxClient.disconnect() }
  }, [translationMode])

  const stopLocalStreamSession = useCallback((sessionId: string) => {
    if (!sessionId) return
    fetch('/api/transcript/local/transcribe-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current)
    }
    return () => { if (timeIntervalRef.current) clearInterval(timeIntervalRef.current) }
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
      const current = analyserRef.current
      if (!current) { stopAudioMonitor(); return }
      current.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setAudioLevel(Math.min(100, (avg / 255) * 100))
      audioMonitorFrameRef.current = requestAnimationFrame(updateLevel)
    }
    updateLevel()
  }, [isPaused, isRecording, stopAudioMonitor])

  useEffect(() => {
    if (isRecording && !isPaused) {
      monitorAudioLevel()
    } else {
      stopAudioMonitor()
      if (analyserRef.current) analyserRef.current.disconnect()
    }
  }, [isRecording, isPaused, monitorAudioLevel, stopAudioMonitor])

  const getSupportedMimeType = () => {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
    return ''
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || '')
        resolve(result.includes(',') ? result.split(',')[1] : result)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const normalizeTranscriptText = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

  const createStreamSessionId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  }

  const formatRecordingTitle = (startAt: Date) => {
    const pad = (v: number) => v.toString().padStart(2, '0')
    const { getFullYear: y, getMonth: mo, getDate: d, getHours: h, getMinutes: min, getSeconds: s } = startAt
    return `Transcript ${y.call(startAt)}-${pad(mo.call(startAt) + 1)}-${pad(d.call(startAt))} ${pad(h.call(startAt))}:${pad(min.call(startAt))}:${pad(s.call(startAt))}`
  }

  const saveTranscriptToLibrary = async (
    finalSegments: TranscriptSegment[],
    startAt: Date | null,
    durationSeconds: number
  ) => {
    const transcriptText = finalSegments
      .map(seg => (seg.translatedText || seg.originalText || '').trim())
      .filter(Boolean)
      .join('\n')
      .trim()
    if (!transcriptText) return
    const title = startAt ? formatRecordingTitle(startAt) : formatRecordingTitle(new Date())
    try {
      const res = await fetch('/api/transcript/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText, summary: '', type: 'lecture', title, duration: durationSeconds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Không thể lưu transcript')
      }
      toast.success('Đã lưu transcript vào thư viện')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu transcript'
      toast.error(message)
    }
  }

  const flushLocalStreamQueue = useCallback(async () => {
    if (localStreamInFlightRef.current) return
    localStreamInFlightRef.current = true
    try {
      while (localStreamQueueRef.current.length > 0) {
        if (!localStreamingActiveRef.current) { localStreamQueueRef.current = []; break }
        const current = localStreamQueueRef.current.shift()
        if (!current) continue
        const base64 = await blobToBase64(current.blob)
        if (!base64) continue
        const res = await fetch('/api/transcript/local/transcribe-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64,
            mimeType: current.mimeType,
            sourceLanguage,
            targetLanguage,
            sessionId: localStreamSessionIdRef.current || 'default',
          }),
        })
        if (!res.ok) continue
        const data = await res.json().catch(() => ({}))
        if (!localStreamingActiveRef.current) continue
        const segmentOriginal = String(data?.segment?.original || '').trim()
        const segmentTranslated = String(data?.segment?.translated || '').trim()
        const provisional = String(data?.provisional || '').trim()
        if (segmentOriginal) {
          setSegments(prev => {
            const normalizedNew = normalizeTranscriptText(segmentOriginal)
            const last = prev[prev.length - 1]
            if (last && normalizeTranscriptText(last.originalText) === normalizedNew) return prev
            return [...prev, {
              speaker: null,
              originalText: segmentOriginal,
              translatedText: segmentTranslated || undefined,
              startTime: Date.now(),
              endTime: Date.now(),
              isFinal: true,
            }]
          })
          setProvisionalText('')
        } else if (provisional) {
          setProvisionalText(provisional)
        }
      }
    } catch (error) {
      console.warn('Local stream chunk failed:', error)
    } finally {
      localStreamInFlightRef.current = false
    }
  }, [sourceLanguage, targetLanguage])

  const enqueueLocalStreamingChunk = useCallback(async (blob: Blob) => {
    if (!localStreamingActiveRef.current) return
    localStreamQueueRef.current.push({ blob, mimeType: blob.type || 'audio/webm' })
    if (localStreamQueueRef.current.length > LOCAL_STREAM_MAX_QUEUE) {
      localStreamQueueRef.current.splice(0, localStreamQueueRef.current.length - LOCAL_STREAM_MAX_QUEUE)
    }
    void flushLocalStreamQueue()
  }, [flushLocalStreamQueue])

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach(t => t.stop())
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
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })
    microphoneStreamRef.current = micStream
    return micStream
  }

  const getSystemAudioStream = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Trình duyệt chưa hỗ trợ ghi âm hệ thống')
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
    const audioTracks = displayStream.getAudioTracks()
    if (audioTracks.length === 0) {
      stopStream(displayStream)
      throw new Error('Chưa có âm thanh hệ thống. Hãy bật Share tab audio khi chia sẻ màn hình/tab.')
    }
    systemStreamRef.current = displayStream
    return new MediaStream(audioTracks)
  }

  const createRecordingStream = async () => {
    if (audioSource === 'microphone') return await getMicrophoneStream()
    if (audioSource === 'system') return await getSystemAudioStream()
    const micStream = await getMicrophoneStream()
    const sysAudioStream = await getSystemAudioStream()
    const mixedCtx = new AudioContext({ sampleRate: 16000 })
    mixedAudioContextRef.current = mixedCtx
    const destination = mixedCtx.createMediaStreamDestination()
    mixedCtx.createMediaStreamSource(micStream).connect(destination)
    mixedCtx.createMediaStreamSource(sysAudioStream).connect(destination)
    return destination.stream
  }

  const startRecording = async () => {
    if (translationMode === 'soniox' && !apiKey) {
      toast.error('Vui lòng nhập Soniox API key trong Cài đặt')
      return
    }
    if (translationMode === 'elevenlabs' && !elevenLabsApiKey) {
      toast.error('Vui lòng nhập ElevenLabs API key trong Cài đặt')
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
      localStreamingActiveRef.current = translationMode === 'local'
      localStreamSessionIdRef.current = createStreamSessionId()

      if (translationMode === 'local') {
        fetch('/api/transcript/local/transcribe-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localStreamSessionIdRef.current,
            warmup: true,
            sourceLanguage,
            targetLanguage,
            mimeType: mimeType || 'audio/webm',
          }),
        }).catch(() => undefined)
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          if (translationMode === 'soniox') {
            event.data.arrayBuffer().then(buffer => sonioxClient.sendAudio(buffer))
          } else if (translationMode === 'local') {
            void enqueueLocalStreamingChunk(event.data)
          }
        }
      }

      mediaRecorderRef.current.start(translationMode === 'local' ? 700 : 1000)

      if (translationMode === 'soniox') {
        sonioxClient.connect({ apiKey: apiKey!, sourceLanguage, targetLanguage })
      } else {
        setStatus('recording')
      }

      setIsRecording(true)
      setIsPaused(false)
      setSegments([])
      segmentsRef.current = []
      setProvisionalText('')
      setRecordingTime(0)
      recordingStartedAtRef.current = new Date()

      const srcLabel = audioSource === 'microphone' ? 'Microphone' : audioSource === 'system' ? 'System Audio' : 'Micro + System'
      toast.success(translationMode !== 'soniox' ? `Đang ghi âm (${srcLabel})` : 'Recording started')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể bắt đầu ghi âm'
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
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const handleStop = () => { recorder.removeEventListener('stop', handleStop); resolve() }
        recorder.addEventListener('stop', handleStop)
        recorder.stop()
      })
    }

    await cleanupCaptureResources()
    if (translationMode === 'soniox') sonioxClient.disconnect()

    setIsRecording(false)
    setIsPaused(false)
    setAudioLevel(0)
    localStreamQueueRef.current = []
    localStreamInFlightRef.current = false
    localStreamSessionIdRef.current = ''
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current)
    if (translationMode === 'local' && localStreamSessionId) stopLocalStreamSession(localStreamSessionId)

    if ((translationMode === 'local' || translationMode === 'elevenlabs') && chunksRef.current.length > 0) {
      setIsTranscribing(true)
      setProvisionalText('')
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const form = new FormData()
        form.append('audio', blob, 'recording.webm')
        form.append('sourceLanguage', sourceLanguage)
        form.append('targetLanguage', targetLanguage)
        if (translationMode === 'elevenlabs') form.append('apiKey', elevenLabsApiKey || '')
        const endpoint = translationMode === 'elevenlabs'
          ? '/api/transcript/elevenlabs/transcribe'
          : '/api/transcript/local/transcribe'
        const res = await fetch(endpoint, { method: 'POST', body: form })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Transcribe thất bại')
        }
        const data = await res.json()
        const newSegments: TranscriptSegment[] = (data.segments || []).map(
          (s: { original?: string; translated?: string }, i: number) => ({
            speaker: null,
            originalText: s.original ?? '',
            translatedText: s.translated ?? undefined,
            startTime: i * 1000,
            endTime: (i + 1) * 1000,
            isFinal: true,
          })
        )
        setSegments(newSegments)
        segmentsRef.current = newSegments
        finalSegments = newSegments
        onSegmentsChange?.(newSegments)
        toast.success(translationMode === 'elevenlabs' ? 'Transcribe xong (ElevenLabs)' : 'Transcribe xong (fal.ai Whisper)')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Lỗi transcribe')
      } finally {
        setIsTranscribing(false)
      }
    }

    await saveTranscriptToLibrary(finalSegments, recordingStartAt, recordingDuration)
    recordingStartedAtRef.current = null
    toast.success(translationMode === 'soniox' ? 'Recording stopped' : 'Đã dừng ghi âm')
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      toast('Recording paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      toast('Recording resumed')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const sourceLabel = audioSource === 'microphone' ? 'Microphone' : audioSource === 'system' ? 'System Audio' : 'Micro + System'
  const isLiveConnected = status === 'connected' || ((translationMode === 'local' || translationMode === 'elevenlabs') && isRecording)
  const transcribingLabel = translationMode === 'elevenlabs' ? 'Đang transcribe (ElevenLabs)...' : 'Đang transcribe (MLX)...'

  const levelColor = audioLevel > 80 ? '#ef4444' : audioLevel > 50 ? '#eab308' : '#22c55e'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Controls Card */}
      <div style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
        {/* Source label */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: D.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Nguồn âm thanh
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: D.card, border: `1px solid ${D.border2}`,
            borderRadius: 8, padding: '5px 10px', fontSize: 13, color: D.text,
          }}>
            {audioSource === 'microphone'
              ? <Smartphone size={14} style={{ color: '#60a5fa' }} />
              : <Monitor size={14} style={{ color: '#a78bfa' }} />
            }
            {sourceLabel}
          </div>
          {audioSource !== 'microphone' && (
            <p style={{ color: '#f59e0b', fontSize: 11, marginTop: 6 }}>
              ⚠ Khi bấm Record, hãy bật Share tab audio
            </p>
          )}
        </div>

        {/* Buttons + status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={status === 'connecting' || isTranscribing}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#dc2626', border: 'none', borderRadius: 10,
                color: '#fff', cursor: (status === 'connecting' || isTranscribing) ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 15, padding: '10px 0',
                opacity: (status === 'connecting' || isTranscribing) ? 0.7 : 1,
                width: '100%',
              }}
            >
              {(status === 'connecting' || isTranscribing)
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Mic size={16} />
              }
              {isTranscribing ? 'Đang transcribe...' : status === 'connecting' ? 'Connecting...' : 'Record'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: D.card, border: `1px solid ${D.border2}`, borderRadius: 10,
                  color: D.text, cursor: 'pointer', padding: '9px 0',
                }}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                onClick={stopRecording}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 10, color: '#f87171', cursor: 'pointer', padding: '9px 0',
                }}
              >
                <Square size={16} />
              </button>
            </div>
          )}

          {/* Status + timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: isLiveConnected ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.1)',
              border: `1px solid ${isLiveConnected ? 'rgba(34,197,94,0.3)' : D.border2}`,
              borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600,
              color: isLiveConnected ? '#4ade80' : D.muted,
            }}>
              {isTranscribing ? transcribingLabel : isLiveConnected ? '🔴 Recording' : status}
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: D.text }}>
              {formatTime(recordingTime)}
            </span>
          </div>
        </div>

        {/* Audio level meter */}
        {isRecording && (
          <div style={{ marginTop: 12, height: 6, background: D.border2, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: levelColor,
              width: `${audioLevel}%`,
              transition: 'width 0.1s ease, background 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {/* Info Card */}
      <div style={{
        background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16,
        textAlign: 'center',
      }}>
        <BookOpen size={28} style={{ color: D.muted, margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
        <p style={{ color: D.muted, fontSize: 13, margin: '0 0 4px' }}>Transcript sẽ hiện trong cột giữa</p>
        <p style={{ color: D.muted, fontSize: 11, margin: 0 }}>
          {audioSource === 'microphone'
            ? 'Nói vào micro để bắt đầu'
            : audioSource === 'system'
              ? 'Phát video/phim để lấy âm thanh hệ thống'
              : 'Vừa nói vào micro, vừa lấy âm thanh từ video'}
        </p>
      </div>
    </div>
  )
}
