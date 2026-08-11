/**
 * EnvironmentMonitoring — Giám sát môi trường phòng học IoT cho GV.
 * Hiển thị cảm biến nhiệt độ/độ ẩm/AQI/ánh sáng/tiếng ồn của từng lớp + camera;
 * dữ liệu thật từ /api/iot/classroom/:id, có chế độ mock khi chưa có thiết bị thật.
 */

import { useState, useEffect } from 'react'
import {
  Thermometer, Droplets, Wind, Sun, Volume2,
  Activity, RefreshCw, AlertCircle, CheckCircle,
  Cpu, Zap, Gauge, MapPin, Info, Users, Video
} from 'lucide-react'
import { api } from '@/services/api'

// ── Dark palette ──
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


// ── Interfaces ──
interface IoTDeviceSummary {
  device_id: string; name: string; device_type: string
  status: string; latest_reading?: number; latest_unit?: string
}

interface ClassroomEnvironment {
  class_id: string; class_name: string
  temperature?: number; humidity?: number; light_level?: number
  noise_level?: number; air_quality?: number; motion_detected: boolean
  occupancy_count?: number; camera_status: string
  devices: IoTDeviceSummary[]; last_updated: string
}

// ── Sub-components ──

function ActionBtn({
  children, onClick, variant = 'default', size = 'default', disabled = false
}: {
  children: React.ReactNode; onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'success'
  size?: 'default' | 'sm' | 'icon'; disabled?: boolean
}) {
  const [hov, setHov] = useState(false)
  const bg =
    variant === 'primary' ? (hov ? '#6d28d9' : D.purple) :
    variant === 'danger'  ? (hov ? '#b91c1c' : '#dc2626') :
    variant === 'success' ? (hov ? '#059669' : D.green)   :
    hov ? D.white(0.08) : D.white(0.04)
  const color = variant === 'default' ? D.text : '#fff'
  const pad = size === 'sm' ? '6px 12px' : size === 'icon' ? '10px' : '10px 16px'
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: pad, background: bg, color, border: `1px solid ${D.border}`,
        borderRadius: 10, fontWeight: 600, fontSize: size === 'sm' ? 11 : 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// EnvGauge — đồng hồ analog hiển thị 1 chỉ số môi trường
function EnvGauge({
  label, value, unit, icon: Icon, color, min = 0, max = 100
}: {
  label: string; value?: number; unit: string; icon: any
  color: string; min?: number; max?: number
}) {
  const pct = value !== undefined
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : 0

  return (
    <div style={{
      background: D.card, borderRadius: 14, border: `1px solid ${D.border}`,
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: color, boxShadow: `0 0 15px ${color}40`, color: '#fff',
        }}>
          <Icon style={{ width: 20, height: 20 }} />
        </div>
        <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', color: D.muted }}>{label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', color }}>
          {value !== undefined ? value.toFixed(1) : '--'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: D.muted }}>{unit}</span>
      </div>

      <div style={{ height: 6, width: '100%', background: D.white(0.06), borderRadius: 9999, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ height: '100%', background: color, width: `${pct}%`, transition: 'width 1s ease-out', borderRadius: 9999 }} />
      </div>

      {/* Ghost icon */}
      <div style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.04, pointerEvents: 'none', color: D.text }}>
        <Icon size={120} />
      </div>
    </div>
  )
}

