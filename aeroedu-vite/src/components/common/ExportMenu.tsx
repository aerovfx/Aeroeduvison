/**
 * ExportMenu — Dropdown 4 button export CSV/JSON/Excel/Word.
 *
 * Click "Tải xuống" → popover hiện 4 lựa chọn với icon + mô tả format.
 * Khi click → gọi exportData() với format tương ứng + toast confirm.
 *
 * Usage:
 *   <ExportMenu
 *     filename="analytics-2026-05-17"
 *     getSheets={() => [{ name: 'Routes', columns: [...], rows: [...] }]}
 *     meta={{ title: 'Báo cáo Analytics', subtitle: '7 ngày qua' }}
 *   />
 */
import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileJson, FileSpreadsheet, FileType2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportData, type ExportFormat, type SheetData, type ExportOptions } from '@/lib/exportReport'

export interface ExportMenuProps {
  filename: string
  /** Lazy — chỉ gọi khi user click export, tránh re-render */
  getSheets: () => SheetData[]
  meta?: ExportOptions['meta']
  className?: string
  variant?: 'default' | 'compact'
}

const OPTIONS: Array<{
  format: ExportFormat
  label: string
  desc: string
  icon: typeof FileText
  color: string
}> = [
  {
    format: 'csv',
    label: 'CSV',
    desc: 'Mở bằng Excel / Google Sheets',
    icon: FileText,
    color: 'text-emerald-300',
  },
  {
    format: 'xlsx',
    label: 'Excel (.xlsx)',
    desc: 'Định dạng + công thức gốc',
    icon: FileSpreadsheet,
    color: 'text-green-400',
  },
  {
    format: 'docx',
    label: 'Word (.doc)',
    desc: 'Bảng có style cho báo cáo',
    icon: FileType2,
    color: 'text-blue-400',
  },
  {
    format: 'json',
    label: 'JSON',
    desc: 'Cho dev / import lại',
    icon: FileJson,
    color: 'text-amber-300',
  },
]

export function ExportMenu({
  filename, getSheets, meta, className = '', variant = 'default',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleExport = async (format: ExportFormat) => {
    setBusy(format)
    try {
      const sheets = getSheets()
      if (sheets.length === 0 || sheets.every(s => s.rows.length === 0)) {
        toast.error('Không có dữ liệu để xuất')
        setBusy(null)
        setOpen(false)
        return
      }
      await exportData({
        format,
        filename,
        sheets,
        meta: {
          generatedAt: new Date().toISOString(),
          ...meta,
        },
      })
      const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0)
      toast.success(`✓ Đã tải ${filename}.${format === 'docx' ? 'doc' : format} (${totalRows} dòng)`)
      setOpen(false)
    } catch (err: any) {
      toast.error('Xuất file lỗi: ' + (err?.message || 'unknown'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={
          variant === 'compact'
            ? 'flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition'
            : 'flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-sm font-semibold transition'
        }
        title="Xuất báo cáo"
      >
        <Download className="w-4 h-4" />
        Tải xuống
        <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <div className="text-xs font-semibold text-white/85">Chọn định dạng</div>
            <div className="text-[10px] text-white/45">Lưu báo cáo từ dữ liệu hiển thị</div>
          </div>
          <div className="py-1">
            {OPTIONS.map(opt => {
              const Icon = opt.icon
              const isBusy = busy === opt.format
              return (
                <button
                  key={opt.format}
                  onClick={() => handleExport(opt.format)}
                  disabled={busy !== null}
                  className="w-full px-4 py-2.5 hover:bg-white/[0.05] flex items-center gap-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBusy ? (
                    <Loader2 className={`w-5 h-5 ${opt.color} animate-spin shrink-0`} />
                  ) : (
                    <Icon className={`w-5 h-5 ${opt.color} shrink-0`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white">{opt.label}</div>
                    <div className="text-[11px] text-white/50">{opt.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
