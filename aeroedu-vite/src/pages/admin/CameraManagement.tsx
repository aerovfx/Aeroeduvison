import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Menu, Maximize2, Minimize2, Play, Square, Video,
  Settings, Volume2, Mic, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Focus, Search, Wifi, WifiOff,
  Shield, Users, X, Film, AlertTriangle, Plus, Trash2,
  Edit2, Radar, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cameraService, type CameraAdmin } from '@/services/camera.service';
import CameraConfigModal from '@/components/camera/CameraConfigModal';

/* ─── Types ─────────────────────────────────────────────── */
interface CameraEntry {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  brand: string;
  channel: string;
  /** Reference đến CameraAdmin (full config) — để mở edit modal */
  _admin?: CameraAdmin;
}

interface Recording {
  id: string;
  cameraName: string;
  startTime: string;
  duration: string;
  size: string;
  status: 'saved' | 'recording';
  thumbnail?: string;
}

type GridSize = 1 | 4 | 9 | 16;

/* ─── Constants ─────────────────────────────────────────── */
// Fallback list khi API rỗng (lần đầu setup, chưa có camera nào trong DB)
const FALLBACK_CAMERAS: CameraEntry[] = [
  { id: 'cam-demo-1', name: 'Demo: Cổng chính',    location: 'Cổng trường',    status: 'offline', brand: 'Hikvision', channel: 'CH01' },
  { id: 'cam-demo-2', name: 'Demo: Sân trường A',  location: 'Khu A',          status: 'offline', brand: 'Dahua',     channel: 'CH02' },
]

/** Map CameraAdmin (từ API) → CameraEntry (cho UI hiện tại) */
function mapAdminToEntry(c: CameraAdmin, idx: number): CameraEntry {
  return {
    id: c.id,
    name: c.name,
    location: c.location || c.roomNumber || '—',
    status: c.status === 'online' ? 'online' : 'offline',
    brand: c.brand || 'Generic',
    channel: `CH${String(idx + 1).padStart(2, '0')}`,
    _admin: c,
  }
}

