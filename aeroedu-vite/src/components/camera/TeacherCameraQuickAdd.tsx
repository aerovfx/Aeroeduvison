/**
 * TeacherCameraQuickAdd — Hero panel cho GV thêm camera với 2 mode rõ ràng:
 *
 *   🏫 Camera LỚP TÔI QUẢN LÝ — camera IP gắn trong phòng học/phòng lab,
 *      hỗ trợ điểm danh tự động, giám sát giờ học, ghi hình tiết dạy
 *
 *   🏠 Camera Ở NHÀ — webcam/IP camera tại nhà để livestream dạy online,
 *      ghi hình bài giảng, làm content YouTube
 *
 * Mỗi mode có guide chi tiết + ví dụ + click → mở CameraConfigModal với
 * locationType pre-filled.
 */
import { useState } from 'react'
import {
  School, Home, Plus, ChevronRight, Info, Camera, Wifi, Globe,
  CheckCircle2, BookOpen, Lightbulb,
} from 'lucide-react'

interface Props {
  cameraCount: number
  /** Callback khi user chọn mode để parent mở CameraConfigModal */
  onAdd: (preset: { locationType: string; locationHint: string; nameHint: string; mode: 'class' | 'home' }) => void
}

export default function TeacherCameraQuickAdd({ cameraCount, onAdd }: Props) {
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="mb-3 rounded-xl overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-900/30 via-purple-900/20 to-indigo-900/20 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06] bg-black/20 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-violet-500/25 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-violet-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Thêm camera mới</h3>
            <p className="text-[11px] text-white/55">
              Bạn đang quản lý <b className="text-violet-300">{cameraCount}</b> camera ·
              Chọn loại camera bên dưới
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(g => !g)}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-bold flex-shrink-0"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {guideOpen ? 'Ẩn hướng dẫn' : 'Xem hướng dẫn'}
        </button>
      </div>

      {/* Guide (collapsible) — hiển thị template/setup từng bước */}
      {guideOpen && (
        <div className="px-4 py-3 border-b border-white/[0.06] bg-amber-500/[0.04]">
          <div className="text-xs text-amber-100/90 space-y-2.5">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-200">3 bước thêm camera bất kỳ:</strong>
              </div>
            </div>
            <ol className="ml-6 space-y-1.5 list-decimal marker:text-amber-300/70">
              <li>
                <strong className="text-amber-200">Cắm camera + kết nối WiFi/LAN.</strong>
                {' '}Camera phải cùng mạng với máy GV.
                Hikvision/Dahua: dùng app SADP / Config Tool tìm IP.
                Webcam USB: cắm trực tiếp vào máy tính.
              </li>
              <li>
                <strong className="text-amber-200">Lấy thông tin kết nối:</strong>
                <ul className="ml-5 mt-1 space-y-0.5 list-disc marker:text-amber-400/60 text-[11px]">
                  <li>📍 <code className="text-amber-100">IP camera</code> (vd: <code>192.168.1.64</code>)</li>
                  <li>🔐 <code className="text-amber-100">Username / Password</code> (mặc định Hikvision: <code>admin</code>/<code>12345</code> → đổi ngay sau lần đầu)</li>
                  <li>🎬 <code className="text-amber-100">RTSP URL</code> nếu có (vd: <code>rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101</code>)</li>
                </ul>
              </li>
              <li>
                <strong className="text-amber-200">Bấm nút bên dưới chọn loại camera</strong> → điền form 4 tab (Cơ bản / Xác thực / Stream / Vị trí).
                Hệ thống tự động <strong>test kết nối</strong> trước khi lưu.
              </li>
            </ol>
            <div className="flex items-start gap-2 pt-1 border-t border-amber-500/20">
              <Info className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <p className="text-[11px]">
                <strong>Không biết IP camera?</strong> Tải app{' '}
                <a href="https://www.hikvision.com/en/support/tools/hitools/clea4c5d59340b8fa1/" target="_blank" rel="noreferrer" className="text-cyan-300 underline">SADP (Hikvision)</a>
                {' '}hoặc{' '}
                <a href="https://www.dahuasecurity.com/support/downloadCenter/tools" target="_blank" rel="noreferrer" className="text-cyan-300 underline">ConfigTool (Dahua)</a>
                {' '}— app sẽ tự dò mọi camera trong mạng LAN.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2 mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        {/* Card 1: Camera lớp học */}
        <button
          type="button"
          onClick={() => onAdd({
            mode: 'class',
            locationType: 'classroom',
            locationHint: 'Lớp 11A1 — phòng 305',
            nameHint: 'Camera Lớp 11A1',
          })}
          className="group text-left rounded-xl border border-violet-500/30 hover:border-violet-400/70 bg-violet-500/10 hover:bg-violet-500/15 transition-all p-4 flex flex-col gap-2.5 hover:scale-[1.02] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/30 group-hover:bg-violet-500/40 flex items-center justify-center transition-colors text-2xl">
              <School className="w-6 h-6 text-violet-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-violet-100">🏫 Camera lớp tôi quản lý</p>
              <p className="text-[11px] text-violet-300/70">Phòng học · Phòng lab · Hành lang</p>
            </div>
            <ChevronRight className="w-5 h-5 text-violet-300/40 group-hover:text-violet-300 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-[12px] text-white/65 leading-snug">
            Camera IP gắn cố định trong trường — phục vụ giảng dạy + giám sát + ghi hình tiết học.
          </p>
          {/* Features */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {[
              { icon: '👥', text: 'Điểm danh AI' },
              { icon: '📹', text: 'Ghi hình tiết' },
              { icon: '🎯', text: 'Theo dõi tập trung' },
              { icon: '🔔', text: 'Cảnh báo bất thường' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-1.5 text-[10.5px] text-violet-200/80">
                <span>{f.icon}</span><span>{f.text}</span>
              </div>
            ))}
          </div>
          {/* Example */}
          <div className="mt-1 pt-2 border-t border-violet-500/20 text-[10.5px] text-violet-300/70">
            <strong className="text-violet-200">Ví dụ:</strong> Hikvision DS-2CD2143 gắn trần lớp 11A1, IP 192.168.1.64
          </div>
        </button>

        {/* Card 2: Camera ở nhà */}
        <button
          type="button"
          onClick={() => onAdd({
            mode: 'home',
            locationType: 'office',
            locationHint: 'Phòng làm việc tại nhà',
            nameHint: 'Camera Nhà — Studio',
          })}
          className="group text-left rounded-xl border border-cyan-500/30 hover:border-cyan-400/70 bg-cyan-500/10 hover:bg-cyan-500/15 transition-all p-4 flex flex-col gap-2.5 hover:scale-[1.02] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/30 group-hover:bg-cyan-500/40 flex items-center justify-center transition-colors">
              <Home className="w-6 h-6 text-cyan-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-cyan-100">🏠 Camera ở nhà</p>
              <p className="text-[11px] text-cyan-300/70">Webcam · IP camera tại gia · Phone camera</p>
            </div>
            <ChevronRight className="w-5 h-5 text-cyan-300/40 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-[12px] text-white/65 leading-snug">
            Camera tại nhà để dạy online — livestream tiết học, ghi hình bài giảng, làm content YouTube.
          </p>
          {/* Features */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {[
              { icon: '🎥', text: 'Livestream lớp' },
              { icon: '🎬', text: 'Ghi bài giảng' },
              { icon: '📡', text: 'OBS / Stream key' },
              { icon: '🎙', text: 'Audio rõ ràng' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-1.5 text-[10.5px] text-cyan-200/80">
                <span>{f.icon}</span><span>{f.text}</span>
              </div>
            ))}
          </div>
          {/* Example */}
          <div className="mt-1 pt-2 border-t border-cyan-500/20 text-[10.5px] text-cyan-300/70">
            <strong className="text-cyan-200">Ví dụ:</strong> Logitech C920 USB hoặc Imou Cell Pro IP 192.168.1.100
          </div>
        </button>
      </div>

      {/* Brand showcase */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] bg-black/30">
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-white/45">
          <span className="text-white/55 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Hỗ trợ:
          </span>
          {['Hikvision', 'Dahua', 'Imou', 'Yoosee', 'Logitech', 'Axis', 'Uniview', 'Bosch', 'EZVIZ', 'Generic ONVIF'].map(b => (
            <span key={b} className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-white/65">
              {b}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-start gap-2 text-[10.5px] text-white/55">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Chuẩn kết nối: <strong className="text-white/75">RTSP</strong> (chính),
            {' '}<strong className="text-white/75">ONVIF</strong> (auto-discovery),
            {' '}<strong className="text-white/75">WebRTC</strong> (webcam browser).
            Tất cả truy cập cần cùng mạng LAN hoặc public IP/DDNS.
          </span>
        </div>
      </div>
    </div>
  )
}
