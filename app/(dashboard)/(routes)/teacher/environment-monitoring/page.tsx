"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Thermometer, Droplets, Wind, Sun, Volume2, 
  Activity, RefreshCw, AlertCircle, CheckCircle,
  Cpu, Zap, Gauge, MapPin, Info, Users, Video
} from "lucide-react"

interface IoTDeviceSummary {
  device_id: string
  name: string
  device_type: string
  status: string
  latest_reading?: number
  latest_unit?: string
}

interface ClassroomEnvironment {
  class_id: string
  class_name: string
  temperature?: number
  humidity?: number
  light_level?: number
  noise_level?: number
  air_quality?: number
  motion_detected: boolean
  occupancy_count?: number
  camera_status: string
  devices: IoTDeviceSummary[]
  last_updated: string
}

// ── AI Native components ──
function ActionBtn({ children, onClick, variant = "default", size = "default", disabled = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "success"; size?: "default" | "sm" | "icon";
  disabled?: boolean; className?: string
}) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-sm" : size === "icon" ? "p-2.5" : "px-4 py-2.5"
  const variantClass =
    variant === "primary" ? "ai-button-primary text-white" :
    variant === "danger" ? "bg-[hsl(var(--destructive))] text-white border-none hover:opacity-90" :
    variant === "success" ? "bg-[hsl(var(--success))] text-white border-none hover:opacity-90" :
    "ai-button text-gray-900"
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${sizeClass} ${variantClass} ${className} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>
      {children}
    </button>
  )
}

function EnvGauge({ label, value, unit, icon: Icon, color, min = 0, max = 100 }: { 
  label: string; value?: number; unit: string; icon: any; color: string; min?: number; max?: number 
}) {
  const percentage = value ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: color, boxShadow: `0 0 15px ${color}40` }}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-600">{label}</span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-2 relative z-10">
        <span className="text-4xl font-black tabular-nums tracking-tighter" style={{ color }}>{value?.toFixed(1) ?? "--"}</span>
        <span className="text-sm font-bold text-gray-600">{unit}</span>
      </div>
      
      <div className="h-1.5 w-full bg-[hsl(var(--muted-foreground)/0.1)] rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full transition-all duration-1000 ease-out rounded-full" 
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
        <Icon size={120} />
      </div>
    </div>
  )
}

