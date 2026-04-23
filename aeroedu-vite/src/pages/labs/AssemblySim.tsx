/**
 * Assembly Sim — Lắp ráp 3D bằng cử chỉ
 *
 * 3 bài học lắp ráp các chi tiết 3D sử dụng cử chỉ "pinch" (chụm ngón cái + trỏ)
 * để grab / drop, snap vào vị trí mục tiêu với tolerance.
 *
 * Bài học:
 *   1. Hộp chữ nhật — 6 mặt (top / bottom / front / back / left / right)
 *   2. Hình trụ tròn — 3 chi tiết (đáy + thân + nắp)
 *   3. Động cơ đốt trong — 6 chi tiết (block / piston / connecting rod /
 *      crankshaft / spark plug / valve)
 *
 * Điều khiển:
 *   • Pinch (chụm ngón cái + trỏ) và giữ ≈ grab chi tiết gần nhất
 *   • Mở tay ra ≈ drop (tự snap nếu trong tolerance)
 *   • Fallback chuột: click + drag để grab chi tiết
 *
 * MediaPipe tasks-vision loaded từ CDN runtime — không phải deps.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import {
  ChevronLeft, Camera, CameraOff, RotateCcw, Power, Loader2,
  AlertTriangle, CheckCircle2, Package, Disc, Cog, HandMetal,
} from 'lucide-react'

// ── MediaPipe types (loose, loaded at runtime) ──────────────────
type Landmark = { x: number; y: number; z: number }
type HandResult = {
  landmarks: Landmark[][]
  handedness?: { categoryName: string }[][]
}
type HandLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, ts: number) => HandResult
  close?: () => void
}

const MP_VERSION = '0.10.32'
const WASM_BASE = '/mediapipe-wasm/wasm'
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

// ── Types ───────────────────────────────────────────────────────
interface PartSpec {
  id: string
  label: string
  description: string
  color: string
  emissive?: string
  geometry: () => THREE.BufferGeometry
  startPosition: [number, number, number]
  targetPosition: [number, number, number]
  targetRotation?: [number, number, number]
  snapTolerance?: number
}

interface LessonSpec {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  cameraPosition: [number, number, number]
  groundY?: number
  parts: PartSpec[]
}

// Runtime 3D instance for a part
interface PartInstance {
  spec: PartSpec
  mesh: THREE.Mesh
  ghost: THREE.LineSegments
  placed: boolean
}

// ── Lesson definitions ──────────────────────────────────────────
const LESSONS: LessonSpec[] = [
  // ── 1. Rectangular box ──
  {
    id: 'box',
    name: 'Hộp chữ nhật',
    icon: <Package className="w-4 h-4" />,
    description:
      'Lắp ráp 6 mặt tạo thành một hộp chữ nhật. Bài tập về nhận diện mặt ghép và vị trí không gian.',
    cameraPosition: [6, 5, 9],
    groundY: -2,
    parts: [
      {
        id: 'bottom',
        label: 'Đáy',
        description: 'Mặt đáy nằm ngang (4×3).',
        color: '#3b82f6',
        geometry: () => new THREE.BoxGeometry(4, 0.12, 3),
        startPosition: [-5, 0.5, 2],
        targetPosition: [0, -1, 0],
      },
      {
        id: 'top',
        label: 'Nắp',
        description: 'Mặt trên đối diện đáy.',
        color: '#60a5fa',
        geometry: () => new THREE.BoxGeometry(4, 0.12, 3),
        startPosition: [-5, 2, -2],
        targetPosition: [0, 1, 0],
      },
      {
        id: 'front',
        label: 'Mặt trước',
        description: 'Mặt đứng phía trước (4×2).',
        color: '#f472b6',
        geometry: () => new THREE.BoxGeometry(4, 2, 0.12),
        startPosition: [-5, 1, 4],
        targetPosition: [0, 0, 1.5],
      },
      {
        id: 'back',
        label: 'Mặt sau',
        description: 'Mặt đứng phía sau.',
        color: '#ec4899',
        geometry: () => new THREE.BoxGeometry(4, 2, 0.12),
        startPosition: [-5, 1, -4],
        targetPosition: [0, 0, -1.5],
      },
      {
        id: 'left',
        label: 'Cạnh trái',
        description: 'Mặt đứng bên trái (3×2).',
        color: '#34d399',
        geometry: () => new THREE.BoxGeometry(0.12, 2, 3),
        startPosition: [5, 1, 3],
        targetPosition: [-2, 0, 0],
      },
      {
        id: 'right',
        label: 'Cạnh phải',
        description: 'Mặt đứng bên phải.',
        color: '#10b981',
        geometry: () => new THREE.BoxGeometry(0.12, 2, 3),
        startPosition: [5, 1, -3],
        targetPosition: [2, 0, 0],
      },
    ],
  },
  // ── 2. Cylinder ──
  {
    id: 'cylinder',
    name: 'Hình trụ tròn',
    icon: <Disc className="w-4 h-4" />,
    description:
      'Lắp ráp 3 chi tiết: đáy tròn + thân trụ + nắp tròn. Bài tập về đối xứng quay.',
    cameraPosition: [5, 4, 8],
    groundY: -2,
    parts: [
      {
        id: 'bottom-cap',
        label: 'Đáy trụ',
        description: 'Đáy tròn phẳng (R=1.2, h=0.1).',
        color: '#f59e0b',
        geometry: () => new THREE.CylinderGeometry(1.2, 1.2, 0.1, 40),
        startPosition: [-4, 0.5, 2],
        targetPosition: [0, -1, 0],
      },
      {
        id: 'body',
        label: 'Thân trụ',
        description: 'Ống trụ rỗng (R=1.15, h=2).',
        color: '#fbbf24',
        geometry: () => {
          // Hollow cylinder shell
          return new THREE.CylinderGeometry(1.15, 1.15, 2, 40, 1, true)
        },
        startPosition: [4, 0.2, 2],
        targetPosition: [0, 0, 0],
      },
      {
        id: 'top-cap',
        label: 'Nắp trụ',
        description: 'Nắp tròn phẳng ở trên.',
        color: '#fcd34d',
        geometry: () => new THREE.CylinderGeometry(1.2, 1.2, 0.1, 40),
        startPosition: [0, 2.5, -3],
        targetPosition: [0, 1, 0],
      },
    ],
  },
  // ── 3. Internal Combustion Engine ──
  {
    id: 'engine',
    name: 'Động cơ đốt trong',
    icon: <Cog className="w-4 h-4" />,
    description:
      'Lắp ráp đơn giản động cơ piston: block xy-lanh + piston + tay biên + trục khuỷu + bugi + xu-páp.',
    cameraPosition: [7, 5, 9],
    groundY: -3,
    parts: [
      {
        id: 'block',
        label: 'Block xy-lanh',
        description: 'Khối xy-lanh bao quanh piston.',
        color: '#64748b',
        emissive: '#1e293b',
        geometry: () => new THREE.BoxGeometry(2.4, 3, 2.4),
        startPosition: [-5, 0.5, 3],
        targetPosition: [0, 0, 0],
      },
      {
        id: 'piston',
        label: 'Piston',
        description: 'Piston trượt lên xuống trong xy-lanh.',
        color: '#cbd5e1',
        geometry: () => new THREE.CylinderGeometry(0.8, 0.8, 0.9, 32),
        startPosition: [-5, 2, 0],
        targetPosition: [0, 0.2, 0],
      },
      {
        id: 'conrod',
        label: 'Tay biên',
        description: 'Thanh truyền nối piston và trục khuỷu.',
        color: '#94a3b8',
        geometry: () => new THREE.BoxGeometry(0.35, 2, 0.3),
        startPosition: [-2, -0.5, 4],
        targetPosition: [0, -1, 0],
      },
      {
        id: 'crankshaft',
        label: 'Trục khuỷu',
        description: 'Biến chuyển động thẳng của piston thành quay.',
        color: '#1f2937',
        emissive: '#374151',
        geometry: () => new THREE.CylinderGeometry(0.35, 0.35, 2.8, 24),
        startPosition: [3, -0.5, 4],
        targetPosition: [0, -2.2, 0],
        targetRotation: [0, 0, Math.PI / 2],
      },
      {
        id: 'spark-plug',
        label: 'Bugi',
        description: 'Đốt cháy hỗn hợp khí nhiên liệu.',
        color: '#ef4444',
        emissive: '#991b1b',
        geometry: () => new THREE.CylinderGeometry(0.18, 0.22, 0.7, 20),
        startPosition: [3, 1, 3],
        targetPosition: [0, 1.9, 0],
      },
      {
        id: 'valve',
        label: 'Xu-páp',
        description: 'Cơ cấu nạp / xả khí.',
        color: '#f97316',
        geometry: () => {
          const g = new THREE.CylinderGeometry(0.1, 0.3, 0.8, 16)
          return g
        },
        startPosition: [5, 1.5, 1],
        targetPosition: [0.7, 1.7, 0.7],
      },
    ],
  },
]

// ── Gesture ─────────────────────────────────────────────────────
// Pinch = thumb tip (4) close to index tip (8) in 2D space
function isPinch(lm: Landmark[]): { pinching: boolean; tip: Landmark } | null {
  if (!lm || lm.length < 21) return null
  const thumb = lm[4], index = lm[8]
  const d = Math.hypot(thumb.x - index.x, thumb.y - index.y)
  const pinching = d < 0.06
  return { pinching, tip: { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2, z: (thumb.z + index.z) / 2 } }
}

// ── Page ────────────────────────────────────────────────────────
export default function AssemblySim() {
  const containerRef  = useRef<HTMLDivElement | null>(null)
  const videoRef      = useRef<HTMLVideoElement | null>(null)
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [lessonIdx, setLessonIdx] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading-mp' | 'ready' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [pinching, setPinching] = useState(false)
  const [grabbedId, setGrabbedId] = useState<string | null>(null)
  const [placedIds, setPlacedIds] = useState<string[]>([])
  const [fps, setFps] = useState(0)
  const [resetTick, setResetTick] = useState(0)

  // Mutable ref for the render loop
  const lessonIdxRef = useRef(lessonIdx)
  useEffect(() => { lessonIdxRef.current = lessonIdx }, [lessonIdx])

  // Hand state — written by MP loop
  const handRef = useRef<{
    tip: THREE.Vector3 | null
    pinching: boolean
    timestamp: number
  }>({ tip: null, pinching: false, timestamp: 0 })

  // Mouse fallback
  const mouseRef = useRef<{ pos: THREE.Vector3 | null; pressed: boolean }>({
    pos: null, pressed: false,
  })

  // Grabbed part id (used by render loop)
  const grabRef = useRef<string | null>(null)
  useEffect(() => { grabRef.current = grabbedId }, [grabbedId])

  // Placed ids (ref for render loop)
  const placedRef = useRef<Set<string>>(new Set())
  useEffect(() => { placedRef.current = new Set(placedIds) }, [placedIds])

  const landmarkerRef = useRef<HandLandmarkerInstance | null>(null)
  const rafRef = useRef<number>(0)

  const currentLesson = LESSONS[lessonIdx]

  // ── Reset when lesson changes or user hits Reset ────────────
  useEffect(() => {
    setGrabbedId(null)
    setPlacedIds([])
  }, [lessonIdx, resetTick])

  // ── Three.js scene setup ────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0b1324')
    scene.fog = new THREE.Fog('#0b1324', 18, 50)

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200)
    const [cx, cy, cz] = currentLesson.cameraPosition
    camera.position.set(cx, cy, cz)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(5, 10, 7)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 40
    key.shadow.camera.left = -10
    key.shadow.camera.right = 10
    key.shadow.camera.top = 10
    key.shadow.camera.bottom = -10
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x7cc0ff, 0.3)
    fill.position.set(-5, 4, -5)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xff99cc, 0.25)
    rim.position.set(0, 2, -8)
    scene.add(rim)

    // Ground plane
    const groundY = currentLesson.groundY ?? -2
    const groundGeom = new THREE.PlaneGeometry(30, 30)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, roughness: 1, metalness: 0,
    })
    const ground = new THREE.Mesh(groundGeom, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = groundY
    ground.receiveShadow = true
    scene.add(ground)

    // Grid helper (subtle)
    const grid = new THREE.GridHelper(20, 20, 0x334155, 0x1f2a44)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.35
    grid.position.y = groundY + 0.01
    scene.add(grid)

    // ── Build part instances ──────────────────────────────────
    const parts: PartInstance[] = currentLesson.parts.map((spec) => {
      const geom = spec.geometry()
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.emissive ? new THREE.Color(spec.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: 0.25,
        metalness: 0.25,
        roughness: 0.55,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.position.set(spec.startPosition[0], spec.startPosition[1], spec.startPosition[2])
      mesh.userData.partId = spec.id
      scene.add(mesh)

      // Ghost (wireframe target outline)
      const edges = new THREE.EdgesGeometry(geom)
      const ghostMat = new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.45,
      })
      const ghost = new THREE.LineSegments(edges, ghostMat)
      ghost.position.set(spec.targetPosition[0], spec.targetPosition[1], spec.targetPosition[2])
      if (spec.targetRotation) {
        ghost.rotation.set(spec.targetRotation[0], spec.targetRotation[1], spec.targetRotation[2])
      }
      scene.add(ghost)

      return { spec, mesh, ghost, placed: false }
    })

    // Highlight ring (shown over grabbed part)
    const ringGeom = new THREE.TorusGeometry(1.2, 0.06, 12, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee, transparent: true, opacity: 0.8,
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.visible = false
    scene.add(ring)

    // ── Resize ─────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    onResize()
    const resizeObs = new ResizeObserver(onResize)
    resizeObs.observe(container)

    // ── Mouse picking / drag ──────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) // z=0 plane, updated each frame

    const screenToWorld = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const out = new THREE.Vector3()
      raycaster.ray.intersectPlane(dragPlane, out)
      return out
    }

    const onMouseDown = (ev: MouseEvent) => {
      if (ev.button !== 0) return
      mouseRef.current.pressed = true
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(parts.map((p) => p.mesh), false)
      if (hits.length > 0) {
        const id = hits[0].object.userData.partId as string
        if (!placedRef.current.has(id)) {
          grabRef.current = id
          setGrabbedId(id)
          // Update drag plane to pass through the hit point, facing camera
          dragPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()).negate(),
            hits[0].point,
          )
          mouseRef.current.pos = hits[0].point.clone()
        }
      }
    }

    const onMouseMove = (ev: MouseEvent) => {
      if (!mouseRef.current.pressed) return
      const world = screenToWorld(ev)
      mouseRef.current.pos = world
    }

    const onMouseUp = () => {
      mouseRef.current.pressed = false
      mouseRef.current.pos = null
      // Try to snap on release
      const id = grabRef.current
      if (id) {
        const part = parts.find((p) => p.spec.id === id)
        if (part) {
          const target = new THREE.Vector3(
            part.spec.targetPosition[0],
            part.spec.targetPosition[1],
            part.spec.targetPosition[2],
          )
          const tol = part.spec.snapTolerance ?? 0.9
          if (part.mesh.position.distanceTo(target) < tol) {
            part.mesh.position.copy(target)
            if (part.spec.targetRotation) {
              part.mesh.rotation.set(
                part.spec.targetRotation[0],
                part.spec.targetRotation[1],
                part.spec.targetRotation[2],
              )
            }
            part.placed = true
            const next = new Set(placedRef.current)
            next.add(id)
            placedRef.current = next
            setPlacedIds(Array.from(next))
          }
        }
      }
      grabRef.current = null
      setGrabbedId(null)
    }

    const dom = renderer.domElement
    dom.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    dom.addEventListener('contextmenu', (e) => e.preventDefault())

    // ── Animation loop ────────────────────────────────────────
    let last = performance.now()
    let frame = 0
    let fpsAccum = 0
    const clock = new THREE.Clock()

    const tmpVec = new THREE.Vector3()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const t = clock.getElapsedTime()

      // Gentle camera orbit unless user is pinching / dragging (so UX stays predictable)
      const orbitSpeed = (handRef.current.pinching || mouseRef.current.pressed) ? 0 : 0.08
      const radius = Math.hypot(cx, cz)
      const angle0 = Math.atan2(cz, cx)
      const ang = angle0 + t * orbitSpeed
      camera.position.x = Math.cos(ang) * radius
      camera.position.z = Math.sin(ang) * radius
      camera.position.y = cy
      camera.lookAt(0, 0, 0)

      // Determine target cursor position in world space (hand OR mouse)
      let cursor: THREE.Vector3 | null = null
      if (handRef.current.tip && handRef.current.pinching) {
        // Map hand NDC (0..1) to world via raycast to a plane at z=0
        const tip = handRef.current.tip
        ndc.x = (tip.x - 0.5) * -2  // mirrored camera
        ndc.y = -(tip.y - 0.5) * 2
        raycaster.setFromCamera(ndc, camera)
        const plane = new THREE.Plane(camera.getWorldDirection(new THREE.Vector3()).negate(), 0)
        const w = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, w)
        cursor = w
      } else if (mouseRef.current.pressed && mouseRef.current.pos) {
        cursor = mouseRef.current.pos
      }

      // Auto-grab nearest unplaced part if pinching and nothing grabbed
      if ((handRef.current.pinching || mouseRef.current.pressed) && !grabRef.current && cursor) {
        let closest: PartInstance | null = null
        let bestDist = 2.5
        for (const p of parts) {
          if (p.placed) continue
          const d = p.mesh.position.distanceTo(cursor)
          if (d < bestDist) {
            bestDist = d
            closest = p
          }
        }
        if (closest) {
          grabRef.current = closest.spec.id
          setGrabbedId(closest.spec.id)
        }
      }

      // Follow cursor if grabbed
      if (grabRef.current && cursor) {
        const part = parts.find((p) => p.spec.id === grabRef.current)
        if (part) {
          part.mesh.position.lerp(cursor, 0.35)
        }
      }

      // Detect release for hand (pinching went false)
      if (!handRef.current.pinching && !mouseRef.current.pressed && grabRef.current) {
        const id = grabRef.current
        const part = parts.find((p) => p.spec.id === id)
        if (part) {
          const target = new THREE.Vector3(
            part.spec.targetPosition[0],
            part.spec.targetPosition[1],
            part.spec.targetPosition[2],
          )
          const tol = part.spec.snapTolerance ?? 0.95
          if (part.mesh.position.distanceTo(target) < tol) {
            part.mesh.position.copy(target)
            if (part.spec.targetRotation) {
              part.mesh.rotation.set(
                part.spec.targetRotation[0],
                part.spec.targetRotation[1],
                part.spec.targetRotation[2],
              )
            }
            part.placed = true
            const next = new Set(placedRef.current)
            next.add(id)
            placedRef.current = next
            setPlacedIds(Array.from(next))
          }
        }
        grabRef.current = null
        setGrabbedId(null)
      }

      // Proximity hint — pulse ghost opacity for unplaced parts when cursor near target
      for (const p of parts) {
        const mat = p.ghost.material as THREE.LineBasicMaterial
        if (p.placed) {
          mat.opacity = 0
        } else if (cursor) {
          const tgt = new THREE.Vector3(
            p.spec.targetPosition[0],
            p.spec.targetPosition[1],
            p.spec.targetPosition[2],
          )
          const d = cursor.distanceTo(tgt)
          const pulse = 0.4 + 0.35 * Math.sin(t * 4)
          mat.opacity = d < 1.6 ? pulse : 0.32
        } else {
          mat.opacity = 0.3
        }

        // Glow for grabbed
        const mesh = p.mesh
        const standard = mesh.material as THREE.MeshStandardMaterial
        if (p.spec.id === grabRef.current) {
          standard.emissiveIntensity = 0.85
        } else if (p.placed) {
          standard.emissiveIntensity = 0.15
        } else {
          standard.emissiveIntensity = 0.25
        }
      }

      // Ring over grabbed part
      if (grabRef.current) {
        const part = parts.find((p) => p.spec.id === grabRef.current)
        if (part) {
          ring.visible = true
          ring.position.copy(part.mesh.position)
          // Size ring to mesh bounds
          const box = new THREE.Box3().setFromObject(part.mesh)
          const size = box.getSize(tmpVec)
          const r = Math.max(size.x, size.z) * 0.65 + 0.25
          ring.scale.setScalar(r / 1.2)
          const ringMatRef = ring.material as THREE.MeshBasicMaterial
          ringMatRef.opacity = 0.6 + 0.3 * Math.sin(t * 6)
        }
      } else {
        ring.visible = false
      }

      // FPS
      frame++
      fpsAccum += dt
      if (fpsAccum >= 0.5) {
        setFps(Math.round(frame / fpsAccum))
        frame = 0
        fpsAccum = 0
      }

      renderer.clear()
      renderer.render(scene, camera)
    }
    animate()

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObs.disconnect()
      dom.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      parts.forEach((p) => {
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        p.ghost.geometry.dispose()
        ;(p.ghost.material as THREE.Material).dispose()
      })
      ringGeom.dispose()
      ringMat.dispose()
      groundGeom.dispose()
      groundMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [lessonIdx, resetTick])
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // ── Start camera + MediaPipe ────────────────────────────────
  const startCamera = useCallback(async () => {
    setErrorMsg('')
    setStatus('loading-mp')
    try {
      const mp: any = await import(
        /* @vite-ignore */ `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`
      )
      const { HandLandmarker, FilesetResolver } = mp
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      landmarkerRef.current = landmarker as HandLandmarkerInstance

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      // Wait up to ~250ms for video element to mount (defensive — luôn mounted ở UI hiện tại)
      let video = videoRef.current
      if (!video) {
        for (let i = 0; i < 15 && !video; i++) {
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 16)))
          video = videoRef.current
        }
      }
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        throw new Error('Video element not mounted')
      }
      video.srcObject = stream
      await video.play()
      setCameraOn(true)
      setStatus('ready')

      // MP detection loop
      let lastTs = -1
      const loop = () => {
        if (!landmarkerRef.current || !videoRef.current) return
        const v = videoRef.current
        if (v.readyState >= 2) {
          const ts = performance.now()
          if (ts !== lastTs) {
            lastTs = ts
            const res = landmarkerRef.current.detectForVideo(v, ts)
            if (res && res.landmarks && res.landmarks.length > 0) {
              const lm = res.landmarks[0]
              const p = isPinch(lm)
              if (p) {
                handRef.current.tip = new THREE.Vector3(p.tip.x, p.tip.y, p.tip.z)
                handRef.current.pinching = p.pinching
                handRef.current.timestamp = ts
                setPinching(p.pinching)
              }
              // Draw overlay
              const cvs = handCanvasRef.current
              if (cvs) {
                const ctx = cvs.getContext('2d')
                if (ctx) {
                  cvs.width = v.videoWidth || 640
                  cvs.height = v.videoHeight || 480
                  ctx.clearRect(0, 0, cvs.width, cvs.height)
                  // Draw landmarks (mirrored)
                  ctx.save()
                  ctx.translate(cvs.width, 0)
                  ctx.scale(-1, 1)
                  // Connections (hand skeleton)
                  const CONN: [number, number][] = [
                    [0, 1], [1, 2], [2, 3], [3, 4],
                    [0, 5], [5, 6], [6, 7], [7, 8],
                    [5, 9], [9, 10], [10, 11], [11, 12],
                    [9, 13], [13, 14], [14, 15], [15, 16],
                    [13, 17], [17, 18], [18, 19], [19, 20],
                    [0, 17],
                  ]
                  ctx.strokeStyle = p && p.pinching ? '#f59e0b' : '#22d3ee'
                  ctx.lineWidth = 2
                  CONN.forEach(([a, b]) => {
                    ctx.beginPath()
                    ctx.moveTo(lm[a].x * cvs.width, lm[a].y * cvs.height)
                    ctx.lineTo(lm[b].x * cvs.width, lm[b].y * cvs.height)
                    ctx.stroke()
                  })
                  // Dots
                  lm.forEach((pt, i) => {
                    ctx.fillStyle = (i === 4 || i === 8) ? '#f472b6' : '#a7f3d0'
                    ctx.beginPath()
                    ctx.arc(pt.x * cvs.width, pt.y * cvs.height, i === 4 || i === 8 ? 5 : 3, 0, Math.PI * 2)
                    ctx.fill()
                  })
                  // Pinch-distance indicator line
                  if (p) {
                    ctx.strokeStyle = p.pinching ? '#fbbf24' : '#e2e8f0'
                    ctx.lineWidth = p.pinching ? 3 : 1.5
                    ctx.setLineDash(p.pinching ? [] : [3, 3])
                    ctx.beginPath()
                    ctx.moveTo(lm[4].x * cvs.width, lm[4].y * cvs.height)
                    ctx.lineTo(lm[8].x * cvs.width, lm[8].y * cvs.height)
                    ctx.stroke()
                    ctx.setLineDash([])
                  }
                  ctx.restore()
                }
              }
            } else {
              handRef.current.tip = null
              handRef.current.pinching = false
              setPinching(false)
              const cvs = handCanvasRef.current
              if (cvs) {
                const ctx = cvs.getContext('2d')
                if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height)
              }
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.message || String(err) || 'Không thể khởi tạo camera / MediaPipe')
      setStatus('error')
    }
  }, [])

  const stopCamera = useCallback(() => {
    const v = videoRef.current
    if (v && v.srcObject) {
      const stream = v.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      v.srcObject = null
    }
    try { landmarkerRef.current?.close?.() } catch { /* noop */ }
    landmarkerRef.current = null
    setCameraOn(false)
    setPinching(false)
    handRef.current = { tip: null, pinching: false, timestamp: 0 }
    setStatus('idle')
  }, [])

  useEffect(() => {
    return () => { stopCamera() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progressPct = useMemo(() => {
    if (currentLesson.parts.length === 0) return 0
    return Math.round((placedIds.length / currentLesson.parts.length) * 100)
  }, [placedIds, currentLesson])

  const allDone = placedIds.length === currentLesson.parts.length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/dashboard/labtwin"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
            LabTwin
          </Link>
          <div className="text-slate-700">/</div>
          <div className="flex items-center gap-2">
            <HandMetal className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold">Assembly Sim</span>
            <span className="text-xs text-slate-500">— Lắp ráp 3D bằng cử chỉ</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline">FPS: {fps}</span>
            {pinching && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PINCH
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Lesson selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {LESSONS.map((L, i) => (
            <button
              key={L.id}
              onClick={() => setLessonIdx(i)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition text-sm font-medium ${
                i === lessonIdx
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100'
                  : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {L.icon}
              <span>{L.name}</span>
              <span className="text-xs text-slate-500">
                {L.parts.length} chi tiết
              </span>
            </button>
          ))}
        </div>

        {/* Main grid: 3D | side panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          {/* 3D viewport */}
          <div className="relative">
            <div
              ref={containerRef}
              className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-800 bg-slate-900"
            />

            {/* Camera overlay (top right inside viewport) — video LUÔN mounted để ref hợp lệ,
                chỉ ẩn visual khi camera off */}
            <div
              className={`absolute top-3 right-3 z-10 flex flex-col items-end gap-2 transition-opacity ${
                cameraOn ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-hidden={!cameraOn}
            >
              <div className="relative rounded-lg overflow-hidden border border-cyan-500/50 shadow-lg shadow-cyan-500/30 bg-slate-950">
                <video
                  ref={videoRef}
                  className="w-56 h-42 object-cover block scale-x-[-1]"
                  playsInline
                  muted
                />
                <canvas
                  ref={handCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </div>
            </div>

            {/* Instruction banner (bottom) */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-950/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-cyan-300 font-medium">{currentLesson.name}</span>
                  <span className="mx-2 text-slate-600">•</span>
                  <span className="text-slate-400">
                    {cameraOn
                      ? 'Chụm ngón cái + trỏ để kẹp, mở ra để thả'
                      : 'Click chuột giữ để kéo chi tiết (hoặc bật camera để dùng cử chỉ)'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">
                  {placedIds.length} / {currentLesson.parts.length} chi tiết đã lắp
                </div>
              </div>
            </div>

            {/* Loading / error overlay */}
            {status === 'loading-mp' && (
              <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang tải MediaPipe…
                </div>
              </div>
            )}
            {status === 'error' && errorMsg && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-6">
                <div className="max-w-md bg-rose-500/10 border border-rose-500/40 rounded-lg p-4 text-sm text-rose-200">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Lỗi khởi tạo
                  </div>
                  <div className="text-rose-300/80">{errorMsg}</div>
                  <button
                    onClick={() => { setStatus('idle'); setErrorMsg('') }}
                    className="mt-3 px-3 py-1 rounded bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 text-xs"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {/* Done banner */}
            {allDone && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-100 rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl shadow-emerald-500/20 pointer-events-auto">
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Hoàn thành!</div>
                    <div className="text-sm text-emerald-200/80">
                      Bạn đã lắp xong tất cả chi tiết của bài {currentLesson.name}.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-3">
            {/* Controls */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                {!cameraOn ? (
                  <button
                    onClick={startCamera}
                    disabled={status === 'loading-mp'}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold disabled:opacity-50"
                  >
                    {status === 'loading-mp' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    Bật camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white font-semibold"
                  >
                    <CameraOff className="w-4 h-4" />
                    Tắt camera
                  </button>
                )}
                <button
                  onClick={() => setResetTick((x) => x + 1)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Reset bài học"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="text-xs text-slate-400 mb-1 flex justify-between">
                <span>Tiến độ</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 rounded bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    allDone ? 'bg-emerald-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Parts checklist */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-sm font-semibold mb-3 text-slate-200">
                Danh sách chi tiết
              </div>
              <ul className="space-y-2">
                {currentLesson.parts.map((p) => {
                  const placed = placedIds.includes(p.id)
                  const grabbing = grabbedId === p.id
                  return (
                    <li
                      key={p.id}
                      className={`flex items-start gap-3 p-2 rounded-lg border transition ${
                        placed
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : grabbing
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded mt-1 shrink-0"
                        style={{ background: p.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${placed ? 'text-emerald-200 line-through' : 'text-slate-200'}`}>
                            {p.label}
                          </span>
                          {placed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {grabbing && (
                            <span className="text-xs text-amber-300 animate-pulse">
                              đang kẹp
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {p.description}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Lesson info */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-1">Về bài học</div>
              <p>{currentLesson.description}</p>
              <div className="mt-3 pt-3 border-t border-slate-800">
                <div className="font-semibold text-slate-300 mb-1">Mẹo</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Khung wireframe nhấp nháy cho biết vị trí mục tiêu.</li>
                  <li>Chi tiết đang kẹp có vòng sáng phát quanh.</li>
                  <li>Thả gần mục tiêu để tự động snap.</li>
                  <li>Không có camera? Dùng chuột kéo-thả vẫn được.</li>
                </ul>
              </div>
            </div>

            {/* Power hint */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex items-center gap-2 text-xs text-slate-500">
              <Power className="w-3.5 h-3.5" />
              WebGL + MediaPipe HandLandmarker chạy cục bộ trên trình duyệt.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
