/**
 * XRCanvas — drop-in thay cho <Canvas> của @react-three/fiber, bổ sung nút "AR".
 *
 * Cách dùng: đổi `<Canvas ...>` → `<XRCanvas ...>` (giữ nguyên mọi prop/children).
 * Component sẽ:
 *   - bắt tham chiếu tới THREE.Scene + WebGLRenderer qua onCreated (gộp onCreated cũ),
 *   - phủ một nút "AR" ở góc dưới-phải khung 3D (giống GeoGebra),
 *   - khi bấm:
 *       · Thiết bị hỗ trợ WebXR `immersive-ar` (Android/Quest) → vào AR REALTIME
 *         (cảnh sống, dò mặt phẳng, chạm để đặt) — ARRealtimeController xử lý.
 *       · Còn lại (iOS/desktop) → xuất GLB/USDZ rồi mở model-viewer / Quick Look / QR.
 *
 * Áp dụng cho mọi lab LabTwin và mọi mô phỏng Aura có cảnh 3D.
 */
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { Canvas } from '@react-three/fiber'
import type * as THREE from 'three'
import { ARLaunchButton } from './ARLaunchButton'
import { ARRealtimeController } from './ARRealtimeController'

type CanvasProps = ComponentProps<typeof Canvas>

export interface XRCanvasProps extends CanvasProps {
  /** Tiêu đề hiển thị trong lớp phủ AR */
  arTitle?: string
  /** Tắt nút AR cho cảnh không phù hợp (mặc định bật) */
  arEnabled?: boolean
  /** Báo trạng thái đang trong phiên AR realtime — để cảnh ẩn bớt hiệu ứng nặng (Stars/Bloom/nhãn) */
  onPresentingChange?: (presenting: boolean) => void
}

export function XRCanvas({
  children,
  onCreated,
  arTitle,
  arEnabled = true,
  onPresentingChange,
  ...rest
}: XRCanvasProps) {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [presenting, setPresenting] = useState(false)
  const [cmPerUnit, setCmPerUnit] = useState<number | null>(null)
  const [arPhase, setArPhase] = useState<'searching' | 'ready' | 'placed' | null>(null)

  useEffect(() => { onPresentingChange?.(presenting) }, [presenting, onPresentingChange])

  const handlePlacedScale = useCallback((v: number | null) => {
    setCmPerUnit((prev) => {
      if (v === null) return null
      const rounded = Math.round(v * 10) / 10
      return prev === rounded ? prev : rounded
    })
  }, [])

  /** Vào AR realtime qua WebXR. Ném lỗi nếu không khả dụng → caller fallback model. */
  const enterRealtimeAR = useCallback(async () => {
    const gl = glRef.current
    const xr = (navigator as any).xr
    if (!gl || !xr?.requestSession) throw new Error('WebXR AR không khả dụng')
    const session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor'],
      ...(wrapperRef.current ? { domOverlay: { root: wrapperRef.current } } : {}),
    })
    const glxr: any = gl.xr
    glxr.enabled = true
    try {
      glxr.setReferenceSpaceType('local')
    } catch {
      /* một số runtime không cho đổi — bỏ qua */
    }
    await glxr.setSession(session)
    setPresenting(true)
    session.addEventListener('end', () => setPresenting(false), { once: true })
  }, [])

  const exitAR = useCallback(() => {
    const session = (glRef.current?.xr as any)?.getSession?.()
    session?.end?.()
  }, [])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        {...rest}
        onCreated={(state) => {
          sceneRef.current = state.scene
          glRef.current = state.gl
          onCreated?.(state)
        }}
      >
        {children}
        {arEnabled && <ARRealtimeController onPlacedScale={handlePlacedScale} onPhase={setArPhase} />}
      </Canvas>

      {arEnabled && !presenting && (
        <ARLaunchButton sceneRef={sceneRef} title={arTitle} onRealtimeAR={enterRealtimeAR} />
      )}

      {presenting && (
        <button
          onClick={exitAR}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 40,
            padding: '10px 16px',
            borderRadius: 999,
            border: 'none',
            background: 'rgba(220,38,38,0.92)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
          }}
        >
          ✕ Thoát AR
        </button>
      )}

      {presenting && cmPerUnit !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(15,23,42,0.82)',
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          📐 1 đơn vị ≈ {cmPerUnit.toFixed(1)} cm · chụm 2 ngón để chỉnh
        </div>
      )}

      {presenting && arPhase && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            maxWidth: '88%',
            padding: '9px 16px',
            borderRadius: 14,
            background: arPhase === 'ready' ? 'rgba(8,145,178,0.92)' : 'rgba(15,23,42,0.85)',
            color: '#f1f5f9',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.35,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          {arPhase === 'searching' && '🔍 Di chuyển điện thoại quét mặt bàn/sàn để nhận diện mặt phẳng — hoặc chạm để đặt ngay trước mặt'}
          {arPhase === 'ready' && '✅ Đã nhận diện mặt phẳng — chạm màn hình để đặt'}
          {arPhase === 'placed' && '✓ Đã đặt — chạm chỗ khác để di chuyển · chụm 2 ngón để phóng to/thu nhỏ'}
        </div>
      )}
    </div>
  )
}

export default XRCanvas