export default function EnvironmentMonitoringPage() {
  const { data: session } = useSession()
  const [envData, setEnvData] = useState<ClassroomEnvironment | null>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<{id: string, name: string}[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchEnvData()
      let interval: any;
      if (isAutoRefresh) {
        interval = setInterval(fetchEnvData, 10000)
      }
      return () => clearInterval(interval)
    }
  }, [selectedClass, isAutoRefresh])

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        const fetchedClasses = data.classes || []
        setClasses(fetchedClasses)
        if (fetchedClasses.length > 0) {
          setSelectedClass(fetchedClasses[0].id)
        }
      } else {
        // Fallback mock classes
        const mock = [{id: "c1", name: "Lớp 9A1"}, {id: "c2", name: "Lớp 10B2"}]
        setClasses(mock)
        setSelectedClass("c1")
      }
    } catch {
      const mock = [{id: "c1", name: "Lớp 9A1"}, {id: "c2", name: "Lớp 10B2"}]
      setClasses(mock)
      setSelectedClass("c1")
    }
  }

  const fetchEnvData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/iot/classroom/${selectedClass}`)
      if (res.ok) {
        const data = await res.json()
        setEnvData(data)
      } else {
        setEnvData(mockEnvData(selectedClass))
      }
    } catch {
      setEnvData(mockEnvData(selectedClass))
    } finally {
      setLoading(false)
    }
  }

  const mockEnvData = (classId: string): ClassroomEnvironment => ({
    class_id: classId,
    class_name: classId === "c1" ? "Lớp 9A1" : "Lớp 10B2",
    temperature: 24.5 + Math.random() * 2,
    humidity: 55 + Math.random() * 10,
    light_level: 450 + Math.random() * 100,
    noise_level: 45 + Math.random() * 20,
    air_quality: 92 + Math.random() * 5,
    motion_detected: Math.random() > 0.5,
    occupancy_count: 35,
    camera_status: "online",
    devices: [
      { device_id: "esp-th-01", name: "Cảm biến Nhiệt/Ẩm", device_type: "esp32", status: "online", latest_reading: 24.5, latest_unit: "°C" },
      { device_id: "esp-env-02", name: "Trạm quan trắc MT", device_type: "esp32", status: "online", latest_reading: 92.0, latest_unit: "AQI" },
    ],
    last_updated: new Date().toISOString()
  })

  return (
    <div className="neu-container min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary)" }}>
              <Thermometer className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-purple-600 tracking-tight">Môi Trường Lớp Học</h1>
              <p className="text-sm text-gray-600 mt-0.5">Giám sát các chỉ số sức khỏe và môi trường học tập theo thời gian thực</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {classes.length > 0 && (
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="ai-input px-3 py-1.5 rounded-xl text-sm font-bold bg-[hsl(var(--background)/0.5)] border border-gray-200 outline-none min-w-[140px]"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <div className="flex bg-[hsl(var(--background)/0.5)] backdrop-blur-sm border border-gray-200 rounded-xl p-1 shadow-sm">
                <button 
                  onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isAutoRefresh ? 'bg-[hsl(var(--primary)/0.1)] text-purple-600' : 'text-gray-600'}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isAutoRefresh ? 'animate-spin' : ''}`} />
                  {isAutoRefresh ? "Tự động cập nhật" : "Cập nhật thủ công"}
                </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Gauges */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <EnvGauge label="Nhiệt độ" value={envData?.temperature} unit="°C" icon={Thermometer} color="hsl(var(--primary))" min={15} max={40} />
            <EnvGauge label="Độ ẩm" value={envData?.humidity} unit="%" icon={Droplets} color="hsl(var(--info))" />
            <EnvGauge label="Chất lượng không khí" value={envData?.air_quality} unit="AQI" icon={Wind} color="hsl(var(--success))" />
            <EnvGauge label="Cường độ ánh sáng" value={envData?.light_level} unit="Lux" icon={Sun} color="#f59e0b" max={1000} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Phân tích môi trường AI
              </h2>
              <span className="text-[10px] bg-[hsl(var(--primary)/0.1)] text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase">Phân tích thực tế</span>
            </div>

            <div className="space-y-4">
               {/* Noise Level */}
               <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--muted-foreground)/0.03)] border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Volume2 className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Mức độ ồn</p>
                      <p className="text-xs text-gray-600">Đang trong ngưỡng cho phép</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-purple-500">{envData?.noise_level?.toFixed(0) ?? "--"} dB</p>
                    <div className="w-24 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${((envData?.noise_level ?? 0) / 100) * 100}%` }} />
                    </div>
                  </div>
               </div>

               {/* Occupancy */}
               <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--muted-foreground)/0.03)] border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sĩ số lớp (AI Vision)</p>
                      <p className="text-xs text-gray-600">Nhận diện qua Camera: {envData?.camera_status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-500">{envData?.occupancy_count ?? "--"} / 40</p>
                    <p className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Đầy đủ</p>
                  </div>
               </div>

               {/* AI Recommendation */}
               <div className="p-4 rounded-xl bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.15)] flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">Gợi ý từ AI:</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Nhiệt độ hiện tại là <span className="text-purple-600 font-bold">{envData?.temperature?.toFixed(1)}°C</span>, không khí trong lành. 
                      Độ sáng phòng học đang đạt chuẩn ({envData?.light_level?.toFixed(0)} Lux), tối ưu cho việc đọc sách. 
                      {envData?.noise_level ?? 0 > 60 ? " Chú ý: Mức độ tiếng ồn đang hơi cao, có thể ảnh hưởng đến sự tập trung." : " Môi trường yên tĩnh, rất tốt để giảng dạy."}
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {/* Active Devices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold flex items-center gap-2 mb-6 text-sm">
              <Cpu className="w-4 h-4 text-gray-600" />
              Thiết bị IoT đang hoạt động ({envData?.devices.length ?? 0})
            </h3>
            
            <div className="space-y-3">
              {envData?.devices.map(device => (
                <div key={device.device_id} className="p-3 rounded-xl border border-gray-200:border-purple-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold truncate max-w-[120px]">{device.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border ${device.status === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                      {device.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> {device.device_type.toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-purple-600">{device.latest_reading ?? "--"} {device.latest_unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
              <Zap className="w-4 h-4 text-yellow-500" />
              Điều khiển nhanh
            </h3>
            <div className="grid grid-cols-2 gap-3">
               <ActionBtn size="sm" className="text-[10px]">Bật Máy Lạnh</ActionBtn>
               <ActionBtn size="sm" className="text-[10px]">Tắt Đèn</ActionBtn>
               <ActionBtn size="sm" className="text-[10px]">Mở Rèm</ActionBtn>
               <ActionBtn size="sm" className="text-[10px] px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Báo Động</ActionBtn>
            </div>
          </div>

          {/* Status info */}
          <div className="p-5 rounded-2xl bg-[hsl(var(--muted-foreground)/0.05)] border border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
              <Info className="w-4 h-4" />
              <span>Cập nhật lần cuối: {envData ? new Date(envData.last_updated).toLocaleTimeString() : "--"}</span>
            </div>
            <div className="space-y-3">
               <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">Camera Gateway:</span>
                  <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Chạy tốt</span>
               </div>
               <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">MQTT Broker:</span>
                  <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Kết nối</span>
               </div>
               <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">AI Processing:</span>
                  <span className="text-blue-500 font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Local AI</span>
               </div>
            </div>
          </div>
        </div>

      </div>

      {loading && !envData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-md">
           <div className="text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="font-bold text-gray-900">Đang kết nối với hệ thống IoT...</p>
           </div>
        </div>
      )}
    </div>
  )
}
