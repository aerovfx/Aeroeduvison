"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  Camera, Eye, RefreshCw, CheckCircle, XCircle,
  AlertCircle, MapPin, Search, Maximize2,
  Users, MonitorPlay, Signal, Grid3x3, LayoutGrid, X as XIcon,
  Video, VideoOff, Scissors, Mic, Volume2, Circle,
  Play, Square, ChevronUp, ChevronDown, ChevronLeft,
  ChevronRight, Plus, Minus, Settings2, History,
  Layout, Grid2x2, Sidebar as SidebarIcon,
  MousePointer2, Gamepad2, Info, Database, Download, Sparkles, Brain, Scan
} from "lucide-react"
import { AIVisionOverlay } from "./ai-vision-overlay"
import { useRouter } from "next/navigation"
import { 
  EMOTION_CONFIG, 
  EmotionType 
} from "../../dashboard/vision-tracker/advanced-emotion-recognition"

interface CameraItem {
  id: string
  name: string
  rtspUrl: string
  brand: string
  location: string
  locationType: string
  assignedTo?: string
  classId?: string
  className?: string
  roomNumber?: string
  status: "online" | "offline" | "error" | "testing"
  hlsUrl?: string
  streamId?: string
  lastChecked?: string
  studentCount?: number
}

interface Recording {
  id: string
  cameraId: string
  cameraName: string
  startTime: string
  endTime?: string
  duration?: number
  videoUrl: string
  thumbnailUrl?: string
  status: 'recording' | 'completed' | 'failed'
  fileSize?: number
}

// ── Student name roster per class (mock data until name-face mapping is implemented) ──
const CLASS_STUDENT_NAMES: Record<string, string[]> = {
  "Lớp 11A2": [
    "Nguyễn Minh Anh", "Trần Đức Bảo", "Lê Thị Cẩm", "Phạm Hoàng Dũng",
    "Hoàng Thúy Duyên", "Võ Quang Hải", "Đặng Thị Hạnh", "Bùi Văn Hùng",
    "Ngô Thị Hương", "Đỗ Minh Khang", "Lý Thị Lan", "Trương Quốc Long",
    "Huỳnh Ngọc Mai", "Phan Thành Nam", "Vũ Thị Ngọc", "Dương Đình Phát",
    "Mai Thị Phương", "Lưu Anh Quân", "Tạ Thị Quỳnh", "Hồ Đắc Sơn",
    "Nguyễn Thị Thanh", "Trần Văn Thắng", "Lê Quốc Thiện", "Phạm Thị Thu",
    "Hoàng Anh Tiến", "Võ Thị Trang", "Đặng Minh Trí", "Bùi Thị Tú",
    "Ngô Quang Tuấn", "Đỗ Thị Uyên", "Lý Văn Vinh", "Trương Thị Xuân",
    "Huỳnh Đình Yên", "Phan Thị Yến", "Vũ Quốc Anh", "Dương Thị Bích",
    "Mai Văn Cường", "Lưu Thị Diệu", "Tạ Quang Đạt", "Hồ Thị Giang",
  ],
  "Lớp 9A1": [
    "Nguyễn Thị An", "Trần Minh Bình", "Lê Văn Công", "Phạm Thị Dung",
    "Hoàng Quốc Đạt", "Võ Thị Hoa", "Đặng Văn Hưng", "Bùi Thị Khánh",
    "Ngô Minh Lâm", "Đỗ Thị Linh", "Lý Quang Minh", "Trương Thị Nhung",
    "Huỳnh Văn Phong", "Phan Thị Quyên", "Vũ Đình Sỹ", "Dương Thị Thảo",
    "Mai Quốc Toàn", "Lưu Thị Uyên", "Tạ Văn Vũ", "Hồ Thị Xuyến",
    "Nguyễn Minh Quân", "Trần Thị Hằng", "Lê Hoàng Long", "Phạm Thúy Liễu",
    "Hoàng Văn Tâm", "Võ Thị Ngân", "Đặng Quang Phúc", "Bùi Thị Sen",
    "Ngô Đình Tú", "Đỗ Thị Vân", "Lý Văn Hòa", "Trương Thị Mai",
    "Huỳnh Quốc Bảo", "Phan Thị Tâm", "Vũ Minh Trung",
  ],
  "Lớp 10B2": [
    "Nguyễn Thị Bảo", "Trần Văn Cảnh", "Lê Thị Diệp", "Phạm Quốc Em",
    "Hoàng Thị Giang", "Võ Minh Hoàng", "Đặng Thị Kim", "Bùi Văn Lộc",
    "Ngô Thị Mỹ", "Đỗ Quang Nghĩa", "Lý Thị Oanh", "Trương Văn Phú",
    "Huỳnh Thị Quyên", "Phan Minh Sang", "Vũ Thị Thu", "Dương Văn Uy",
    "Mai Thị Vân", "Lưu Quốc Vinh", "Tạ Thị Xuân", "Hồ Đình Ý",
    "Nguyễn Văn Anh", "Trần Thị Bình", "Lê Minh Châu", "Phạm Thị Đào",
    "Hoàng Quốc Huy", "Võ Thị Lan", "Đặng Minh Nhật", "Bùi Thị Phượng",
    "Ngô Quang Sơn", "Đỗ Thị Thúy", "Lý Văn Triệu", "Trương Thị Uyên",
  ],
}

