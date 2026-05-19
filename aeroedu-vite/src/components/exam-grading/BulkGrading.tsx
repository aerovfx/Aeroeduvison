/**
 * BulkGrading — chấm hàng loạt (≤ 100 phiếu cùng lúc).
 *
 * Flow:
 *   1. GV chọn answer key đã lưu
 *   2. Upload nhiều file ảnh phiếu (drag-drop hoặc click multi-select)
 *   3. Tự compress ảnh > 500KB trước khi upload (giữ < 60MB total)
 *   4. POST /api/grading/batch-grade — backend xử lý song song 5 phiếu
 *   5. Hiển thị bảng kết quả: tên HS, mã đề, điểm, % đúng
 *   6. Lọc/sort, export Excel, hoặc xoá bớt nếu OCR sai
 *
 * Backend xử lý concurrency 5 → 100 phiếu ~100-150s tuỳ Vision AI.
 * Frontend show progress bar + ETA dựa trên trung bình thời gian/phiếu.
 */
import { useState, useRef, useCallback, useMemo } from 'react'
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileImage,
  Download, Trash2, Eye, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { compressImage } from '@/lib/imageCompression'
import type { AnswerKey } from './ScanGrading'

interface SavedKey {
  id?: string
  key: AnswerKey
}

interface BulkResult {
  ok: boolean
  filename: string
  sheetId?: string
  studentName?: string
  studentId?: string
  examCode?: string
  className?: string
  correct?: number
  total?: number
  score?: number
  maxScore?: number
  error?: string
  tookMs?: number
}

interface QueueItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'failed'
  result?: BulkResult
}

interface Props {
  savedKeys: SavedKey[]
  selectedKeyIdx: number
  setSelectedKeyIdx: (idx: number) => void
  onSwitchToAnswerKey: () => void
}

const MAX_FILES = 100
const MAX_TOTAL_MB = 50  // safety margin (backend = 60MB)

