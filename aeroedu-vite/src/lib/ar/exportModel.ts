/**
 * exportModel — xuất cảnh THREE.js đang hiển thị ra file 3D để đưa vào AR.
 *
 *  - GLB  (GLTFExporter): dùng cho model-viewer / WebXR / Scene Viewer (Android, Quest)
 *  - USDZ (USDZExporter): dùng cho AR Quick Look (iOS / iPadOS / app Capacitor)
 *
 * Cả hai exporter đều có sẵn trong gói `three` (examples/jsm) — không thêm phụ thuộc npm.
 * Nạp động (dynamic import) để không phình bundle khi chưa dùng AR.
 * Cảnh được "đóng băng" tại trạng thái hiện tại (snapshot) rồi đặt lên mặt thật trong AR.
 */
import type * as THREE from 'three'

/** Xuất cảnh sang GLB (binary glTF). */
export async function exportSceneToGLB(scene: THREE.Object3D): Promise<Blob> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  return new Promise<Blob>((resolve, reject) => {
    try {
      const exporter = new GLTFExporter()
      exporter.parse(
        scene,
        (result: ArrayBuffer | object) => {
          if (result instanceof ArrayBuffer) {
            resolve(new Blob([result], { type: 'model/gltf-binary' }))
          } else {
            resolve(new Blob([JSON.stringify(result)], { type: 'model/gltf+json' }))
          }
        },
        (error: unknown) =>
          reject(error instanceof Error ? error : new Error('GLB export thất bại')),
        { binary: true, onlyVisible: true, truncateDrawRange: true },
      )
    } catch (e) {
      reject(e instanceof Error ? e : new Error('GLB export thất bại'))
    }
  })
}

/**
 * Xuất cảnh sang USDZ cho AR Quick Look (iOS). Best-effort:
 * một số material/shader tuỳ biến có thể không xuất được → trả null, FE tự xử lý.
 */
export async function exportSceneToUSDZ(scene: THREE.Object3D): Promise<Blob | null> {
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')
  const exporter: any = new USDZExporter()
  const data = exporter.parseAsync ? await exporter.parseAsync(scene) : await exporter.parse(scene)
  if (!data) return null
  return new Blob([data], { type: 'model/vnd.usdz+zip' })
}