const DEMO_VIDEOS: { label: string; url: string; tag: string }[] = [
  { label: 'Lớp học',    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',       tag: 'CLASSROOM' },
  { label: 'Hành lang',  url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',     tag: 'HALLWAY'   },
  { label: 'Cổng vào',   url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',         tag: 'ENTRANCE'  },
  { label: 'Phòng lab',  url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',   tag: 'LAB'       },
];

const AI_VIDEOS: { label: string; url: string }[] = [
  { label: 'AI Phát hiện người',  url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  { label: 'AI Đếm lưu lượng',   url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'   },
];

const MOCK_RECORDINGS: Recording[] = [
  { id: 'r1', cameraName: 'Cổng chính',   startTime: '08:00 - 12/04', duration: '4h 12m', size: '2.3 GB', status: 'saved' },
  { id: 'r2', cameraName: 'Sân trường A', startTime: '07:30 - 12/04', duration: '5h 05m', size: '3.1 GB', status: 'recording' },
  { id: 'r3', cameraName: 'Hành lang T1', startTime: '06:55 - 12/04', duration: '6h 22m', size: '3.8 GB', status: 'saved' },
  { id: 'r4', cameraName: 'Nhà xe',       startTime: '08:15 - 11/04', duration: '3h 44m', size: '1.9 GB', status: 'saved' },
];

/* ─── Helpers ────────────────────────────────────────────── */
function gridCols(size: GridSize) {
  if (size === 1)  return 'grid-cols-1';
  if (size === 4)  return 'grid-cols-2';
  if (size === 9)  return 'grid-cols-3';
  return 'grid-cols-4';
}

function slotCount(size: GridSize): number { return size; }

/* ─── Sub-components ─────────────────────────────────────── */
function ControlBtn({ icon: Icon, label, active, onClick, danger }: {
  icon: React.ElementType; label: string; active?: boolean;
  onClick?: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-all
        ${danger  ? 'text-red-400 hover:bg-red-900/30'
        : active  ? 'text-purple-300 bg-purple-900/30'
        : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function PTZJoystick({ onMove }: { onMove?: (dir: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">PTZ Control</p>
      {/* Arrow pad */}
      <div className="grid grid-cols-3 gap-0.5 w-24">
        {['↖','↑','↗','←','·','→','↙','↓','↘'].map((sym, i) => (
          <button
            key={i}
            onClick={() => onMove?.(sym)}
            className={`h-8 flex items-center justify-center rounded text-sm font-bold
              ${sym === '·' ? 'bg-white/10 text-white/20' : 'bg-white/5 hover:bg-purple-600/40 text-white/60 hover:text-white transition-colors'}`}
          >
            {sym}
          </button>
        ))}
      </div>
      {/* Focus / Zoom */}
      <div className="flex gap-1 mt-1">
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] transition-colors">
          <Focus className="w-3 h-3" /> Focus
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] transition-colors">
          <ZoomIn className="w-3 h-3" /> Z+
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] transition-colors">
          <ZoomOut className="w-3 h-3" /> Z-
        </button>
      </div>
    </div>
  );
}

interface CameraSlotProps {
  slotIndex: number;
  cameraId: string | null;
  cameras: CameraEntry[];
  onPlay: (cam: CameraEntry) => void;
  onFullscreen: (cam: CameraEntry) => void;
  onRemove: (slot: number) => void;
}

function CameraSlot({ slotIndex, cameraId, cameras, onPlay, onFullscreen, onRemove }: CameraSlotProps) {
  const cam = cameras.find(c => c.id === cameraId) ?? null;

  if (!cam) {
    return (
      <div className="relative bg-[#050505] border border-white/[0.04] rounded flex items-center justify-center min-h-[120px] group">
        <div className="text-center">
          <Camera className="w-6 h-6 text-white/10 mx-auto mb-1" />
          <p className="text-[10px] text-white/20">Slot {slotIndex + 1}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black border border-white/[0.06] rounded overflow-hidden min-h-[120px] group">
      {/* Scan-line overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scanline absolute left-0 right-0 h-px bg-white/5" />
      </div>

      {/* Camera "feed" — dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1520] to-[#050505]" />

      {/* Corner brackets */}
      {['top-1 left-1','top-1 right-1','bottom-1 left-1','bottom-1 right-1'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none`}>
          <div className={`absolute w-3 h-px bg-green-400/60 ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'}`} />
          <div className={`absolute h-3 w-px bg-green-400/60 ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'}`} />
        </div>
      ))}

      {/* Top HUD */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white animate-pulse">LIVE</span>
          <span className="text-[9px] text-white/70 font-medium">{cam.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-white/40">{cam.brand}</span>
          <span className="text-[9px] text-cyan-400 font-bold">4K</span>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
        <span className="text-[9px] text-white/40 font-mono">4096kbps · H.265</span>
        <span className="text-[9px] text-white/40">{cam.channel}</span>
      </div>

      {/* Status dot */}
      <div className="absolute top-2 right-2 z-20">
        {cam.status === 'online'
          ? <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_#4ade80]" />
          : <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      </div>

      {/* Hover actions */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <button onClick={() => onPlay(cam)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600/80 hover:bg-purple-600 text-white text-[10px] font-medium transition-colors">
          <Play className="w-3 h-3" /> Play
        </button>
        <button onClick={() => onFullscreen(cam)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] transition-colors">
          <Maximize2 className="w-3 h-3" /> Full
        </button>
        <button onClick={() => onRemove(slotIndex)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-red-600/60 hover:bg-red-600 text-white text-[10px] transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Offline overlay */}
      {cam.status === 'offline' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/70">
          <WifiOff className="w-6 h-6 text-red-400 mb-1" />
          <p className="text-[10px] text-red-400">OFFLINE</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CameraManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [gridSize, setGridSize] = useState<GridSize>(4);

  // ── Cameras từ API (admin view) ──
  const [cameras, setCameras] = useState<CameraEntry[]>(FALLBACK_CAMERAS);
  const [camerasLoading, setCamerasLoading] = useState(true);

  // ── Modal Add/Edit camera ──
  const [configOpen, setConfigOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraAdmin | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const loadCameras = useCallback(async () => {
    setCamerasLoading(true);
    try {
      const r = await cameraService.admin.list();
      if (r.cameras && r.cameras.length > 0) {
        setCameras(r.cameras.map((c, i) => mapAdminToEntry(c, i)));
      } else {
        setCameras(FALLBACK_CAMERAS); // demo placeholder khi DB rỗng
      }
    } catch (e: any) {
      console.warn('[admin:cameras]', e.message);
      setCameras(FALLBACK_CAMERAS);
    } finally {
      setCamerasLoading(false);
    }
  }, []);

  useEffect(() => { loadCameras(); }, [loadCameras]);

  const handleAddCamera = () => {
    setEditingCamera(null);
    setConfigOpen(true);
  };
  const handleEditCamera = (e: CameraEntry) => {
    if (!e._admin) {
      toast.error('Camera demo — không edit được. Nhấn "Thêm Camera" để tạo mới.');
      return;
    }
    setEditingCamera(e._admin);
    setConfigOpen(true);
  };
  const handleDeleteCamera = async (e: CameraEntry) => {
    if (!e._admin) {
      toast.error('Camera demo — không xoá được');
      return;
    }
    if (!confirm(`Xoá camera "${e.name}"?\nHành động không thể hoàn tác.`)) return;
    try {
      await cameraService.admin.remove(e._admin.id);
      toast.success(`Đã xoá ${e.name}`);
      loadCameras();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Lỗi xoá camera');
    }
  };
  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const r = await cameraService.admin.discover();
      if (r.discovered && r.discovered.length > 0) {
        toast.success(`Tìm thấy ${r.discovered.length} camera trong mạng LAN`);
      } else {
        toast(r.message || 'Chưa tìm thấy camera. Xem hint trong console.', {
          icon: '💡', duration: 6000,
        });
        if (r.hint) console.log('[discover hint]', r.hint);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Lỗi discover');
    } finally {
      setDiscovering(false);
    }
  };

  const [gridAssignments, setGridAssignments] = useState<(string | null)[]>(Array(16).fill(null));

  // Auto-assign cameras vào grid khi list load xong
  useEffect(() => {
    setGridAssignments(prev => {
      const next = [...prev];
      cameras.slice(0, 16).forEach((c, i) => { if (!next[i]) next[i] = c.id; });
      return next;
    });
  }, [cameras]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Video player modal
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<{ url: string; title: string } | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fullscreen camera modal
  const [fullscreenCamera, setFullscreenCamera] = useState<CameraEntry | null>(null);

  // Recordings modal
  const [showRecordings, setShowRecordings] = useState(false);

  // Master controls
  const [masterPlaying, setMasterPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Sidebar search
  const [sidebarSearch, setSidebarSearch] = useState('');

  const filteredCameras = cameras.filter(c =>
    c.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    c.location.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const assignCameraToSlot = useCallback((cameraId: string) => {
    if (selectedSlot !== null) {
      setGridAssignments(prev => {
        const next = [...prev];
        next[selectedSlot] = cameraId;
        return next;
      });
      setSelectedSlot(null);
    } else {
      // auto-assign to first empty slot
      setGridAssignments(prev => {
        const idx = prev.findIndex(s => s === null);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = cameraId;
        return next;
      });
    }
  }, [selectedSlot]);

  const removeFromSlot = useCallback((slot: number) => {
    setGridAssignments(prev => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  }, []);

  const openVideoPlayer = (url: string, title: string, live = false) => {
    setCurrentVideo({ url, title });
    setIsLiveMode(live);
    setShowVideoPlayer(true);
  };

  const openFullscreen = (cam: CameraEntry) => {
    setFullscreenCamera(cam);
  };

  const slots = slotCount(gridSize);

  /* ── Volume visualizer bars ── */
  const volBars = Array.from({ length: 24 }, (_, i) => {
    const h = masterPlaying ? Math.round(20 + Math.sin(i * 0.7) * 15 + Math.random() * 10) : 4;
    return h;
  });

  return (
    <>
      {/* Scan animation */}
      <style>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to   { transform: translateY(400%);  }
        }
        .scanline { animation: scan 3s linear infinite; }
      `}</style>

      <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden" style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* ── Left Sidebar ─────────────────────────────────── */}
        <aside
          className={`flex-shrink-0 flex flex-col bg-[#111111] border-r border-white/[0.06] transition-all duration-300 overflow-hidden
            ${isSidebarOpen ? 'w-72' : 'w-0'}`}
        >
          <div className="flex flex-col h-full min-w-[288px] overflow-y-auto">
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Cameras</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  placeholder="Tìm camera..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/[0.06] rounded text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Demo video buttons */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Demo Clips</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_VIDEOS.map(v => (
                  <button
                    key={v.tag}
                    onClick={() => openVideoPlayer(v.url, v.label)}
                    className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-purple-600/20 border border-white/[0.05] hover:border-purple-500/30 transition-all group"
                  >
                    <Film className="w-4 h-4 text-white/40 group-hover:text-purple-400 transition-colors" />
                    <span className="text-[9px] text-white/50 group-hover:text-white/80">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI video buttons */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">AI Detection</p>
              <div className="flex flex-col gap-1.5">
                {AI_VIDEOS.map(v => (
                  <button
                    key={v.label}
                    onClick={() => openVideoPlayer(v.url, v.label)}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-cyan-900/20 hover:bg-cyan-800/30 border border-cyan-500/10 hover:border-cyan-500/30 transition-all text-left"
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-[10px] text-cyan-300/80">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Camera list — Admin có thêm Add/Edit/Delete/Discover */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">
                  Camera List ({cameras.length})
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={loadCameras} disabled={camerasLoading}
                    title="Refresh list"
                    className="p-1 rounded hover:bg-white/10 disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 text-white/40 ${camerasLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={handleDiscover} disabled={discovering}
                    title="ONVIF Discovery (scan mạng LAN)"
                    className="p-1 rounded hover:bg-cyan-500/20 disabled:opacity-50">
                    {discovering
                      ? <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                      : <Radar className="w-3 h-3 text-cyan-400" />}
                  </button>
                  <button onClick={handleAddCamera}
                    title="Thêm camera mới (ONVIF)"
                    className="p-1 rounded hover:bg-violet-500/20">
                    <Plus className="w-3 h-3 text-violet-400" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {camerasLoading ? (
                  <div className="text-[10px] text-white/30 text-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    Đang tải...
                  </div>
                ) : filteredCameras.length === 0 ? (
                  <div className="text-[10px] text-white/30 text-center py-3">
                    Chưa có camera. Bấm <Plus className="w-3 h-3 inline mx-0.5" /> để thêm.
                  </div>
                ) : filteredCameras.map(cam => (
                  <div key={cam.id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 border border-transparent hover:border-white/[0.06] transition-all">
                    <button
                      onClick={() => assignCameraToSlot(cam.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cam.status === 'online' ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate group-hover:text-white">{cam.name}</p>
                        <p className="text-[9px] text-white/30 truncate">
                          {cam.brand} • {cam.location}
                        </p>
                      </div>
                    </button>
                    {cam._admin && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditCamera(cam)}
                          title="Cấu hình ONVIF"
                          className="p-1 rounded hover:bg-cyan-500/30">
                          <Edit2 className="w-3 h-3 text-cyan-400" />
                        </button>
                        <button onClick={() => handleDeleteCamera(cam)}
                          title="Xoá camera"
                          className="p-1 rounded hover:bg-red-500/30">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Subsystems */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Hệ thống phụ</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-2.5 py-2 rounded bg-green-900/20 border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] text-green-300">An Ninh AI</span>
                  </div>
                  <span className="text-[9px] text-green-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-2 rounded bg-blue-900/20 border border-blue-500/10">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-blue-300">Điểm Danh</span>
                  </div>
                  <span className="text-[9px] text-blue-400 font-bold">ON</span>
                </div>
              </div>
            </div>

            {/* PTZ Joystick */}
            <div className="px-4 py-3">
              <PTZJoystick />
            </div>
          </div>
        </aside>

        {/* ── Main Area ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#111111] border-b border-white/[0.06] flex-shrink-0">
            <button
              onClick={() => setIsSidebarOpen(p => !p)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
              <h1 className="text-sm font-semibold text-white/90 tracking-wide">Surveillance Command Center</h1>
            </div>

            <div className="flex-1" />

            {/* Grid size switcher */}
            <div className="flex items-center gap-1 bg-white/5 rounded p-0.5">
              {([1, 4, 9, 16] as GridSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => setGridSize(s)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all
                    ${gridSize === s ? 'text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                  style={gridSize === s ? { background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' } : {}}
                >
                  {s === 1 ? '1×1' : s === 4 ? '2×2' : s === 9 ? '3×3' : '4×4'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFullscreenCamera(cameras.find(c => gridAssignments[0] === c.id) ?? null)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Surveillance grid */}
          <div className="flex-1 p-3 overflow-auto">
            <div className={`grid ${gridCols(gridSize)} gap-2 h-full`} style={{ gridAutoRows: `calc(${100 / Math.sqrt(slots)}% - 8px)` }}>
              {Array.from({ length: slots }).map((_, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedSlot(i)}
                  className={`cursor-pointer rounded transition-all ${selectedSlot === i ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <CameraSlot
                    slotIndex={i}
                    cameraId={gridAssignments[i] ?? null}
                    cameras={cameras}
                    onPlay={cam => openVideoPlayer(
                      DEMO_VIDEOS[cameras.indexOf(cam) % DEMO_VIDEOS.length]?.url ?? DEMO_VIDEOS[0].url,
                      cam.name
                    )}
                    onFullscreen={openFullscreen}
                    onRemove={removeFromSlot}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Global control bar */}
          <div className="flex-shrink-0 bg-[#0d0d0d] border-t border-white/[0.06] px-4 py-1.5 flex items-center gap-2">
            {/* Master controls */}
            <ControlBtn icon={masterPlaying ? Square : Play} label={masterPlaying ? 'Stop' : 'Play'}
              active={masterPlaying} onClick={() => setMasterPlaying(p => !p)} />
            <ControlBtn icon={Video} label="Playback" onClick={() => setShowRecordings(true)} />
            <ControlBtn icon={Settings} label="Wall Cfg" />

            <div className="w-px h-5 bg-white/10 mx-1" />

            <ControlBtn icon={Film} label="Auto Clip" />
            <ControlBtn icon={Camera} label="Snap" />
            <ControlBtn icon={isRecording ? Square : Video} label={isRecording ? 'Stop Rec' : 'Record'}
              danger={isRecording} active={isRecording} onClick={() => setIsRecording(p => !p)} />

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* Volume visualizer */}
            <div className="flex items-end gap-px h-6 px-1">
              {volBars.map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-sm transition-all duration-150"
                  style={{
                    height: `${h}px`,
                    background: h > 25 ? '#ef4444' : h > 15 ? '#a855f7' : '#6366f1',
                    opacity: masterPlaying ? 1 : 0.3,
                  }}
                />
              ))}
            </div>

            <div className="flex-1" />

            <ControlBtn icon={Mic} label="PA System" />
            <ControlBtn icon={AlertTriangle} label="Alert" danger />
            <ControlBtn icon={Settings} label="Settings" />
          </div>
        </div>
      </div>

      {/* ── Video Player Modal ─────────────────────────────── */}
      {showVideoPlayer && currentVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#111111] rounded-xl w-full max-w-3xl border border-white/[0.08] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-red-500 animate-pulse' : 'bg-purple-400'}`} />
                  <span className="text-[10px] font-bold text-white/60 uppercase">{isLiveMode ? 'LIVE' : 'PLAYBACK'}</span>
                </div>
                <h2 className="text-sm font-semibold text-white/90">{currentVideo.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLiveMode(p => !p)}
                  className="px-2 py-1 rounded text-[10px] font-medium border transition-colors"
                  style={isLiveMode
                    ? { background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }
                    : { background: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.2)', color: '#c084fc' }}
                >
                  {isLiveMode ? '● LIVE' : '▶ PLAYBACK'}
                </button>
                <button onClick={() => setShowVideoPlayer(false)}
                  className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video content */}
            <div className="relative bg-black w-full aspect-video">
              {isLiveMode ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a1520] to-[#050505]">
                  <Camera className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-white/30 text-sm">Đang kết nối luồng trực tiếp...</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={currentVideo.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
                <span>4096kbps</span>
                <span>H.265</span>
                <span>1920×1080</span>
                <span>30fps</span>
              </div>
              <button onClick={() => setShowVideoPlayer(false)}
                className="px-3 py-1.5 rounded text-xs text-white/60 hover:text-white border border-white/[0.08] hover:bg-white/5 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recordings Modal ────────────────────────────────── */}
      {showRecordings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#111111] rounded-xl w-full max-w-2xl border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white/90">Recordings</h2>
              <button onClick={() => setShowRecordings(false)}
                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {MOCK_RECORDINGS.map(r => (
                <div key={r.id} className="bg-[#0a0a0a] border border-white/[0.06] rounded-lg overflow-hidden group">
                  {/* Thumbnail */}
                  <div className="h-24 bg-gradient-to-br from-[#0f1f30] to-[#050505] flex items-center justify-center relative">
                    <Video className="w-8 h-8 text-white/10" />
                    {r.status === 'recording' && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[8px] text-white font-bold">REC</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowRecordings(false);
                        openVideoPlayer(DEMO_VIDEOS[0].url, r.cameraName);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-8 h-8 text-white fill-white" />
                    </button>
                  </div>
                  {/* Info */}
                  <div className="px-3 py-2">
                    <p className="text-xs text-white/80 font-medium truncate">{r.cameraName}</p>
                    <p className="text-[9px] text-white/40 mt-0.5">{r.startTime}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-white/30">{r.duration}</span>
                      <span className="text-[9px] text-purple-400">{r.size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Camera Modal ──────────────────────────── */}
      {fullscreenCamera && (
        <div className="fixed inset-0 bg-[#050505] z-50 flex flex-col">
          {/* Top HUD */}
          <div className="flex items-center justify-between px-6 py-3 bg-black/50 border-b border-white/[0.06] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">LIVE</span>
              <span className="text-sm font-semibold text-white">{fullscreenCamera.name}</span>
              <span className="text-xs text-white/40">{fullscreenCamera.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/30 font-mono">4096kbps · H.265 · CH01</span>
              <span className="text-xs text-cyan-400 font-bold">4K</span>
              <button onClick={() => setFullscreenCamera(null)}
                className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main view */}
          <div className="flex-1 relative overflow-hidden">
            {/* Dark gradient "feed" */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1520] to-[#020408]" />

            {/* Scan line */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="scanline absolute left-0 right-0 h-0.5 bg-white/[0.03]" />
            </div>

            {/* Corner brackets */}
            {[
              'top-6 left-6', 'top-6 right-6',
              'bottom-6 left-6', 'bottom-6 right-6'
            ].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-10 h-10 pointer-events-none`}>
                <div className={`absolute w-8 h-0.5 bg-green-400/50 ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'}`} />
                <div className={`absolute w-0.5 h-8 bg-green-400/50 ${i < 2 ? 'top-0' : 'bottom-0'} ${i % 2 === 0 ? 'left-0' : 'right-0'}`} />
              </div>
            ))}

            {/* Center camera icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {fullscreenCamera.status === 'offline' ? (
                <div className="flex flex-col items-center gap-3">
                  <WifiOff className="w-16 h-16 text-red-400/40" />
                  <p className="text-red-400/60 font-medium">Camera Offline</p>
                </div>
              ) : (
                <Camera className="w-20 h-20 text-white/5" />
              )}
            </div>

            {/* Right sidebar quick actions */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {[
                { icon: Play,       label: 'Play'  },
                { icon: Video,      label: 'Rec'   },
                { icon: Camera,     label: 'Snap'  },
                { icon: ZoomIn,     label: 'Zoom+' },
                { icon: ZoomOut,    label: 'Zoom-' },
                { icon: Volume2,    label: 'Audio' },
              ].map(({ icon: Icon, label }) => (
                <button key={label}
                  className="w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded bg-black/60 border border-white/[0.06] hover:bg-white/10 text-white/50 hover:text-white transition-all"
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[7px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="flex items-center justify-between px-6 py-2 bg-black/50 border-t border-white/[0.06] backdrop-blur-sm">
            <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
              <span>Bitrate: 4096 kbps</span>
              <span>Codec: H.265+</span>
              <span>FPS: 30</span>
              <span>Res: 3840×2160</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${fullscreenCamera.status === 'online' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                {fullscreenCamera.status === 'online'
                  ? <Wifi className="w-3 h-3 text-green-400" />
                  : <WifiOff className="w-3 h-3 text-red-400" />}
                <span className={`text-[10px] font-bold ${fullscreenCamera.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                  {fullscreenCamera.status.toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] text-white/30">{fullscreenCamera.brand} · {fullscreenCamera.channel}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Camera Config Modal (ONVIF Add/Edit) ── */}
      <CameraConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        camera={editingCamera}
        onSaved={() => loadCameras()}
      />
    </>
  );
}
