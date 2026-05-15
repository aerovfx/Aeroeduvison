import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, RefreshCw,
  AlertCircle, Search, Maximize2,
  Users, MonitorPlay, Signal,
  Video, VideoOff, Scissors, Mic, Volume2, Circle,
  Play, Square, ChevronUp, ChevronDown, ChevronLeft,
  ChevronRight, Plus, Minus, Settings2, History,
  Sidebar as SidebarIcon,
  MousePointer2, Gamepad2, Info, Database, Download, Sparkles, Brain, Scan,
  Copy as CopyIcon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AIVisionOverlay, type AnalysisResult } from '@/components/camera/AIVisionOverlay'
import {
  EMOTION_CONFIG,
  EmotionType
} from '@/lib/advanced-emotion-recognition'
import { cameraService } from '@/services/camera.service'

// ── Dark colour palette ──
const D = {
  bg:      '#0d0e17',
  wall:    '#0a0a0a',
  topbar:  '#111118',
  card:    '#0f1016',
  card2:   '#14151f',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  text:    '#f1f5f9',
  muted:   'rgba(255,255,255,0.45)',
  purple:  '#7c3aed',
  purpleA: (a: number) => `rgba(124,58,237,${a})`,
  white:   (a: number) => `rgba(255,255,255,${a})`,
}

// ── Interfaces ──
interface CameraItem {
  id: string; name: string; rtspUrl: string; brand: string
  location: string; locationType: string; assignedTo?: string
  classId?: string; className?: string; roomNumber?: string
  status: 'online' | 'offline' | 'error' | 'testing'
  hlsUrl?: string; streamId?: string; lastChecked?: string
  studentCount?: number
}

interface Recording {
  id: string; cameraId: string; cameraName: string; startTime: string
  endTime?: string; duration?: number; videoUrl: string
  thumbnailUrl?: string; status: 'recording' | 'completed' | 'failed'
  fileSize?: number
}

// ── Student rosters ──
const CLASS_STUDENT_NAMES: Record<string, string[]> = {
  'Lớp 11A2': [
    'Nguyễn Minh Anh','Trần Đức Bảo','Lê Thị Cẩm','Phạm Hoàng Dũng',
    'Hoàng Thúy Duyên','Võ Quang Hải','Đặng Thị Hạnh','Bùi Văn Hùng',
    'Ngô Thị Hương','Đỗ Minh Khang','Lý Thị Lan','Trương Quốc Long',
    'Huỳnh Ngọc Mai','Phan Thành Nam','Vũ Thị Ngọc','Dương Đình Phát',
    'Mai Thị Phương','Lưu Anh Quân','Tạ Thị Quỳnh','Hồ Đắc Sơn',
    'Nguyễn Thị Thanh','Trần Văn Thắng','Lê Quốc Thiện','Phạm Thị Thu',
    'Hoàng Anh Tiến','Võ Thị Trang','Đặng Minh Trí','Bùi Thị Tú',
    'Ngô Quang Tuấn','Đỗ Thị Uyên','Lý Văn Vinh','Trương Thị Xuân',
    'Huỳnh Đình Yên','Phan Thị Yến','Vũ Quốc Anh','Dương Thị Bích',
    'Mai Văn Cường','Lưu Thị Diệu','Tạ Quang Đạt','Hồ Thị Giang',
  ],
  'Lớp 9A1': [
    'Nguyễn Thị An','Trần Minh Bình','Lê Văn Công','Phạm Thị Dung',
    'Hoàng Quốc Đạt','Võ Thị Hoa','Đặng Văn Hưng','Bùi Thị Khánh',
    'Ngô Minh Lâm','Đỗ Thị Linh','Lý Quang Minh','Trương Thị Nhung',
    'Huỳnh Văn Phong','Phan Thị Quyên','Vũ Đình Sỹ','Dương Thị Thảo',
    'Mai Quốc Toàn','Lưu Thị Uyên','Tạ Văn Vũ','Hồ Thị Xuyến',
    'Nguyễn Minh Quân','Trần Thị Hằng','Lê Hoàng Long','Phạm Thúy Liễu',
    'Hoàng Văn Tâm','Võ Thị Ngân','Đặng Quang Phúc','Bùi Thị Sen',
    'Ngô Đình Tú','Đỗ Thị Vân','Lý Văn Hòa','Trương Thị Mai',
    'Huỳnh Quốc Bảo','Phan Thị Tâm','Vũ Minh Trung',
  ],
  'Lớp 10B2': [
    'Nguyễn Thị Bảo','Trần Văn Cảnh','Lê Thị Diệp','Phạm Quốc Em',
    'Hoàng Thị Giang','Võ Minh Hoàng','Đặng Thị Kim','Bùi Văn Lộc',
    'Ngô Thị Mỹ','Đỗ Quang Nghĩa','Lý Thị Oanh','Trương Văn Phú',
    'Huỳnh Thị Quyên','Phan Minh Sang','Vũ Thị Thu','Dương Văn Uy',
    'Mai Thị Vân','Lưu Quốc Vinh','Tạ Thị Xuân','Hồ Đình Ý',
    'Nguyễn Văn Anh','Trần Thị Bình','Lê Minh Châu','Phạm Thị Đào',
    'Hoàng Quốc Huy','Võ Thị Lan','Đặng Minh Nhật','Bùi Thị Phượng',
    'Ngô Quang Sơn','Đỗ Thị Thúy','Lý Văn Triệu','Trương Thị Uyên',
  ],
}

