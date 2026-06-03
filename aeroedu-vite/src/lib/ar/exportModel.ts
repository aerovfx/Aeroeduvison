/**
 * exportModel — xuất cảnh THREE.js đang hiển thị ra file 3D để đưa vào AR.
 *
 *  - GLB  (GLTFExporter): dùng cho model-viewer / WebXR / Scene Viewer (Android, Quest)
 *  - USDZ (USDZExporter): dùng cho AR Quick Look (iOS / iPadOS / app Capacitor)
 *
 * Cả hai exporter đều có sẵn trong gói `three` (examples/jsm) — không thêm phụ thuộc npm.
 * Nạp động (dynamic import) để không phình bundle khi chưa dùng AR.
 * Animation `useFrame` (imperative) KHÔNG nằm trong AnimationClip nên exporter mặc
 * định xuất cảnh TĨNH → AR đứng hình. `bakeSceneAnimation` ghi lại chuyển động vài
 * giây thành AnimationClip để GLB (model-viewer/Scene Viewer) phát được hoạt hình.
 */
import * as THREE from 'three'

/**
 * Ghi (bake) chuyển động đang chạy của cảnh thành AnimationClip bằng cách lấy mẫu
 * transform mỗi frame trong `duration` giây. Chỉ giữ track của node CÓ thay đổi.
 * Trả null nếu cảnh tĩnh / quá lớn / không có chuyển động.
 */
export async function bakeSceneAnimation(
  scene: THREE.Object3D,
  opts: { duration?: number; fps?: number } = {},
): Promise<THREE.AnimationClip | null> {
  const duration = opts.duration ?? 3
  const fps = opts.fps ?? 20
  const nodes: THREE.Object3D[] = []
  scene.traverse((o) => nodes.push(o))
  if (nodes.length > 1500) return null  // cảnh quá lớn → bỏ qua cho nhẹ
  nodes.forEach((n, i) => { if (!n.name) n.name = `bakeNode_${i}` })

  const times: number[] = []
  const P = new Map<THREE.Object3D, number[]>()
  const Q = new Map<THREE.Object3D, number[]>()
  const S = new Map<THREE.Object3D, number[]>()
  nodes.forEach((n) => { P.set(n, []); Q.set(n, []); S.set(n, []) })
  const frames = Math.max(2, Math.round(duration * fps))
  const start = performance.now()

  return new Promise((resolve) => {
    let f = 0
    const cap = () => {
      times.push((performance.now() - start) / 1000)
      for (const n of nodes) {
        P.get(n)!.push(n.position.x, n.position.y, n.position.z)
        Q.get(n)!.push(n.quaternion.x, n.quaternion.y, n.quaternion.z, n.quaternion.w)
        S.get(n)!.push(n.scale.x, n.scale.y, n.scale.z)
      }
      if (++f >= frames) {
        const changed = (arr: number[], stride: number) => {
          for (let c = 0; c < stride; c++) {
            const v0 = arr[c]
            for (let k = c + stride; k < arr.length; k += stride)
              if (Math.abs(arr[k] - v0) > 1e-4) return true
          }
          return false
        }
        const tracks: THREE.KeyframeTrack[] = []
        for (const n of nodes) {
          const p = P.get(n)!, q = Q.get(n)!, s = S.get(n)!
          if (changed(p, 3)) tracks.push(new THREE.VectorKeyframeTrack(`${n.name}.position`, times, p))
          if (changed(q, 4)) tracks.push(new THREE.QuaternionKeyframeTrack(`${n.name}.quaternion`, times, q))
          if (changed(s, 3)) tracks.push(new THREE.VectorKeyframeTrack(`${n.name}.scale`, times, s))
        }
        if (!tracks.length) return resolve(null)
        resolve(new THREE.AnimationClip('bake', times[times.length - 1] || duration, tracks))
        return
      }
      requestAnimationFrame(cap)
    }
    requestAnimationFrame(cap)
  })
}

/** Xuất cảnh sang GLB (binary glTF). Kèm AnimationClip nếu có → AR phát hoạt hình. */
export async function exportSceneToGLB(scene: THREE.Object3D, clip?: THREE.AnimationClip | null): Promise<Blob> {
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
        { binary: true, onlyVisible: true, truncateDrawRange: true, animations: clip ? [clip] : [] },
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
