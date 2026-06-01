/**
 * ARModelOverlay — lớp phủ toàn màn hình hiển thị mô hình 3D đã xuất, cho phép vào AR.
 *
 * - Mobile (Android/iOS): nút "Xem trong AR" của model-viewer → đặt mô hình lên mặt thật.
 *     · Android → WebXR / Scene Viewer (GLB)
 *     · iOS     → AR Quick Look (USDZ, nếu xuất được)
 * - Desktop: xem 3D xoay được + QR để mở chính trang này trên điện thoại.
 */
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X } from 'lucide-react'
import { ensureModelViewer } from './ensureModelViewer'
import { detectARSync } from '../../lib/ar/arCapabilities'

interface Props {
  glbUrl: string
  usdzUrl?: string
  title?: string
  onClose: () => void
}

export function ARModelOverlay({ glbUrl, usdzUrl, title, onClose }: Props) {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const caps = detectARSync()

  useEffect(() => {
    let alive = true
    ensureModelViewer()
      .then(() => alive && setReady(true))
      .catch((e) => alive && setLoadError(e.message))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 10, 22, 0.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thanh tiêu đề */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          color: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          🥽 {title || 'Thực tế tăng cường (AR)'}
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: '#fff',
            borderRadius: 10,
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <X size={16} /> Thoát
        </button>
      </div>

      {/* Khu vực mô hình */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loadError && (
          <div style={{ color: '#fca5a5', textAlign: 'center', padding: 24 }}>
            {loadError}
          </div>
        )}
        {!loadError && !ready && (
          <div style={{ color: '#cbd5e1', textAlign: 'center', padding: 24 }}>
            Đang chuẩn bị mô hình AR…
          </div>
        )}
        {!loadError && ready && (
          // @ts-ignore custom element
          <model-viewer
            src={glbUrl}
            ios-src={usdzUrl}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            ar-placement="floor"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            exposure="1"
            alt={title || 'Mô hình 3D AeroEduVision'}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          />
        )}
      </div>

      {/* Chân: hướng dẫn theo nền tảng */}
      <div
        style={{
          padding: '14px 16px',
          color: '#e2e8f0',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {caps.isMobile ? (
          <span style={{ textAlign: 'center', maxWidth: 520 }}>
            Bấm nút <b>“Xem trong AR”</b> ở góc mô hình, hướng camera vào mặt bàn/sàn để đặt mô
            hình, rồi <b>chụm ngón tay để phóng to/thu nhỏ</b> và đi vòng quanh quan sát.
            {!usdzUrl && caps.isIOS && (
              <span style={{ color: '#fbbf24' }}>
                {' '}
                (Mô hình này chưa xuất được USDZ — bạn vẫn xoay xem 3D được.)
              </span>
            )}
          </span>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'rgba(255,255,255,0.06)',
              padding: '10px 14px',
              borderRadius: 12,
            }}
          >
            <div style={{ background: '#fff', padding: 8, borderRadius: 10 }}>
              <QRCodeSVG value={window.location.href} size={92} />
            </div>
            <span style={{ maxWidth: 320 }}>
              AR cần điện thoại có camera. <b>Quét mã QR</b> để mở trang này trên điện thoại và
              đặt mô hình lên mặt bàn thật.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ARModelOverlay
