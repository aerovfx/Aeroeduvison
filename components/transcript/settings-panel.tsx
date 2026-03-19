"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Volume2, Type, Maximize2, Monitor, Loader, CheckCircle, AlertCircle } from "lucide-react"

interface TranscriptSettings {
  sonioxApiKey: string
  sourceLanguage: string
  targetLanguage: string
  translationMode: "local" | "soniox"  // Changed: local first (default)
  overlayOpacity: number
  fontSize: number
  maxLines: number
  showOriginal: boolean
  ttsEnabled: boolean
  ttsProvider: "webspeech" | "edge" | "elevenlabs"
  ttsVoice: string
  ttsSpeed: number
  customContext?: {
    domain?: string
    terms?: string[]
  }
  mlxEnabled: boolean
  mlxModelPath: string
  mlxVenvPath: string
}

interface TranscriptSettingsPanelProps {
  settings: TranscriptSettings
  onSave: (settings: TranscriptSettings) => void
  onClose: () => void
}

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

interface MLXStatus {
  pythonAvailable: boolean
  pythonVersion?: string
  venvExists: boolean
  modelsReady: boolean
  whisperReady: boolean
  gemmaReady: boolean
  setupInProgress: boolean
  setupComplete: boolean
  setupError?: string
}

export function TranscriptSettingsPanel({ settings, onSave, onClose }: TranscriptSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<TranscriptSettings>(settings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [mlxStatus, setMlxStatus] = useState<MLXStatus>({
    pythonAvailable: false,
    venvExists: false,
    modelsReady: false,
    whisperReady: false,
    gemmaReady: false,
    setupInProgress: false,
    setupComplete: false,
  })
  const [setupProgress, setSetupProgress] = useState<string[]>([])

  // Check MLX setup status on mount
  useEffect(() => {
    checkMlxStatus()
  }, [])

  const checkMlxStatus = async () => {
    try {
      // Check Python
      const pythonRes = await fetch('/api/transcript/local/check-python')
      const pythonData = await pythonRes.json()
      
      // Check venv
      const venvRes = await fetch('/api/transcript/local/check-venv')
      const venvData = await venvRes.json()
      
      // Check models
      const modelsRes = await fetch('/api/transcript/local/check-models')
      const modelsData = await modelsRes.json()

      setMlxStatus({
        pythonAvailable: pythonData.available,
        pythonVersion: pythonData.version,
        venvExists: venvData.exists,
        modelsReady: modelsData.ready,
        whisperReady: modelsData.models?.whisper || false,
        gemmaReady: modelsData.models?.gemma || false,
        setupInProgress: false,
        setupComplete: venvData.exists && modelsData.ready,
      })
    } catch (error) {
      console.error('Error checking MLX status:', error)
    }
  }

  const handleSetupMLX = async () => {
    setMlxStatus(prev => ({ ...prev, setupInProgress: true, setupError: undefined }))
    setSetupProgress([])

    try {
      const response = await fetch('/api/transcript/local/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDownload: true }),
      })

      if (!response.ok) {
        throw new Error(`Setup failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.message) {
                setSetupProgress(prev => [...prev, data.message])
              }
              if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (e) {
              // Skip parsing errors for non-JSON lines
            }
          }
        }
      }

      // Re-check status after setup
      await checkMlxStatus()
      setMlxStatus(prev => ({ ...prev, setupInProgress: false, setupComplete: true }))
    } catch (error: any) {
      setMlxStatus(prev => ({
        ...prev,
        setupInProgress: false,
        setupError: error.message || 'Setup failed',
      }))
    }
  }

  const handleSave = () => {
    onSave(localSettings)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Chung</TabsTrigger>
          <TabsTrigger value="display">Hiển thị</TabsTrigger>
          <TabsTrigger value="tts">TTS</TabsTrigger>
          <TabsTrigger value="context">Ngữ cảnh</TabsTrigger>
          <TabsTrigger value="local">Local MLX</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API & Ngôn ngữ</CardTitle>
              <CardDescription>Cấu hình API key và ngôn ngữ dịch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Soniox API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={localSettings.sonioxApiKey}
                    onChange={(e) => setLocalSettings({ ...localSettings, sonioxApiKey: e.target.value })}
                    placeholder="Nhập API key từ soniox.com"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Lấy API key tại{' '}
                  <a href="https://console.soniox.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                    console.soniox.com
                  </a>
                </p>
                {localSettings.sonioxApiKey && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-yellow-600 flex items-center gap-1">
                      ⚠️ Free trial expires quickly. Get backup keys for continuous use.
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source-lang">Ngôn ngữ nguồn</Label>
                  <Select
                    value={localSettings.sourceLanguage}
                    onValueChange={(value) => setLocalSettings({ ...localSettings, sourceLanguage: value })}
                  >
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
                  <Select
                    value={localSettings.targetLanguage}
                    onValueChange={(value) => setLocalSettings({ ...localSettings, targetLanguage: value })}
                  >
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
              </div>

              <div className="space-y-2">
                <Label>Chế độ dịch</Label>
                <Select
                  value={localSettings.translationMode}
                  onValueChange={(value: any) => setLocalSettings({ ...localSettings, translationMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">🖥️ Local MLX (Offline - Miễn phí - Default)</SelectItem>
                    <SelectItem value="soniox">☁️ Soniox Cloud (Real-time - $0.12/hr)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Local MLX: Miễn phí, offline, riêng tư. Soniox: Real-time, độ chính xác cao.
                </p>
                {localSettings.translationMode === "local" && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Đang dùng Local MLX (Miễn phí)</span>
                  </div>
                )}
                {localSettings.translationMode === "soniox" && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Đang dùng Soniox API (Cần API key)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Settings */}
        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hiển thị Transcript</CardTitle>
              <CardDescription>Điều chỉnh giao diện hiển thị</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="opacity">Độ trong suốt: {Math.round(localSettings.overlayOpacity * 100)}%</Label>
                  <Monitor className="w-4 h-4 text-gray-500" />
                </div>
                <Slider
                  id="opacity"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={[localSettings.overlayOpacity]}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, overlayOpacity: value[0] })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-size">Cỡ chữ: {localSettings.fontSize}px</Label>
                  <Type className="w-4 h-4 text-gray-500" />
                </div>
                <Slider
                  id="font-size"
                  min={12}
                  max={24}
                  step={1}
                  value={[localSettings.fontSize]}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, fontSize: value[0] })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-lines">Số dòng tối đa: {localSettings.maxLines}</Label>
                  <Maximize2 className="w-4 h-4 text-gray-500" />
                </div>
                <Slider
                  id="max-lines"
                  min={3}
                  max={10}
                  step={1}
                  value={[localSettings.maxLines]}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, maxLines: value[0] })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hiển thị bản gốc</Label>
                  <p className="text-xs text-gray-500">Hiển thị cả bản gốc và bản dịch</p>
                </div>
                <Switch
                  checked={localSettings.showOriginal}
                  onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showOriginal: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TTS Settings */}
        <TabsContent value="tts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Text-to-Speech
              </CardTitle>
              <CardDescription>Đọc dịch bằng giọng nói</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bật TTS</Label>
                  <p className="text-xs text-gray-500">Đọc to bản dịch</p>
                </div>
                <Switch
                  checked={localSettings.ttsEnabled}
                  onCheckedChange={(checked) => setLocalSettings({ ...localSettings, ttsEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Nhà cung cấp TTS</Label>
                <Select
                  value={localSettings.ttsProvider}
                  onValueChange={(value: any) => setLocalSettings({ ...localSettings, ttsProvider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webspeech">🆓 Web Speech (Free, Browser)</SelectItem>
                    <SelectItem value="edge">🆓 Edge TTS (Free, Microsoft)</SelectItem>
                    <SelectItem value="elevenlabs">⭐ ElevenLabs (Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {localSettings.ttsProvider === "elevenlabs" && (
                <div className="space-y-2">
                  <Label>ElevenLabs API Key</Label>
                  <Input
                    type="password"
                    placeholder="Nhập API key"
                    value=""
                    onChange={() => {}}
                  />
                  <p className="text-xs text-gray-500">
                    Lấy API key tại{' '}
                    <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                      elevenlabs.io
                    </a>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tts-speed">Tốc độ: {localSettings.ttsSpeed}x</Label>
                <Slider
                  id="tts-speed"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[localSettings.ttsSpeed]}
                  onValueChange={(value) => setLocalSettings({ ...localSettings, ttsSpeed: value[0] })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Context Settings */}
        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ngữ cảnh Tùy chỉnh</CardTitle>
              <CardDescription>Cung cấp ngữ cảnh để cải thiện độ chính xác</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain/Lĩnh vực</Label>
                <Input
                  id="domain"
                  placeholder="Ví dụ: Y học, Luật, Công nghệ"
                  value={localSettings.customContext?.domain || ""}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    customContext: { ...localSettings.customContext, domain: e.target.value }
                  })}
                />
                <p className="text-xs text-gray-500">Giúp AI hiểu các thuật ngữ chuyên ngành</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Thuật ngữ (phân cách bằng dấu phẩy)</Label>
                <Input
                  id="terms"
                  placeholder="Ví dụ: API, WebSocket, transcription"
                  value={localSettings.customContext?.terms?.join(", ") || ""}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    customContext: { ...localSettings.customContext, terms: e.target.value.split(",").map(t => t.trim()) }
                  })}
                />
                <p className="text-xs text-gray-500">Các từ/cụm từ quan trọng cần nhận diện chính xác</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Local MLX Settings */}
        <TabsContent value="local" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Local MLX (Offline)</CardTitle>
              <CardDescription>Chạy transcription cục bộ, không cần API key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 text-blue-600 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Yêu cầu hệ thống:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>macOS với Apple Silicon (M1/M2/M3)</li>
                      <li>Python 3.10+</li>
                      <li>~5GB dung lượng trống</li>
                      <li>Lần đầu tải model: ~10-15 phút</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bật Local MLX</Label>
                  <p className="text-xs text-gray-500">Sử dụng Whisper local thay vì Soniox API</p>
                </div>
                <Switch
                  checked={localSettings.mlxEnabled && mlxStatus.setupComplete}
                  disabled={!mlxStatus.setupComplete}
                  onCheckedChange={(checked) => setLocalSettings({ ...localSettings, mlxEnabled: checked })}
                />
              </div>

              {/* Setup Status */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Trạng thái cài đặt</Label>
                  <Badge variant={mlxStatus.setupComplete ? "default" : "secondary"}>
                    {mlxStatus.setupComplete ? "✅ Sẵn sàng" : "⏳ Chưa cài đặt"}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {/* Python Check */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      {mlxStatus.pythonAvailable ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Python 3.10+</div>
                      {mlxStatus.pythonAvailable && mlxStatus.pythonVersion && (
                        <div className="text-xs text-gray-500">v{mlxStatus.pythonVersion}</div>
                      )}
                    </div>
                  </div>

                  {/* Virtual Environment */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      {mlxStatus.venvExists ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Virtual environment</div>
                      {mlxStatus.venvExists && (
                        <div className="text-xs text-gray-500">~Library/Application Support/Aeroeduvison/mlx-env</div>
                      )}
                    </div>
                  </div>

                  {/* MLX Packages */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      {mlxStatus.venvExists ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">MLX packages</div>
                      {mlxStatus.venvExists && (
                        <div className="text-xs text-gray-500">mlx, mlx-lm, whisper-mlx, gemma</div>
                      )}
                    </div>
                  </div>

                  {/* Whisper Model */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      {mlxStatus.whisperReady ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Whisper model</div>
                      {mlxStatus.whisperReady && (
                        <div className="text-xs text-gray-500">whisper-large-v3-turbo (1.5GB)</div>
                      )}
                    </div>
                  </div>

                  {/* Gemma Model */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      {mlxStatus.gemmaReady ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Gemma model</div>
                      {mlxStatus.gemmaReady && (
                        <div className="text-xs text-gray-500">gemma-3-4b-it-qat-4bit (3GB)</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Install Button */}
                <Button 
                  onClick={handleSetupMLX}
                  disabled={mlxStatus.setupInProgress || mlxStatus.setupComplete}
                  className="w-full mt-4"
                >
                  {mlxStatus.setupInProgress && (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Đang cài đặt MLX...
                    </>
                  )}
                  {!mlxStatus.setupInProgress && mlxStatus.setupComplete && (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Cài đặt hoàn tất
                    </>
                  )}
                  {!mlxStatus.setupInProgress && !mlxStatus.setupComplete && (
                    "Cài đặt MLX"
                  )}
                </Button>

                {/* Setup Error */}
                {mlxStatus.setupError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <p className="font-medium mb-1">❌ Lỗi cài đặt:</p>
                    <p>{mlxStatus.setupError}</p>
                  </div>
                )}

                {/* Setup Progress */}
                {setupProgress.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded max-h-48 overflow-y-auto">
                    <p className="text-sm font-medium text-green-900 mb-2">📋 Tiến trình:</p>
                    <div className="space-y-1 text-xs text-green-800 font-mono">
                      {setupProgress.map((msg, idx) => (
                        <div key={idx}>{msg}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Info Box */}
              {mlxStatus.setupComplete && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 text-green-600 mt-0.5">✨</div>
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">Local MLX sẵn sàng!</p>
                      <p>Bạn có thể bật Local MLX để chạy transcription offline mà không cần API key.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={handleSave} className="px-6">
          Lưu cài đặt
        </Button>
      </div>
    </div>
  )
}
