import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Upload, FileVideo, Settings, BookOpen, Copy, Download, Clock, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AudioRecorder, type RecorderAudioSource, type RecorderTranslationMode } from '@/components/transcript/AudioRecorder'
import type { TranscriptSegment } from '@/lib/transcript/soniox-client'

/* ── Dark palette ── */
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


const LANGUAGES = [
  { value: 'auto', label: '🌐 Tự động phát hiện' },
  { value: 'vi',   label: '🇻🇳 Tiếng Việt' },
  { value: 'en',   label: '🇺🇸 English' },
  { value: 'zh',   label: '🇨🇳 中文' },
  { value: 'ja',   label: '🇯🇵 日本語' },
  { value: 'ko',   label: '🇰🇷 한국어' },
  { value: 'fr',   label: '🇫🇷 Français' },
  { value: 'de',   label: '🇩🇪 Deutsch' },
  { value: 'es',   label: '🇪🇸 Español' },
]

const inputStyle: React.CSSProperties = {
  background: '#161728', border: '1px solid #2a2b3d', borderRadius: 8,
  color: '#f1f5f9', fontSize: 13, padding: '8px 12px', width: '100%', boxSizing: 'border-box',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  background: '#161728', border: '1px solid #2a2b3d', borderRadius: 8,
  color: '#f1f5f9', fontSize: 13, padding: '8px 10px', width: '100%', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  color: '#94a3b8', fontSize: 12, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6,
}

