"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Camera, Plus, Trash2, Edit2, Save,
  X as XIcon, RefreshCw, CheckCircle, XCircle,
  AlertCircle, MapPin, Search, Eye, Link, Unlink,
  MonitorPlay, Signal, Video, Maximize2,
  School, Settings2, TestTube, LayoutGrid, Grid3x3,
  Scissors, Mic, Volume2, Circle, Play, Square,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Minus, Layout, Sidebar as SidebarIcon, History,
  Database, UserCheck, ShieldAlert, Copy
} from "lucide-react"

interface CameraItem {
  id: string
  name: string
  rtspUrl: string
  brand: string
  location: string
  locationType: string
  assignedTo?: string
  classId?: string
  roomNumber?: string
  status: "online" | "offline" | "error" | "testing"
  hlsUrl?: string
  streamId?: string
  lastChecked?: string
  isActive: boolean
  hasRecording?: boolean
  latestRecordingUrl?: string
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
}

interface ClassAssignment {
  classId: string
  className: string
  grade: string
  roomNumber: string
  teacherName?: string
  cameraId?: string
  cameraName?: string
  studentCount: number
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
          ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]' 
          : 'text-white/40 hover:bg-white/10 hover:text-white'
      } ${danger ? 'hover:text-red-500 hover:bg-red-500/10' : ''}`}
      title={label}
    >
      <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
      {label && <span className="text-[10px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black/80 text-white px-2 py-1 rounded-md whitespace-nowrap z-50">{label}</span>}
    </button>
  )
}

function PTZJoystick() {
  return (
    <div className="relative w-32 h-32 rounded-full border border-white/5 flex items-center justify-center bg-black/20 shadow-inner">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2">
        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronUp className="w-5 h-5 rotate-[-45deg]" /></button>
        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronUp className="w-6 h-6" /></button>
        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronUp className="w-5 h-5 rotate-[45deg]" /></button>

        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronLeft className="w-6 h-6" /></button>
        <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] shadow-[var(--glow-primary)] self-center justify-self-center border-4 border-white/10" />
        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronRight className="w-6 h-6" /></button>

        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronDown className="w-5 h-5 rotate-[45deg]" /></button>
        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronDown className="w-6 h-6" /></button>
        <button className="flex items-center justify-center text-white/30 hover:text-[hsl(var(--primary))] transition-colors"><ChevronDown className="w-5 h-5 rotate-[-45deg]" /></button>
      </div>
    </div>
  )
}

function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const variants: Record<string, string> = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]',
    success: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.3)]',
    info: 'bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.3)]',
  }
  return <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant]}`}>{children}</span>
}

