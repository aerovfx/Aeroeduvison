/**
 * CameraConfigModal — modal admin nhập cấu hình camera ONVIF-compliant
 *
 * Tương tự cách CMS/VMS chuyên dụng (Hikvision iVMS, Dahua DSS, Nx Witness,
 * Milestone XProtect) tổ chức form: 4 tab nhóm logic
 *   1. ⚙ Cơ bản    — Tên, brand, model, IP, ports
 *   2. 🔐 Xác thực  — Username, password, ONVIF profile token
 *   3. 📡 Stream   — RTSP main/sub URL override, HLS, snapshot
 *   4. 📍 Vị trí   — Location, classId, room, capabilities
 *
 * Brand presets: Hikvision/Dahua/Axis/Uniview tự suggest port + ONVIF path.
 * Test button: gọi /api/admin/cameras/:id/test → TCP probe → toast.
 */
import { useState, useEffect } from 'react'
import { X, Loader2, TestTube2, CheckCircle, AlertCircle, Network, Lock, Tv, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cameraService, type CameraAdmin, type CameraCreatePayload } from '@/services/camera.service'

const BRANDS = [
  { id: 'Hikvision', label: 'Hikvision' },
  { id: 'Dahua',     label: 'Dahua' },
  { id: 'Axis',      label: 'Axis' },
  { id: 'Uniview',   label: 'Uniview' },
  { id: 'Bosch',     label: 'Bosch' },
  { id: 'Vivotek',   label: 'Vivotek' },
  { id: 'Generic',   label: 'Generic ONVIF' },
]

const LOCATION_TYPES = [
  { id: 'classroom', label: '🏫 Phòng học' },
  { id: 'lab',       label: '🧪 Phòng lab' },
  { id: 'hallway',   label: '🚶 Hành lang' },
  { id: 'gate',      label: '🚪 Cổng trường' },
  { id: 'parking',   label: '🅿️ Bãi xe' },
  { id: 'office',    label: '💼 Văn phòng' },
  { id: 'cafeteria', label: '🍱 Căng-tin' },
  { id: 'gym',       label: '⚽ Sân thể dục' },
]

interface Props {
  open: boolean
  onClose: () => void
  /** null = create mới; CameraAdmin = edit */
  camera: CameraAdmin | null
  onSaved: (cam: CameraAdmin) => void
}

