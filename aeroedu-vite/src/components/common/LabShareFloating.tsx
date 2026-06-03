/**
 * LabShareFloating — nút chia sẻ NỔI (X/Facebook/Zalo/link/nhúng) áp dụng cho
 * TẤT CẢ trang lab chi tiết: IoT, Aura, Vẽ đồ thị (GraphLab), LabTwin.
 *
 * Đặt 1 lần trong DashboardLayout → tự hiện trên các route lab, CHỤP ẢNH vùng
 * <main> làm thumbnail OG (lab SVG/2D chụp tốt; lab WebGL 3D không chụp được sẽ
 * tự bỏ qua, dùng ảnh OG mặc định).
 *
 * Ẩn ở chế độ nhúng (?embed=1) và trên trang index IoT (đã có share theo card).
 */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ShareMenu from './ShareMenu'

// Route lab CHI TIẾT (không gồm trang danh sách):
//  - /dashboard/iot-lab/<tool>      (circuit-builder, semiconductor, emulator…);
//      LOẠI TRỪ sketch/ & arduino/ vì IoTLab đã có nút share riêng (tên mạch chính xác)
//  - /dashboard/aura/<simId>        (chỉ khi mở 1 sim)
//  - /dashboard/graph-lab
//  - /dashboard/labtwin/<sim>       (từng sim; index /dashboard/labtwin loại trừ)
// (aura: loại trừ fpv-drone-vr — màn game toàn màn hình, nút share che điều khiển)
const LAB_DETAIL_RE = /^\/dashboard\/(iot-lab\/(?!sketch\/|arduino\/).+|aura\/(?!fpv-drone-vr).+|graph-lab|labtwin\/.+)$/

export default function LabShareFloating() {
  const { pathname } = useLocation()
  const [title, setTitle] = useState('AeroEduVision')

  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1'
  const show = LAB_DETAIL_RE.test(pathname) && !embed

  // document.title được usePageTitle set trong effect → đọc sau khi paint.
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => {
      const dt = (document.title || '').replace(/\s*[—|·]\s*AeroEduVision.*$/i, '').trim()
      setTitle(dt || 'AeroEduVision')
    }, 120)
    return () => clearTimeout(t)
  }, [pathname, show])

  if (!show) return null

  return (
    <div className="fixed top-14 right-3 z-40" data-no-capture="1">
      <ShareMenu
        path={pathname}
        title={title}
        embeddable
        captureNode={() => document.querySelector('main') as HTMLElement | null}
      />
    </div>
  )
}
