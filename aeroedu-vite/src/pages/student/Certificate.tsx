import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Trophy, Download, Share2, ArrowLeft, FileImage, FileText, Pencil } from 'lucide-react'
import { toPng } from 'html-to-image'
// jsPDF được import động trong handleDownloadPdf để tránh SES lockdown chạy khi app load
// (jsPDF bundle chứa @agoric/ses — nếu import tĩnh sẽ log "SES Removing unpermitted intrinsics")
import { learningService } from '@/services/learning.service'
import { useAuth } from '@/hooks/useAuth'

export default function Certificate() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const certRef = useRef<HTMLDivElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [customName, setCustomName] = useState('')
  const [downloading, setDownloading] = useState<'jpg' | 'pdf' | null>(null)

  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ['certificate', courseId],
    queryFn: () => learningService.getCertificate(courseId!),
    enabled: !!courseId,
  })

  // Displayed name: editable override → cert user name → auth user name
  const displayName = customName || cert?.user?.name || user?.name || 'Học viên'

  const captureImage = async (): Promise<string> => {
    if (!certRef.current) throw new Error('No certificate element')
    return toPng(certRef.current, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#1a0e2e',
    })
  }

  const handleDownloadJpg = async () => {
    setDownloading('jpg')
    try {
      const dataUrl = await captureImage()
      const link = document.createElement('a')
      link.download = `chung-chi-${courseId?.slice(0, 8) ?? 'aero'}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloading('pdf')
    try {
      const dataUrl = await captureImage()
      const el = certRef.current!
      const widthPx = el.offsetWidth
      const heightPx = el.offsetHeight
      // Lazy import: SES lockdown chỉ chạy khi user bấm nút, không phải khi app load
      const { default: jsPDF } = await import('jspdf')
      // A4 landscape: 297 x 210 mm
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pdfW / widthPx, pdfH / heightPx)
      const imgW = widthPx * ratio
      const imgH = heightPx * ratio
      const x = (pdfW - imgW) / 2
      const y = (pdfH - imgH) / 2
      pdf.addImage(dataUrl, 'PNG', x, y, imgW, imgH)
      pdf.save(`chung-chi-${courseId?.slice(0, 8) ?? 'aero'}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'Chứng chỉ của tôi', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Đã sao chép link chứng chỉ!')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !cert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Trophy className="w-16 h-16 text-gray-600" />
        <h2 className="text-xl font-bold text-white">Chứng chỉ chưa khả dụng</h2>
        <p className="text-gray-400">Hoàn thành toàn bộ khoá học để nhận chứng chỉ.</p>
        <Link
          to="/student/my-courses"
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại khoá học
        </Link>
      </div>
    )
  }

  const completedDate = new Date(cert.completedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link
          to="/student/my-courses"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Khoá học của tôi
        </Link>
      </div>

      {/* Action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Edit name */}
        <div className="flex items-center gap-2">
          {editingName ? (
            <>
              <input
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={cert.user?.name || user?.name || 'Tên của bạn'}
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-purple-500/50 text-white text-sm outline-none w-52"
              />
              <button
                onClick={() => setEditingName(false)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors"
              >
                Xong
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Sửa tên hiển thị
            </button>
          )}
        </div>

        {/* Download & share */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
          >
            <Share2 className="w-4 h-4" /> Chia sẻ
          </button>
          <button
            onClick={handleDownloadJpg}
            disabled={!!downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-purple-500/50 text-gray-300 text-sm transition-colors disabled:opacity-50"
          >
            {downloading === 'jpg'
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <FileImage className="w-4 h-4" />}
            PNG
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={!!downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {downloading === 'pdf'
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <FileText className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </div>

      {/* Certificate card — captured by html-to-image */}
      <div className="max-w-3xl mx-auto">
        <div
          ref={certRef}
          id="certificate"
          className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-blue-900/40 border-2 border-purple-500/30 p-12 text-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #2d1b6e 0%, #1e1b4b 50%, #1e3a6e 100%)' }}
        >
          {/* Decorative corner elements */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-purple-400/50 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-purple-400/50 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-purple-400/50 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-purple-400/50 rounded-br-lg" />

          {/* Logo / Brand */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-purple-200 font-semibold text-sm tracking-wider uppercase">
                AeroEduVision
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm tracking-widest uppercase mb-2">
            Chứng nhận hoàn thành khoá học
          </p>

          {/* Student name — uses editable override */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-6 mb-2">
            {displayName}
          </h1>

          <p className="text-gray-300 mb-8">
            đã hoàn thành xuất sắc khoá học
          </p>

          <div className="mx-auto max-w-xl px-8 py-4 rounded-xl bg-white/5 border border-white/10 mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-purple-300">
              {cert.course.title}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Giảng viên: {cert.course.user.name}
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider mb-1">Ngày hoàn thành</p>
              <p className="text-white font-semibold">{completedDate}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider mb-1">Mã chứng chỉ</p>
              <p className="text-white font-mono text-xs">{cert.id.slice(0, 16).toUpperCase()}</p>
            </div>
          </div>

          {/* Signature area */}
          <div className="mt-10 pt-6 border-t border-white/10 flex justify-around">
            <div className="text-center">
              <div className="h-px w-32 bg-white/30 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Giám đốc học thuật</p>
              <p className="text-sm text-white font-semibold">AeroEduVision</p>
            </div>
            <div className="text-center">
              <div className="h-px w-32 bg-white/30 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Giảng viên</p>
              <p className="text-sm text-white font-semibold">{cert.course.user.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