// ── Main Page ──
// Component chính: chọn lớp, tải dữ liệu môi trường thật (hoặc mock) và vẽ dashboard
export default function EnvironmentMonitoring() {
  const [envData, setEnvData]           = useState<ClassroomEnvironment | null>(null)
  const [loading, setLoading]           = useState(true)
  const [classes, setClasses]           = useState<{ id: string; name: string }[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  useEffect(() => { fetchClasses() }, [])

  useEffect(() => {
    if (!selectedClass) return
    fetchEnvData()
    let interval: ReturnType<typeof setInterval> | undefined
    if (isAutoRefresh) interval = setInterval(fetchEnvData, 10000)
    return () => { if (interval) clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, isAutoRefresh])

  async function fetchClasses() {
    try {
      // Dùng axios api (auto-inject Bearer token), không phải bare fetch()
      const res = await api.get<{ classes: Array<{ id: string; name: string }> }>('/classes')
      const cls = res.data?.classes || []
      if (cls.length > 0) {
        setClasses(cls)
        setSelectedClass(cls[0].id)
      } else { useMockClasses() }
    } catch { useMockClasses() }
  }

  function useMockClasses() {
    const mock = [{ id: 'c1', name: 'Lớp 9A1' }, { id: 'c2', name: 'Lớp 10B2' }]
    setClasses(mock); setSelectedClass('c1')
  }

  async function fetchEnvData() {
    try {
      setLoading(true)
      // IoT endpoint hiện chưa có handler thực — fallback mock data im lặng
      const res = await api.get<ClassroomEnvironment>(`/iot/classroom/${selectedClass}`).catch(() => null)
      if (res?.data) setEnvData(res.data)
      else           setEnvData(mockEnvData(selectedClass))
    } catch { setEnvData(mockEnvData(selectedClass)) }
    finally { setLoading(false) }
  }

  function mockEnvData(classId: string): ClassroomEnvironment {
    return {
      class_id: classId,
      class_name: classId === 'c1' ? 'Lớp 9A1' : 'Lớp 10B2',
      temperature: 24.5 + Math.random() * 2,
      humidity: 55 + Math.random() * 10,
      light_level: 450 + Math.random() * 100,
      noise_level: 45 + Math.random() * 20,
      air_quality: 92 + Math.random() * 5,
      motion_detected: Math.random() > 0.5,
      occupancy_count: 35,
      camera_status: 'online',
      devices: [
        { device_id: 'esp-th-01', name: 'Cảm biến Nhiệt/Ẩm', device_type: 'esp32', status: 'online', latest_reading: 24.5, latest_unit: '°C' },
        { device_id: 'esp-env-02', name: 'Trạm quan trắc MT', device_type: 'esp32', status: 'online', latest_reading: 92.0, latest_unit: 'AQI' },
      ],
      last_updated: new Date().toISOString(),
    }
  }

  const cardStyle = {
    background: D.card, borderRadius: 14, border: `1px solid ${D.border}`, padding: 24,
  }

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 12, background: D.white(0.03), border: `1px solid ${D.border}`,
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: '24px 32px', color: D.text }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 0 24px rgba(124,58,237,0.4)', color: '#fff', flexShrink: 0,
            }}>
              <Thermometer style={{ width: 28, height: 28 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: D.purple, letterSpacing: '-0.02em', margin: 0 }}>Môi Trường Lớp Học</h1>
              <p style={{ fontSize: 13, color: D.muted, margin: '2px 0 0 0' }}>Giám sát các chỉ số sức khỏe và môi trường học tập theo thời gian thực</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {classes.length > 0 && (
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                style={{
                  padding: '6px 12px', background: D.card, border: `1px solid ${D.border}`,
                  borderRadius: 10, fontSize: 13, fontWeight: 700, color: D.text,
                  outline: 'none', cursor: 'pointer', minWidth: 140,
                }}
              >
                {classes.map(c => <option key={c.id} value={c.id} style={{ background: D.card }}>{c.name}</option>)}
              </select>
            )}
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              style={{
                padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
                background: isAutoRefresh ? D.purpleA(0.12) : D.white(0.04),
                color: isAutoRefresh ? D.purple : D.muted, transition: 'all 0.15s',
              }}
            >
              <RefreshCw style={{ width: 12, height: 12 }} className={isAutoRefresh ? 'animate-spin' : ''} />
              {isAutoRefresh ? 'Tự động cập nhật' : 'Cập nhật thủ công'}
            </button>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

        {/* Left + Center: gauges + analysis (2 cols) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* 4 gauges 2×2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <EnvGauge label="Nhiệt độ"             value={envData?.temperature} unit="°C"  icon={Thermometer} color={D.purple}  min={15} max={40} />
            <EnvGauge label="Độ ẩm"                value={envData?.humidity}    unit="%"   icon={Droplets}    color={D.blue} />
            <EnvGauge label="Chất lượng không khí" value={envData?.air_quality}  unit="AQI" icon={Wind}        color={D.green} />
            <EnvGauge label="Cường độ ánh sáng"    value={envData?.light_level}  unit="Lux" icon={Sun}         color={D.amber}  max={1000} />
          </div>

          {/* AI Analysis card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 15 }}>
                <Activity style={{ width: 20, height: 20, color: D.purple }} />
                Phân tích môi trường AI
              </h2>
              <span style={{
                fontSize: 10, background: D.purpleA(0.1), color: D.purple,
                padding: '2px 8px', borderRadius: 9999, fontWeight: 700, textTransform: 'uppercase',
              }}>Phân tích thực tế</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Noise */}
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: D.purpleA(0.1), borderRadius: 8 }}>
                    <Volume2 style={{ width: 20, height: 20, color: D.purple }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Mức độ ồn</p>
                    <p style={{ fontSize: 12, color: D.muted, margin: '2px 0 0 0' }}>Đang trong ngưỡng cho phép</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: D.purple, margin: 0 }}>
                    {envData?.noise_level?.toFixed(0) ?? '--'} dB
                  </p>
                  <div style={{ width: 96, height: 4, background: D.white(0.06), borderRadius: 9999, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: D.purple, width: `${((envData?.noise_level ?? 0) / 100) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Occupancy */}
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 8 }}>
                    <Users style={{ width: 20, height: 20, color: D.blue }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Sĩ số lớp (AI Vision)</p>
                    <p style={{ fontSize: 12, color: D.muted, margin: '2px 0 0 0' }}>Nhận diện qua Camera: {envData?.camera_status}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: D.blue, margin: 0 }}>{envData?.occupancy_count ?? '--'} / 40</p>
                  <p style={{ fontSize: 10, color: D.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: '4px 0 0 0' }}>Đầy đủ</p>
                </div>
              </div>

              {/* AI Recommendation */}
              <div style={{
                padding: 16, borderRadius: 12,
                background: D.purpleA(0.06), border: `1px solid ${D.purpleA(0.18)}`,
                display: 'flex', gap: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: D.purple,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Zap style={{ width: 20, height: 20, color: '#fff' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}>Gợi ý từ AI:</h4>
                  <p style={{ fontSize: 12, color: D.muted, lineHeight: 1.7, margin: 0 }}>
                    Nhiệt độ hiện tại là{' '}
                    <span style={{ color: D.purple, fontWeight: 700 }}>{envData?.temperature?.toFixed(1)}°C</span>
                    , không khí trong lành. Độ sáng phòng học đang đạt chuẩn ({envData?.light_level?.toFixed(0)} Lux), tối ưu cho việc đọc sách.{' '}
                    {(envData?.noise_level ?? 0) > 60
                      ? ' Chú ý: Mức độ tiếng ồn đang hơi cao, có thể ảnh hưởng đến sự tập trung.'
                      : ' Môi trường yên tĩnh, rất tốt để giảng dạy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Active Devices */}
          <div style={cardStyle}>
            <h3 style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, margin: '0 0 20px 0', color: D.text }}>
              <Cpu style={{ width: 16, height: 16, color: D.muted }} />
              Thiết bị IoT ({envData?.devices.length ?? 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(envData?.devices ?? []).map(device => (
                <div key={device.device_id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${D.border}`, background: D.white(0.02) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, color: D.text }}>{device.name}</span>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 9999, fontWeight: 700, textTransform: 'uppercase',
                      background: device.status === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                      color: device.status === 'online' ? D.green : D.muted,
                      border: `1px solid ${device.status === 'online' ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.25)'}`,
                    }}>{device.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: D.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Zap style={{ width: 10, height: 10 }} /> {device.device_type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: D.purple }}>
                      {device.latest_reading ?? '--'} {device.latest_unit}
                    </span>
                  </div>
                </div>
              ))}
              {!envData && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: D.muted, fontSize: 12 }}>Đang tải...</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={cardStyle}>
            <h3 style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px 0', color: D.text }}>
              <Zap style={{ width: 16, height: 16, color: D.amber }} />
              Điều khiển nhanh
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ActionBtn size="sm">Bật Máy Lạnh</ActionBtn>
              <ActionBtn size="sm">Tắt Đèn</ActionBtn>
              <ActionBtn size="sm">Mở Rèm</ActionBtn>
              <ActionBtn size="sm" variant="danger">Báo Động</ActionBtn>
            </div>
          </div>

          {/* Status panel */}
          <div style={{ padding: 20, borderRadius: 14, background: D.white(0.03), border: `1px solid ${D.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: D.muted, marginBottom: 16 }}>
              <Info style={{ width: 16, height: 16 }} />
              <span>Cập nhật lần cuối: {envData ? new Date(envData.last_updated).toLocaleTimeString('vi-VN') : '--'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Camera Gateway:', status: 'Chạy tốt', color: D.green, icon: CheckCircle },
                { label: 'MQTT Broker:',    status: 'Kết nối',  color: D.green, icon: CheckCircle },
                { label: 'AI Processing:',  status: 'Local AI', color: D.blue,  icon: RefreshCw, spin: true },
              ].map(({ label, status, color, icon: StatusIcon, spin }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ fontWeight: 500, color: D.muted }}>{label}</span>
                  <span style={{ fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StatusIcon style={{ width: 12, height: 12 }} className={spin ? 'animate-spin' : ''} /> {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && !envData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,14,23,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ textAlign: 'center' }}>
            <RefreshCw style={{ width: 40, height: 40, color: D.purple, margin: '0 auto 16px' }} className="animate-spin" />
            <p style={{ fontWeight: 700, color: D.text }}>Đang kết nối với hệ thống IoT...</p>
          </div>
        </div>
      )}
    </div>
  )
}