/** Get student names for a given class */
function getStudentNamesForClass(className?: string): string[] {
  if (!className) return []
  return CLASS_STUDENT_NAMES[className] || []
}

// ── AI Native DMSS Components ──

function ControlBtn({ icon: Icon, onClick, active = false, label, danger = false }: {
  icon: any; onClick?: () => void; active?: boolean; label?: string; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
        active 
          ? 'bg-[hsl(var(--primary)/0.15)] text-purple-600' 
          : 'text-gray-600 hover:bg-[hsl(var(--muted-foreground)/0.1)] hover:text-gray-900'
      } ${danger ? 'hover:text-red-500 hover:bg-red-500/10' : ''}`}
      title={label}
    >
      <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
      {label && <span className="text-[10px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black/80 text-white px-2 py-1 rounded-md whitespace-nowrap z-50">{label}</span>}
    </button>
  )
}

function CameraSlot({
  index,
  camera,
  isSelected,
  onSelect,
  aiActive,
  onAiToggle,
  onAnalysis,
  analysisData,
  recordingActive,
  onRecordingToggle,
  onViewHistory,
  onRemove,
  recordingLoading,
  studentNames,
}: {
  index: number
  camera: CameraItem | null
  isSelected: boolean
  onSelect: () => void
  aiActive: boolean
  onAiToggle: () => void
  onAnalysis: (data: any) => void
  onSnapshot?: (data: any) => void
  analysisData: any
  recordingActive: boolean
  onRecordingToggle: () => void
  onViewHistory: () => void
  onRemove: () => void
  recordingLoading?: boolean
  studentNames?: string[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div
      onClick={onSelect}
      className={`relative aspect-video flex flex-col transition-all group border-2 ${
        isSelected ? 'border-[hsl(var(--primary))]' : 'border-transparent'
      } bg-[#1a1a1a] cursor-pointer rounded-sm overflow-hidden shadow-2xl`}
    >
      {camera ? (
        <>
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
             {camera.id === "cam_demo" ? (
               <video 
                 ref={videoRef}
                 src={camera.rtspUrl} 
                 className="w-full h-full object-cover" 
                 autoPlay 
                 loop 
                 muted 
                 playsInline
               />
             ) : (
               <div className="text-center opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="flex items-center justify-center gap-3 mb-2">
                      <MonitorPlay className="w-8 h-8 text-white/50" />
                      <div className="h-6 w-[1px] bg-white/20" />
                      <span className="text-xl font-black text-white italic tracking-tighter">HD</span>
                  </div>
                  <p className="text-[10px] font-medium text-white/60 tracking-widest uppercase">{camera.name}</p>
               </div>
             )}

             <AIVisionOverlay
               videoRef={videoRef}
               isActive={aiActive}
               cameraId={camera.id}
               studentNames={studentNames}
               className={camera.className}
               onAnalysisUpdate={onAnalysis}
               onSnapshot={(data) => {
                 console.log(`[SNAPSHOT 5 MIN] Camera ${camera?.id}:`, data)
               }}
             />
             
             {/* Scanner FX when AI is active */}
             {aiActive && (
               <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                  <div className="w-full h-[2px] bg-[hsl(var(--primary))] shadow-[0_0_15px_hsl(var(--primary))] animate-scan" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.4)_100%)]" />
               </div>
             )}
             
             <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20">
                <div className="bg-red-600 px-1.5 py-0.5 rounded text-[8px] font-black text-white flex items-center gap-1 shadow-lg">
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE
                </div>
                <div className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/80 border border-white/10 mt-1">
                  {camera.className || "UNKNOWN"}
                </div>
             </div>

             {aiActive && analysisData && (
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-20">
                 <div className="bg-blue-600/90 backdrop-blur-md px-2 py-1 rounded-sm text-[8px] font-black text-white flex items-center gap-2 border border-blue-400/30">
                    <Brain className="w-3 h-3" /> ANALYZING
                 </div>
                 <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-sm text-[8px] font-black text-white border border-white/10">
                    STUDENTS: {analysisData.peopleCount}
                 </div>
                 {analysisData.actions.length > 0 && (
                   <div className="bg-orange-500/90 px-2 py-1 rounded-sm text-[8px] font-black text-white">
                      {analysisData.actions[0]}
                   </div>
                 )}
              </div>
             )}

             <div className="absolute bottom-2 left-2 flex items-center gap-4 text-[9px] font-mono text-white/40 bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/5 z-20">
                <span>{new Date().toLocaleDateString('vi-VN')}</span>
                <span>{new Date().toLocaleTimeString('vi-VN')}</span>
                <span className="text-green-500 font-bold">15.4 FPS</span>
             </div>

             {recordingActive && (
               <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                  <div className="bg-red-600 px-2 py-1 rounded text-[8px] font-black text-white flex items-center gap-1 shadow-lg animate-pulse">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" /> REC
                  </div>
               </div>
             )}

             <div className="absolute inset-0 bg-[hsl(var(--primary)/0.1)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-30 pointer-events-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); onAiToggle(); }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                    aiActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[hsl(var(--muted-foreground)/0.4)] hover:bg-[hsl(var(--primary))]'
                  }`}
                  title="Bật/Tắt Phân tích AI"
                >
                  <Brain className={`w-6 h-6 ${aiActive ? 'animate-pulse' : ''}`} />
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onRecordingToggle(); }}
                  disabled={recordingLoading}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                    recordingActive ? 'bg-red-600 hover:bg-red-700' : 'bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.8]'
                  } ${recordingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {recordingActive ? <Square className="w-5 h-5 fill-current" /> : <Circle className="w-5 h-5 fill-current" />}
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onViewHistory(); }}
                  className="w-10 h-10 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-lg hover:bg-[hsl(var(--secondary))/0.8] transition-all"
                >
                  <History className="w-5 h-5" />
                </button>
             </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/10 hover:text-white/20 transition-colors">
           <div className="text-center">
              <Plus className="w-10 h-10 mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Chọn Kênh</p>
           </div>
        </div>
      )}
      
      <div className="absolute top-2 right-2 flex items-center gap-1 z-40">
         <span className="text-[9px] font-bold text-white/30 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 uppercase">CH{index + 1}</span>
         {camera && (
           <button 
             onClick={(e) => { e.stopPropagation(); onRemove(); }}
             className="p-1 rounded bg-black/40 hover:bg-red-500/80 text-white/50 hover:text-white transition-all border border-white/5"
           >
             <Square className="w-2.5 h-2.5 fill-current" />
           </button>
         )}
      </div>
    </div>
  )
}

function VisionAnalyticsDashboard({ data, cameraName }: { data: any, cameraName: string }) {
  if (!data) return (
    <div className="h-full flex flex-col items-center justify-center text-white/20 border border-dashed border-white/5 rounded-2xl p-6 text-center">
      <Brain className="w-12 h-12 mb-4 opacity-10 animate-pulse" />
      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
        Kích hoạt AI Vision (Brain Icon)<br/>để xem phân tích hành vi & cảm xúc
      </p>
    </div>
  )

  const emotionCounts = data.emotions.reduce((acc: any, e: string) => {
    acc[e] = (acc[e] || 0) + 1
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-tighter text-white/80 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Analytics: {cameraName.split(' - ')[0]}
        </h3>
        <span className="text-[10px] font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded italic animate-pulse">LIVE-AI</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3 rounded-xl border border-white/5 bg-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-white/40 uppercase">Sĩ số phát hiện</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-black text-white">{data.peopleCount}</div>
            <div className="text-[10px] text-white/40 font-bold">/ 40</div>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${(data.peopleCount / 40) * 100}%` }} />
          </div>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-white/5 bg-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-white/40 uppercase">Hành động</span>
            <Scan className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xs font-black text-orange-400 truncate uppercase mt-1">
            {data.actions.length > 0 ? (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping" />
                {data.actions[0]}
              </span>
            ) : "ỔN ĐỊNH"}
          </div>
          <div className="text-[8px] text-white/40 mt-2 italic">Dựa trên Pose Landmarks</div>
        </div>
      </div>

      <div className="flex-1 glass-panel p-4 rounded-xl border border-white/5 overflow-hidden flex flex-col bg-white/5">
        <span className="text-[10px] font-bold text-white/40 uppercase mb-3 flex items-center gap-2 border-b border-white/5 pb-2">
          <Brain className="w-3 h-3 text-purple-400" /> Distribution (Ký tâm đồ)
        </span>
        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
          {Object.entries(emotionCounts).map(([emotion, count]: [any, any]) => {
            const config = EMOTION_CONFIG[emotion as EmotionType]
            const percentage = Math.round((count / data.emotions.length) * 100)
            return (
              <div key={emotion} className="group">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-white/70 font-bold group-hover:text-white transition-colors">
                    {config?.emoji} {config?.labelVi} ({count})
                  </span>
                  <span className="text-white/40 font-mono italic">{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-700 ease-out shadow-[0_0_8px_currentcolor]" 
                    style={{ 
                      width: `${percentage}%`, 
                      backgroundColor: config?.color,
                      color: config?.color
                    }} 
                  />
                </div>
              </div>
            )
          })}
          {data.emotions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 opacity-20">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <p className="text-[9px] uppercase font-black text-center">Đang quét sinh trắc học...</p>
            </div>
          )}
        </div>
      </div>

      {/* Per-student emotion list */}
      {data.studentEmotions && data.studentEmotions.length > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5 max-h-[200px] overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-bold text-white/40 uppercase mb-2 flex items-center gap-2 border-b border-white/5 pb-2">
            <Users className="w-3 h-3 text-cyan-400" /> Học sinh đang nhận diện ({data.studentEmotions.length})
          </span>
          <div className="space-y-1.5 mt-2">
            {data.studentEmotions.map((se: { name: string; emotion: string; confidence: number }, i: number) => {
              const config = EMOTION_CONFIG[se.emotion as EmotionType]
              return (
                <div key={`${se.name}-${i}`} className="flex items-center justify-between text-[10px] py-1 px-1.5 rounded hover:bg-white/5 transition-colors">
                  <span className="text-white/80 font-semibold truncate max-w-[120px]">{se.name}</span>
                  <span className="flex items-center gap-1 shrink-0" style={{ color: config?.color }}>
                    {config?.emoji} <span className="font-bold">{config?.labelVi}</span>
                    <span className="text-white/25 ml-1">{Math.round(se.confidence * 100)}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function PTZJoystick() {
  return (
    <div className="relative w-32 h-32 rounded-full glass-panel border border-gray-200 flex items-center justify-center shadow-inner">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2">
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronUp className="w-5 h-5 rotate-[-45deg]" /></button>
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronUp className="w-6 h-6" /></button>
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronUp className="w-5 h-5 rotate-[45deg]" /></button>
        
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
        <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] shadow-sm self-center justify-self-center border-4 border-white/20" />
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronRight className="w-6 h-6" /></button>
        
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronDown className="w-5 h-5 rotate-[45deg]" /></button>
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronDown className="w-6 h-6" /></button>
        <button className="flex items-center justify-center hover:text-purple-600 transition-colors"><ChevronDown className="w-5 h-5 rotate-[-45deg]" /></button>
      </div>
    </div>
  )
}

export default function DMSSCameraManagement() {
  const { data: session } = useSession()
  const [cameras, setCameras] = useState<CameraItem[]>([])
  const [loading, setLoading] = useState(true)
  const [gridSize, setGridSize] = useState<1 | 4 | 9>(4)
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  const [gridAssignments, setGridAssignments] = useState<(CameraItem | null)[]>(new Array(16).fill(null))
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // AI Vision state
  const [aiVisionActive, setAiVisionActive] = useState<Record<string, boolean>>({})
  const [analysisData, setAnalysisData] = useState<Record<string, any>>({})
  
  // Recording state
  const [activeRecordings, setActiveRecordings] = useState<Record<string, boolean>>({})
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [showRecordingsModal, setShowRecordingsModal] = useState(false)
  const [recordingLoading, setRecordingLoading] = useState(false)

  useEffect(() => {
    fetchData()
    loadRecordings()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const classRes = await fetch("/api/classes")
      let classIdsStr = ""
      const classMap: Record<string, string> = {}
      
      if (classRes.ok) {
        const classData = await classRes.json()
        const fetchedClasses = classData.classes || []
        classIdsStr = fetchedClasses.map((c: any) => c.id).join(",")
        fetchedClasses.forEach((c: any) => { classMap[c.id] = c.name })
      }

      const response = await fetch(`/api/camera/teacher?class_ids=${classIdsStr}`)
      const demoCamera: CameraItem = { 
        id: "cam_demo", 
        name: "AI Demo Analysis", 
        rtspUrl: "/api/camera/file/20260316003128604.MP4", 
        brand: "AeroAI", 
        location: "Lab 101", 
        locationType: "lab", 
        className: "Lớp 11A2", 
        status: "online", 
        studentCount: 40 
      }

      if (response.ok) {
        const data = await response.json()
        const fetchedCameras = (data.cameras || []).map((cam: any) => ({
          ...cam,
          className: cam.classId ? classMap[cam.classId] : undefined
        }))
        
        // Ensure demo camera is always at the top
        const combinedCameras = [demoCamera, ...fetchedCameras.filter((c: any) => c.id !== "cam_demo")]
        setCameras(combinedCameras)
        
        // Auto-assign demo camera to first slot, others to next slots
        const initialGrid = new Array(16).fill(null)
        combinedCameras.slice(0, 4).forEach((cam: any, i: number) => {
          initialGrid[i] = cam
        })
        setGridAssignments(initialGrid)
      } else {
        setCameras([demoCamera])
        const initialGrid = new Array(16).fill(null)
        initialGrid[0] = demoCamera
        setGridAssignments(initialGrid)
      }
    } catch (error) {
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockData = () => {
    const mock: CameraItem[] = [
      { id: "cam_demo", name: "AI Demo Analysis", rtspUrl: "/api/camera/file/20260316003128604.MP4", brand: "AeroAI", location: "Lab 101", locationType: "lab", className: "Lớp 11A2", status: "online", studentCount: 40 },
      { id: "cam_1", name: "Camera 9A1 - P1", rtspUrl: "...", brand: "Dahua", location: "Phòng 201", locationType: "classroom", className: "Lớp 9A1", status: "online", studentCount: 35 },
      { id: "cam_2", name: "Camera 9A1 - P2", rtspUrl: "...", brand: "Dahua", location: "Phòng 201", locationType: "classroom", className: "Lớp 9A1", status: "online", studentCount: 35 },
      { id: "cam_3", name: "Camera 10B2", rtspUrl: "...", brand: "HikVision", location: "Phòng 301", locationType: "classroom", className: "Lớp 10B2", status: "online", studentCount: 32 },
      { id: "cam_4", name: "Hành lang Tòa A", rtspUrl: "...", brand: "HikVision", location: "Hành lang", locationType: "hallway", status: "online" },
    ]
    setCameras(mock)
    const initialGrid = new Array(16).fill(null)
    mock.forEach((cam, i) => { initialGrid[i] = cam })
    setGridAssignments(initialGrid)
  }

  const loadRecordings = async () => {
    try {
      const res = await fetch('/api/camera/recording?limit=100')
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.recordings || [])
        // Set active recordings
        const active: Record<string, boolean> = {}
        data.recordings?.forEach((r: Recording) => {
          if (r.status === 'recording') active[r.cameraId] = true
        })
        setActiveRecordings(active)
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
    }
  }

  const handleStartRecording = async (camera: CameraItem) => {
    try {
      setRecordingLoading(true)
      const res = await fetch('/api/camera/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: camera.id,
          cameraName: camera.name,
          rtspUrl: camera.rtspUrl,
          classId: camera.classId
        })
      })
      
      const result = await res.json()
      
      if (result.success) {
        setActiveRecordings(prev => ({ ...prev, [camera.id]: true }))
        loadRecordings()
      } else {
        alert('Không thể bắt đầu ghi hình: ' + (result.error || 'Lỗi không xác định'))
      }
    } catch (error: any) {
      console.error('Error starting recording:', error)
      alert('Lỗi: ' + (error.message || 'Không thể bắt đầu ghi hình'))
    } finally {
      setRecordingLoading(false)
    }
  }

  const handleStopRecording = async (cameraId: string, recordingId: string) => {
    try {
      setRecordingLoading(true)
      const res = await fetch(`/api/camera/recording/${recordingId}/stop`, {
        method: 'POST'
      })
      
      const result = await res.json()
      
      if (result.success) {
        setActiveRecordings(prev => ({ ...prev, [cameraId]: false }))
        loadRecordings()
      } else {
        alert('Không thể dừng ghi hình: ' + (result.error || 'Lỗi không xác định'))
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error)
      alert('Lỗi: ' + (error.message || 'Không thể dừng ghi hình'))
    } finally {
      setRecordingLoading(false)
    }
  }

  const handleCameraSelect = (camera: CameraItem) => {
    const newGrid = [...gridAssignments]
    newGrid[selectedSlot] = camera
    setGridAssignments(newGrid)
  }

  const filteredCameras = cameras.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.className?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[hsl(var(--background))]">
      
      {/* ── Left Sidebar: Device List ── */}
      <div className={`flex-shrink-0 border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col ${isSidebarOpen ? 'w-72' : 'w-0'}`}>
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-sm uppercase tracking-widest text-gray-600 flex items-center gap-2">
              <SidebarIcon className="w-4 h-4" />
              Thiết bị
            </h2>
            <button onClick={fetchData} className="p-1.5 hover:bg-[hsl(var(--muted-foreground)/0.1)] rounded-lg transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input 
              type="text" 
              placeholder="Tìm camera..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[hsl(var(--muted-foreground)/0.05)] border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[hsl(var(--primary))] outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredCameras.map((cam) => (
            <div 
              key={cam.id}
              onClick={() => handleCameraSelect(cam)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 group ${
                gridAssignments.some(a => a?.id === cam.id) 
                  ? 'bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)]'
                  : 'hover:bg-[hsl(var(--muted-foreground)/0.05)] border border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate group-hover:text-purple-600 transition-colors">{cam.name}</p>
                <p className="text-[10px] text-gray-600 truncate">{cam.className || cam.location}</p>
              </div>
              <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" />
            </div>
          ))}
        </div>

        {/* PTZ Quick Control (at bottom of sidebar) */}
        <div className="p-6 border-t border-gray-200 flex flex-col items-center gap-4 bg-[hsl(var(--background)/0.5)] backdrop-blur-sm">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 w-full text-center">Điều khiển PTZ</h3>
           <PTZJoystick />
           <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-[hsl(var(--muted-foreground)/0.05)] hover:bg-[hsl(var(--primary)/0.1)] transition-all flex flex-col items-center">
                <Plus className="w-4 h-4" />
                <span className="text-[8px] font-bold">ZOOM</span>
              </button>
              <button className="p-2 rounded-lg bg-[hsl(var(--muted-foreground)/0.05)] hover:bg-[hsl(var(--primary)/0.1)] transition-all flex flex-col items-center">
                <Minus className="w-4 h-4" />
                <span className="text-[8px] font-bold">ZOOM</span>
              </button>
           </div>
        </div>
      </div>

      {/* ── Main View: Video Wall ── */}
      <div className="flex-1 flex flex-col bg-[#121212] overflow-hidden">
        
        {/* Top bar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#1a1a1a]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <SidebarIcon className="w-5 h-5" />
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <h1 className="text-white font-black text-sm tracking-tighter uppercase italic flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
              Aero Vision LIVE
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ControlBtn icon={RefreshCw} label="Làm mới" onClick={fetchData} />
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <button 
              onClick={() => setGridSize(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${gridSize === 1 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >1x1</button>
            <button 
              onClick={() => setGridSize(4)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${gridSize === 4 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >2x2</button>
            <button 
              onClick={() => setGridSize(9)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${gridSize === 9 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >3x3</button>
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <ControlBtn icon={Maximize2} label="Toàn màn hình" />
          </div>
        </div>

        {/* The Wall Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex-1 grid gap-1 p-1 bg-black overflow-hidden ${
            gridSize === 1 ? 'grid-cols-1 grid-rows-1' : 
            gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 
            'grid-cols-3 grid-rows-3'
          }`}>
            {new Array(gridSize).fill(null).map((_, i) => (
              <CameraSlot 
                key={i}
                index={i}
                camera={gridAssignments[i]}
                isSelected={selectedSlot === i}
                onSelect={() => setSelectedSlot(i)}
                aiActive={!!gridAssignments[i] && !!aiVisionActive[gridAssignments[i]!.id]}
                onAiToggle={() => {
                  const cam = gridAssignments[i]
                  if (cam) setAiVisionActive(prev => ({ ...prev, [cam.id]: !prev[cam.id] }))
                }}
                onAnalysis={(data) => {
                  const cam = gridAssignments[i]
                  if (cam) setAnalysisData(prev => ({ ...prev, [cam.id]: data }))
                }}
                onSnapshot={(data) => {
                  console.log(`[SNAPSHOT 5 MIN] Camera ${gridAssignments[i]?.id}:`, data)
                  // Here we could toast or send to a database
                }}
                analysisData={gridAssignments[i] ? analysisData[gridAssignments[i]!.id] : null}
                recordingActive={!!gridAssignments[i] && !!activeRecordings[gridAssignments[i]!.id]}
                onRecordingToggle={() => {
                  const camera = gridAssignments[i]
                  if (!camera) return
                  if (activeRecordings[camera.id]) {
                    const recording = recordings.find(r => r.cameraId === camera.id && r.status === 'recording')
                    if (recording) handleStopRecording(camera.id, recording.id)
                  } else {
                    handleStartRecording(camera)
                  }
                }}
                onViewHistory={() => setShowRecordingsModal(true)}
                onRemove={() => {
                  const g = [...gridAssignments]
                  g[i] = null
                  setGridAssignments(g)
                }}
                recordingLoading={recordingLoading}
                studentNames={getStudentNamesForClass(gridAssignments[i]?.className)}
              />
            ))}
          </div>

          {/* Bottom Control Bar */}
          <div className="h-20 bg-[#1a1a1a] border-t border-white/5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex bg-[#2a2a2a] rounded-xl p-1.5 border border-white/5 gap-2">
                  <ControlBtn icon={Play} label="Phát" active />
                  <ControlBtn icon={Square} label="Dừng" danger />
                  <div className="w-[1px] h-6 bg-white/10 self-center" />
                  <ControlBtn icon={History} label="Xem lại" />
                </div>
                <div className="flex bg-[#2a2a2a] rounded-xl p-1.5 border border-white/5 gap-2">
                  <ControlBtn icon={Scissors} label="Cắt đoạn" />
                  <ControlBtn icon={Camera} label="Chụp ảnh" />
                  <ControlBtn icon={Circle} label="Ghi hình" danger />
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex flex-col gap-1 items-end mr-4">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Âm thanh</span>
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-white/60" />
                      <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-[hsl(var(--primary))] w-3/4 shadow-sm" />
                      </div>
                    </div>
                 </div>
                 <div className="h-8 w-[1px] bg-white/10" />
                 <ControlBtn icon={Mic} label="Đàm thoại" />
                 <ControlBtn icon={Settings2} label="Cài đặt luồng" />
              </div>
          </div>
        </div>

        {/* ── Right Panel: AI Insights Dashboard ── */}
        <div className="w-80 border-l border-white/5 bg-[#161616] p-4 flex flex-col gap-4 overflow-hidden">
          <VisionAnalyticsDashboard 
            data={gridAssignments[selectedSlot] ? analysisData[gridAssignments[selectedSlot]!.id] : null}
            cameraName={gridAssignments[selectedSlot]?.name || "Chưa chọn kênh"}
          />
          
          <div className="mt-auto glass-panel p-4 rounded-xl border border-white/5 bg-blue-600/5">
            <h4 className="text-[10px] font-black text-blue-400 uppercase mb-2">Hệ thống AI Tự động hóa</h4>
            <p className="text-[9px] text-white/40 leading-relaxed mb-3">Phát hiện bạo lực học đường và bất thường trong lớp học đang hoạt động ngầm.</p>
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
              Báo cáo an ninh chi tiết
            </button>
          </div>
        </div>
      </div>

      {/* ── Status Bar Bottom ── */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-4 z-[100]">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
               <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Hệ thống: OK</span>
            </div>
            <div className="flex items-center gap-2">
               <Database className="w-2.5 h-2.5 text-white/20" />
               <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Lưu trữ: 82% Free</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-[9px] font-mono text-white/40">GCP-APP-01 (Ver 2.4.0)</span>
            <span className="text-[9px] font-mono text-white/40 italic">Managed by AI Native Assistant</span>
         </div>
      </div>

      {/* ── Recordings Modal ── */}
      {showRecordingsModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRecordingsModal(false)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-white">Lịch Sử Ghi Hình</h2>
                <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full">
                  {recordings.length} video
                </span>
              </div>
              <button
                onClick={() => setShowRecordingsModal(false)}
                className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <XIcon className="w-6 h-6 text-white/60" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
              {recordings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/40">
                  <History className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-semibold">Chưa có video ghi hình</p>
                  <p className="text-sm mt-2">Bắt đầu ghi hình từ camera để xem lại tại đây</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recordings.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-[#2a2a2a] rounded-xl overflow-hidden border border-white/5 hover:border-[hsl(var(--primary))/0.3] transition-all group"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-[#1a1a1a] relative flex items-center justify-center">
                        {rec.thumbnailUrl ? (
                          <img
                            src={rec.thumbnailUrl}
                            alt={rec.cameraName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center opacity-40">
                            <MonitorPlay className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-[10px] font-medium">{rec.cameraName}</p>
                          </div>
                        )}
                        
                        {/* Status badge */}
                        <div className="absolute top-2 right-2">
                          {rec.status === 'recording' ? (
                            <div className="bg-red-600 px-2 py-1 rounded text-[8px] font-black text-white flex items-center gap-1 animate-pulse">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" /> REC
                            </div>
                          ) : (
                            <div className="bg-green-600 px-2 py-1 rounded text-[8px] font-black text-white">
                              HOÀN TẤT
                            </div>
                          )}
                        </div>

                        {/* Play button */}
                        {rec.status === 'completed' && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button className="w-14 h-14 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 fill-current translate-x-0.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2 truncate">{rec.cameraName}</h3>
                        <div className="space-y-1 text-xs text-white/60">
                          <div className="flex items-center justify-between">
                            <span>Bắt đầu:</span>
                            <span className="text-white/80">
                              {new Date(rec.startTime).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          {rec.duration && (
                            <div className="flex items-center justify-between">
                              <span>Thời lượng:</span>
                              <span className="text-white/80">
                                {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}
                              </span>
                            </div>
                          )}
                          {rec.fileSize && (
                            <div className="flex items-center justify-between">
                              <span>Kích thước:</span>
                              <span className="text-white/80">
                                {(rec.fileSize / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          {rec.status === 'completed' ? (
                            <>
                              <button className="flex-1 bg-[hsl(var(--primary))] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[hsl(var(--primary))/0.8] transition-colors flex items-center justify-center gap-2">
                                <Play className="w-4 h-4" /> Phát
                              </button>
                              <button className="px-3 py-2 bg-white/5 text-white rounded-lg hover:bg-gray-50 transition-colors">
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStopRecording(rec.cameraId, rec.id)}
                              disabled={recordingLoading}
                              className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Square className="w-4 h-4" /> Dừng ghi
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  )
}