function getStudentNamesForClass(className?: string): string[] {
  if (!className) return []
  return CLASS_STUDENT_NAMES[className] || []
}

// ── Sub-components ──

function ControlBtn({
  icon: Icon, onClick, active = false, label, danger = false
}: { icon: any; onClick?: () => void; active?: boolean; label?: string; danger?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const bg    = active ? D.purpleA(0.15) : hovered ? (danger ? 'rgba(239,68,68,0.1)' : D.white(0.06)) : 'transparent'
  const color = active ? D.purple : hovered ? (danger ? '#ef4444' : D.text) : D.muted
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 4, padding: '6px 8px',
        borderRadius: 10, background: bg, color, border: 'none',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <Icon style={{ width: 20, height: 20 }} />
      {label && (
        <span style={{
          display: hovered ? 'block' : 'none', position: 'absolute', top: -32,
          background: 'rgba(0,0,0,0.85)', color: D.text, padding: '2px 8px',
          borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          whiteSpace: 'nowrap', zIndex: 50, letterSpacing: '0.05em',
        }}>{label}</span>
      )}
    </button>
  )
}

function CameraSlot({
  index, camera, isSelected, onSelect, aiActive, onAiToggle, onAnalysis,
  analysisData, recordingActive, onRecordingToggle, onViewHistory, onRemove, recordingLoading, studentNames,
}: {
  index: number; camera: CameraItem | null; isSelected: boolean; onSelect: () => void
  aiActive: boolean; onAiToggle: () => void; onAnalysis: (data: AnalysisResult) => void
  onSnapshot?: (data: AnalysisResult & { timestamp: string }) => void
  analysisData: AnalysisResult | null; recordingActive: boolean; onRecordingToggle: () => void
  onViewHistory: () => void; onRemove: () => void; recordingLoading?: boolean; studentNames?: string[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', aspectRatio: '16/9', display: 'flex', flexDirection: 'column',
        border: `2px solid ${isSelected ? D.purple : 'transparent'}`,
        background: '#1a1a1a', cursor: 'pointer', borderRadius: 2,
        overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        transition: 'border-color 0.15s',
      }}
    >
      {camera ? (
        <>
          <div style={{ position: 'absolute', inset: 0, background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {camera.id === 'cam_demo' ? (
              <video
                ref={videoRef} src={camera.rtspUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                autoPlay loop muted playsInline
              />
            ) : (
              <div style={{ textAlign: 'center', opacity: hovered ? 0.6 : 0.4, transition: 'opacity 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                  <MonitorPlay style={{ width: 32, height: 32, color: D.white(0.5) }} />
                  <div style={{ width: 1, height: 24, background: D.white(0.2) }} />
                  <span style={{ fontSize: 20, fontWeight: 900, color: D.white(0.8), fontStyle: 'italic', letterSpacing: '-0.05em' }}>HD</span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 500, color: D.white(0.6), letterSpacing: '0.15em', textTransform: 'uppercase' }}>{camera.name}</p>
              </div>
            )}

            <AIVisionOverlay
              videoRef={videoRef} isActive={aiActive} cameraId={camera.id}
              studentNames={studentNames} className={camera.className}
              onAnalysisUpdate={onAnalysis}
              onSnapshot={data => console.log(`[SNAPSHOT] Camera ${camera.id}:`, data)}
            />

            {aiActive && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity: 0.2 }}>
                <div className="animate-scan" style={{ width: '100%', height: 2, background: D.purple, boxShadow: `0 0 15px ${D.purple}` }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0, rgba(0,0,0,0.4) 100%)' }} />
              </div>
            )}

            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', zIndex: 20 }}>
              <div style={{ background: '#dc2626', padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 4, height: 4, background: '#fff', borderRadius: '50%' }} className="animate-pulse" />
                LIVE
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, color: D.white(0.8), border: `1px solid ${D.white(0.1)}`, marginTop: 2 }}>
                {camera.className || 'UNKNOWN'}
              </div>
            </div>

            {aiActive && analysisData && (
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, zIndex: 20 }}>
                <div style={{ background: 'rgba(37,99,235,0.9)', backdropFilter: 'blur(8px)', padding: '3px 6px', borderRadius: 2, fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(96,165,250,0.3)' }}>
                  <Brain style={{ width: 12, height: 12 }} /> ANALYZING
                </div>
                <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '2px 6px', borderRadius: 2, fontSize: 8, fontWeight: 900, color: '#fff', border: `1px solid ${D.white(0.1)}` }}>
                  STUDENTS: {analysisData.peopleCount}
                </div>
                {analysisData.actions.length > 0 && (
                  <div style={{ background: 'rgba(249,115,22,0.9)', padding: '2px 6px', borderRadius: 2, fontSize: 8, fontWeight: 900, color: '#fff' }}>
                    {analysisData.actions[0]}
                  </div>
                )}
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 16, fontSize: 9, fontFamily: 'monospace', color: D.white(0.4), background: 'rgba(0,0,0,0.45)', padding: '2px 8px', borderRadius: 4, backdropFilter: 'blur(4px)', border: `1px solid ${D.white(0.05)}`, zIndex: 20 }}>
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
              <span>{new Date().toLocaleTimeString('vi-VN')}</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>15.4 FPS</span>
            </div>

            {recordingActive && (
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, zIndex: 20 }}>
                <div style={{ background: '#dc2626', padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }} className="animate-pulse">
                  <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} /> REC
                </div>
              </div>
            )}

            <div style={{
              position: 'absolute', inset: 0, background: D.purpleA(0.1),
              opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 30,
            }}>
              <button
                onClick={e => { e.stopPropagation(); onAiToggle() }}
                title="Bật/Tắt Phân tích AI"
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                  background: aiActive ? '#2563eb' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.15s',
                }}
              >
                <Brain style={{ width: 24, height: 24 }} className={aiActive ? 'animate-pulse' : ''} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRecordingToggle() }}
                disabled={recordingLoading}
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: 'none', cursor: recordingLoading ? 'not-allowed' : 'pointer',
                  background: recordingActive ? '#dc2626' : D.purple, opacity: recordingLoading ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {recordingActive ? <Square style={{ width: 20, height: 20 }} /> : <Circle style={{ width: 20, height: 20 }} />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onViewHistory() }}
                style={{
                  width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.12)',
                }}
              >
                <History style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.white(0.1) }}>
          <div style={{ textAlign: 'center' }}>
            <Plus style={{ width: 40, height: 40, margin: '0 auto 8px' }} />
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Chọn Kênh</p>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, zIndex: 40 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: D.white(0.3), background: 'rgba(0,0,0,0.45)', padding: '1px 6px', borderRadius: 3, border: `1px solid ${D.white(0.05)}`, textTransform: 'uppercase' }}>
          CH{index + 1}
        </span>
        {camera && (
          <button
            onClick={e => { e.stopPropagation(); onRemove() }}
            style={{ padding: 4, borderRadius: 4, background: 'rgba(0,0,0,0.45)', color: D.white(0.5), border: `1px solid ${D.white(0.05)}`, cursor: 'pointer' }}
          >
            <Square style={{ width: 10, height: 10 }} />
          </button>
        )}
      </div>
    </div>
  )
}

