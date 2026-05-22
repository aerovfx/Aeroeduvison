/**
 * RtspUrlBuilder — modal helper sinh URL RTSP tự động theo brand camera
 *
 * Hỗ trợ 8 brand: Hikvision, Dahua, Imou, Ezviz, Vivotek, Yoosee, Generic ONVIF, Custom.
 * Mỗi brand có template URL riêng + bộ input phù hợp (có brand không cần user/pass,
 * có brand chỉ cần verification code, v.v.)
 *
 * Sử dụng:
 *   <RtspUrlBuilder
 *     open={open}
 *     initialUrl={form.rtspMainUrl}
 *     onClose={() => setOpen(false)}
 *     onConfirm={(url, brand) => { update('rtspMainUrl', url); update('brand', brand) }}
 *   />
 */
import { useState, useEffect, useMemo } from 'react'
import { X, Copy, Check, Wrench, Wifi, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'

/* ─── Types ────────────────────────────────────────────────── */
export type RtspBrand =
  | 'Hikvision'
  | 'Dahua'
  | 'Imou'
  | 'Ezviz'
  | 'Vivotek'
  | 'Yoosee'
  | 'Generic'
  | 'Custom'

export interface RtspBuildParams {
  username?: string
  password?: string
  verifyCode?: string
  ip?: string
  port?: number
  channel?: string
  subtype?: string
  customUrl?: string
}

export interface RtspUrlBuilderProps {
  open: boolean
  initialUrl?: string
  initialBrand?: RtspBrand
  onClose: () => void
  onConfirm: (url: string, brand: RtspBrand) => void
}

/* ─── Brand templates & metadata ───────────────────────────── */
interface BrandSpec {
  id: RtspBrand
  label: string
  description: string
  defaultPort: number
  /** Các field cần show cho brand này */
  fields: {
    user?: boolean
    password?: boolean
    verifyCode?: boolean
    ip?: boolean
    port?: boolean
    channel?: boolean
    subtype?: boolean
    custom?: boolean
  }
  channelHint?: string
  subtypeHint?: string
  templateLabel: string
}

const BRAND_SPECS: BrandSpec[] = [
  {
    id: 'Hikvision',
    label: 'Hikvision',
    description: 'DS-2CD2143G0-I, DS-2DE3304W, ... — channel 101 = main, 102 = sub',
    defaultPort: 554,
    fields: { user: true, password: true, ip: true, port: true, channel: true },
    channelHint: '101 (stream chính, 4K) — 102 (stream phụ, 480p)',
    templateLabel: 'rtsp://{user}:{pass}@{ip}:{port}/Streaming/Channels/{channel}',
  },
  {
    id: 'Dahua',
    label: 'Dahua',
    description: 'IPC-HFW1230S, IPC-HDBW2231R-ZS, ... — channel + subtype riêng',
    defaultPort: 554,
    fields: { user: true, password: true, ip: true, port: true, channel: true, subtype: true },
    channelHint: '1, 2, 3 (số channel vật lý)',
    subtypeHint: '0 = main stream, 1 = sub stream',
    templateLabel: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype={subtype}',
  },
  {
    id: 'Imou',
    label: 'Imou (Dahua consumer)',
    description: 'Sub-brand của Dahua — cùng template, default channel=1, subtype=0',
    defaultPort: 554,
    fields: { user: true, password: true, ip: true, port: true, channel: true, subtype: true },
    channelHint: 'Thường = 1 cho camera consumer',
    subtypeHint: '0 = main, 1 = sub',
    templateLabel: 'rtsp://{user}:{pass}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype={subtype}',
  },
  {
    id: 'Ezviz',
    label: 'Ezviz (Hikvision consumer)',
    description: 'Chỉ cần mã xác thực (verifyCode) ghi dưới đáy camera, user hardcoded = admin',
    defaultPort: 554,
    fields: { verifyCode: true, ip: true, port: true },
    templateLabel: 'rtsp://admin:{verifyCode}@{ip}:{port}/ch1/main',
  },
  {
    id: 'Vivotek',
    label: 'Vivotek',
    description: 'IP8160, IB836BA, ... — URL ngắn, không cần port mặc định 554',
    defaultPort: 554,
    fields: { user: true, password: true, ip: true },
    templateLabel: 'rtsp://{user}:{pass}@{ip}/live.sdp',
  },
  {
    id: 'Yoosee',
    label: 'Yoosee',
    description: 'Camera IP giá rẻ Trung Quốc — KHÔNG cần auth qua RTSP (ONVIF1 path)',
    defaultPort: 554,
    fields: { ip: true, port: true },
    templateLabel: 'rtsp://{ip}:{port}/onvif1',
  },
  {
    id: 'Generic',
    label: 'Generic ONVIF',
    description: 'Camera ONVIF chuẩn — fallback khi brand không có trong list',
    defaultPort: 554,
    fields: { user: true, password: true, ip: true, port: true, channel: true },
    channelHint: '101 hoặc 1 — tuỳ firmware',
    templateLabel: 'rtsp://{user}:{pass}@{ip}:{port}/Streaming/Channels/{channel}',
  },
  {
    id: 'Custom',
    label: 'Custom (tự nhập URL)',
    description: 'Paste trực tiếp URL RTSP nếu brand không match — không validate',
    defaultPort: 554,
    fields: { custom: true },
    templateLabel: 'rtsp://...',
  },
]

/* ─── Core builder ─────────────────────────────────────────── */
/**
 * buildRtspUrl — sinh URL RTSP theo brand + params
 * Trả về chuỗi rỗng nếu thiếu field bắt buộc (UI sẽ disable nút confirm).
 */
export function buildRtspUrl(brand: RtspBrand, params: RtspBuildParams): string {
  const p = params
  const user = encodeURIComponent(p.username || '')
  const pass = encodeURIComponent(p.password || '')
  const ip = (p.ip || '').trim()
  const port = p.port || 554
  const channel = p.channel || ''
  const subtype = p.subtype || '0'

  switch (brand) {
    case 'Hikvision':
      if (!user || !pass || !ip || !channel) return ''
      return `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/${channel}`

    case 'Dahua':
    case 'Imou':
      if (!user || !pass || !ip || !channel) return ''
      return `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=${channel}&subtype=${subtype}`

    case 'Ezviz': {
      const code = encodeURIComponent(p.verifyCode || '')
      if (!code || !ip) return ''
      return `rtsp://admin:${code}@${ip}:${port}/ch1/main`
    }

    case 'Vivotek':
      if (!user || !pass || !ip) return ''
      return `rtsp://${user}:${pass}@${ip}/live.sdp`

    case 'Yoosee':
      if (!ip) return ''
      return `rtsp://${ip}:${port}/onvif1`

    case 'Generic':
      if (!user || !pass || !ip || !channel) return ''
      return `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/${channel}`

    case 'Custom':
      return (p.customUrl || '').trim()

    default:
      return ''
  }
}

/**
 * parseRtspUrl — thử guess brand + extract params từ URL có sẵn (best-effort)
 * Dùng để pre-fill form khi user edit URL đã tồn tại.
 */
export function parseRtspUrl(url: string): { brand: RtspBrand; params: RtspBuildParams } {
  if (!url || !url.startsWith('rtsp://')) return { brand: 'Custom', params: { customUrl: url } }
  try {
    const u = new URL(url)
    const params: RtspBuildParams = {
      username: u.username ? decodeURIComponent(u.username) : '',
      password: u.password ? decodeURIComponent(u.password) : '',
      ip: u.hostname,
      port: u.port ? Number(u.port) : 554,
    }
    const path = u.pathname + u.search

    if (path.includes('/Streaming/Channels/')) {
      const m = path.match(/\/Streaming\/Channels\/(\d+)/)
      if (m) params.channel = m[1]
      return { brand: 'Hikvision', params }
    }
    if (path.includes('/cam/realmonitor')) {
      const ch = path.match(/channel=(\d+)/)
      const st = path.match(/subtype=(\d+)/)
      if (ch) params.channel = ch[1]
      if (st) params.subtype = st[1]
      return { brand: 'Dahua', params }
    }
    if (path.includes('/live.sdp')) return { brand: 'Vivotek', params }
    if (path.includes('/onvif1')) return { brand: 'Yoosee', params }
    if (path.includes('/ch1/main') && u.username === 'admin') {
      return { brand: 'Ezviz', params: { ...params, verifyCode: params.password, username: undefined, password: undefined } }
    }
    return { brand: 'Generic', params }
  } catch {
    return { brand: 'Custom', params: { customUrl: url } }
  }
}

/* ─── Component ────────────────────────────────────────────── */
export default function RtspUrlBuilder({ open, initialUrl, initialBrand, onClose, onConfirm }: RtspUrlBuilderProps) {
  const [brand, setBrand] = useState<RtspBrand>(initialBrand || 'Hikvision')
  const [params, setParams] = useState<RtspBuildParams>({ port: 554, channel: '101', subtype: '0' })
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  // Pre-fill từ initialUrl khi mở modal
  useEffect(() => {
    if (!open) return
    if (initialUrl) {
      const parsed = parseRtspUrl(initialUrl)
      setBrand(initialBrand || parsed.brand)
      setParams({
        port: 554,
        channel: '101',
        subtype: '0',
        ...parsed.params,
      })
    } else {
      setBrand(initialBrand || 'Hikvision')
      setParams({ port: 554, channel: '101', subtype: '0', username: 'admin' })
    }
    setCopied(false)
  }, [open, initialUrl, initialBrand])

  const spec = BRAND_SPECS.find(b => b.id === brand)!
  const generatedUrl = useMemo(() => buildRtspUrl(brand, params), [brand, params])
  const isValid = generatedUrl.length > 0

  function updateParam<K extends keyof RtspBuildParams>(k: K, v: RtspBuildParams[K]) {
    setParams(p => ({ ...p, [k]: v }))
  }

  function handleBrandChange(b: RtspBrand) {
    setBrand(b)
    const newSpec = BRAND_SPECS.find(s => s.id === b)!
    // reset port về default của brand mới
    setParams(p => ({ ...p, port: newSpec.defaultPort }))
  }

  async function handleCopy() {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      toast.success('Đã copy URL')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Không copy được — browser block clipboard')
    }
  }

  function handleConfirm() {
    if (!isValid) {
      toast.error('Điền đầy đủ thông tin trước')
      return
    }
    onConfirm(generatedUrl, brand)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl"
        style={{ background: '#0f1016', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Wrench className="w-4.5 h-4.5 text-violet-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tạo URL RTSP tự động</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Sinh URL stream theo template của từng brand camera
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Brand picker */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-2">
              Chọn hãng camera
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {BRAND_SPECS.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBrandChange(b.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    brand === b.id
                      ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/40 mt-2 italic">{spec.description}</p>
          </div>

          {/* Template preview */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
            <p className="text-[10px] text-cyan-300/80 uppercase tracking-widest mb-1">Template</p>
            <code className="text-[11px] text-cyan-200 font-mono break-all">{spec.templateLabel}</code>
          </div>

          {/* Smart input form */}
          <div className="grid grid-cols-2 gap-3">
            {spec.fields.user && (
              <Field label="Username" hint="Tài khoản ONVIF (mặc định: admin)">
                <input
                  type="text"
                  value={params.username || ''}
                  onChange={e => updateParam('username', e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                />
              </Field>
            )}
            {spec.fields.password && (
              <Field label="Password" hint="Password user ONVIF — sẽ URL-encode tự động">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={params.password || ''}
                    onChange={e => updateParam('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Field>
            )}
            {spec.fields.verifyCode && (
              <Field label="Verification Code" hint="Mã 6 ký tự ghi dưới đáy Ezviz (vd: ABCDEF)">
                <input
                  type="text"
                  value={params.verifyCode || ''}
                  onChange={e => updateParam('verifyCode', e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono tracking-widest bg-white/5 border border-white/10 text-white"
                  maxLength={20}
                />
              </Field>
            )}
            {spec.fields.ip && (
              <Field label="Địa chỉ IP" hint="IP của camera trong LAN (vd: 192.168.1.64)">
                <input
                  type="text"
                  value={params.ip || ''}
                  onChange={e => updateParam('ip', e.target.value)}
                  placeholder="192.168.1.64"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                />
              </Field>
            )}
            {spec.fields.port && (
              <Field label="Port RTSP" hint="Default: 554 — đổi nếu camera dùng port khác">
                <input
                  type="number"
                  value={params.port || 554}
                  onChange={e => updateParam('port', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                />
              </Field>
            )}
            {spec.fields.channel && (
              <Field label="Channel" hint={spec.channelHint}>
                <input
                  type="text"
                  value={params.channel || ''}
                  onChange={e => updateParam('channel', e.target.value)}
                  placeholder={brand === 'Hikvision' ? '101' : '1'}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                />
              </Field>
            )}
            {spec.fields.subtype && (
              <Field label="Subtype" hint={spec.subtypeHint}>
                <select
                  value={params.subtype || '0'}
                  onChange={e => updateParam('subtype', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                >
                  <option value="0">0 — Main stream (HD)</option>
                  <option value="1">1 — Sub stream (480p)</option>
                </select>
              </Field>
            )}
            {spec.fields.custom && (
              <div className="col-span-2">
                <Field label="RTSP URL (paste trực tiếp)" hint="Không validate — chỉ pass qua">
                  <textarea
                    value={params.customUrl || ''}
                    onChange={e => updateParam('customUrl', e.target.value)}
                    placeholder="rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-white/5 border border-white/10 text-white"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-white/80 mb-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              URL sinh ra (preview)
            </label>
            <div
              className={`relative rounded-lg p-3 font-mono text-[12px] break-all min-h-[60px] border ${
                isValid
                  ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-500/5 border-amber-500/30 text-amber-200/70 italic'
              }`}
            >
              {isValid ? (
                <>
                  {generatedUrl}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded hover:bg-white/10 transition-colors"
                    title="Copy URL"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-emerald-300" />
                      : <Copy className="w-3.5 h-3.5 text-white/50" />}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Điền đầy đủ các trường bắt buộc để sinh URL</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes by brand */}
          {brand === 'Hikvision' && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-[11px] text-white/60 space-y-1">
              <p><b className="text-white/80">Mẹo:</b> Đa số firmware Hikvision dùng channel = <code className="text-cyan-300">101</code> cho stream 4K chính, <code className="text-cyan-300">102</code> cho stream phụ. Một số dòng PTZ dùng <code className="text-cyan-300">201, 301</code>.</p>
            </div>
          )}
          {brand === 'Ezviz' && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-[11px] text-white/60 space-y-1">
              <p><b className="text-white/80">Lưu ý:</b> Ezviz mặc định <b>tắt RTSP</b>. Vào app EZVIZ → Settings → Network → Bật <code className="text-cyan-300">Local RTSP</code>. Verification code ghi ở dưới đáy camera (label).</p>
            </div>
          )}
          {brand === 'Yoosee' && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-[11px] text-white/60 space-y-1">
              <p><b className="text-white/80">Lưu ý:</b> Yoosee mặc định <b>không cho RTSP từ ngoài</b>. Vào app Yoosee → Settings → Advanced → Bật <code className="text-cyan-300">ONVIF</code>. Một số firmware path là <code className="text-cyan-300">/onvif2</code> cho sub stream.</p>
            </div>
          )}
          {brand === 'Custom' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-[11px] text-amber-200/80">
              <b>Custom mode:</b> Bạn paste URL trực tiếp — không có validate. Đảm bảo URL bắt đầu bằng <code>rtsp://</code> và camera đã enable RTSP.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-black/40" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="text-[11px] text-white/40">
            {isValid ? '✓ URL hợp lệ — sẵn sàng dùng' : 'Đang chờ input đầy đủ...'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-white/70"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Sử dụng URL này
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ───────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/80 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
    </div>
  )
}
