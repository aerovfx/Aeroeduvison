"use client"

import { useEffect, useState } from "react"
import { AudioRecorder, type RecorderAudioSource, type RecorderTranslationMode } from "@/components/transcript/audio-recorder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Mic, Upload, FileVideo, Settings, BookOpen, Copy, Download, Clock, User, Monitor } from "lucide-react"
import { useRouter } from "next/navigation"
import { TranscriptSegment } from "@/lib/transcript/soniox-client"
import { toast } from "react-hot-toast"

const LANGUAGES = [
  { value: "auto", label: "🌐 Tự động phát hiện" },
  { value: "vi", label: "🇻🇳 Tiếng Việt" },
  { value: "en", label: "🇺🇸 English" },
  { value: "zh", label: "🇨🇳 中文" },
  { value: "ja", label: "🇯🇵 日本語" },
  { value: "ko", label: "🇰🇷 한국어" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "es", label: "🇪🇸 Español" },
]

export default function TranscriptPage() {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('soniox_api_key') || ''
    }
    return ''
  })
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("elevenlabs_api_key") || ""
    }
    return ""
  })
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("vi")
  const [translationMode, setTranslationMode] = useState<RecorderTranslationMode>("local") // Default to local
  const [audioSource, setAudioSource] = useState<RecorderAudioSource>("microphone")
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [provisionalText, setProvisionalText] = useState("")

  useEffect(() => {
    // Load saved settings: MLX Local = default, Soniox = second
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem("translation_mode") as RecorderTranslationMode | null
      if (savedMode === "local" || savedMode === "soniox" || savedMode === "elevenlabs") {
        setTranslationMode(savedMode)
      } else {
        setTranslationMode("local")
      }
      const savedAudioSource = localStorage.getItem('transcript_audio_source') as RecorderAudioSource | null
      if (savedAudioSource === "microphone" || savedAudioSource === "system" || savedAudioSource === "both") {
        setAudioSource(savedAudioSource)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('translation_mode', translationMode)
    }
    if (translationMode === 'local') {
      console.log('[Transcript] Model mặc định: MLX Local')
    } else if (translationMode === "soniox") {
      console.log('[Transcript] Model: Soniox (API Key)')
    } else {
      console.log("[Transcript] Model: ElevenLabs (API Key)")
    }
  }, [translationMode])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transcript_audio_source", audioSource)
    }
  }, [audioSource])

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soniox_api_key', apiKey)
      localStorage.setItem("elevenlabs_api_key", elevenLabsApiKey)
      localStorage.setItem('translation_mode', translationMode)
    }
    setSettingsOpen(false)
  }

  const copyTranscript = () => {
    const text = segments.map(seg => 
      `${seg.speaker ? seg.speaker + ': ' : ''}${seg.translatedText || seg.originalText}`
    ).join('\n')
    navigator.clipboard.writeText(text)
    toast.success("Đã copy transcript")
  }

  const exportTranscript = () => {
    const content = segments.map((seg, i) => {
      const time = new Date(seg.startTime).toISOString().substr(11, 12)
      return `[${time}] ${seg.speaker ? seg.speaker + ': ' : ''}${seg.translatedText || seg.originalText}`
    }).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Đã export transcript")
  }

  const formatTime = (ms: number) => {
    return new Date(ms).toISOString().substr(11, 8)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transcript & Phụ đề</h1>
                <p className="text-sm text-gray-600">Tạo phụ đề từ micro, video với AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Cài đặt
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cài đặt Transcription</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Model transcribe</Label>
                      <Select value={translationMode} onValueChange={(v: RecorderTranslationMode) => setTranslationMode(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">🖥️ MLX Local (mặc định — offline, miễn phí)</SelectItem>
                          <SelectItem value="soniox">☁️ Soniox (Real-time — cần API Key)</SelectItem>
                          <SelectItem value="elevenlabs">⚡ ElevenLabs (API Key)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Mặc định: MLX Local. Chọn Soniox hoặc ElevenLabs nếu cần cloud model.
                      </p>
                    </div>
                    {translationMode === "soniox" && (
                      <div className="space-y-2">
                        <Label htmlFor="api-key">Soniox API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Nhập API key từ soniox.com"
                        />
                        <p className="text-xs text-gray-500">
                          Lấy API key tại{' '}
                          <a
                            href="https://soniox.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline"
                          >
                            soniox.com
                          </a>
                        </p>
                      </div>
                    )}
                    {translationMode === "elevenlabs" && (
                      <div className="space-y-2">
                        <Label htmlFor="elevenlabs-api-key">ElevenLabs API Key</Label>
                        <Input
                          id="elevenlabs-api-key"
                          type="password"
                          value={elevenLabsApiKey}
                          onChange={(e) => setElevenLabsApiKey(e.target.value)}
                          placeholder="Nhập API key từ elevenlabs.io"
                        />
                        <p className="text-xs text-gray-500">
                          Lấy API key tại{" "}
                          <a
                            href="https://elevenlabs.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline"
                          >
                            elevenlabs.io
                          </a>
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="source-lang">Ngôn ngữ nguồn</Label>
                      <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target-lang">Ngôn ngữ đích</Label>
                      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.filter(l => l.value !== "auto").map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {translationMode === "elevenlabs" && (
                      <p className="text-xs text-gray-500">
                        ElevenLabs sẽ tự dịch sang ngôn ngữ đích nếu server có `OPENAI_API_KEY` hoặc `GEMINI_API_KEY`.
                      </p>
                    )}
                    <Button onClick={handleSaveSettings} className="w-full">
                      Lưu cài đặt
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered Layout */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Quick Actions (1/4) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chức năng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <Mic className="w-6 h-6 text-purple-600 mb-2" />
                    <CardTitle className="text-sm">Ghi âm</CardTitle>
                    <CardDescription className="text-xs">
                      Transcribe trực tiếp
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/teacher/transcript/upload')}>
                  <CardHeader>
                    <Upload className="w-6 h-6 text-blue-600 mb-2" />
                    <CardTitle className="text-sm">Upload</CardTitle>
                    <CardDescription className="text-xs">
                      Từ file audio/video
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/teacher/transcript/library')}>
                  <CardHeader>
                    <FileVideo className="w-6 h-6 text-green-600 mb-2" />
                    <CardTitle className="text-sm">Thư viện</CardTitle>
                    <CardDescription className="text-xs">
                      Quản lý transcript
                    </CardDescription>
                  </CardHeader>
                </Card>
              </CardContent>
            </Card>

            {/* Settings Panel */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Cài đặt nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Model</Label>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setTranslationMode('local')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${translationMode === 'local' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      🖥️ MLX Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranslationMode('soniox')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${translationMode === 'soniox' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      ☁️ Soniox
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranslationMode("elevenlabs")}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${translationMode === "elevenlabs" ? "bg-purple-50 text-purple-700 border border-purple-200" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      ⚡ ElevenLabs
                    </button>
                  </div>
                  {translationMode === 'soniox' && !apiKey && (
                    <span className="text-xs text-amber-600">⚠ Nhập API Key</span>
                  )}
                  {translationMode === "elevenlabs" && !elevenLabsApiKey && (
                    <span className="text-xs text-amber-600">⚠ Nhập API Key</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Nguồn âm thanh</Label>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setAudioSource("microphone")}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left inline-flex items-center gap-2 ${
                        audioSource === "microphone" ? "bg-purple-50 text-purple-700 border border-purple-200" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      Micro
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioSource("system")}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left inline-flex items-center gap-2 ${
                        audioSource === "system" ? "bg-purple-50 text-purple-700 border border-purple-200" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Monitor className="w-3 h-3" />
                      System
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioSource("both")}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                        audioSource === "both" ? "bg-purple-50 text-purple-700 border border-purple-200" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Cả 2
                    </button>
                  </div>
                  {audioSource !== "microphone" && (
                    <span className="text-xs text-amber-600">⚠ Bật Share tab audio</span>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="w-full">
                    <Settings className="w-3 h-3 mr-2" />
                    Cài đặt chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center - Transcript Viewer (2/4) */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Transcript</CardTitle>
                    <CardDescription>
                      {segments.length} segment{segments.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyTranscript}
                      disabled={segments.length === 0}
                      className="h-8 w-8"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={exportTranscript}
                      disabled={segments.length === 0}
                      className="h-8 w-8"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-4 space-y-3">
                    {segments.length === 0 && !provisionalText ? (
                      <div className="text-center py-12 text-gray-500">
                        <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Chưa có transcript</p>
                        <p className="text-xs mt-2">Bấm Record để bắt đầu</p>
                      </div>
                    ) : (
                      <>
                        {segments.map((segment, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {segment.speaker && (
                                  <Badge variant="outline" className="text-xs">
                                    <User className="w-3 h-3 mr-1" />
                                    {segment.speaker.replace('Speaker ', 'SP')}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(segment.startTime)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-900">{segment.originalText}</p>
                            {segment.translatedText && (
                              <div className="text-sm text-blue-600 pl-2 border-l-2 border-blue-300">
                                → {segment.translatedText}
                              </div>
                            )}
                          </div>
                        ))}

                        {provisionalText && (
                          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 opacity-70">
                            <p className="text-sm text-gray-700">{provisionalText}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right - AudioRecorder (1/4) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Điều khiển</CardTitle>
              </CardHeader>
              <CardContent>
                <AudioRecorder
                  translationMode={translationMode}
                  apiKey={apiKey}
                  elevenLabsApiKey={elevenLabsApiKey}
                  sourceLanguage={sourceLanguage}
                  targetLanguage={targetLanguage}
                  audioSource={audioSource}
                  onSegmentsChange={setSegments}
                  onProvisionalChange={setProvisionalText}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