function VisionAnalyticsDashboard({ data, cameraName }: { data: AnalysisResult | null; cameraName: string }) {
  const panelStyle = { background: D.white(0.03), border: `1px solid ${D.white(0.05)}`, borderRadius: 12, padding: 12 }
  if (!data) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...panelStyle, borderStyle: 'dashed', textAlign: 'center' }}>
      <Brain style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.1, color: D.muted }} className="animate-pulse" />
      <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.muted, lineHeight: 1.6 }}>
        Kích hoạt AI Vision (Brain Icon)<br />để xem phân tích hành vi &amp; cảm xúc
      </p>
    </div>
  )

  const emotionCounts = data.emotions.reduce((acc: Record<string, number>, e) => {
    acc[e] = (acc[e] || 0) + 1; return acc
  }, {})

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: D.white(0.8), display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Sparkles style={{ width: 16, height: 16, color: '#60a5fa' }} />
          Analytics: {cameraName.split(' - ')[0]}
        </h3>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '1px 8px', borderRadius: 4, fontStyle: 'italic' }} className="animate-pulse">LIVE-AI</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase' }}>Sĩ số</span>
            <Users style={{ width: 14, height: 14, color: '#60a5fa' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: D.text }}>{data.peopleCount}</span>
            <span style={{ fontSize: 10, color: D.muted, fontWeight: 700 }}>/ 40</span>
          </div>
          <div style={{ width: '100%', height: 4, background: D.white(0.05), borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3b82f6', width: `${(data.peopleCount / 40) * 100}%`, transition: 'width 0.5s' }} />
          </div>
        </div>
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase' }}>Hành động</span>
            <Scan style={{ width: 14, height: 14, color: '#fb923c' }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#fb923c', textTransform: 'uppercase', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.actions.length > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, background: '#fb923c', borderRadius: '50%' }} className="animate-ping" />
                {data.actions[0]}
              </span>
            ) : 'ỔN ĐỊNH'}
          </div>
          <div style={{ fontSize: 8, color: D.muted, marginTop: 8, fontStyle: 'italic' }}>Dựa trên Pose Landmarks</div>
        </div>
      </div>

      <div style={{ flex: 1, ...panelStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${D.white(0.05)}`, paddingBottom: 8 }}>
          <Brain style={{ width: 12, height: 12, color: '#c084fc' }} /> Distribution (Ký tâm đồ)
        </span>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
          {Object.entries(emotionCounts).map(([emotion, count]) => {
            const config = EMOTION_CONFIG[emotion as EmotionType]
            const pct    = Math.round((count / data.emotions.length) * 100)
            return (
              <div key={emotion} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: D.white(0.7), fontWeight: 700 }}>{config?.emoji} {config?.labelVi} ({count})</span>
                  <span style={{ color: D.muted, fontFamily: 'monospace', fontStyle: 'italic' }}>{pct}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: D.white(0.05), borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: config?.color, transition: 'width 0.7s ease-out' }} />
                </div>
              </div>
            )
          })}
          {data.emotions.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', opacity: 0.2 }}>
              <RefreshCw style={{ width: 24, height: 24, marginBottom: 8 }} className="animate-spin" />
              <p style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 900, textAlign: 'center' }}>Đang quét sinh trắc học...</p>
            </div>
          )}
        </div>
      </div>

      {data.studentEmotions && data.studentEmotions.length > 0 && (
        <div style={{ ...panelStyle, maxHeight: 200, overflowY: 'auto' }} className="custom-scrollbar">
          <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${D.white(0.05)}`, paddingBottom: 8, marginBottom: 8 }}>
            <Users style={{ width: 12, height: 12, color: '#22d3ee' }} /> Học sinh ({data.studentEmotions.length})
          </span>
          {data.studentEmotions.map((se, i) => {
            const config = EMOTION_CONFIG[se.emotion as EmotionType]
            return (
              <div key={`${se.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, padding: '4px 6px', borderRadius: 4 }}>
                <span style={{ color: D.white(0.8), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{se.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: config?.color, flexShrink: 0 }}>
                  {config?.emoji} <span style={{ fontWeight: 700 }}>{config?.labelVi}</span>
                  <span style={{ color: D.muted, marginLeft: 4 }}>{Math.round(se.confidence)}%</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PTZJoystick() {
  return (
    <div style={{ position: 'relative', width: 128, height: 128, borderRadius: '50%', background: D.white(0.04), border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', padding: 8 }}>
        {[
          <ChevronUp style={{ width: 20, height: 20, transform: 'rotate(-45deg)' }} />,
          <ChevronUp style={{ width: 24, height: 24 }} />,
          <ChevronUp style={{ width: 20, height: 20, transform: 'rotate(45deg)' }} />,
          <ChevronLeft style={{ width: 24, height: 24 }} />,
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: D.purple, border: '4px solid rgba(255,255,255,0.2)', alignSelf: 'center', justifySelf: 'center' }} />,
          <ChevronRight style={{ width: 24, height: 24 }} />,
          <ChevronDown style={{ width: 20, height: 20, transform: 'rotate(45deg)' }} />,
          <ChevronDown style={{ width: 24, height: 24 }} />,
          <ChevronDown style={{ width: 20, height: 20, transform: 'rotate(-45deg)' }} />,
        ].map((icon, i) => (
          <button key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: D.muted }}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ──
export default function CameraManagement() {
  const [cameras, setCameras]                   = useState<CameraItem[]>([])
  const [loading, setLoading]                   = useState(true)
  const [gridSize, setGridSize]                 = useState<1 | 4 | 9>(4)
  const [selectedSlot, setSelectedSlot]         = useState<number>(0)
  const [gridAssignments, setGridAssignments]   = useState<(CameraItem | null)[]>(new Array(16).fill(null))
  const [isSidebarOpen, setIsSidebarOpen]       = useState(true)
  const [searchQuery, setSearchQuery]           = useState('')
  const [aiVisionActive, setAiVisionActive]     = useState<Record<string, boolean>>({})
  const [analysisData, setAnalysisData]         = useState<Record<string, AnalysisResult>>({})
  const [activeRecordings, setActiveRecordings] = useState<Record<string, boolean>>({})
  const [recordings, setRecordings]             = useState<Recording[]>([])
  const [showRecordingsModal, setShowRecordingsModal] = useState(false)
  const [recordingLoading, setRecordingLoading] = useState(false)

  // Load data on mount
  useState(() => { fetchData(); loadRecordings() })

  async function fetchData() {
    try {
      setLoading(true)
      // Class map để lookup className theo classId
      const classRes = await fetch('/api/classes')
      const classMap: Record<string, string> = {}
      if (classRes.ok) {
        const cd = await classRes.json()
        const cls = cd.classes || []
        cls.forEach((c: any) => { classMap[c.id] = c.name })
      }
      // Demo camera (AI analysis sample) — luôn có cho test
      const demoCamera: CameraItem = {
        id: 'cam_demo', name: 'AI Demo Analysis',
        rtspUrl: '/api/camera/file/20260316003128604.MP4',
        brand: 'AeroAI', location: 'Lab 101', locationType: 'lab',
        className: 'Lớp 11A2', status: 'online', studentCount: 40,
      }
      // Real cameras from /api/cameras (admin đã setup ONVIF)
      const r = await cameraService.list()
      const fetched: CameraItem[] = (r.cameras || []).map(c => ({
        id: c.id, name: c.name, brand: c.brand,
        rtspUrl: c.rtspUrl || '',
        location: c.location, locationType: c.locationType,
        classId: c.classId || undefined,
        className: c.classId ? classMap[c.classId] : undefined,
        status: c.status === 'online' ? 'online' : c.status === 'offline' ? 'offline' : 'online',
        hlsUrl: c.hlsUrl || undefined,
      }))
      const combined = [demoCamera, ...fetched.filter(c => c.id !== 'cam_demo')]
      setCameras(combined)
      const grid = new Array(16).fill(null)
      combined.slice(0, 4).forEach((cam, i) => { grid[i] = cam })
      setGridAssignments(grid)
    } catch (e) {
      console.warn('[teacher:cameras] fallback mock', e)
      loadMockData()
    } finally { setLoading(false) }
  }

  /** Copy RTSP URL của camera vào clipboard — gọi backend để lấy URL có cred.
   * Hiển thị toast với URL preview (để user verify đã copy đúng).
   */
  async function handleCopyRtspUrl(camera: CameraItem) {
    try {
      // Camera demo dùng URL local file, không qua backend
      if (camera.id === 'cam_demo' || !camera.id.startsWith('cam_')) {
        await navigator.clipboard.writeText(camera.rtspUrl)
        toast.success(`Đã copy URL "${camera.name}"`)
        return
      }
      const r = await cameraService.copyUrl(camera.id)
      await navigator.clipboard.writeText(r.rtspMain)
      // Mask password trong toast preview
      const masked = r.rtspMain.replace(/:([^:@]+)@/, ':***@')
      toast.success(
        `Đã copy URL "${camera.name}"\n${masked}\n\nMở VLC → Media → Open Network Stream → paste`,
        { duration: 5000 }
      )
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || 'Không thể copy URL camera')
    }
  }

  function loadMockData() {
    const mock: CameraItem[] = [
      { id: 'cam_demo',  name: 'AI Demo Analysis', rtspUrl: '/api/camera/file/20260316003128604.MP4', brand: 'AeroAI',    location: 'Lab 101',      locationType: 'lab',       className: 'Lớp 11A2', status: 'online', studentCount: 40 },
      { id: 'cam_1',     name: 'Camera 9A1 - P1',  rtspUrl: '...',                                     brand: 'Dahua',     location: 'Phòng 201',    locationType: 'classroom', className: 'Lớp 9A1',  status: 'online', studentCount: 35 },
      { id: 'cam_2',     name: 'Camera 9A1 - P2',  rtspUrl: '...',                                     brand: 'Dahua',     location: 'Phòng 201',    locationType: 'classroom', className: 'Lớp 9A1',  status: 'online', studentCount: 35 },
      { id: 'cam_3',     name: 'Camera 10B2',       rtspUrl: '...',                                     brand: 'HikVision', location: 'Phòng 301',    locationType: 'classroom', className: 'Lớp 10B2', status: 'online', studentCount: 32 },
      { id: 'cam_4',     name: 'Hành lang Tòa A',   rtspUrl: '...',                                     brand: 'HikVision', location: 'Hành lang',    locationType: 'hallway',                          status: 'online' },
    ]
    setCameras(mock)
    const grid = new Array(16).fill(null)
    mock.forEach((cam, i) => { grid[i] = cam })
    setGridAssignments(grid)
  }

  async function loadRecordings() {
    try {
      const res = await fetch('/api/camera/recording?limit=100')
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.recordings || [])
        const active: Record<string, boolean> = {}
        data.recordings?.forEach((r: Recording) => { if (r.status === 'recording') active[r.cameraId] = true })
        setActiveRecordings(active)
      }
    } catch (e) { console.error('Error loading recordings:', e) }
  }

  async function handleStartRecording(camera: CameraItem) {
    try {
      setRecordingLoading(true)
      const res = await fetch('/api/camera/recording', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: camera.id, cameraName: camera.name, rtspUrl: camera.rtspUrl, classId: camera.classId }),
      })
      const result = await res.json()
      if (result.success) { setActiveRecordings(prev => ({ ...prev, [camera.id]: true })); loadRecordings() }
      else alert('Không thể bắt đầu ghi hình: ' + (result.error || 'Lỗi không xác định'))
    } catch (e: any) { alert('Lỗi: ' + (e.message || 'Không thể bắt đầu ghi hình')) }
    finally { setRecordingLoading(false) }
  }

  async function handleStopRecording(cameraId: string, recordingId: string) {
    try {
      setRecordingLoading(true)
      const res    = await fetch(`/api/camera/recording/${recordingId}/stop`, { method: 'POST' })
      const result = await res.json()
      if (result.success) { setActiveRecordings(prev => ({ ...prev, [cameraId]: false })); loadRecordings() }
      else alert('Không thể dừng ghi hình: ' + (result.error || 'Lỗi không xác định'))
    } catch (e: any) { alert('Lỗi: ' + (e.message || 'Không thể dừng ghi hình')) }
    finally { setRecordingLoading(false) }
  }

  function handleCameraSelect(camera: CameraItem) {
    const g = [...gridAssignments]; g[selectedSlot] = camera; setGridAssignments(g)
  }

  const filteredCameras = cameras.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.className?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const gridCols: Record<number, string> = { 1: 'grid-cols-1', 4: 'grid-cols-2', 9: 'grid-cols-3' }
  const gridRows: Record<number, string> = { 1: 'grid-rows-1', 4: 'grid-rows-2', 9: 'grid-rows-3' }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: D.bg }}>

      {/* Global CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        .animate-scan { animation: scan 3s ease-in-out infinite; }
        @keyframes scan { 0%,100%{transform:translateY(0)} 50%{transform:translateY(100vh)} }
        .cam-slot-hover { transition: background 0.15s; }
        .cam-slot-hover:hover { background: rgba(124,58,237,0.08) !important; }
      `}</style>

      {/* ── Left Sidebar ── */}
      <div style={{
        flexShrink: 0, borderRight: `1px solid ${D.border}`, transition: 'width 0.3s',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        width: isSidebarOpen ? 288 : 0, background: D.bg,
      }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: D.muted, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <SidebarIcon style={{ width: 16, height: 16 }} /> Thiết bị
            </h2>
            <button
              onClick={fetchData}
              style={{ padding: 6, borderRadius: 8, background: D.white(0.04), border: `1px solid ${D.border}`, cursor: 'pointer', color: D.muted }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: D.muted }} />
            <input
              type="text" placeholder="Tìm camera..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 8, paddingBottom: 8, background: D.white(0.03), border: `1px solid ${D.border}`, borderRadius: 10, fontSize: 12, color: D.text, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} className="custom-scrollbar">
          {filteredCameras.map(cam => {
            const active = gridAssignments.some(a => a?.id === cam.id)
            return (
              <div
                key={cam.id}
                className="cam-slot-hover group"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                  background: active ? D.purpleA(0.1) : 'transparent',
                  border: `1px solid ${active ? D.purpleA(0.2) : 'transparent'}`,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cam.status === 'online' ? '#22c55e' : '#64748b', flexShrink: 0 }} className={cam.status === 'online' ? 'animate-pulse' : ''} />
                <div onClick={() => handleCameraSelect(cam)} style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{cam.name}</p>
                  <p style={{ fontSize: 10, color: D.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {cam.brand} • {cam.className || cam.location}
                  </p>
                </div>
                {/* Copy RTSP URL — hover to reveal */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopyRtspUrl(cam) }}
                  title={`Copy RTSP URL của ${cam.name} (paste vào VLC để xem live)`}
                  style={{
                    padding: 6, borderRadius: 6, background: 'transparent', border: 'none',
                    cursor: 'pointer', color: D.muted, opacity: 0.6,
                  }}
                  className="hover:!opacity-100 hover:!bg-cyan-500/20 hover:!text-cyan-400"
                >
                  <CopyIcon style={{ width: 13, height: 13 }} />
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ padding: 24, borderTop: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'rgba(13,14,23,0.5)', backdropFilter: 'blur(8px)' }}>
          <h3 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: D.muted, textAlign: 'center', margin: 0 }}>Điều khiển PTZ</h3>
          <PTZJoystick />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {[{icon: Plus, label: 'ZOOM'}, {icon: Minus, label: 'ZOOM'}].map(({ icon: Icon, label }, i) => (
              <button key={i} style={{ padding: 8, borderRadius: 8, background: D.white(0.04), border: `1px solid ${D.border}`, cursor: 'pointer', color: D.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Icon style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 8, fontWeight: 700 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main: Top Bar + Wall + Right Panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ height: 56, borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#111118', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: 8, color: D.muted, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <SidebarIcon style={{ width: 20, height: 20 }} />
            </button>
            <div style={{ width: 1, height: 16, background: D.white(0.1) }} />
            <h1 style={{ fontSize: 13, fontWeight: 900, color: D.text, letterSpacing: '-0.03em', textTransform: 'uppercase', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <div style={{ width: 8, height: 8, background: '#dc2626', borderRadius: '50%', boxShadow: '0 0 10px rgba(220,38,38,0.5)' }} className="animate-pulse" />
              Aero Vision LIVE
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ControlBtn icon={RefreshCw} label="Làm mới" onClick={fetchData} />
            <div style={{ width: 1, height: 16, background: D.white(0.1), margin: '0 8px' }} />
            {([1, 4, 9] as const).map(sz => (
              <button key={sz} onClick={() => setGridSize(sz)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: gridSize === sz ? D.white(0.1) : 'transparent', color: gridSize === sz ? D.text : D.muted }}>
                {sz === 1 ? '1x1' : sz === 4 ? '2x2' : '3x3'}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: D.white(0.1), margin: '0 8px' }} />
            <ControlBtn icon={Maximize2} label="Toàn màn hình" />
          </div>
        </div>

        {/* Content row: wall + right panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Wall col */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className={`flex-1 grid ${gridCols[gridSize]} ${gridRows[gridSize]}`} style={{ flex: 1, gap: 4, padding: 4, background: '#000', overflow: 'hidden' }}>
              {new Array(gridSize).fill(null).map((_, i) => (
                <CameraSlot
                  key={i} index={i}
                  camera={gridAssignments[i]}
                  isSelected={selectedSlot === i}
                  onSelect={() => setSelectedSlot(i)}
                  aiActive={!!gridAssignments[i] && !!aiVisionActive[gridAssignments[i]!.id]}
                  onAiToggle={() => {
                    const cam = gridAssignments[i]
                    if (cam) setAiVisionActive(prev => ({ ...prev, [cam.id]: !prev[cam.id] }))
                  }}
                  onAnalysis={data => {
                    const cam = gridAssignments[i]
                    if (cam) setAnalysisData(prev => ({ ...prev, [cam.id]: data }))
                  }}
                  analysisData={gridAssignments[i] ? (analysisData[gridAssignments[i]!.id] ?? null) : null}
                  recordingActive={!!gridAssignments[i] && !!activeRecordings[gridAssignments[i]!.id]}
                  onRecordingToggle={() => {
                    const cam = gridAssignments[i]; if (!cam) return
                    if (activeRecordings[cam.id]) {
                      const rec = recordings.find(r => r.cameraId === cam.id && r.status === 'recording')
                      if (rec) handleStopRecording(cam.id, rec.id)
                    } else { handleStartRecording(cam) }
                  }}
                  onViewHistory={() => setShowRecordingsModal(true)}
                  onRemove={() => { const g = [...gridAssignments]; g[i] = null; setGridAssignments(g) }}
                  recordingLoading={recordingLoading}
                  studentNames={getStudentNamesForClass(gridAssignments[i]?.className)}
                />
              ))}
            </div>

            {/* Bottom control bar */}
            <div style={{ height: 80, background: '#111118', borderTop: `1px solid ${D.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', background: D.card2, borderRadius: 12, padding: 6, border: `1px solid ${D.border}`, gap: 8 }}>
                  <ControlBtn icon={Play}    label="Phát"    active />
                  <ControlBtn icon={Square}  label="Dừng"    danger />
                  <div style={{ width: 1, height: 24, background: D.white(0.1), alignSelf: 'center' }} />
                  <ControlBtn icon={History} label="Xem lại" />
                </div>
                <div style={{ display: 'flex', background: D.card2, borderRadius: 12, padding: 6, border: `1px solid ${D.border}`, gap: 8 }}>
                  <ControlBtn icon={Scissors} label="Cắt đoạn" />
                  <ControlBtn icon={Camera}   label="Chụp ảnh" />
                  <ControlBtn icon={Circle}   label="Ghi hình"  danger />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', marginRight: 16 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Âm thanh</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Volume2 style={{ width: 16, height: 16, color: D.muted }} />
                    <div style={{ width: 128, height: 4, background: D.white(0.1), borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: D.purple, width: '75%' }} />
                    </div>
                  </div>
                </div>
                <div style={{ width: 1, height: 32, background: D.white(0.1) }} />
                <ControlBtn icon={Mic}      label="Đàm thoại" />
                <ControlBtn icon={Settings2} label="Cài đặt luồng" />
              </div>
            </div>
          </div>

          {/* Right panel: AI analytics */}
          <div style={{ width: 304, borderLeft: `1px solid ${D.border}`, background: '#0f1016', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
            <VisionAnalyticsDashboard
              data={gridAssignments[selectedSlot] ? (analysisData[gridAssignments[selectedSlot]!.id] ?? null) : null}
              cameraName={gridAssignments[selectedSlot]?.name || 'Chưa chọn kênh'}
            />
            <div style={{ marginTop: 'auto', padding: 16, borderRadius: 12, border: `1px solid rgba(37,99,235,0.2)`, background: 'rgba(37,99,235,0.04)' }}>
              <h4 style={{ fontSize: 10, fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', marginBottom: 8, margin: '0 0 8px 0' }}>Hệ thống AI Tự động hóa</h4>
              <p style={{ fontSize: 9, color: D.muted, lineHeight: 1.7, marginBottom: 12 }}>Phát hiện bạo lực học đường và bất thường trong lớp học đang hoạt động ngầm.</p>
              <button style={{ width: '100%', padding: '8px 0', background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                Báo cáo an ninh chi tiết
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Bar (fixed bottom) ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 24, background: '#050508', borderTop: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hệ thống: OK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database style={{ width: 10, height: 10, color: D.muted }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Lưu trữ: 82% Free</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: D.muted }}>GCP-APP-01 (Ver 2.4.0)</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: D.muted, fontStyle: 'italic' }}>Managed by AI Native Assistant</span>
        </div>
      </div>

      {/* ── Recordings Modal ── */}
      {showRecordingsModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowRecordingsModal(false)}
        >
          <div
            style={{ background: '#111118', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '85vh', overflow: 'hidden', border: `1px solid ${D.border}`, boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ height: 64, borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: D.card2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <History style={{ width: 24, height: 24, color: D.purple }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: D.text, margin: 0 }}>Lịch Sử Ghi Hình</h2>
                <span style={{ fontSize: 13, color: D.muted, background: D.white(0.05), padding: '2px 12px', borderRadius: 9999 }}>{recordings.length} video</span>
              </div>
              <button onClick={() => setShowRecordingsModal(false)} style={{ padding: 8, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: D.muted }}>
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: 24, maxHeight: 'calc(85vh - 140px)' }} className="custom-scrollbar">
              {recordings.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: D.muted }}>
                  <History style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.2 }} />
                  <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px 0' }}>Chưa có video ghi hình</p>
                  <p style={{ fontSize: 13, margin: 0 }}>Bắt đầu ghi hình từ camera để xem lại tại đây</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {recordings.map(rec => (
                    <div key={rec.id} style={{ background: D.card2, borderRadius: 12, overflow: 'hidden', border: `1px solid ${D.border}`, transition: 'border-color 0.15s' }}>
                      <div style={{ aspectRatio: '16/9', background: D.card, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {rec.thumbnailUrl ? (
                          <img src={rec.thumbnailUrl} alt={rec.cameraName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ textAlign: 'center', opacity: 0.4 }}>
                            <MonitorPlay style={{ width: 40, height: 40, margin: '0 auto 8px' }} />
                            <p style={{ fontSize: 10, fontWeight: 500, margin: 0 }}>{rec.cameraName}</p>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, right: 8 }}>
                          {rec.status === 'recording' ? (
                            <div style={{ background: '#dc2626', padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }} className="animate-pulse">
                              <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} /> REC
                            </div>
                          ) : (
                            <div style={{ background: '#16a34a', padding: '2px 6px', borderRadius: 3, fontSize: 8, fontWeight: 900, color: '#fff' }}>HOÀN TẤT</div>
                          )}
                        </div>
                        {rec.status === 'completed' && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                            <button style={{ width: 56, height: 56, borderRadius: '50%', background: D.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer' }}>
                              <Play style={{ width: 24, height: 24 }} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 16 }}>
                        <h3 style={{ fontWeight: 600, color: D.text, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 8px 0' }}>{rec.cameraName}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: D.muted }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Bắt đầu:</span><span style={{ color: D.white(0.8) }}>{new Date(rec.startTime).toLocaleString('vi-VN')}</span>
                          </div>
                          {rec.duration && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Thời lượng:</span><span style={{ color: D.white(0.8) }}>{Math.floor(rec.duration/60)}:{String(rec.duration%60).padStart(2,'0')}</span>
                            </div>
                          )}
                          {rec.fileSize && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Kích thước:</span><span style={{ color: D.white(0.8) }}>{(rec.fileSize/1024/1024).toFixed(1)} MB</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          {rec.status === 'completed' ? (
                            <>
                              <button style={{ flex: 1, background: D.purple, color: '#fff', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Play style={{ width: 16, height: 16 }} /> Phát
                              </button>
                              <button style={{ padding: '8px 12px', background: D.white(0.05), color: D.text, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                                <Download style={{ width: 16, height: 16 }} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStopRecording(rec.cameraId, rec.id)}
                              disabled={recordingLoading}
                              style={{ width: '100%', background: '#dc2626', color: '#fff', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: recordingLoading ? 'not-allowed' : 'pointer', opacity: recordingLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                              <Square style={{ width: 16, height: 16 }} /> Dừng ghi
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
