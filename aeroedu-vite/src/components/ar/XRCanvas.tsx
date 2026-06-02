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
import { useCallback, useRef, useState, type ComponentProps } from 'react'
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
}

export function XRCanvas({
  children,
  onCreated,
  arTitle,
  arEnabled = true,
  ...rest
}: XRCanvasProps) {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [presenting, setPresenting] = useState(false)

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
        {arEnabled && <ARRealtimeController />}
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
    </div>
  )
}

export default XRCanvas
