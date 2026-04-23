import React, { useState, useEffect } from 'react';
import {
  Cpu, Plus, Search, Filter, RefreshCw,
  Settings, Trash2, MapPin, Activity,
  AlertCircle, ArrowUpRight, Database,
  Edit3, Send,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface IoTDevice {
  id: string;
  device_id: string;
  name: string;
  device_type: string;
  firmware_version?: string;
  location: string;
  class_id?: string;
  status: 'online' | 'offline';
  last_seen?: string;
  capabilities: string[];
}

/* ─── Mock data ──────────────────────────────────────────── */
const MOCK_DEVICES: IoTDevice[] = [
  {
    id: '1', device_id: 'esp32-9a1-env', name: 'Cảm biến 9A1',
    device_type: 'ESP32', location: 'Phòng 302', class_id: '9A1',
    status: 'online', last_seen: new Date().toISOString(),
    capabilities: ['temp', 'hum', 'air'],
  },
  {
    id: '2', device_id: 'rpi-gate-01', name: 'Gateway Cổng',
    device_type: 'Raspberry Pi', location: 'Cổng chính',
    status: 'online', last_seen: new Date().toISOString(),
    capabilities: ['video', 'rfid'],
  },
  {
    id: '3', device_id: 'esp32-lab-01', name: 'Cảm biến Lab',
    device_type: 'ESP32', location: 'Phòng Lab Lý', class_id: 'LAB-PHY',
    status: 'offline', last_seen: new Date(Date.now() - 3_600_000).toISOString(),
    capabilities: ['light', 'motion'],
  },
  {
    id: '4', device_id: 'arduino-lib-01', name: 'Thư viện Info',
    device_type: 'Arduino', location: 'Thư viện',
    status: 'online', last_seen: new Date().toISOString(),
    capabilities: ['noise'],
  },
];

/* ─── Primitive components ───────────────────────────────── */
function ActionBtn({
  children, onClick, variant = 'default', size = 'default', disabled = false, className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  disabled?: boolean;
  className?: string;
}) {
  const sizeClass =
    size === 'sm'   ? 'px-3 py-1.5 text-xs' :
    size === 'icon' ? 'p-2' :
    'px-4 py-2.5 text-sm';

  const base = 'rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyle: React.CSSProperties =
    variant === 'primary' ? { background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' } : {};

  const variantClass =
    variant === 'primary' ? 'text-white border-none hover:opacity-90' :
    variant === 'danger'  ? 'bg-red-600/80 text-white border-none hover:bg-red-600' :
    variant === 'success' ? 'bg-green-600/80 text-white border-none hover:bg-green-600' :
    variant === 'outline' ? 'bg-transparent border border-white/[0.1] hover:bg-white/[0.05] text-white/70 hover:text-white' :
    'bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={variantStyle}
      className={`${base} ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value, icon: Icon, color, trend }: {
  label: string; value: string | number;
  icon: React.ElementType; color: string; trend?: string;
}) {
  return (
    <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-5 group hover:border-purple-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div
          className="p-2.5 rounded-xl text-white group-hover:scale-110 transition-transform"
          style={{ background: color, boxShadow: `0 0 15px ${color}40` }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ArrowUpRight className="w-2.5 h-2.5" /> {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1">{label}</p>
        <p className="text-2xl font-black tracking-tight text-white/90">{value}</p>
      </div>
    </div>
  );
}

/* ─── Capability badge ───────────────────────────────────── */
const CAP_COLOR: Record<string, string> = {
  temp:   'bg-orange-500/10 text-orange-400',
  hum:    'bg-cyan-500/10   text-cyan-400',
  air:    'bg-sky-500/10    text-sky-400',
  video:  'bg-purple-500/10 text-purple-400',
  rfid:   'bg-yellow-500/10 text-yellow-400',
  light:  'bg-amber-500/10  text-amber-400',
  motion: 'bg-rose-500/10   text-rose-400',
  noise:  'bg-pink-500/10   text-pink-400',
};

function CapBadge({ cap }: { cap: string }) {
  const cls = CAP_COLOR[cap] ?? 'bg-white/10 text-white/50';
  return (
    <span className={`text-[9px] ${cls} px-1.5 py-0.5 rounded-md font-bold uppercase`}>
      {cap}
    </span>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function IoTManagement() {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDevices = () => {
    setLoading(true);
    setTimeout(() => {
      setDevices(MOCK_DEVICES);
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.device_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount  = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-purple-600/[0.03] rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-blue-600/[0.03] rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
              <Cpu className="w-5 h-5" />
            </div>
            <h1
              className="text-2xl md:text-3xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              IoT Gateway Hub
            </h1>
          </div>
          <p className="text-sm text-white/50">Quản lý mạng lưới thiết bị ngoại vi và cảm biến toàn trường</p>
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

      {/* ── Stat boxes ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatBox label="Tổng thiết bị"   value={devices.length} icon={Cpu}          color="#667eea" />
        <StatBox label="Đang kết nối"    value={onlineCount}    icon={Activity}     color="#22c55e" trend="+2 mới" />
        <StatBox label="Telemetry / Giờ" value="12.4K"          icon={Database}     color="#0ea5e9" trend="+15%" />
        <StatBox label="Sự cố IoT"       value={offlineCount}   icon={AlertCircle}  color="#ef4444" />
      </div>

      {/* ── Search & Filter bar ────────────────────────────── */}
      <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Tìm theo ID hoặc tên thiết bị..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ActionBtn variant="outline" size="sm"><Filter className="w-3.5 h-3.5" /> Lọc</ActionBtn>
          <ActionBtn variant="outline" size="sm"><Settings className="w-3.5 h-3.5" /> MQTT Config</ActionBtn>
        </div>
      </div>

      {/* ── Device table ──────────────────────────────────── */}
      <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                {['Thiết bị / ID', 'Loại / Firmware', 'Vị trí / Lớp', 'Khả năng', 'Trạng thái', 'Hành động'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-white/30">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <p className="text-sm">Đang tải danh sách thiết bị...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-sm text-white/30">
                    Không tìm thấy thiết bị nào
                  </td>
                </tr>
              ) : (
                filteredDevices.map(device => (
                  <tr key={device.id} className="hover:bg-white/[0.02] transition-colors group">

                    {/* Device / ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${device.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[150px] text-white/90">{device.name}</p>
                          <p className="text-[10px] text-white/40 font-mono">{device.device_id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Type / Firmware */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-white/80">{device.device_type}</p>
                      <p className="text-[10px] text-white/40">v2.1.0-stable</p>
                    </td>

                    {/* Location / Class */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs font-bold text-white/80">
                        <MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        {device.location}
                      </div>
                      {device.class_id && (
                        <p className="text-[10px] text-white/40 mt-0.5">Lớp: {device.class_id}</p>
                      )}
                    </td>

                    {/* Capabilities */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {device.capabilities.map(cap => (
                          <CapBadge key={cap} cap={cap} />
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]' : 'bg-white/20'}`} />
                        <span className={`text-xs font-bold ${device.status === 'online' ? 'text-green-400' : 'text-white/30'}`}>
                          {device.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {device.status === 'online' ? 'Vừa xong' : '1 giờ trước'}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ActionBtn size="icon" variant="outline"><Edit3 className="w-3.5 h-3.5" /></ActionBtn>
                        <ActionBtn size="icon" variant="outline"><Send className="w-3.5 h-3.5" /></ActionBtn>
                        <ActionBtn size="icon" variant="outline" className="hover:!text-red-400 hover:!border-red-500/30">
                          <Trash2 className="w-3.5 h-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && filteredDevices.length > 0 && (
          <div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/30">
            <span>Hiển thị {filteredDevices.length} / {devices.length} thiết bị</span>
            <span>{onlineCount} online · {offlineCount} offline</span>
          </div>
        )}
      </div>
    </div>
  );
}
