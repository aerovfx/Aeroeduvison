/**
 * ARLaunchButton — nút "AR" nổi trên góc khung 3D (giống nút AR của GeoGebra).
 *
 * Bấm → xuất cảnh THREE hiện tại sang GLB (+ USDZ cho iOS) → mở ARModelOverlay
 * để đặt mô hình lên mặt thật qua camera. Lazy: chỉ nạp model-viewer khi cần.
 */
import { useCallback, useEffect, useState, lazy, Suspense, type MutableRefObject } from 'react'
import type * as THREE from 'three'
import { Box } from 'lucide-react'
import { exportSceneToGLB, exportSceneToUSDZ, bakeSceneAnimation } from '../../lib/ar/exportModel'
import { detectAR } from '../../lib/ar/arCapabilities'

const ARModelOverlay = lazy(() => import('./ARModelOverlay'))

interface Props {
  sceneRef: MutableRefObject<THREE.Scene | null>
  title?: string
  /** Vào AR realtime (WebXR). Có thì ưu tiên dùng khi thiết bị hỗ trợ. */
  onRealtimeAR?: () => Promise<void>
}

export function ARLaunchButton({ sceneRef, title, onRealtimeAR }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<{ glb: string; usdz?: string } | null>(null)
  const [supportsRealtime, setSupportsRealtime] = useState(false)

  useEffect(() => {
    let alive = true
    detectAR()
      .then((c) => alive && setSupportsRealtime(c.webxrAR))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const exportModel = useCallback(async () => {
    const scene = sceneRef.current
    if (!scene) {
      setError('Cảnh 3D chưa sẵn sàng, thử lại sau giây lát.')
      return
    }
    try {
      // Ghi hoạt hình useFrame ~3s thành AnimationClip → GLB phát được trong AR
      // (best-effort: cảnh tĩnh/quá lớn → null → xuất tĩnh như cũ).
      const clip = await bakeSceneAnimation(scene, { duration: 3, fps: 20 }).catch(() => null)
      const glbBlob = await exportSceneToGLB(scene, clip)
      const glb = URL.createObjectURL(glbBlob)
      let usdz: string | undefined
      try {
        const usdzBlob = await exportSceneToUSDZ(scene)
        if (usdzBlob) usdz = URL.createObjectURL(usdzBlob)
      } catch {
        /* USDZ là tuỳ chọn — bỏ qua nếu lỗi */
      }
      setModel({ glb, usdz })
    } catch (e) {
      setError('Mô hình này chưa hỗ trợ AR. (' + (e as Error).message + ')')
    } finally {
      setBusy(false)
    }
  }, [sceneRef])

  const close = useCallback(() => {
    setModel((m) => {
      if (m) {
        URL.revokeObjectURL(m.glb)
        if (m.usdz) URL.revokeObjectURL(m.usdz)
      }
      return null
    })
  }, [])

  const launch = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      // Ưu tiên AR realtime (WebXR) khi thiết bị hỗ trợ; lỗi → quay về xuất model
      if (supportsRealtime && onRealtimeAR) {
        try {
          await onRealtimeAR()
          return
        } catch {
          /* WebXR thất bại (thiếu hit-test, từ chối quyền…) → fallback model */
        }
      }
      await exportModel()
    } finally {
      setBusy(false)
    }
  }, [supportsRealtime, onRealtimeAR, exportModel])

  return (
    <>
      <button
        onClick={launch}
        disabled={busy}
        title="Xem trong Thực tế tăng cường (AR) — đặt mô hình lên mặt bàn"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.25)',
          background: busy
            ? 'rgba(100,116,139,0.85)'
            : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          cursor: busy ? 'default' : 'pointer',
          boxShadow: '0 6px 18px rgba(124,58,237,0.45)',
        }}
      >
        <Box size={16} />
        {busy ? 'Đang dựng…' : 'AR'}
      </button>

      {error && (
        <div
          onClick={() => setError(null)}
          style={{
            position: 'absolute',
            bottom: 64,
            right: 16,
            zIndex: 30,
            maxWidth: 260,
            background: 'rgba(127,29,29,0.95)',
            color: '#fee2e2',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {error} <span style={{ opacity: 0.7 }}>(bấm để đóng)</span>
        </div>
      )}

      {model && (
        <Suspense fallback={null}>
          <ARModelOverlay glbUrl={model.glb} usdzUrl={model.usdz} title={title} onClose={close} />
        </Suspense>
      )}
    </>
  )
}

export default ARLaunchButton
