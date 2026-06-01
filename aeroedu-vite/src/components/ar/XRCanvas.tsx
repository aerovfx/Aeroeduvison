/**
 * XRCanvas — drop-in thay cho <Canvas> của @react-three/fiber, bổ sung nút "AR".
 *
 * Cách dùng: đổi `<Canvas ...>` → `<XRCanvas ...>` (giữ nguyên mọi prop/children).
 * Component sẽ:
 *   - bắt tham chiếu tới THREE.Scene qua onCreated (gộp với onCreated sẵn có),
 *   - phủ một nút "AR" ở góc dưới-phải khung 3D (giống GeoGebra),
 *   - khi bấm → xuất cảnh hiện tại ra GLB/USDZ và mở AR (đặt lên mặt bàn thật).
 *
 * Áp dụng cho mọi lab LabTwin và mọi mô phỏng Aura có cảnh 3D.
 */
import { useRef, type ComponentProps } from 'react'
import { Canvas } from '@react-three/fiber'
import type * as THREE from 'three'
import { ARLaunchButton } from './ARLaunchButton'

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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        {...rest}
        onCreated={(state) => {
          sceneRef.current = state.scene
          onCreated?.(state)
        }}
      >
        {children}
      </Canvas>
      {arEnabled && <ARLaunchButton sceneRef={sceneRef} title={arTitle} />}
    </div>
  )
}

export default XRCanvas
