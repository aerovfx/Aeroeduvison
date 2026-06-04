/**
 * Quản lý Tích hợp API (admin) — thêm/sửa/xoá API key bên thứ 3 từ web,
 * kiểm tra kết nối, đồng bộ Google Secret Manager.
 *
 * BẢO MẬT NHIỀU LỚP:
 *  1) Chỉ ADMIN (RoleGuard + backend _ADMIN_GUARD_PREFIXES verify role DB).
 *  2) Step-up auth: nhập lại mật khẩu (+TOTP nếu bật) → phiên nâng quyền 10'
 *     mới được Sửa / Xem / Đồng bộ / Xoá secret. Token elevation giữ trong RAM,
 *     KHÔNG lưu localStorage.
 *  3) Secret luôn bị che (chỉ 4 ký tự cuối); muốn xem full phải step-up + ghi audit.
 *  4) Audit log mọi thao tác (panel bên dưới).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/services/api'
import { Plug, Shield, Eye, Trash2, CheckCircle2, XCircle, Cloud, Lock, AlertTriangle, Plus } from 'lucide-react'

interface Integration {
  name: string
  label: string
  category: string
  placeholder?: string
  builtin: boolean
  configured: boolean
  source: 'db' | 'env' | 'none'
  last4: string | null
  updatedAt: string | null
  updatedBy: string | null
  syncedAt: string | null
}
interface AuditEvent {
  id: string; actor_email: string | null; action: string; target: string | null
  ip: string | null; created_at: string
}

const ACTION_LABEL: Record<string, string> = {
  elevate_ok: '🔓 Mở khoá nâng quyền', elevate_fail: '⚠️ Step-up sai', elevate_locked: '🚫 Khoá tạm',
  secret_update: '✏️ Cập nhật key', secret_reveal: '👁️ Xem key', secret_sync: '☁️ Đồng bộ cloud',
  secret_sync_fail: '☁️✖ Đồng bộ lỗi', secret_delete: '🗑️ Xoá override',
}

export default function ApiIntegrations() {
  const [items, setItems] = useState<Integration[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [cloudSync, setCloudSync] = useState<'available' | 'unavailable'>('unavailable')
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // ── Elevation (phiên nâng quyền) — giữ trong RAM ──
  const elevRef = useRef<string | null>(null)
  const [elevExp, setElevExp] = useState<number>(0) // epoch ms hết hạn
  const [now, setNow] = useState(Date.now())
  const elevated = !!elevRef.current && elevExp > now
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const flash = (kind: 'ok' | 'err', msg: string) => { setToast({ kind, msg }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [st, list, log] = await Promise.allSettled([
        api.get('/admin/security/status'),
        api.get('/admin/integrations'),
        api.get('/admin/security/audit?limit=60'),
      ])
      if (st.status === 'fulfilled') { setTwoFactorEnabled(!!st.value.data.twoFactorEnabled); setCloudSync(st.value.data.cloudSync || 'unavailable') }
      if (list.status === 'fulfilled') setItems(list.value.data.integrations || [])
      if (log.status === 'fulfilled') setAudit(log.value.data.events || [])
    } catch { flash('err', 'Không tải được dữ liệu') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // ── Step-up modal ──
  const [stepUp, setStepUp] = useState<null | { resolve: (ok: boolean) => void }>(null)
  const [pw, setPw] = useState(''); const [code, setCode] = useState(''); const [stepBusy, setStepBusy] = useState(false); const [stepErr, setStepErr] = useState('')

  const ensureElevated = useCallback(async (): Promise<boolean> => {
    if (elevRef.current && elevExp > Date.now()) return true
    return new Promise<boolean>((resolve) => { setPw(''); setCode(''); setStepErr(''); setStepUp({ resolve }) })
  }, [elevExp])

  const submitStepUp = async () => {
    setStepBusy(true); setStepErr('')
    try {
      const { data } = await api.post('/admin/security/elevate', { password: pw, code: code || undefined })
      elevRef.current = data.elevationToken
      setElevExp(Date.now() + (data.expiresInSec || 600) * 1000)
      stepUp?.resolve(true); setStepUp(null)
      flash('ok', 'Đã mở khoá khu vực nhạy cảm (10 phút)')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string }; status?: number } }
      setStepErr(err.response?.data?.error || 'Xác thực thất bại')
    } finally { setStepBusy(false) }
  }

  const elevHeaders = () => ({ headers: { 'X-Admin-Elevation': elevRef.current || '' } })

  // ── Hành động ──
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [testRes, setTestRes] = useState<Record<string, { ok: boolean; message: string }>>({})

  const startEdit = async (name: string) => {
    if (!(await ensureElevated())) return
    setEditing(name); setEditVal('')
  }
  const saveEdit = async (it: Integration) => {
    if (!editVal.trim()) return
    if (!(await ensureElevated())) return
    try {
      await api.post('/admin/integrations', { name: it.name, value: editVal.trim(), label: it.label, category: it.category }, elevHeaders())
      setEditing(null); setEditVal(''); flash('ok', `Đã lưu ${it.label} — có hiệu lực ngay`)
      load()
    } catch (e: unknown) { flash('err', (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Lưu thất bại') }
  }
  const reveal = async (name: string) => {
    if (revealed[name]) { setRevealed(r => { const n = { ...r }; delete n[name]; return n }); return }
    if (!(await ensureElevated())) return
    try {
      const { data } = await api.post(`/admin/integrations/${name}/reveal`, {}, elevHeaders())
      setRevealed(r => ({ ...r, [name]: data.value }))
    } catch (e: unknown) { flash('err', (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Không xem được') }
  }
  const test = async (name: string) => {
    setTesting(name)
    try {
      const { data } = await api.post(`/admin/integrations/${name}/test`, {})
      setTestRes(r => ({ ...r, [name]: { ok: !!data.ok, message: data.message || data.status } }))
    } catch { setTestRes(r => ({ ...r, [name]: { ok: false, message: 'Lỗi' } })) }
    setTesting(null)
  }
  const sync = async (name: string) => {
    if (!(await ensureElevated())) return
    try {
      const { data } = await api.post(`/admin/integrations/${name}/sync`, {}, elevHeaders())
      flash('ok', `Đã đồng bộ ${name} lên Secret Manager (${data.cloudName})`); load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      flash('err', err.response?.data?.error || 'Đồng bộ thất bại')
    }
  }
  const remove = async (name: string) => {
    if (!(await ensureElevated())) return
    if (!window.confirm(`Gỡ override DB của ${name}? (giá trị từ môi trường deploy vẫn còn)`)) return
    try { await api.delete(`/admin/integrations/${name}`, elevHeaders()); flash('ok', 'Đã gỡ override'); load() }
    catch (e: unknown) { flash('err', (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Xoá thất bại') }
  }

  // ── Thêm tích hợp tuỳ chỉnh ──
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState(''); const [newVal, setNewVal] = useState(''); const [newCat, setNewCat] = useState('Khác')
  const addCustom = async () => {
    if (!(await ensureElevated())) return
    try {
      await api.post('/admin/integrations', { name: newName.trim().toUpperCase(), value: newVal.trim(), category: newCat }, elevHeaders())
      setAddOpen(false); setNewName(''); setNewVal(''); flash('ok', 'Đã thêm tích hợp'); load()
    } catch (e: unknown) { flash('err', (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Thêm thất bại') }
  }

  const cats = Array.from(new Set(items.map(i => i.category)))
  const remainSec = Math.max(0, Math.floor((elevExp - now) / 1000))

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 grid place-items-center"><Plug className="w-6 h-6 text-cyan-300" /></div>
        <div>
          <h1 className="text-xl font-bold">Tích hợp API</h1>
          <p className="text-sm text-slate-400">Thêm & quản lý API key bên thứ 3 từ web, đồng bộ Google Secret Manager</p>
        </div>
      </div>

      {/* Trạng thái bảo mật */}
      <div className="flex flex-wrap items-center gap-2 mt-3 mb-5 text-xs">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300"><Shield className="w-3.5 h-3.5" /> Chỉ ADMIN</span>
        {elevated
          ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300"><Lock className="w-3.5 h-3.5" /> Đã mở khoá · còn {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, '0')}</span>
          : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-600/30 border border-slate-500/40 text-slate-300"><Lock className="w-3.5 h-3.5" /> Khu nhạy cảm đang khoá</span>}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-600/20 border border-slate-500/30 text-slate-300">2FA: {twoFactorEnabled ? 'bật' : 'tắt'}</span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${cloudSync === 'available' ? 'bg-sky-500/15 border-sky-400/30 text-sky-300' : 'bg-slate-600/20 border-slate-500/30 text-slate-400'}`}><Cloud className="w-3.5 h-3.5" /> Cloud sync: {cloudSync === 'available' ? 'sẵn sàng' : 'chưa khả dụng'}</span>
        <button onClick={() => setAddOpen(true)} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium"><Plus className="w-4 h-4" /> Thêm tích hợp</button>
      </div>

      {toast && <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${toast.kind === 'ok' ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200' : 'bg-rose-500/15 border border-rose-400/30 text-rose-200'}`}>{toast.msg}</div>}

      {loading ? <div className="text-slate-400 py-10 text-center">Đang tải…</div> : (
        <div className="space-y-6">
          {cats.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{cat}</h2>
              <div className="grid gap-2">
                {items.filter(i => i.category === cat).map(it => (
                  <div key={it.name} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{it.label}</span>
                          {!it.builtin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-400/30">tuỳ chỉnh</span>}
                          {it.configured
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">{it.source === 'db' ? 'DB (runtime)' : 'env (deploy)'}</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-400 border border-slate-500/30">chưa cấu hình</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {it.name}{it.configured && it.last4 ? <> · <span className="text-slate-300">{revealed[it.name] || it.last4}</span></> : null}
                        </div>
                        {(it.updatedAt || it.syncedAt) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {it.updatedAt && <>sửa {new Date(it.updatedAt).toLocaleString('vi-VN')}{it.updatedBy ? ` · ${it.updatedBy}` : ''}</>}
                            {it.syncedAt && <> · ☁️ đồng bộ {new Date(it.syncedAt).toLocaleString('vi-VN')}</>}
                          </div>
                        )}
                        {testRes[it.name] && (
                          <div className={`text-xs mt-1 inline-flex items-center gap-1 ${testRes[it.name].ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {testRes[it.name].ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {testRes[it.name].message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => test(it.name)} disabled={testing === it.name || !it.configured} className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-700/60 hover:bg-slate-600 disabled:opacity-40">{testing === it.name ? '…' : 'Kiểm tra'}</button>
                        {it.configured && <button onClick={() => reveal(it.name)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-700/60 hover:bg-slate-600 inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{revealed[it.name] ? 'Ẩn' : 'Xem'}</button>}
                        <button onClick={() => startEdit(it.name)} className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-600/80 hover:bg-cyan-500 text-white">{it.configured ? 'Sửa' : 'Thêm key'}</button>
                        {it.source === 'db' && <button onClick={() => sync(it.name)} className="px-2 py-1.5 rounded-lg text-xs bg-sky-600/70 hover:bg-sky-500 text-white inline-flex items-center gap-1"><Cloud className="w-3.5 h-3.5" />Sync</button>}
                        {it.source === 'db' && <button onClick={() => remove(it.name)} className="px-2 py-1.5 rounded-lg text-xs bg-rose-600/60 hover:bg-rose-500 text-white"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                    {editing === it.name && (
                      <div className="mt-3 flex items-center gap-2">
                        <input type="password" autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} placeholder={it.placeholder || 'Dán giá trị key…'}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-sm font-mono" />
                        <button onClick={() => saveEdit(it)} className="px-3 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white">Lưu</button>
                        <button onClick={() => { setEditing(null); setEditVal('') }} className="px-3 py-2 rounded-lg text-sm bg-slate-700">Huỷ</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit log */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-300" /> Nhật ký thao tác (audit)</h2>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 divide-y divide-slate-700/40 max-h-72 overflow-y-auto text-xs">
          {audit.length === 0 ? <div className="p-4 text-slate-500">Chưa có sự kiện</div> : audit.map(e => (
            <div key={e.id} className="px-3 py-2 flex items-center gap-2">
              <span className="text-slate-300">{ACTION_LABEL[e.action] || e.action}</span>
              {e.target && <span className="font-mono text-slate-400">{e.target}</span>}
              <span className="ml-auto text-slate-500">{e.actor_email || '—'} · {e.ip || ''} · {new Date(e.created_at).toLocaleString('vi-VN')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step-up modal */}
      {stepUp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => { stepUp.resolve(false); setStepUp(null) }}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2"><Lock className="w-5 h-5 text-amber-400" /><h3 className="font-bold">Xác thực nâng cao</h3></div>
            <p className="text-sm text-slate-400 mb-3">Nhập lại mật khẩu{twoFactorEnabled ? ' và mã 2FA' : ''} để mở khoá quản lý secret (phiên 10 phút).</p>
            <input type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} placeholder="Mật khẩu" className="w-full mb-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && !twoFactorEnabled) submitStepUp() }} />
            {twoFactorEnabled && <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Mã 2FA (6 số)" inputMode="numeric"
              className="w-full mb-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm font-mono tracking-widest"
              onKeyDown={e => { if (e.key === 'Enter') submitStepUp() }} />}
            {stepErr && <div className="text-xs text-rose-300 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{stepErr}</div>}
            <div className="flex gap-2 mt-1">
              <button onClick={submitStepUp} disabled={stepBusy || !pw} className="flex-1 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50">{stepBusy ? '…' : 'Mở khoá'}</button>
              <button onClick={() => { stepUp.resolve(false); setStepUp(null) }} className="px-3 py-2 rounded-lg bg-slate-700">Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm tích hợp tuỳ chỉnh */}
      {addOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3 flex items-center gap-2"><Plus className="w-5 h-5 text-cyan-400" /> Thêm tích hợp tuỳ chỉnh</h3>
            <label className="text-xs text-slate-400">Tên biến môi trường (CHỮ HOA)</label>
            <input value={newName} onChange={e => setNewName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} placeholder="VD: MY_SERVICE_API_KEY" className="w-full mb-2 mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm font-mono" />
            <label className="text-xs text-slate-400">Danh mục</label>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full mb-2 mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm" />
            <label className="text-xs text-slate-400">Giá trị key</label>
            <input type="password" value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Dán giá trị…" className="w-full mb-3 mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm font-mono" />
            <div className="flex gap-2">
              <button onClick={addCustom} disabled={!newName || !newVal} className="flex-1 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50">Thêm</button>
              <button onClick={() => setAddOpen(false)} className="px-3 py-2 rounded-lg bg-slate-700">Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
