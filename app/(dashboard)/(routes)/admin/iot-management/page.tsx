"use client"

import { useState, useEffect } from "react"
import { 
  Cpu, Zap, Plus, Search, Filter, RefreshCw, 
  Settings, Trash2, MapPin, Activity, CheckCircle, 
  AlertCircle, ArrowUpRight, BarChart3, Database,
  MoreVertical, Edit3, Send
} from "lucide-react"

interface IoTDevice {
  id: string
  device_id: string
  name: string
  device_type: string
  firmware_version?: string
  location: string
  class_id?: string
  status: string
  last_seen?: string
  capabilities: string[]
}

// ── AI Native components ──
function ActionBtn({ children, onClick, variant = "default", size = "default", disabled = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "success" | "outline"; size?: "default" | "sm" | "icon";
  disabled?: boolean; className?: string
}) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : size === "icon" ? "p-2" : "px-4 py-2.5"
  const variantClass =
    variant === "primary" ? "ai-button-primary text-white" :
    variant === "danger" ? "bg-[hsl(var(--destructive))] text-white border-none hover:opacity-90" :
    variant === "success" ? "bg-[hsl(var(--success))] text-white border-none hover:opacity-90" :
    variant === "outline" ? "bg-transparent border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted-foreground)/0.05)] text-[hsl(var(--foreground))]" :
    "ai-button text-[hsl(var(--foreground))]"
  
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${sizeClass} ${variantClass} ${className} rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>
      {children}
    </button>
  )
}

function StatBox({ label, value, icon: Icon, color, trend }: { label: string; value: string | number; icon: any; color: string; trend?: string }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-[hsl(var(--border))] group hover:border-[hsl(var(--primary)/0.3)] transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-xl text-white group-hover:scale-110 transition-transform" style={{ background: color, boxShadow: `0 0 15px ${color}40` }}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
           <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
             <ArrowUpRight className="w-2.5 h-2.5" /> {trend}
           </span>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold tracking-widest text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
      </div>
    </div>
  )
}

export default function IoTManagementPage() {
  const [devices, setDevices] = useState<IoTDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    setLoading(true)
    // In a real app: const res = await fetch("/api/iot/devices")
    // Mocking for now
    setTimeout(() => {
      setDevices([
        { id: "1", device_id: "esp32-9a1-env", name: "Cảm biến 9A1", device_type: "ESP32", location: "Phòng 302", class_id: "9A1", status: "online", last_seen: new Date().toISOString(), capabilities: ["temp", "hum", "air"] },
        { id: "2", device_id: "rpi-gate-01", name: "Gateway Cổng", device_type: "Raspberry Pi", location: "Cổng chính", status: "online", last_seen: new Date().toISOString(), capabilities: ["video", "rfid"] },
        { id: "3", device_id: "esp32-lab-01", name: "Cảm biến Lab", device_type: "ESP32", location: "Phòng Lab Lý", class_id: "LAB-PHY", status: "offline", last_seen: new Date(Date.now() - 3600000).toISOString(), capabilities: ["light", "motion"] },
        { id: "4", device_id: "arduino-lib-01", name: "Thư viện Info", device_type: "Arduino", location: "Thư viện", status: "online", last_seen: new Date().toISOString(), capabilities: ["noise"] },
      ])
      setLoading(false)
    }, 800)
  }

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.device_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="neu-container min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-2 bg-[hsl(var(--primary))] rounded-lg text-white">
                <Cpu className="w-5 h-5" />
             </div>
             <h1 className="text-2xl md:text-3xl font-black tracking-tight gradient-text">IoT Gateway Hub</h1>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Quản lý mạng lưới thiết bị ngoại vi và cảm biến toàn trường</p>
        </div>
        <div className="flex items-center gap-3">
          <ActionBtn onClick={fetchDevices} variant="outline" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ActionBtn>
          <ActionBtn variant="primary">
            <Plus className="w-4 h-4" /> Đăng ký thiết bị
          </ActionBtn>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatBox label="Tổng thiết bị" value={devices.length} icon={Cpu} color="hsl(var(--primary))" />
        <StatBox label="Đang kết nối" value={devices.filter(d => d.status === 'online').length} icon={Activity} color="hsl(var(--success))" trend="+2 mới" />
        <StatBox label="Telemetry / Giờ" value="12.4K" icon={Database} color="hsl(var(--info))" trend="+15%" />
        <StatBox label="Sự cố IoT" value={devices.filter(d => d.status === 'offline').length} icon={AlertCircle} color="hsl(var(--destructive))" />
      </div>

      {/* Controls & Search */}
      <div className="glass-panel p-4 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input 
            type="text"
            placeholder="Tìm theo ID hoặc tên thiết bị..."
            className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--muted-foreground)/0.05)] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <ActionBtn variant="outline" size="sm"><Filter className="w-3.5 h-3.5" /> Lọc</ActionBtn>
           <ActionBtn variant="outline" size="sm"><Settings className="w-3.5 h-3.5" /> MQTT Config</ActionBtn>
        </div>
      </div>

      {/* Device Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[hsl(var(--muted-foreground)/0.03)] border-b border-[hsl(var(--border))]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Thiết bị / ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Loại / Firmware</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Vị trí / Lớp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Khả năng</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-[hsl(var(--muted-foreground))]">Đang tải danh sách thiết bị...</td></tr>
              ) : filteredDevices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-[hsl(var(--muted-foreground))]">Không tìm thấy thiết bị nào</td></tr>
              ) : (
                filteredDevices.map(device => (
                  <tr key={device.id} className="hover:bg-[hsl(var(--muted-foreground)/0.02)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${device.status === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[150px]">{device.name}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">{device.device_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-bold text-[hsl(var(--foreground))]">{device.device_type}</span>
                       <p className="text-[10px] text-[hsl(var(--muted-foreground))]">v2.1.0-stable</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs font-bold transition-colors">
                        <MapPin className="w-3 h-3 text-[hsl(var(--primary))]" /> {device.location}
                      </div>
                      {device.class_id && <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Lớp: {device.class_id}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {device.capabilities.map(cap => (
                          <span key={cap} className="text-[9px] bg-[hsl(var(--muted-foreground)/0.1)] px-1.5 py-0.5 rounded-md font-bold uppercase">{cap}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span className={`text-xs font-bold ${device.status === 'online' ? 'text-green-500' : 'text-slate-500'}`}>
                          {device.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {device.status === 'online' ? 'Vừa xong' : '1 giờ trước'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <ActionBtn size="icon" variant="outline"><Edit3 className="w-3.5 h-3.5" /></ActionBtn>
                          <ActionBtn size="icon" variant="outline"><Send className="w-3.5 h-3.5" /></ActionBtn>
                          <ActionBtn size="icon" variant="outline" className="hover:text-red-500 hover:border-red-500/30"><Trash2 className="w-3.5 h-3.5" /></ActionBtn>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-[hsl(var(--primary)/0.03)] rounded-full blur-[100px] -z-10" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-[hsl(var(--info)/0.03)] rounded-full blur-[100px] -z-10" />
    </div>
  )
}
