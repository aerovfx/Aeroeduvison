import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, CloudOff } from 'lucide-react'
import type { SaveStatus } from '@/services/office.service'

/** Thanh trên dùng chung cho 3 trình soạn thảo Văn phòng. */
export default function EditorBar({ title, onTitle, status, children }: {
  title: string
  onTitle: (v: string) => void
  status: SaveStatus
  children?: React.ReactNode  // nút xuất file
}) {
  const navigate = useNavigate()
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-border">
      <button onClick={() => navigate('/teacher/office')} className="p-2 rounded-lg hover:bg-accent dark:hover:bg-slate-800 text-slate-500 shrink-0" title="Về Văn phòng">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Tên tài liệu"
        className="font-bold text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 min-w-0 flex-1 px-1" />
      <span className="text-xs shrink-0 inline-flex items-center gap-1 mr-1"
        style={{ color: status === 'saved' ? '#22c55e' : status === 'saving' ? '#f59e0b' : '#ef4444' }}>
        {status === 'saving' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu…</>
          : status === 'idle' ? <><CloudOff className="w-3.5 h-3.5" /> Lỗi lưu</>
            : <><Check className="w-3.5 h-3.5" /> Đã lưu</>}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">{children}</div>
    </div>
  )
}