export default function TranscriptPage() {
  const navigate = useNavigate()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('soniox_api_key') || '')
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(() => localStorage.getItem('elevenlabs_api_key') || '')
  const [sourceLanguage, setSourceLanguage] = useState('auto')
  const [targetLanguage, setTargetLanguage] = useState('vi')
  const [translationMode, setTranslationMode] = useState<RecorderTranslationMode>('local')
  const [audioSource, setAudioSource] = useState<RecorderAudioSource>('microphone')
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [provisionalText, setProvisionalText] = useState('')

  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedMode = localStorage.getItem('translation_mode') as RecorderTranslationMode | null
    if (savedMode === 'local' || savedMode === 'soniox' || savedMode === 'elevenlabs') {
      setTranslationMode(savedMode)
    }
    const savedSrc = localStorage.getItem('transcript_audio_source') as RecorderAudioSource | null
    if (savedSrc === 'microphone' || savedSrc === 'system' || savedSrc === 'both') {
      setAudioSource(savedSrc)
    }
  }, [])

  useEffect(() => { localStorage.setItem('translation_mode', translationMode) }, [translationMode])
  useEffect(() => { localStorage.setItem('transcript_audio_source', audioSource) }, [audioSource])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments, provisionalText])

  const handleSaveSettings = () => {
    localStorage.setItem('soniox_api_key', apiKey)
    localStorage.setItem('elevenlabs_api_key', elevenLabsApiKey)
    localStorage.setItem('translation_mode', translationMode)
    setSettingsOpen(false)
  }

  const copyTranscript = () => {
    const text = segments
      .map(seg => `${seg.speaker ? seg.speaker + ': ' : ''}${seg.translatedText || seg.originalText}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Đã copy transcript')
  }

  const exportTranscript = () => {
    const content = segments
      .map(seg => {
        const time = new Date(seg.startTime).toISOString().substr(11, 8)
        return `[${time}] ${seg.speaker ? seg.speaker + ': ' : ''}${seg.translatedText || seg.originalText}`
      })
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã export transcript')
  }

  const formatTime = (ms: number) => new Date(ms).toISOString().substr(11, 8)

  const modeBtn = (val: RecorderTranslationMode, label: string) => (
    <button
      key={val}
      type="button"
      onClick={() => setTranslationMode(val)}
      style={{
        width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 13,
        fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'background 0.15s',
        background: translationMode === val ? 'rgba(124,58,237,0.15)' : 'transparent',
        color: translationMode === val ? '#a78bfa' : D.muted,
        outline: translationMode === val ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
      }}
    >{label}</button>
  )

  const srcBtn = (val: RecorderAudioSource, label: string) => (
    <button
      key={val}
      type="button"
      onClick={() => setAudioSource(val)}
      style={{
        width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 13,
        fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'background 0.15s',
        background: audioSource === val ? 'rgba(124,58,237,0.15)' : 'transparent',
        color: audioSource === val ? '#a78bfa' : D.muted,
        outline: audioSource === val ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
      }}
    >{label}</button>
  )

  return (
    <div style={{ background: D.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: D.card, borderBottom: `1px solid ${D.border}`,
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookOpen size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ color: D.text, fontSize: 18, fontWeight: 800, margin: 0 }}>Transcript & Phụ đề</h1>
            <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>Tạo phụ đề từ micro, video với AI</p>
          </div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 9,
            color: D.muted, cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 600,
          }}
        >
          <Settings size={14} /> Cài đặt
        </button>
      </div>

      {/* 3-column grid */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 280px',
        gap: 16, padding: 16, maxWidth: 1600, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>

        {/* ── Left Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Quick Actions */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
              <span style={{ color: D.text, fontWeight: 700, fontSize: 14 }}>Chức năng</span>
            </div>
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { Icon: Mic,       color: '#a78bfa', label: 'Ghi âm',   desc: 'Transcribe trực tiếp', path: '/teacher/transcript' },
                { Icon: Upload,    color: '#60a5fa', label: 'Upload',   desc: 'Từ file audio/video',  path: '/teacher/transcript/upload' },
                { Icon: FileVideo, color: '#4ade80', label: 'Thư viện', desc: 'Quản lý transcript',   path: '/teacher/transcript/recording' },
              ]).map(({ Icon, color, label, desc, path }) => (
                <div
                  key={label}
                  onClick={() => navigate(path)}
                  style={{
                    background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10,
                    padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = D.border)}
                >
                  <Icon size={18} style={{ color, marginBottom: 4, display: 'block' }} />
                  <div style={{ color: D.text, fontWeight: 700, fontSize: 13 }}>{label}</div>
                  <div style={{ color: D.muted, fontSize: 11 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Settings */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${D.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Settings size={14} style={{ color: D.muted }} />
              <span style={{ color: D.text, fontWeight: 700, fontSize: 14 }}>Cài đặt nhanh</span>
            </div>
            <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={labelStyle}>Model</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {modeBtn('local', '⚡ fal.ai Whisper')}
                  {modeBtn('soniox', '☁️ Soniox')}
                  {modeBtn('elevenlabs', '🎙️ ElevenLabs')}
                </div>
                {translationMode === 'soniox' && !apiKey && (
                  <p style={{ color: '#f59e0b', fontSize: 11, marginTop: 4 }}>⚠ Nhập API Key trong Cài đặt</p>
                )}
                {translationMode === 'elevenlabs' && !elevenLabsApiKey && (
                  <p style={{ color: '#f59e0b', fontSize: 11, marginTop: 4 }}>⚠ Nhập API Key trong Cài đặt</p>
                )}
              </div>
              <div>
                <span style={labelStyle}>Nguồn âm thanh</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {srcBtn('microphone', '🎙 Microphone')}
                  {srcBtn('system', '🖥 System Audio')}
                  {srcBtn('both', '🎛 Micro + System')}
                </div>
                {audioSource !== 'microphone' && (
                  <p style={{ color: '#f59e0b', fontSize: 11, marginTop: 4 }}>⚠ Bật Share tab audio</p>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 10 }}>
                <button
                  onClick={() => setSettingsOpen(true)}
                  style={{
                    width: '100%', background: D.card2, border: `1px solid ${D.border2}`,
                    borderRadius: 8, color: D.muted, cursor: 'pointer', padding: '7px 0',
                    fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Settings size={12} /> Cài đặt chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Center: Transcript Viewer ── */}
        <div>
          <div style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
            display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)',
            position: 'sticky', top: 76,
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: `1px solid ${D.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <div style={{ color: D.text, fontWeight: 700, fontSize: 16 }}>Transcript</div>
                <div style={{ color: D.muted, fontSize: 12 }}>
                  {segments.length} segment{segments.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={copyTranscript}
                  disabled={segments.length === 0}
                  title="Copy"
                  style={{
                    background: 'transparent', border: `1px solid ${D.border2}`, borderRadius: 7,
                    color: D.muted, cursor: segments.length === 0 ? 'not-allowed' : 'pointer',
                    padding: '5px 8px', opacity: segments.length === 0 ? 0.4 : 1,
                  }}
                ><Copy size={14} /></button>
                <button
                  onClick={exportTranscript}
                  disabled={segments.length === 0}
                  title="Export"
                  style={{
                    background: 'transparent', border: `1px solid ${D.border2}`, borderRadius: 7,
                    color: D.muted, cursor: segments.length === 0 ? 'not-allowed' : 'pointer',
                    padding: '5px 8px', opacity: segments.length === 0 ? 0.4 : 1,
                  }}
                ><Download size={14} /></button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {segments.length === 0 && !provisionalText ? (
                <div style={{ textAlign: 'center', paddingTop: 60 }}>
                  <Mic size={40} style={{ color: D.muted, opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ color: D.muted, fontSize: 14, margin: '0 0 4px' }}>Chưa có transcript</p>
                  <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>Bấm Record để bắt đầu</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {segments.map((seg, idx) => (
                    <div key={idx} style={{
                      background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        {seg.speaker && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
                            borderRadius: 5, padding: '2px 7px', fontSize: 11, color: '#a78bfa',
                          }}>
                            <User size={10} />
                            {seg.speaker.replace('Speaker ', 'SP')}
                          </span>
                        )}
                        <span style={{ color: D.muted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} />
                          {formatTime(seg.startTime)}
                        </span>
                      </div>
                      <p style={{ color: D.text, fontSize: 13, margin: 0 }}>{seg.originalText}</p>
                      {seg.translatedText && (
                        <p style={{
                          color: '#60a5fa', fontSize: 13, margin: '5px 0 0',
                          paddingLeft: 10, borderLeft: '2px solid rgba(96,165,250,0.4)',
                        }}>
                          → {seg.translatedText}
                        </p>
                      )}
                    </div>
                  ))}
                  {provisionalText && (
                    <div style={{
                      background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)',
                      borderRadius: 10, padding: '10px 12px', opacity: 0.8,
                    }}>
                      <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>{provisionalText}</p>
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Recorder Controls ── */}
        <div>
          <div style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden',
            position: 'sticky', top: 76,
          }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${D.border}` }}>
              <span style={{ color: D.text, fontWeight: 700, fontSize: 15 }}>Điều khiển</span>
            </div>
            <div style={{ padding: 14 }}>
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
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            style={{
              background: D.card, border: `1px solid ${D.border2}`, borderRadius: 16,
              padding: 28, width: '90%', maxWidth: 480, position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSettingsOpen(false)}
              style={{
                position: 'absolute', top: 14, right: 14, background: 'transparent',
                border: 'none', color: D.muted, cursor: 'pointer', padding: 4,
              }}
            ><X size={18} /></button>

            <h2 style={{ color: D.text, fontSize: 18, fontWeight: 800, margin: '0 0 20px' }}>
              Cài đặt Transcription
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Model transcribe</label>
                <select
                  value={translationMode}
                  onChange={e => setTranslationMode(e.target.value as RecorderTranslationMode)}
                  style={selectStyle}
                >
                  <option value="local">⚡ fal.ai Whisper large-v3 (mặc định — server-side, không cần key)</option>
                  <option value="soniox">☁️ Soniox (Real-time — cần API Key)</option>
                  <option value="elevenlabs">🎙️ ElevenLabs (đang phát triển)</option>
                </select>
                <p style={{ color: D.muted, fontSize: 11, marginTop: 5 }}>
                  Mặc định: fal.ai Whisper qua server (Vietnamese OK). Chọn Soniox nếu cần real-time.
                </p>
              </div>

              {translationMode === 'soniox' && (
                <div>
                  <label style={labelStyle}>Soniox API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Nhập API key từ soniox.com"
                    style={inputStyle}
                  />
                  <p style={{ color: D.muted, fontSize: 11, marginTop: 5 }}>
                    Lấy API key tại{' '}
                    <a href="https://soniox.com" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>
                      soniox.com
                    </a>
                  </p>
                </div>
              )}

              {translationMode === 'elevenlabs' && (
                <div>
                  <label style={labelStyle}>ElevenLabs API Key</label>
                  <input
                    type="password"
                    value={elevenLabsApiKey}
                    onChange={e => setElevenLabsApiKey(e.target.value)}
                    placeholder="Nhập API key từ elevenlabs.io"
                    style={inputStyle}
                  />
                  <p style={{ color: D.muted, fontSize: 11, marginTop: 5 }}>
                    Lấy API key tại{' '}
                    <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>
                      elevenlabs.io
                    </a>
                  </p>
                </div>
              )}

              <div>
                <label style={labelStyle}>Ngôn ngữ nguồn</label>
                <select value={sourceLanguage} onChange={e => setSourceLanguage(e.target.value)} style={selectStyle}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Ngôn ngữ đích</label>
                <select value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)} style={selectStyle}>
                  {LANGUAGES.filter(l => l.value !== 'auto').map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Nguồn âm thanh</label>
                <select
                  value={audioSource}
                  onChange={e => setAudioSource(e.target.value as RecorderAudioSource)}
                  style={selectStyle}
                >
                  <option value="microphone">🎙 Microphone</option>
                  <option value="system">🖥 System Audio</option>
                  <option value="both">🎛 Micro + System Audio</option>
                </select>
              </div>

              {translationMode === 'elevenlabs' && (
                <p style={{ color: D.muted, fontSize: 11 }}>
                  ElevenLabs sẽ tự dịch sang ngôn ngữ đích nếu server có OPENAI_API_KEY hoặc GEMINI_API_KEY.
                </p>
              )}

              <button
                onClick={handleSaveSettings}
                style={{
                  background: D.purple, border: 'none', borderRadius: 10,
                  color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  padding: '10px 0', width: '100%', marginTop: 4,
                }}
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
