"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Volume2, 
  Download, 
  Copy,
  AlertCircle,
  CheckCircle,
  Loader2,
  Monitor,
  Smartphone
} from "lucide-react"
import { recordingHandlers, type AudioSource, type TranslationMode } from "@/lib/transcript/recording-handlers"
import { mlxLocalClient } from "@/lib/transcript/mlx-local-client"
import { TranscriptSegment } from "@/lib/transcript/soniox-client"
import { toast } from "react-hot-toast"

export default function RecordingPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone')
  const [translationMode, setTranslationMode] = useState<TranslationMode>('local')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState<'idle' | 'ready' | 'recording' | 'paused' | 'error'>('idle')
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [provisionalText, setProvisionalText] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("vi")
  const [mlxEnabled, setMlxEnabled] = useState(false)
  const [mlxStatus, setMlxStatus] = useState({
    ready: false,
    pythonAvailable: false,
    venvExists: false,
    modelsReady: false,
    setupInProgress: false,
  })
  const [setupProgress, setSetupProgress] = useState<string[]>([])

  const recordingTimeRef = useRef<NodeJS.Timeout | null>(null)
  const initializingRef = useRef(false)

  // Check MLX status on mount
  useEffect(() => {
    checkMLXStatus()
  }, [])

  // Sync translation mode with localStorage (same key as main transcript page)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('translation_mode') as TranslationMode | null
    if (saved === 'soniox' || saved === 'local') setTranslationMode(saved)
  }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('translation_mode', translationMode)
  }, [translationMode])

  const checkMLXStatus = async () => {
    const status = await mlxLocalClient.checkSystemSetup()
    const mlxStatusObj = mlxLocalClient.getStatus()
    setMlxStatus(mlxStatusObj)
    setMlxEnabled(mlxStatusObj.ready)
  }

  const handleMLXSetup = async () => {
    try {
      setSetupProgress([])
      setMlxStatus(prev => ({ ...prev, setupInProgress: true }))
      
      await mlxLocalClient.setupEnvironment()
      
      await checkMLXStatus()
      toast.success("MLX setup completed!")
    } catch (err) {
      const error = err as Error
      toast.error(error.message)
      setSetupProgress([error.message])
    }
  }

  // Initialize handlers on mount
  useEffect(() => {
    recordingHandlers.onSegment = (segment) => {
      setSegments(prev => [...prev, segment])
      setProvisionalText("")
    }

    recordingHandlers.onProvisional = (text) => {
      setProvisionalText(text)
    }

    recordingHandlers.onError = (error) => {
      setErrorMessage(error)
      setStatus('error')
      toast.error(error)
      console.error('Recording error:', error)
    }

    recordingHandlers.onAudioLevel = (level) => {
      setAudioLevel(level)
    }

    return () => {
      recordingHandlers.destroy()
    }
  }, [])

  // Update recording time
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimeRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingTimeRef.current) {
        clearInterval(recordingTimeRef.current)
        recordingTimeRef.current = null
      }
    }

    return () => {
      if (recordingTimeRef.current) {
        clearInterval(recordingTimeRef.current)
      }
    }
  }, [isRecording, isPaused])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    if (initializingRef.current) return
    initializingRef.current = true

    try {
      setErrorMessage("")
      setStatus('ready')

      // Initialize recording handlers
      const initialized = await recordingHandlers.init({
        apiKey: translationMode === 'soniox' ? apiKey : undefined,
        sourceLanguage,
        targetLanguage,
        audioSource,
        translationMode,
        mlxEnabled: mlxEnabled && translationMode === 'local',
      })

      if (!initialized) {
        setStatus('error')
        initializingRef.current = false
        return
      }

      // Start recording based on audio source
      let success = false
      switch (audioSource) {
        case 'microphone':
          success = await recordingHandlers.startMicrophoneRecording()
          break
        case 'system':
          success = await recordingHandlers.startSystemAudioRecording()
          break
        case 'both':
          success = await recordingHandlers.startDualRecording()
          break
      }

      if (!success) {
        setStatus('error')
        initializingRef.current = false
        return
      }

      // Start the actual recording
      const recordingStarted = recordingHandlers.startRecording()
      if (recordingStarted) {
        setIsRecording(true)
        setIsPaused(false)
        setStatus('recording')
        setRecordingTime(0)
        setSegments([])
        setProvisionalText("")
        toast.success("Recording started")
      }
    } catch (err) {
      const error = err as Error
      setErrorMessage(error.message)
      setStatus('error')
      toast.error(error.message)
    } finally {
      initializingRef.current = false
    }
  }

  const handlePauseRecording = () => {
    const success = recordingHandlers.pauseRecording()
    if (success) {
      setIsPaused(true)
      setStatus('paused')
      toast.success("Recording paused")
    }
  }

  const handleResumeRecording = () => {
    const success = recordingHandlers.resumeRecording()
    if (success) {
      setIsPaused(false)
      setStatus('recording')
      toast.success("Recording resumed")
    }
  }

  const handleStopRecording = () => {
    const success = recordingHandlers.stopRecording()
    if (success) {
      setIsRecording(false)
      setIsPaused(false)
      setStatus('idle')
      toast.success(`Recording stopped. Transcribed ${segments.length} segments`)
    }
  }

  const handleExportAudio = () => {
    recordingHandlers.exportAudio()
    toast.success("Audio exported")
  }

  const copyTranscript = () => {
    const text = segments
      .map(seg => `${seg.speaker ? seg.speaker + ': ' : ''}${seg.translatedText || seg.originalText}`)
      .join('\n')
    
    navigator.clipboard.writeText(text)
    toast.success("Transcript copied")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ghi Âm & Transcribe</h1>
            <p className="text-gray-600 mt-2">Ghi âm từ micro hoặc hệ thống với dịch thuật trực tiếp</p>
          </div>
          <Badge variant={status === 'recording' ? 'default' : 'secondary'} className="text-base px-4 py-2">
            {status === 'recording' && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang ghi âm
              </>
            )}
            {status === 'paused' && (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Tạm dừng
              </>
            )}
            {status === 'idle' && (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Sẵn sàng
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Lỗi
              </>
            )}
          </Badge>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recording Controls Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Điều khiển
                </CardTitle>
                <CardDescription>Bắt đầu ghi âm</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recording Time Display */}
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">Thời gian ghi âm</p>
                  <p className="text-3xl font-mono font-bold text-gray-900">
                    {formatTime(recordingTime)}
                  </p>
                </div>

                {/* Audio Source Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nguồn âm thanh</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={audioSource === 'microphone' ? 'default' : 'outline'}
                      onClick={() => setAudioSource('microphone')}
                      disabled={isRecording}
                      className="text-xs"
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={audioSource === 'system' ? 'default' : 'outline'}
                      onClick={() => setAudioSource('system')}
                      disabled={isRecording}
                      className="text-xs"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={audioSource === 'both' ? 'default' : 'outline'}
                      onClick={() => setAudioSource('both')}
                      disabled={isRecording}
                      className="text-xs"
                    >
                      Cả 2
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {audioSource === 'microphone' && 'Chỉ ghi âm từ micro'}
                    {audioSource === 'system' && 'Chỉ ghi âm hệ thống'}
                    {audioSource === 'both' && 'Ghi âm cả micro và hệ thống'}
                  </p>
                </div>

                {/* Main Control Buttons */}
                <div className="space-y-2">
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      disabled={status === 'error' || initializingRef.current}
                      size="lg"
                      className="w-full gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <Mic className="w-5 h-5" />
                      Bắt đầu ghi âm
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {!isPaused ? (
                        <Button
                          onClick={handlePauseRecording}
                          size="lg"
                          className="gap-2"
                          variant="outline"
                        >
                          <Pause className="w-5 h-5" />
                          Tạm dừng
                        </Button>
                      ) : (
                        <Button
                          onClick={handleResumeRecording}
                          size="lg"
                          className="gap-2"
                        >
                          <Play className="w-5 h-5" />
                          Tiếp tục
                        </Button>
                      )}
                      <Button
                        onClick={handleStopRecording}
                        size="lg"
                        className="gap-2 bg-red-600 hover:bg-red-700"
                      >
                        <Square className="w-5 h-5" />
                        Dừng
                      </Button>
                    </div>
                  )}
                </div>

                {/* Audio Level Indicator */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Mức âm thanh
                  </label>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">{Math.round(audioLevel)}%</p>
                </div>

                {/* Mode Selection: MLX Local (default) first, Soniox second */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Model transcribe</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={translationMode === 'local' ? 'default' : 'outline'}
                      onClick={() => setTranslationMode('local')}
                      disabled={isRecording || !mlxStatus.ready}
                      className="text-xs"
                    >
                      🖥️ MLX Local (mặc định)
                    </Button>
                    <Button
                      variant={translationMode === 'soniox' ? 'default' : 'outline'}
                      onClick={() => setTranslationMode('soniox')}
                      disabled={isRecording}
                      className="text-xs"
                    >
                      ☁️ Soniox (API Key)
                    </Button>
                  </div>
                </div>

                {/* MLX Status */}
                {translationMode === 'local' && !isRecording && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">MLX Status</span>
                          <Badge variant={mlxStatus.ready ? 'default' : 'secondary'}>
                            {mlxStatus.ready ? '✅ Ready' : '⚙️ Setup needed'}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            {mlxStatus.pythonAvailable ? '✓' : '○'} Python 3.10+
                          </div>
                          <div className="flex items-center gap-2">
                            {mlxStatus.venvExists ? '✓' : '○'} Virtual environment
                          </div>
                          <div className="flex items-center gap-2">
                            {mlxStatus.modelsReady ? '✓' : '○'} Models (Whisper + Gemma)
                          </div>
                        </div>

                        {!mlxStatus.ready && (
                          <Button
                            onClick={handleMLXSetup}
                            disabled={mlxStatus.setupInProgress}
                            className="w-full mt-2"
                            size="sm"
                          >
                            {mlxStatus.setupInProgress ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Setting up...
                              </>
                            ) : (
                              'Setup MLX'
                            )}
                          </Button>
                        )}

                        {setupProgress.length > 0 && (
                          <div className="mt-2 p-2 bg-white rounded text-xs max-h-24 overflow-y-auto">
                            {setupProgress.map((msg, idx) => (
                              <div key={idx} className="text-gray-600">{msg}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Export Button */}
                {!isRecording && segments.length > 0 && (
                  <Button
                    onClick={handleExportAudio}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Tải xuống âm thanh
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Settings Card */}
            {translationMode === 'soniox' && !isRecording && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cài đặt Soniox</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Ngôn ngữ
                      </label>
                      <select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="auto">Tự động</option>
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Dịch sang
                      </label>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Transcript */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Alert */}
            {errorMessage && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-900">Lỗi</p>
                      <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transcript Display */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Bảng dịch</CardTitle>
                  <CardDescription>{segments.length} đoạn đã transcribe</CardDescription>
                </div>
                {segments.length > 0 && (
                  <Button
                    onClick={copyTranscript}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {/* Provisional Text */}
                  {provisionalText && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-600 italic">{provisionalText}</p>
                    </div>
                  )}

                  {/* Transcript Segments */}
                  {segments.length === 0 && !provisionalText ? (
                    <div className="text-center py-12">
                      <Mic className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {isRecording ? 'Đợi đầu tiên...' : 'Bắt đầu ghi âm để xem bản dịch tại đây'}
                      </p>
                    </div>
                  ) : (
                    segments.map((segment, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          {segment.speaker && (
                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {segment.speaker}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 ml-auto">
                            {new Date(segment.startTime).toISOString().substr(11, 8)}
                          </span>
                        </div>
                        {segment.translatedText && (
                          <p className="text-gray-900 font-medium">{segment.translatedText}</p>
                        )}
                        {segment.translatedText !== segment.originalText && (
                          <p className="text-sm text-gray-600 mt-1">{segment.originalText}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