export default function CameraConfigModal({ open, onClose, camera, onSaved }: Props) {
  const [tab, setTab] = useState<'basic' | 'auth' | 'stream' | 'location'>('basic')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [form, setForm] = useState<CameraCreatePayload>({
    name: '', ipAddress: '', brand: 'Hikvision',
    httpPort: 80, rtspPort: 554, onvifPort: 80,
    enabled: true, hasPTZ: false, hasAudio: false, hasMotion: false,
  })

  useEffect(() => {
    if (camera) {
      setForm({
        name: camera.name, ipAddress: camera.ipAddress,
        brand: camera.brand, model: camera.model,
        serialNumber: camera.serialNumber,
        httpPort: camera.httpPort, rtspPort: camera.rtspPort, onvifPort: camera.onvifPort,
        username: camera.username, password: '',  // không pre-fill — chỉ update khi gõ mới
        mainProfile: camera.mainProfile, subProfile: camera.subProfile,
        rtspMainUrl: camera.rtspMainUrl, rtspSubUrl: camera.rtspSubUrl,
        hlsUrl: camera.hlsUrl ?? undefined, snapshotUrl: camera.snapshotUrl ?? undefined,
        location: camera.location, locationType: camera.locationType,
        classId: camera.classId ?? undefined, roomNumber: camera.roomNumber,
        enabled: camera.enabled, hasPTZ: camera.hasPTZ, hasAudio: camera.hasAudio,
        hasMotion: camera.hasMotion,
      })
    } else {
      setForm({
        name: '', ipAddress: '', brand: 'Hikvision',
        httpPort: 80, rtspPort: 554, onvifPort: 80,
        enabled: true, hasPTZ: false, hasAudio: false, hasMotion: false,
      })
    }
    setTab('basic')
    setTestResult(null)
  }, [camera, open])

  function update<K extends keyof CameraCreatePayload>(k: K, v: CameraCreatePayload[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSave() {
    if (!form.name?.trim() || !form.ipAddress?.trim()) {
      toast.error('Bắt buộc: Tên + IP address')
      setTab('basic')
      return
    }
    setSaving(true)
    try {
      const result = camera
        ? await cameraService.admin.update(camera.id, form)
        : await cameraService.admin.create(form)
      toast.success(camera ? 'Đã cập nhật camera' : 'Đã thêm camera')
      onSaved(result)
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || 'Lỗi lưu camera')
    } finally { setSaving(false) }
  }

  async function handleTest() {
    if (!camera) {
      toast.error('Lưu camera trước để test connection')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const r = await cameraService.admin.test(camera.id)
      setTestResult({ ok: r.ok, msg: r.message })
      if (r.ok) toast.success(`Camera online: ${r.message}`)
      else toast.error(`Camera offline: ${r.message}`)
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || 'Lỗi test' })
      toast.error('Lỗi test connection')
    } finally { setTesting(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl"
           style={{ background: '#0f1016', border: '1px solid rgba(255,255,255,0.12)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">
              {camera ? '⚙ Cấu hình Camera' : '➕ Thêm Camera mới (ONVIF)'}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              {camera ? `${camera.name} — ${camera.ipAddress}` : 'Nhập theo chuẩn ONVIF (Hikvision/Dahua/Axis/Uniview)'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {[
            { id: 'basic',    label: 'Cơ bản',    icon: Network },
            { id: 'auth',     label: 'Xác thực',  icon: Lock },
            { id: 'stream',   label: 'Stream',    icon: Tv },
            { id: 'location', label: 'Vị trí',    icon: MapPin },
          ].map(t => {
            const Ic = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-violet-600/20 text-violet-300 border-b-2 border-violet-500'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}>
                <Ic className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'basic' && (
            <>
              <Field label="Tên camera *" hint="Ví dụ: Camera Lớp 9A1, Cổng chính, Hành lang T2">
                <input type="text" value={form.name || ''} onChange={e => update('name', e.target.value)}
                  placeholder="Camera Lớp 9A1"
                  className="w-full px-3 py-2 rounded-lg text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hãng (Brand)">
                  <select value={form.brand || 'Hikvision'} onChange={e => update('brand', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm">
                    {BRANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </Field>
                <Field label="Model" hint="DS-2CD2143G0-I, IPC-HFW1230S, ...">
                  <input type="text" value={form.model || ''} onChange={e => update('model', e.target.value)}
                    placeholder="DS-2CD2143G0-I"
                    className="w-full px-3 py-2 rounded-lg text-sm" />
                </Field>
              </div>
              <Field label="Địa chỉ IP *" hint="IP camera trong mạng LAN trường (xem qua SADP / Dahua ConfigTool)">
                <input type="text" value={form.ipAddress || ''} onChange={e => update('ipAddress', e.target.value)}
                  placeholder="192.168.1.64"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="HTTP Port" hint="Port web (default: 80)">
                  <input type="number" value={form.httpPort || 80} onChange={e => update('httpPort', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
                </Field>
                <Field label="RTSP Port" hint="Port stream video (default: 554)">
                  <input type="number" value={form.rtspPort || 554} onChange={e => update('rtspPort', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
                </Field>
                <Field label="ONVIF Port" hint="Port ONVIF service (default: 80)">
                  <input type="number" value={form.onvifPort || 80} onChange={e => update('onvifPort', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
                </Field>
              </div>
              <Field label="Serial Number (tuỳ chọn)" hint="Hiển thị trên thân camera, thường để xác nhận quyền admin">
                <input type="text" value={form.serialNumber || ''} onChange={e => update('serialNumber', e.target.value)}
                  placeholder="DS-2CD2143G0-I20210301AAW..."
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
            </>
          )}

          {tab === 'auth' && (
            <>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                🔐 <b>Bảo mật:</b> Password được lưu obfuscated trên server, KHÔNG bao giờ trả về raw qua API.
                Khi edit: để trống ô password = giữ nguyên password hiện tại; nhập mới = thay thế.
              </div>
              <Field label="Username ONVIF" hint="Tài khoản admin/operator của camera (mặc định Hikvision: admin)">
                <input type="text" value={form.username || ''} onChange={e => update('username', e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <Field label="Password" hint={camera ? '(Để trống nếu không đổi password)' : 'Password ONVIF user'}>
                <input type="password" value={form.password || ''} onChange={e => update('password', e.target.value)}
                  placeholder={camera ? '(giữ nguyên)' : '••••••••'}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Main Profile Token" hint="ONVIF profile cho stream chính (Hikvision: 101, Dahua: subtype=0)">
                  <input type="text" value={form.mainProfile || ''} onChange={e => update('mainProfile', e.target.value)}
                    placeholder="Profile_1 / 101"
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
                </Field>
                <Field label="Sub Profile Token" hint="ONVIF profile cho stream phụ (Hikvision: 102, Dahua: subtype=1)">
                  <input type="text" value={form.subProfile || ''} onChange={e => update('subProfile', e.target.value)}
                    placeholder="Profile_2 / 102"
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
                </Field>
              </div>
            </>
          )}

          {tab === 'stream' && (
            <>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-xs text-cyan-200">
                📡 <b>RTSP URL tự động:</b> Để trống ô bên dưới → server tự build URL theo brand đã chọn ở tab Cơ bản.
                Override chỉ khi camera có path đặc biệt không match preset.
              </div>
              <Field label="RTSP Main URL (override)" hint="Để trống → auto build theo brand">
                <input type="text" value={form.rtspMainUrl || ''} onChange={e => update('rtspMainUrl', e.target.value)}
                  placeholder="rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <Field label="RTSP Sub URL (override)" hint="Stream phụ, độ phân giải thấp hơn cho mobile/grid view">
                <input type="text" value={form.rtspSubUrl || ''} onChange={e => update('rtspSubUrl', e.target.value)}
                  placeholder="rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/102"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <Field label="HLS Proxy URL (tuỳ chọn)" hint="Nếu có proxy HLS (vd: ffmpeg restream → /hls/cam-1.m3u8)">
                <input type="text" value={form.hlsUrl || ''} onChange={e => update('hlsUrl', e.target.value)}
                  placeholder="https://stream.school.edu/hls/cam-1.m3u8"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <Field label="Snapshot URL (HTTP JPEG)" hint="ONVIF GetSnapshotUri kết quả — preview ảnh tĩnh">
                <input type="text" value={form.snapshotUrl || ''} onChange={e => update('snapshotUrl', e.target.value)}
                  placeholder="http://admin:pass@192.168.1.64/ISAPI/Streaming/channels/101/picture"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
            </>
          )}

          {tab === 'location' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Loại vị trí">
                  <select value={form.locationType || ''} onChange={e => update('locationType', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm">
                    <option value="">-- Chọn --</option>
                    {LOCATION_TYPES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </Field>
                <Field label="Số phòng">
                  <input type="text" value={form.roomNumber || ''} onChange={e => update('roomNumber', e.target.value)}
                    placeholder="201, P. Lab 3, ..."
                    className="w-full px-3 py-2 rounded-lg text-sm" />
                </Field>
              </div>
              <Field label="Vị trí cụ thể" hint="Mô tả ngắn cho teacher dễ nhận biết">
                <input type="text" value={form.location || ''} onChange={e => update('location', e.target.value)}
                  placeholder="Hành lang Tòa A tầng 2, gần cầu thang"
                  className="w-full px-3 py-2 rounded-lg text-sm" />
              </Field>
              <Field label="Class ID (tuỳ chọn)" hint="Nếu camera gắn với 1 lớp cụ thể, paste ID lớp ở đây">
                <input type="text" value={form.classId || ''} onChange={e => update('classId', e.target.value)}
                  placeholder="abc123-def456-..."
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" />
              </Field>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <ToggleField label="Bật camera (enabled)" hint="Tắt = teacher không thấy" checked={!!form.enabled} onChange={v => update('enabled', v)} />
                <ToggleField label="Có PTZ"     hint="Pan/Tilt/Zoom" checked={!!form.hasPTZ} onChange={v => update('hasPTZ', v)} />
                <ToggleField label="Có Audio"   hint="Loa + microphone" checked={!!form.hasAudio} onChange={v => update('hasAudio', v)} />
                <ToggleField label="Phát hiện chuyển động" hint="Motion detection event" checked={!!form.hasMotion} onChange={v => update('hasMotion', v)} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-black/40" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {/* Test result */}
          {testResult ? (
            <div className={`flex items-center gap-2 text-xs ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="truncate max-w-[300px]">{testResult.msg}</span>
            </div>
          ) : <div />}
          <div className="flex items-center gap-2">
            {camera && (
              <button onClick={handleTest} disabled={testing}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 disabled:opacity-50 inline-flex items-center gap-1.5">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                Test kết nối
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-white/70">
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {camera ? 'Cập nhật' : 'Tạo camera'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/80 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
    </div>
  )
}

function ToggleField({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-violet-600" />
      <div>
        <div className="text-xs font-medium text-white/80">{label}</div>
        {hint && <div className="text-[11px] text-white/40">{hint}</div>}
      </div>
    </label>
  )
}