export function BulkGrading({
  savedKeys,
  selectedKeyIdx,
  setSelectedKeyIdx,
  onSwitchToAnswerKey,
}: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [grading, setGrading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [filter, setFilter] = useState<'all' | 'failed' | 'low'>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const selectedKey = savedKeys[selectedKeyIdx]
  // Tính max score expected từ key để show ở header
  const expectedQuestions = useMemo(() => {
    if (!selectedKey?.key) return 0
    const k = selectedKey.key
    let n = 0
    n += Object.values(k.part1 ?? {}).filter(v => v).length
    for (const m of Object.values(k.part2 ?? {})) {
      if (m && typeof m === 'object') {
        n += Object.values(m).filter(v => v).length
      }
    }
    n += Object.values(k.part3 ?? {}).filter(v => v).length
    return n
  }, [selectedKey])

  // ─── File picker ───
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/') || f.name.toLowerCase().match(/\.(jpe?g|png|webp|heic)$/))
    if (arr.length === 0) {
      toast.error('Chỉ chấp nhận file ảnh (JPG/PNG/WebP/HEIC)')
      return
    }
    setQueue(prev => {
      const remaining = MAX_FILES - prev.length
      if (arr.length > remaining) {
        toast(`Chỉ thêm được ${remaining} file nữa (tối đa ${MAX_FILES}). Đã bỏ ${arr.length - remaining} file.`, { icon: '⚠️' })
      }
      const toAdd = arr.slice(0, remaining)
      const items: QueueItem[] = toAdd.map(f => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        status: 'pending',
      }))
      toast.success(`Đã thêm ${items.length} phiếu vào hàng đợi`)
      return [...prev, ...items]
    })
  }, [])

  const removeItem = (id: string) => setQueue(q => q.filter(x => x.id !== id))
  const clearAll = () => {
    if (grading) return toast.error('Đang chấm, không xoá được')
    setQueue([])
    setProgress({ done: 0, total: 0 })
  }

  // ─── Compress + base64 + upload ───
  async function fileToBase64(f: File): Promise<{ image: string; mimeType: string; filename: string }> {
    // compressImage trả CompressResult { blob, file, ... }; skip nếu < 500KB
    const result = await compressImage(f, { maxWidth: 1920, quality: 0.85, skipBelowKB: 500 })
    const blob = result.blob
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let bin = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[])
    }
    return { image: btoa(bin), mimeType: blob.type || 'image/jpeg', filename: f.name }
  }

  const startGrading = async () => {
    if (!selectedKey?.id) {
      return toast.error('Đáp án chưa được lưu — quay lại "① Nhập đáp án" lưu trước')
    }
    if (queue.length === 0) return toast.error('Chưa có phiếu nào trong hàng đợi')

    setGrading(true)
    setProgress({ done: 0, total: queue.length })

    // Mark all as uploading
    setQueue(q => q.map(x => ({ ...x, status: 'uploading' as const })))

    try {
      // Compress + encode tất cả
      const t = toast.loading(`Đang nén & encode ${queue.length} ảnh...`)
      const encoded: Array<{ id: string; image: string; mimeType: string; filename: string }> = []
      let totalSize = 0
      for (const item of queue) {
        const enc = await fileToBase64(item.file)
        totalSize += enc.image.length * 0.75 / 1024 / 1024  // base64 → MB
        if (totalSize > MAX_TOTAL_MB) {
          toast.error(`Tổng dung lượng > ${MAX_TOTAL_MB}MB. Bỏ bớt phiếu hoặc chia nhỏ 2 batch.`, { id: t })
          setGrading(false)
          return
        }
        encoded.push({ id: item.id, ...enc })
      }
      toast.loading(`Đang chấm ${queue.length} phiếu (~${Math.round(queue.length * 5)}s)...`, { id: t })

      // POST batch-grade
      const res = await api.post<{
        success: boolean
        results: BulkResult[]
        summary: { total: number; success: number; failed: number; avgScore: number }
      }>('/grading/batch-grade', {
        answerKeyId: selectedKey.id,
        sheets: encoded.map(e => ({ filename: e.filename, image: e.image, mimeType: e.mimeType })),
      }, { timeout: 300_000 })  // 5 phút timeout

      const data = res.data
      if (!data.success) throw new Error('Server trả failure')

      // Map results theo filename → update queue
      const byFilename = new Map(data.results.map(r => [r.filename, r]))
      setQueue(q => q.map(item => {
        const r = byFilename.get(item.file.name)
        if (!r) return { ...item, status: 'failed', result: { ok: false, filename: item.file.name, error: 'Không có response' } }
        return {
          ...item,
          status: r.ok ? 'done' : 'failed',
          result: r,
        }
      }))
      setProgress({ done: data.summary.total, total: data.summary.total })

      toast.success(
        `✅ Chấm xong! ${data.summary.success}/${data.summary.total} thành công · ` +
        `TB: ${data.summary.avgScore}/10`,
        { id: t, duration: 6000 }
      )
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      toast.error(e.response?.data?.error || e.message || 'Lỗi không xác định')
    } finally {
      setGrading(false)
    }
  }

  // ─── Filter view ───
  const visibleQueue = useMemo(() => {
    if (filter === 'all') return queue
    if (filter === 'failed') return queue.filter(x => x.status === 'failed' || x.result?.ok === false)
    if (filter === 'low') return queue.filter(x => x.result?.score !== undefined && x.result.score < 5)
    return queue
  }, [queue, filter])

  // ─── Export CSV ───
  const exportCsv = () => {
    if (queue.filter(x => x.result?.ok).length === 0) return toast.error('Chưa có kết quả nào để xuất')
    const rows = [
      ['STT', 'Filename', 'Họ tên', 'SBD', 'Lớp', 'Mã đề', 'Đúng', 'Tổng', 'Điểm /10', 'Trạng thái', 'Lỗi'],
      ...queue.map((item, i) => {
        const r = item.result
        return [
          String(i + 1),
          item.file.name,
          r?.studentName ?? '',
          r?.studentId ?? '',
          r?.className ?? '',
          r?.examCode ?? '',
          String(r?.correct ?? ''),
          String(r?.total ?? ''),
          String(r?.score ?? ''),
          item.status === 'done' ? 'OK' : item.status === 'failed' ? 'Lỗi' : item.status,
          r?.error ?? '',
        ]
      }),
    ]
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chamhangloat-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Đã tải CSV kết quả')
  }

  // ─── Render ───
  if (savedKeys.length === 0) {
    return (
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-900/15 p-10 text-center">
        <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
        <h3 className="font-bold text-foreground text-lg mb-1">Chưa có đáp án nào</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Cần nhập đáp án chuẩn trước khi chấm hàng loạt.
        </p>
        <button
          onClick={onSwitchToAnswerKey}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
        >
          ① Nhập đáp án ngay
        </button>
      </div>
    )
  }

  const sumOK = queue.filter(x => x.status === 'done').length
  const sumFail = queue.filter(x => x.status === 'failed').length

  return (
    <div className="space-y-4">

      {/* ── Header: chọn key + chỉ số ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Đáp án dùng để chấm
            </label>
            <select
              value={selectedKeyIdx}
              onChange={e => setSelectedKeyIdx(Number(e.target.value))}
              disabled={grading}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:ring-2 focus:ring-purple-500"
            >
              {savedKeys.map((k, i) => (
                <option key={k.id ?? i} value={i}>
                  {k.key.examName || `Đáp án ${i + 1}`}
                  {k.key.examCode ? ` · Mã ${k.key.examCode}` : ''}
                  {k.key.examDate ? ` · ${k.key.examDate}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 text-sm">
            <Metric label="Câu hỏi" value={expectedQuestions} accent="cyan" />
            <Metric label="Hàng đợi" value={queue.length} accent="amber" />
            <Metric label="Đã chấm" value={sumOK} accent="green" />
            {sumFail > 0 && <Metric label="Lỗi" value={sumFail} accent="red" />}
          </div>
        </div>
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
        }}
        onClick={() => !grading && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors p-8 text-center ${
          dragOver ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/20' : 'border-border bg-muted/30 hover:bg-muted'
        } ${grading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic"
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <Upload className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
        <p className="font-semibold text-foreground mb-1">
          Kéo-thả nhiều ảnh phiếu vào đây
        </p>
        <p className="text-xs text-muted-foreground">
          hoặc click để chọn (tối đa {MAX_FILES} ảnh · {MAX_TOTAL_MB}MB sau khi nén) · JPG/PNG/WebP/HEIC
        </p>
        <p className="text-[11px] text-muted-foreground mt-2">
          💡 Ảnh sẽ tự nén xuống ~500KB · Vision AI extract bubble + so với đáp án
        </p>
      </div>

      {/* ── Action bar ── */}
      {queue.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={startGrading}
              disabled={grading || !selectedKey?.id}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2"
            >
              {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {grading ? `Đang chấm ${progress.done}/${progress.total}...` : `Chấm ${queue.length} phiếu`}
            </button>
            {!selectedKey?.id && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Đáp án chưa được lưu (chưa có ID)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as typeof filter)}
              className="text-xs px-2 py-1.5 rounded border bg-background text-foreground"
            >
              <option value="all">Tất cả ({queue.length})</option>
              <option value="failed">Lỗi ({sumFail})</option>
              <option value="low">Điểm thấp &lt; 5</option>
            </select>
            <button
              onClick={exportCsv}
              disabled={sumOK === 0}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={clearAll}
              disabled={grading}
              className="px-3 py-1.5 rounded-lg border border-red-500/40 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá tất cả
            </button>
          </div>
        </div>
      )}

      {/* ── Progress bar khi đang chấm ── */}
      {grading && (
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Đang xử lý song song 5 phiếu cùng lúc...</span>
            <span>{progress.done}/{progress.total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 5}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Result list ── */}
      {visibleQueue.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">File</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Học sinh</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">SBD</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Lớp</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Mã đề</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Đúng/Tổng</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Điểm</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleQueue.map((item, idx) => (
                  <tr key={item.id} className="border-t hover:bg-accent/30">
                    <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <FileImage className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="truncate max-w-[160px] text-foreground" title={item.file.name}>
                          {item.file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-foreground font-medium">
                      {item.result?.studentName || <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                      {item.result?.studentId || '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{item.result?.className || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{item.result?.examCode || '—'}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                      {item.result?.total !== undefined ? `${item.result.correct}/${item.result.total}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.result?.score !== undefined ? (
                        <span className={`font-bold ${
                          item.result.score >= 8 ? 'text-green-600 dark:text-green-400' :
                          item.result.score >= 5 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {item.result.score}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                          Chờ
                        </span>
                      )}
                      {item.status === 'uploading' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" /> Đang chấm
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Xong
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span
                          title={item.result?.error}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-semibold"
                        >
                          <AlertCircle className="w-3 h-3" /> Lỗi
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={grading}
                        className="p-1 rounded text-muted-foreground hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: number; accent: 'cyan' | 'amber' | 'green' | 'red' }) {
  const color = {
    cyan: 'text-cyan-600 dark:text-cyan-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
  }[accent]
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

export default BulkGrading
