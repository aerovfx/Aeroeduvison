/**
 * RS Experiments Admin — /admin/rs-experiments
 *
 * RS-Phase 9 A/B testing dashboard cho admin:
 *   - List experiments (active/draft/paused/ended)
 *   - Tạo experiment mới (variants + allocation + config)
 *   - Pause/resume/end existing
 *   - View per-variant metrics (CTR / completion / pass_rate / negative)
 *
 * Auth: admin nhập x-admin-token thủ công (1 lần, lưu localStorage).
 * Token chính là RS_DIGEST_ADMIN_TOKEN env trên Cloud Run.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Beaker, RefreshCw, Plus, Play, Pause, StopCircle, BarChart3,
  Loader2, AlertCircle, ArrowLeft, Key,
} from 'lucide-react'
import toast from 'react-hot-toast'
import usePageTitle from '@/hooks/usePageTitle'

const TOKEN_LS_KEY = 'rs.exp.adminToken'
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/reco'

interface Variant {
  key: string
  name: string
  config: Record<string, any>
}
interface Experiment {
  id: string
  name: string
  description: string | null
  variants: Variant[]
  allocation: Record<string, number>
  status: 'draft' | 'active' | 'paused' | 'ended'
  start_at: string | null
  end_at: string | null
  created_at: string
}
interface VariantMetrics {
  key: string
  totalActions: number
  byAction: Record<string, number>
  metrics: {
    views: number; clicks: number; completes: number; passes: number
    skips: number; notInter: number
    ctr: number; completion: number; pass_rate: number; negative_rate: number
  }
}

async function apiCall<T>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
      ...(init.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

export default function RsExperimentsAdminPage() {
  usePageTitle('RS A/B Experiments')

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_LS_KEY) || '')
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [metricsByName, setMetricsByName] = useState<Record<string, VariantMetrics[]>>({})

  const saveToken = useCallback((t: string) => {
    setToken(t)
    if (t) localStorage.setItem(TOKEN_LS_KEY, t)
    else localStorage.removeItem(TOKEN_LS_KEY)
  }, [])

  const loadExperiments = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await apiCall<{ experiments: Experiment[] }>('/experiments', token)
      setExperiments(r.experiments)
    } catch (e: any) {
      toast.error(`Lỗi load: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadExperiments() }, [loadExperiments])

  const loadMetrics = useCallback(async (name: string) => {
    try {
      const r = await apiCall<{ variants: VariantMetrics[] }>(`/experiments/${encodeURIComponent(name)}/metrics`, token)
      setMetricsByName(prev => ({ ...prev, [name]: r.variants }))
    } catch (e: any) {
      toast.error(`Lỗi metrics: ${e.message}`)
    }
  }, [token])

  const updateStatus = useCallback(async (name: string, status: Experiment['status']) => {
    try {
      await apiCall(`/experiments/${encodeURIComponent(name)}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      toast.success(`Đã chuyển sang ${status}`)
      loadExperiments()
    } catch (e: any) {
      toast.error(`Lỗi update: ${e.message}`)
    }
  }, [token, loadExperiments])

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8">
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-cyan-500" />
            <h1 className="text-lg font-bold">RS Admin Token</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
            Nhập RS_DIGEST_ADMIN_TOKEN (env trên Cloud Run) để xem A/B experiments.
            Token được lưu localStorage (chỉ device này).
          </p>
          <input
            type="password"
            placeholder="x-admin-token"
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700 mb-3"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim()
                if (v) saveToken(v)
              }
            }}
          />
          <p className="text-xs text-gray-500">Bấm Enter để áp dụng.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Beaker className="w-6 h-6 text-cyan-500" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">RS A/B Experiments</h1>
            <p className="text-xs text-gray-500">
              Phase 9 — Multi-variant feed testing · {experiments.length} experiments
            </p>
          </div>
          <button
            onClick={loadExperiments}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> Mới
          </button>
          <button
            onClick={() => saveToken('')}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Đổi token
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {showCreate && (
          <CreateExperimentForm
            token={token}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); loadExperiments() }}
          />
        )}

        {loading && experiments.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading experiments…
          </div>
        )}

        {!loading && experiments.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-semibold">Chưa có experiment nào</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Tạo experiment đầu tiên để A/B test ranker config.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4 inline mr-1" /> Tạo experiment
            </button>
          </div>
        )}

        {experiments.map(exp => (
          <ExperimentCard
            key={exp.id}
            exp={exp}
            metrics={metricsByName[exp.name] || null}
            onLoadMetrics={() => loadMetrics(exp.name)}
            onPause={() => updateStatus(exp.name, 'paused')}
            onResume={() => updateStatus(exp.name, 'active')}
            onEnd={() => {
              if (confirm(`Kết thúc experiment "${exp.name}"? Không reversible.`)) {
                updateStatus(exp.name, 'ended')
              }
            }}
          />
        ))}
      </main>
    </div>
  )
}

function ExperimentCard({
  exp, metrics, onLoadMetrics, onPause, onResume, onEnd,
}: {
  exp: Experiment
  metrics: VariantMetrics[] | null
  onLoadMetrics: () => void
  onPause: () => void
  onResume: () => void
  onEnd: () => void
}) {
  const statusColor = {
    draft:  'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    ended:  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  }[exp.status]

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 overflow-hidden">
      <div className="p-4 border-b dark:border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-base truncate">{exp.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${statusColor}`}>
                {exp.status}
              </span>
            </div>
            {exp.description && (
              <p className="text-sm text-gray-500 dark:text-zinc-400">{exp.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>Tạo: {new Date(exp.created_at).toLocaleDateString('vi-VN')}</span>
              {exp.end_at && <span>Kết thúc: {new Date(exp.end_at).toLocaleDateString('vi-VN')}</span>}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {exp.status === 'active' && (
              <button onClick={onPause} title="Pause" className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-500">
                <Pause className="w-4 h-4" />
              </button>
            )}
            {exp.status === 'paused' && (
              <button onClick={onResume} title="Resume" className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500">
                <Play className="w-4 h-4" />
              </button>
            )}
            {(exp.status === 'active' || exp.status === 'paused') && (
              <button onClick={onEnd} title="End" className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500">
                <StopCircle className="w-4 h-4" />
              </button>
            )}
            <button onClick={onLoadMetrics} title="Load metrics" className="p-2 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-cyan-500">
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
        {exp.variants.map(v => {
          const m = metrics?.find(x => x.key === v.key)
          const alloc = exp.allocation[v.key] || 0
          return (
            <div key={v.key} className="rounded-lg border dark:border-zinc-800 p-3 bg-gray-50 dark:bg-zinc-950/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-sm">{v.name}</p>
                  <p className="text-xs text-gray-500 font-mono">key: {v.key}</p>
                </div>
                <span className="text-xs font-bold text-cyan-500">{alloc}%</span>
              </div>
              {Object.keys(v.config || {}).length > 0 && (
                <div className="text-[10px] text-gray-500 font-mono bg-white dark:bg-zinc-900 rounded p-1.5 mb-2 break-all">
                  {JSON.stringify(v.config)}
                </div>
              )}
              {m ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Metric label="CTR" value={`${m.metrics.ctr}%`} color="cyan" />
                  <Metric label="Completion" value={`${m.metrics.completion}%`} color="emerald" />
                  <Metric label="Pass rate" value={`${m.metrics.pass_rate}%`} color="violet" />
                  <Metric label="Negative" value={`${m.metrics.negative_rate}%`} color="rose" />
                  <div className="col-span-2 text-[10px] text-gray-400 mt-1">
                    {m.metrics.views} views · {m.metrics.clicks} clicks · {m.metrics.completes} completes
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">Bấm 📊 để load metrics</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded p-1.5 bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-200/50 dark:border-${color}-500/30`}>
      <p className={`text-[10px] text-${color}-700 dark:text-${color}-300 font-bold uppercase`}>{label}</p>
      <p className={`text-sm font-mono text-${color}-700 dark:text-${color}-200`}>{value}</p>
    </div>
  )
}

function CreateExperimentForm({
  token, onClose, onCreated,
}: { token: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [variantA, setVariantA] = useState('control')
  const [variantB, setVariantB] = useState('treatment')
  const [configBJson, setConfigBJson] = useState('{"boost_explore": 0.3}')
  const [allocA, setAllocA] = useState(50)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { toast.error('Cần name'); return }
    let configB: Record<string, any> = {}
    try { configB = JSON.parse(configBJson) }
    catch { toast.error('Config B không phải JSON hợp lệ'); return }

    setSubmitting(true)
    try {
      await apiCall('/experiments', token, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          variants: [
            { key: variantA, name: variantA, config: {} },
            { key: variantB, name: variantB, config: configB },
          ],
          allocation: {
            [variantA]: allocA,
            [variantB]: 100 - allocA,
          },
          status: 'draft',
        }),
      })
      toast.success('Đã tạo experiment (status: draft) — bấm Play để active')
      onCreated()
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }, [name, description, variantA, variantB, configBJson, allocA, token, onCreated])

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-cyan-500 dark:border-cyan-500/50 p-4 mb-4">
      <h2 className="font-bold mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4 text-cyan-500" /> Tạo Experiment mới
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-bold mb-1">Name (unique)</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="feed_explore_boost_v1"
            className="w-full px-2 py-1.5 border rounded dark:bg-zinc-800 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Allocation A %</label>
          <input
            type="number" min={0} max={100}
            value={allocA} onChange={e => setAllocA(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-full px-2 py-1.5 border rounded dark:bg-zinc-800 dark:border-zinc-700"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold mb-1">Description (tuỳ chọn)</label>
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Test boost explore source +30%"
            className="w-full px-2 py-1.5 border rounded dark:bg-zinc-800 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Variant A key</label>
          <input
            value={variantA} onChange={e => setVariantA(e.target.value)}
            className="w-full px-2 py-1.5 border rounded dark:bg-zinc-800 dark:border-zinc-700 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Variant B key</label>
          <input
            value={variantB} onChange={e => setVariantB(e.target.value)}
            className="w-full px-2 py-1.5 border rounded dark:bg-zinc-800 dark:border-zinc-700 font-mono"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold mb-1">
            Config B (JSON) — Variant A always {`{}`}
          </label>
          <textarea
            value={configBJson} onChange={e => setConfigBJson(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 border rounded dark:bg-zinc-800 dark:border-zinc-700 font-mono text-xs"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Supported keys: <code>boost_explore</code>, <code>boost_kg_weak</code>, <code>dampen_popular</code> (0-1 float)
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">
          Huỷ
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tạo (draft)'}
        </button>
      </div>
    </div>
  )
}