export default function AdminCameraManagementPage() {
  const { data: session } = useSession()
  const [cameras, setCameras] = useState<CameraItem[]>([])
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [gridSize, setGridSize] = useState<1 | 4 | 9 | 16>(4)
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  const [gridAssignments, setGridAssignments] = useState<(CameraItem | null)[]>(new Array(16).fill(null))
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Video & Recording state
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [showRecordingsModal, setShowRecordingsModal] = useState(false)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<{ url: string; title: string; isLive?: boolean } | null>(null)
  const [activeRecordings, setActiveRecordings] = useState<Record<string, boolean>>({})
  const [fullscreenCamera, setFullscreenCamera] = useState<CameraItem | null>(null)

  useEffect(() => {
    fetchData()
    loadRecordings()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const camRes = await fetch("/api/cameras")
      const classRes = await fetch("/api/classes")

      let fetchedCameras: CameraItem[] = []
      if (camRes.ok) fetchedCameras = await camRes.json()

      if (classRes.ok) {
        const classData = await classRes.json()
        const classes = classData.classes || []
        const assignments = classes.map((c: any) => ({
          classId: c.id,
          className: c.name,
          grade: c.grade,
          roomNumber: c.description || "N/A",
          studentCount: c.studentCount || 0,
          cameraId: fetchedCameras.find(cam => cam.classId === c.id)?.id,
          cameraName: fetchedCameras.find(cam => cam.classId === c.id)?.name,
        }))
        setClassAssignments(assignments)
      }

      if (fetchedCameras.length > 0) {
        setCameras(fetchedCameras)
        const initialGrid = new Array(16).fill(null)
        fetchedCameras.slice(0, 4).forEach((cam, i) => { initialGrid[i] = cam })
        setGridAssignments(initialGrid)
      } else {
        loadMockData()
      }
    } catch (error) {
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockData = () => {
    const mock: CameraItem[] = [
      { id: "cam_1", name: "Cổng chính", rtspUrl: "...", brand: "HikVision", location: "Cổng trường", locationType: "entrance", status: "online", isActive: true },
      { id: "cam_2", name: "Sân trường A", rtspUrl: "...", brand: "HikVision", location: "Sân chơi", locationType: "other", status: "online", isActive: true },
      { id: "cam_3", name: "Hành lang T1", rtspUrl: "...", brand: "Dahua", location: "Dãy A", locationType: "hallway", status: "online", isActive: true },
      { id: "cam_4", name: "Nhà xe", rtspUrl: "...", brand: "Dahua", location: "Khu B", locationType: "other", status: "offline", isActive: true },
    ]
    setCameras(mock)
    const initialGrid = new Array(16).fill(null)
    mock.slice(0, 4).forEach((cam, i) => { initialGrid[i] = cam })
    setGridAssignments(initialGrid)
  }

  const loadRecordings = async () => {
    try {
      const res = await fetch('/api/camera/recording?limit=100')
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.recordings || [])
        const active: Record<string, boolean> = {}
        data.recordings?.forEach((r: Recording) => {
          if (r.status === 'recording') active[r.cameraId] = true
        })
        setActiveRecordings(active)
        // Update cameras with recording info
        setCameras(prev => prev.map(cam => ({
          ...cam,
          hasRecording: data.recordings?.some((r: Recording) => r.cameraId === cam.id),
          latestRecordingUrl: data.recordings?.find((r: Recording) => r.cameraId === cam.id)?.videoUrl
        })))
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
    }
  }

  const handlePlayRecording = (camera: CameraItem) => {
    if (camera.latestRecordingUrl) {
      setCurrentVideo({ url: camera.latestRecordingUrl!, title: `${camera.name} - Recording`, isLive: false })
      setShowVideoPlayer(true)
    } else {
      setShowRecordingsModal(true)
    }
  }

  const handlePlayLive = (camera: CameraItem) => {
    // Demo video URLs for testing AI features
    const demoVideos: Record<string, string> = {
      'classroom': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'hallway': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'entrance': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'lab': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'library': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'default': 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
    }
    
    const videoUrl = demoVideos[camera.locationType] || demoVideos['default']
    
    setCurrentVideo({ 
      url: videoUrl, 
      title: `${camera.name} - LIVE Demo`, 
      isLive: true 
    })
    setShowVideoPlayer(true)
  }

  const handleFullscreenCamera = (camera: CameraItem) => {
    setFullscreenCamera(camera)
  }

  const exitFullscreen = () => {
    setFullscreenCamera(null)
  }

  const handleCameraSelect = (camera: CameraItem) => {
    const newGrid = [...gridAssignments]
    newGrid[selectedSlot] = camera
    setGridAssignments(newGrid)
  }

  const filteredCameras = cameras.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.location.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0a0a0a]">
      
      {/* ── Left Sidebar: Device Management ── */}
      <div className={`flex-shrink-0 border-r border-white/5 transition-all duration-300 overflow-hidden flex flex-col bg-[#111111] ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
              <SidebarIcon className="w-4 h-4" />
              Tổng quan hệ thống
            </h2>
            <div className="flex gap-1">
               <button onClick={() => setIsConfigOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-[hsl(var(--primary))] transition-all">
                  <Settings2 className="w-4 h-4" />
               </button>
               <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
               </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Tìm kiếm thiết bị / vị trí..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:border-[hsl(var(--primary))] outline-none transition-all placeholder:text-white/20"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {/* Demo Videos Section */}
          <div className="mb-4">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-2">
              🎬 Video Demo AI
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Classroom', type: 'classroom', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
                { name: 'Hallway', type: 'hallway', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
                { name: 'Entrance', type: 'entrance', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
                { name: 'Lab', type: 'lab', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
              ].map((demo) => (
                <button
                  key={demo.name}
                  onClick={() => {
                    setCurrentVideo({ url: demo.url, title: `${demo.name} Demo`, isLive: false })
                    setShowVideoPlayer(true)
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[hsl(var(--primary))/0.5] rounded-xl transition-all group"
                >
                  <div className="aspect-video bg-black/50 rounded-lg mb-2 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                    <Play className="w-6 h-6 text-white/40 group-hover:text-[hsl(var(--primary))]" />
                  </div>
                  <p className="text-[9px] font-bold text-white/60 group-hover:text-white">{demo.name}</p>
                </button>
              ))}
            </div>
            
            {/* AI Test Videos */}
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-4 mb-2 px-2">
              👥 AI People Detection
            </h3>
            <div className="space-y-2">
              {[
                { name: 'People Walking', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGT.mp4', desc: 'Nhiều người đi bộ' },
                { name: 'Crowd Scene', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDiner.mp4', desc: 'Đám đông' },
              ].map((demo) => (
                <button
                  key={demo.name}
                  onClick={() => {
                    setCurrentVideo({ url: demo.url, title: demo.name, isLive: false })
                    setShowVideoPlayer(true)
                  }}
                  className="w-full p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-all group"
                >
                  <div className="w-16 h-10 bg-black/50 rounded flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-bold text-white/80">{demo.name}</p>
                    <p className="text-[8px] text-white/40">{demo.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-[1px] bg-white/5 my-3" />

          <div className="mb-4">
             <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-black uppercase text-white/20">Camera Hoạt Động</span>
                <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20">{cameras.filter(c => c.status === 'online').length} ONLINE</span>
             </div>
             {filteredCameras.map((cam) => (
                <div 
                  key={cam.id}
                  onClick={() => handleCameraSelect(cam)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 group border ${
                    gridAssignments.some(a => a?.id === cam.id) 
                      ? 'bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.2)]'
                      : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${cam.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500/40'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white/90 truncate group-hover:text-[hsl(var(--primary))] transition-colors">{cam.name}</p>
                    <p className="text-[10px] text-white/30 truncate uppercase tracking-tighter">{cam.location} • {cam.brand}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Edit2 className="w-3 h-3 text-white/20 hover:text-white" />
                     <Plus className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-8">
             <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-black uppercase text-white/20">Hệ Thống Phụ Trợ</span>
             </div>
             <div className="grid grid-cols-2 gap-2 px-2">
                <div className="p-3 rounded-xl border border-white/5 bg-white/2 bg-gradient-to-br from-white/5 to-transparent">
                   <ShieldAlert className="w-4 h-4 text-orange-500 mb-2" />
                   <p className="text-[10px] font-bold text-white/60">An Ninh AI</p>
                   <p className="text-[9px] text-green-500 font-mono mt-0.5">ACTIVE</p>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-white/2 bg-gradient-to-br from-white/5 to-transparent">
                   <UserCheck className="w-4 h-4 text-blue-500 mb-2" />
                   <p className="text-[10px] font-bold text-white/60">Điểm Danh</p>
                   <p className="text-[9px] text-white/20 font-mono mt-0.5">IDLE</p>
                </div>
             </div>
          </div>
        </div>

        {/* Global Admin PTZ Control */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex flex-col items-center gap-4">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20">Master Control PTZ</h3>
           <PTZJoystick />
           <div className="flex items-center gap-2 w-full">
              <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-[hsl(var(--primary)/0.2)] transition-all flex flex-col items-center border border-white/5">
                <Maximize2 className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[8px] font-bold text-white/40 mt-1 uppercase">FOCUS</span>
              </button>
              <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-[hsl(var(--primary)/0.2)] transition-all flex flex-col items-center border border-white/5">
                <Plus className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[8px] font-bold text-white/40 mt-1 uppercase">ZOOM +</span>
              </button>
              <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-[hsl(var(--primary)/0.2)] transition-all flex flex-col items-center border border-white/5">
                <Minus className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[8px] font-bold text-white/40 mt-1 uppercase">ZOOM -</span>
              </button>
           </div>
        </div>
      </div>

      {/* ── Main View: Command Center ── */}
      <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
        
        {/* Top bar */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0f0f0f]">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <SidebarIcon className="w-5 h-5" />
            </button>
            <div className="h-6 w-[1px] bg-white/10" />
            <div>
               <h1 className="text-white font-black text-base tracking-tighter uppercase italic flex items-center gap-3">
                 <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]" />
                 Surveillance Command Center
               </h1>
               <p className="text-[9px] text-white/30 uppercase tracking-[.2em] font-bold">Admin Privileges Escalated • Secure Link</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-4 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
               <Database className="w-4 h-4 text-[hsl(var(--primary))]" />
               <span className="text-[10px] font-black text-white/60 font-mono">NODE: RUST-CAM-099</span>
            </div>
            
            <div className="flex bg-black p-1 rounded-xl border border-white/10">
              {[1, 4, 9, 16].map(size => (
                <button 
                  key={size}
                  onClick={() => setGridSize(size as any)}
                  className={`w-10 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${gridSize === size ? 'bg-[hsl(var(--primary))] text-white shadow-[var(--glow-primary)]' : 'text-white/40 hover:text-white'}`}
                >
                  {Math.sqrt(size)}x{Math.sqrt(size)}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-[1px] bg-white/10 mx-2" />
            <ControlBtn icon={Maximize2} label="Fullscreen Wall" />
          </div>
        </div>

        {/* The Surveillance Grid */}
        <div className={`flex-1 grid gap-1 p-1 bg-black overflow-hidden ${
          gridSize === 1 ? 'grid-cols-1 grid-rows-1' : 
          gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 
          gridSize === 9 ? 'grid-cols-3 grid-rows-3' :
          'grid-cols-4 grid-rows-4'
        }`}>
          {new Array(gridSize).fill(null).map((_, i) => {
            const camera = gridAssignments[i]
            const isSelected = selectedSlot === i
            
            return (
              <div 
                key={i}
                onClick={() => setSelectedSlot(i)}
                className={`relative aspect-video flex flex-col transition-all group border-2 ${
                  isSelected ? 'border-[hsl(var(--primary))]' : 'border-transparent'
                } bg-[#0d0d0d] cursor-pointer rounded-sm overflow-hidden`}
              >
                {camera ? (
                  <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center overflow-hidden">
                       <div className="text-center opacity-30 group-hover:opacity-50 transition-all duration-500 scale-90 group-hover:scale-100">
                         <div className="flex items-center justify-center gap-3 mb-2">
                            <Video className="w-10 h-10 text-white" />
                         </div>
                         <p className="text-[11px] font-black text-white tracking-[.3em] uppercase">{camera.name}</p>
                         <p className="text-[9px] font-mono text-white/50 mt-1">{camera.locationType?.toUpperCase()}</p>
                       </div>
                       
                       {/* Stream HUD */}
                       <div className="absolute top-3 left-3 flex flex-col gap-2 items-start scale-90 origin-top-left">
                          <div className={`px-2 py-1 rounded text-[10px] font-black text-white flex items-center gap-2 shadow-lg ${camera.status === 'online' ? 'bg-red-600' : 'bg-white/20'}`}>
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                          </div>
                          <div className="bg-black/60 backdrop-blur-xl px-2 py-1 rounded text-[9px] font-black text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] shadow-lg uppercase tracking-widest">
                             {camera.brand} • 4K ULTRA
                          </div>
                       </div>

                       <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[9px] font-mono text-white/40 bg-black/60 px-2.5 py-1.5 rounded-lg backdrop-blur-xl border border-white/10 shadow-lg">
                          <span className="flex items-center gap-1.5 text-green-500 font-bold"><Signal className="w-3 h-3" /> 24.8 Mbps</span>
                          <span className="w-[1px] h-3 bg-white/10" />
                          <span>CH{i + 1}</span>
                          <span className="w-[1px] h-3 bg-white/10" />
                          <span>H.265</span>
                       </div>

                       {/* Action buttons on hover */}
                       <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                          <button
                            className="p-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-[hsl(var(--primary))] transition-all shadow-xl"
                            onClick={(e) => { e.stopPropagation(); handlePlayLive(camera) }}
                            title="Xem LIVE"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          {camera.hasRecording && (
                            <button
                              className="p-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-[hsl(var(--secondary))] transition-all shadow-xl"
                              onClick={(e) => { e.stopPropagation(); handlePlayRecording(camera) }}
                              title="Xem lại recording"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="p-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-[hsl(var(--primary))] transition-all shadow-xl"
                            onClick={(e) => { e.stopPropagation(); handleFullscreenCamera(camera) }}
                            title="Toàn màn hình"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                       </div>

                       {/* Interactive scanning effect */}
                       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--primary)/0.03)] to-transparent h-20 w-full animate-scan pointer-events-none" />
                    </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/5 hover:text-white/10 transition-all duration-300">
                     <div className="text-center">
                        <Plus className="w-12 h-12 mx-auto mb-3" />
                        <p className="text-xs font-black uppercase tracking-[.5em] ml-1">ASSIGN CH</p>
                     </div>
                  </div>
                )}
                
                {/* Slot ID Floating Label */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                   {camera && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); const g = [...gridAssignments]; g[i] = null; setGridAssignments(g); }}
                       className="p-2 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white transition-all border border-red-500/20"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Global Control Bar */}
        <div className="h-24 bg-[#0a0a0a] border-t border-white/5 px-8 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
            <div className="flex items-center gap-6">
              <div className="flex bg-white/2 rounded-2xl p-2 border border-white/5 gap-3">
                <ControlBtn icon={Play} label="Master Play" active />
                <ControlBtn icon={Square} label="All Stop" danger />
                <div className="w-[1px] h-8 bg-white/10 self-center mx-1" />
                <ControlBtn icon={History} label="Playback Hub" />
                <ControlBtn icon={Layout} label="Wall Config" />
              </div>
              <div className="flex bg-white/2 rounded-2xl p-2 border border-white/5 gap-3">
                <ControlBtn icon={Scissors} label="Auto Clip" />
                <ControlBtn icon={Camera} label="Snap All" />
                <ControlBtn icon={Circle} label="Global Rec" danger />
              </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black text-white/20 uppercase tracking-[.3em]">Master Volume</span>
                     <Volume2 className="w-4 h-4 text-[hsl(var(--primary))] animate-pulse" />
                  </div>
                  <div className="flex gap-1 h-1.5 w-48">
                    {new Array(24).fill(0).map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full ${idx < 18 ? 'bg-[hsl(var(--primary))] shadow-[0_0_5px_hsl(var(--primary))]' : 'bg-white/5'}`} />
                    ))}
                  </div>
               </div>
               <div className="h-12 w-[1px] bg-white/10" />
               <div className="flex gap-2">
                 <button className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white transition-all">
                    <Mic className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">PA System</span>
                 </button>
                 <button onClick={() => setIsConfigOpen(true)} className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                    <Settings2 className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Settings</span>
                 </button>
               </div>
            </div>
        </div>
      </div>

      {/* ── Video Player Modal ── */}
      {showVideoPlayer && currentVideo && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideoPlayer(false)}
        >
          <div
            className="w-full max-w-6xl bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-16 bg-gradient-to-r from-[hsl(var(--primary))/20] to-transparent border-b border-white/5 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${currentVideo.isLive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                <h2 className="text-xl font-bold text-white">{currentVideo.title}</h2>
                {currentVideo.isLive && (
                  <AIBadge variant="danger">LIVE</AIBadge>
                )}
              </div>
              <button
                onClick={() => setShowVideoPlayer(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <XIcon className="w-6 h-6 text-white/60" />
              </button>
            </div>

            {/* Video */}
            <div className="aspect-video bg-black relative">
              {currentVideo.isLive ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MonitorPlay className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/40 text-sm">Live stream will appear here</p>
                    <p className="text-white/20 text-xs mt-2">RTSP: {currentVideo.url}</p>
                  </div>
                </div>
              ) : (
                <video
                  src={currentVideo.url}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>

            {/* Controls */}
            <div className="h-14 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <Play className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-[hsl(var(--primary))]" />
                  </div>
                  <span className="text-xs text-white/40 font-mono">00:00 / 00:00</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <Volume2 className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <Maximize2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-[hsl(var(--primary))]" />
                <h2 className="text-xl font-bold text-white">Lịch Sử Ghi Hình</h2>
                <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full">
                  {recordings.length} video
                </span>
              </div>
              <button
                onClick={() => setShowRecordingsModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <XIcon className="w-6 h-6 text-white/60" />
              </button>
            </div>

            {/* Content */}
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
                      className="bg-[#2a2a2a] rounded-xl overflow-hidden border border-white/5 hover:border-[hsl(var(--primary))/0.3] transition-all group cursor-pointer"
                      onClick={() => {
                        setCurrentVideo({ url: rec.videoUrl, title: rec.cameraName, isLive: false })
                        setShowVideoPlayer(true)
                        setShowRecordingsModal(false)
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-[#1a1a1a] relative flex items-center justify-center">
                        {rec.thumbnailUrl ? (
                          <img src={rec.thumbnailUrl} alt={rec.cameraName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center opacity-40">
                            <MonitorPlay className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-[10px] font-medium">{rec.cameraName}</p>
                          </div>
                        )}
                        
                        {/* Status */}
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
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-current translate-x-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2 truncate">{rec.cameraName}</h3>
                        <div className="space-y-1 text-xs text-white/60">
                          <div className="flex items-center justify-between">
                            <span>Bắt đầu:</span>
                            <span className="text-white/80">{new Date(rec.startTime).toLocaleString('vi-VN')}</span>
                          </div>
                          {rec.duration && (
                            <div className="flex items-center justify-between">
                              <span>Thời lượng:</span>
                              <span className="text-white/80">{Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}</span>
                            </div>
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

      {/* ── Fullscreen Camera Modal ── */}
      {fullscreenCamera && (
        <div
          className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
          onClick={exitFullscreen}
        >
          {/* Camera Feed */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <MonitorPlay className="w-16 h-16 text-white/30" />
                  <div className="h-12 w-[1px] bg-white/20" />
                  <span className="text-4xl font-black text-white/50 italic tracking-tighter">LIVE</span>
                </div>
                <h2 className="text-2xl font-bold text-white/70 mb-2">{fullscreenCamera.name}</h2>
                <p className="text-sm text-white/40 font-mono">{fullscreenCamera.location}</p>
                <p className="text-xs text-white/30 mt-1">{fullscreenCamera.rtspUrl || 'RTSP Stream'}</p>
              </div>
            </div>
          </div>

          {/* HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white font-black text-sm tracking-widest">LIVE</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/20" />
                  <div>
                    <h3 className="text-white font-bold text-lg">{fullscreenCamera.name}</h3>
                    <p className="text-white/60 text-xs">{fullscreenCamera.location} • {fullscreenCamera.brand}</p>
                  </div>
                </div>
                <button
                  onClick={exitFullscreen}
                  className="pointer-events-auto p-3 bg-white/10 hover:bg-red-500/80 backdrop-blur-xl border border-white/20 rounded-xl transition-all group"
                >
                  <XIcon className="w-6 h-6 text-white group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-green-500">
                    <Signal className="w-5 h-5" />
                    <span className="text-white font-mono text-sm font-bold">24.8 Mbps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 font-mono text-xs">CH</span>
                    <span className="text-white font-bold text-lg">01</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/20" />
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 font-mono text-xs">CODEC</span>
                    <span className="text-white font-bold text-sm">H.265</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/60 font-mono text-xs">
                  <span>{new Date().toLocaleDateString('vi-VN')}</span>
                  <span>|</span>
                  <span className="text-white">{new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>

            {/* Corner Indicators */}
            <div className="absolute top-24 left-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AIBadge variant="success">ONLINE</AIBadge>
                {fullscreenCamera.hasRecording && (
                  <AIBadge variant="info">
                    <History className="w-3 h-3 mr-1" /> REC
                  </AIBadge>
                )}
              </div>
            </div>

            {/* Scan Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--primary)/0.03)] to-transparent h-32 w-full animate-scan pointer-events-none" />
          </div>

          {/* Quick Actions */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
            <button
              onClick={() => handlePlayLive(fullscreenCamera)}
              className="p-4 bg-white/10 hover:bg-[hsl(var(--primary))] backdrop-blur-xl border border-white/20 rounded-2xl transition-all group"
              title="Phát video"
            >
              <Play className="w-6 h-6 text-white" />
            </button>
            {fullscreenCamera.hasRecording && (
              <button
                onClick={() => handlePlayRecording(fullscreenCamera)}
                className="p-4 bg-white/10 hover:bg-[hsl(var(--secondary))] backdrop-blur-xl border border-white/20 rounded-2xl transition-all group"
                title="Xem recording"
              >
                <History className="w-6 h-6 text-white" />
              </button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(fullscreenCamera.rtspUrl || '')
              }}
              className="p-4 bg-white/10 hover:bg-[hsl(var(--primary))] backdrop-blur-xl border border-white/20 rounded-2xl transition-all group"
              title="Sao chép RTSP URL"
            >
              <Copy className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
        
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(500%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  )
}
