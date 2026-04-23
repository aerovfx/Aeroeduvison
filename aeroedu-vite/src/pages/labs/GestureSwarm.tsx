/**
 * Murmuration AI — Gesture Swarm
 *
 * Một bầy hạt 3D ~1200 particles dùng InstancedMesh + boid behaviour
 * (cohesion / separation / alignment) tự lan toả trong không gian, được
 * điều khiển bằng cử chỉ tay qua MediaPipe HandLandmarker.
 *
 * Cử chỉ:
 *   • Mở bàn tay  → phát lực đẩy (đàn tản ra)
 *   • Nắm tay     → phát lực hút (đàn tụ về bàn tay)
 *   • Chỉ ngón trỏ → đàn bay theo hướng ngón
 *   • Không tay   → tự bay tự nhiên
 *
 * Fallback chuột: click giữ trái = hút, phải = đẩy.
 *
 * MediaPipe + model được load tại runtime từ CDN — không cần thêm
 * dependency vào package.json. WASM lấy từ /public/mediapipe-wasm/wasm
 * (đã có sẵn v0.10.32).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import {
  ChevronLeft, Camera, CameraOff, RotateCcw, Hand, Pointer, Power,
  Loader2, AlertTriangle, Sparkles,
} from 'lucide-react'

// ── Mediapipe types (loose — loaded dynamically) ─────────────────
type Landmark = { x: number; y: number; z: number }
type HandResult = {
  landmarks: Landmark[][]
  worldLandmarks?: Landmark[][]
  handedness?: { categoryName: string }[][]
}
type HandLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, ts: number) => HandResult
  close?: () => void
  setOptions?: (opts: Record<string, unknown>) => Promise<void>
}

const MP_VERSION = '0.10.32'
const WASM_BASE = '/mediapipe-wasm/wasm'
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

type Gesture = 'open' | 'fist' | 'point' | 'none'

// ── Gesture detection ─────────────────────────────────────────────
function detectGesture(lm: Landmark[]): Gesture {
  if (!lm || lm.length < 21) return 'none'
  // Landmarks: 0=wrist, 4=thumb tip, 8=index tip, 12=mid tip, 16=ring tip, 20=pinky tip
  // For each finger (except thumb): tip y < pip y (image coords, y grows downward) → extended
  const ext = (tip: number, pip: number) => lm[tip].y < lm[pip].y - 0.02
  const indexExt  = ext(8,  6)
  const midExt    = ext(12, 10)
  const ringExt   = ext(16, 14)
  const pinkyExt  = ext(20, 18)
  // Thumb: compare tip x against IP x (mirrored later)
  const thumbExt  = Math.abs(lm[4].x - lm[2].x) > 0.06

  const extCount = [indexExt, midExt, ringExt, pinkyExt].filter(Boolean).length

  if (indexExt && !midExt && !ringExt && !pinkyExt) return 'point'
  if (extCount >= 3 && thumbExt) return 'open'
  if (extCount === 0) return 'fist'
  return 'none'
}

function mid(p: Landmark, q: Landmark): Landmark {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 }
}

// ── Page ──────────────────────────────────────────────────────────
export default function GestureSwarm() {
  // Refs to DOM nodes
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef     = useRef<HTMLVideoElement | null>(null)
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Loading / error UI
  const [status, setStatus]   = useState<'idle' | 'loading-mp' | 'ready' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [cameraOn, setCameraOn] = useState(false)

  // Real-time stats (rendered in HUD)
  const [gesture, setGesture] = useState<Gesture>('none')
  const [fps, setFps]         = useState(0)
  const [handsDetected, setHandsDetected] = useState(0)

  // Tunable settings
  const [particleCount, setParticleCount] = useState(1000)
  const [colorA, setColorA] = useState('#22d3ee')
  const [colorB, setColorB] = useState('#a855f7')
  const [trail, setTrail]   = useState(0.18) // motion-blur amount (0 = none)

  // Mutable refs for the animation loop (avoid React re-renders per frame)
  const settingsRef = useRef({
    count: particleCount,
    colorA: new THREE.Color(colorA),
    colorB: new THREE.Color(colorB),
    trail,
  })
  useEffect(() => { settingsRef.current.count = particleCount }, [particleCount])
  useEffect(() => { settingsRef.current.colorA = new THREE.Color(colorA) }, [colorA])
  useEffect(() => { settingsRef.current.colorB = new THREE.Color(colorB) }, [colorB])
  useEffect(() => { settingsRef.current.trail = trail }, [trail])

  // Hand state — written by MP loop, read by render loop
  const handStateRef = useRef<{
    target: THREE.Vector3 | null   // 3D position derived from hand
    direction: THREE.Vector3 | null // pointing direction (point gesture)
    gesture: Gesture
    timestamp: number
  }>({ target: null, direction: null, gesture: 'none', timestamp: 0 })

  // Mouse fallback state
  const mouseRef = useRef<{ active: boolean; mode: 'attract' | 'repel'; pos: THREE.Vector3 }>({
    active: false, mode: 'attract', pos: new THREE.Vector3(),
  })

  const landmarkerRef = useRef<HandLandmarkerInstance | null>(null)
  const rafRef = useRef<number>(0)

  // ── Init Three.js scene + boid sim ────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene + camera
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#06061a')
    scene.fog = new THREE.FogExp2('#06061a', 0.012)

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
    camera.position.set(0, 0, 28)
    camera.lookAt(0, 0, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.autoClearColor = false  // for trails

    // ── Particles (InstancedMesh) ───────────────────────────────
    const MAX_COUNT = 2000
    const positions  = new Float32Array(MAX_COUNT * 3)
    const velocities = new Float32Array(MAX_COUNT * 3)
    const colors     = new Float32Array(MAX_COUNT * 3)
    const sizes      = new Float32Array(MAX_COUNT)

    for (let i = 0; i < MAX_COUNT; i++) {
      positions[3 * i + 0] = (Math.random() - 0.5) * 20
      positions[3 * i + 1] = (Math.random() - 0.5) * 14
      positions[3 * i + 2] = (Math.random() - 0.5) * 12
      velocities[3 * i + 0] = (Math.random() - 0.5) * 0.4
      velocities[3 * i + 1] = (Math.random() - 0.5) * 0.4
      velocities[3 * i + 2] = (Math.random() - 0.5) * 0.4
      const t = Math.random()
      const col = new THREE.Color().lerpColors(
        settingsRef.current.colorA, settingsRef.current.colorB, t,
      )
      colors[3 * i + 0] = col.r
      colors[3 * i + 1] = col.g
      colors[3 * i + 2] = col.b
      sizes[i] = 0.6 + Math.random() * 0.7
    }

    // Custom shader for soft glowing dots — Points is much cheaper than InstancedMesh of spheres.
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
    geom.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))
    geom.setDrawRange(0, settingsRef.current.count)

    const mat = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * (60.0 / -mv.z) * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          alpha = pow(alpha, 1.4);
          gl_FragColor = vec4(vColor * (1.5 + alpha), alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geom, mat)
    scene.add(points)

    // Subtle target marker
    const markerGeom = new THREE.SphereGeometry(0.4, 16, 16)
    const markerMat  = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.75 })
    const marker = new THREE.Mesh(markerGeom, markerMat)
    marker.visible = false
    scene.add(marker)

    // Background trail quad — instead of clearing the colour buffer each frame,
    // we draw a translucent black fullscreen quad. With autoClearColor=false this
    // produces the murmuration motion-blur look.
    const fadeGeom = new THREE.PlaneGeometry(2, 2)
    const fadeMat  = new THREE.MeshBasicMaterial({
      color: 0x06061a, transparent: true, opacity: 0.18, depthTest: false, depthWrite: false,
    })
    const fadeMesh = new THREE.Mesh(fadeGeom, fadeMat)
    const fadeScene = new THREE.Scene()
    const fadeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    fadeScene.add(fadeMesh)

    // ── Resize ──────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    // ── Mouse fallback ──────────────────────────────────────────
    const projectMouseToWorld = (clientX: number, clientY: number): THREE.Vector3 => {
      const rect = renderer.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((clientY - rect.top)  / rect.height) * 2 + 1
      const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera)
      // Project to plane z = 0 (intersecting camera ray with z=0)
      const dir = v.sub(camera.position).normalize()
      const t = -camera.position.z / dir.z
      return new THREE.Vector3().copy(camera.position).addScaledVector(dir, t)
    }
    const onMouseDown = (e: MouseEvent) => {
      mouseRef.current.active = true
      mouseRef.current.mode = e.button === 2 ? 'repel' : 'attract'
      mouseRef.current.pos.copy(projectMouseToWorld(e.clientX, e.clientY))
      e.preventDefault()
    }
    const onMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.active) {
        mouseRef.current.pos.copy(projectMouseToWorld(e.clientX, e.clientY))
      }
    }
    const onMouseUp = () => { mouseRef.current.active = false }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)

    // ── Boid sim ────────────────────────────────────────────────
    const tmpVec = new THREE.Vector3()
    const tmpColor = new THREE.Color()

    let lastFrame = performance.now()
    let frames = 0
    let fpsAccum = 0

    const SPEED_MAX  = 0.45
    const NEIGHBOR_R = 1.8

    const animate = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastFrame) / 1000)
      lastFrame = now
      frames++; fpsAccum += dt
      if (fpsAccum >= 0.5) {
        setFps(Math.round(frames / fpsAccum))
        frames = 0; fpsAccum = 0
      }

      const cfg = settingsRef.current
      const N = Math.min(cfg.count, MAX_COUNT)
      geom.setDrawRange(0, N)

      // Decide forces based on hand or mouse
      let attractCenter: THREE.Vector3 | null = null
      let repelCenter:   THREE.Vector3 | null = null
      let flowDir:       THREE.Vector3 | null = null

      const hs = handStateRef.current
      const handFresh = (now - hs.timestamp) < 600
      if (handFresh && hs.target) {
        if (hs.gesture === 'fist') attractCenter = hs.target
        else if (hs.gesture === 'open') repelCenter = hs.target
        else if (hs.gesture === 'point' && hs.direction) {
          flowDir = hs.direction
          attractCenter = hs.target
        }
      } else if (mouseRef.current.active) {
        if (mouseRef.current.mode === 'attract') attractCenter = mouseRef.current.pos
        else                                     repelCenter   = mouseRef.current.pos
      }

      marker.visible = !!(attractCenter || repelCenter)
      if (attractCenter || repelCenter) {
        marker.position.copy((attractCenter ?? repelCenter)!)
        ;(marker.material as THREE.MeshBasicMaterial).color.setHex(
          repelCenter ? 0xf43f5e : 0xfde047,
        )
      }

      // Boid rules — neighbour interactions are O(N²) but cheap-enough at <=2000.
      // For perf, sample a partial subset for cohesion/alignment.
      for (let i = 0; i < N; i++) {
        const ix = 3 * i, iy = ix + 1, iz = ix + 2
        const px = positions[ix], py = positions[iy], pz = positions[iz]
        let vx = velocities[ix], vy = velocities[iy], vz = velocities[iz]

        // Sample boids: every 6th neighbour up to 30 samples (good enough for flocking)
        let cohX = 0, cohY = 0, cohZ = 0
        let aliX = 0, aliY = 0, aliZ = 0
        let sepX = 0, sepY = 0, sepZ = 0
        let nNeighbor = 0
        for (let j = (i + 7) % N, c = 0; c < 28; j = (j + 6) % N, c++) {
          if (j === i) continue
          const jx = 3 * j
          const dx = positions[jx]     - px
          const dy = positions[jx + 1] - py
          const dz = positions[jx + 2] - pz
          const dsq = dx * dx + dy * dy + dz * dz
          if (dsq > NEIGHBOR_R * NEIGHBOR_R || dsq < 0.0001) continue
          nNeighbor++
          cohX += dx; cohY += dy; cohZ += dz
          aliX += velocities[jx];     aliY += velocities[jx + 1]; aliZ += velocities[jx + 2]
          // Separation: stronger when very close
          const inv = 1 / Math.max(0.05, dsq)
          sepX -= dx * inv * 0.05
          sepY -= dy * inv * 0.05
          sepZ -= dz * inv * 0.05
        }
        if (nNeighbor > 0) {
          const inv = 1 / nNeighbor
          // Cohesion
          vx += cohX * inv * 0.012
          vy += cohY * inv * 0.012
          vz += cohZ * inv * 0.012
          // Alignment
          vx += (aliX * inv - vx) * 0.06
          vy += (aliY * inv - vy) * 0.06
          vz += (aliZ * inv - vz) * 0.06
          // Separation
          vx += sepX
          vy += sepY
          vz += sepZ
        }

        // Hand forces
        if (attractCenter) {
          tmpVec.set(attractCenter.x - px, attractCenter.y - py, attractCenter.z - pz)
          const d = tmpVec.length()
          if (d > 0.01) {
            const f = Math.min(0.06, 0.6 / (d + 1)) * dt * 60
            vx += (tmpVec.x / d) * f
            vy += (tmpVec.y / d) * f
            vz += (tmpVec.z / d) * f
          }
        }
        if (repelCenter) {
          tmpVec.set(px - repelCenter.x, py - repelCenter.y, pz - repelCenter.z)
          const d = tmpVec.length()
          if (d > 0.01 && d < 8) {
            const f = (1 - d / 8) * 0.08 * dt * 60
            vx += (tmpVec.x / d) * f
            vy += (tmpVec.y / d) * f
            vz += (tmpVec.z / d) * f
          }
        }
        if (flowDir) {
          vx += flowDir.x * 0.03 * dt * 60
          vy += flowDir.y * 0.03 * dt * 60
          vz += flowDir.z * 0.03 * dt * 60
        }

        // Centre pull (keep swarm in scene)
        const cd = Math.sqrt(px * px + py * py + pz * pz)
        if (cd > 14) {
          vx -= (px / cd) * 0.04
          vy -= (py / cd) * 0.04
          vz -= (pz / cd) * 0.04
        }

        // Drag
        vx *= 0.985; vy *= 0.985; vz *= 0.985

        // Clamp speed
        const sp = Math.sqrt(vx * vx + vy * vy + vz * vz)
        if (sp > SPEED_MAX) {
          vx = (vx / sp) * SPEED_MAX
          vy = (vy / sp) * SPEED_MAX
          vz = (vz / sp) * SPEED_MAX
        }

        velocities[ix] = vx; velocities[iy] = vy; velocities[iz] = vz
        positions[ix]  = px + vx
        positions[iy]  = py + vy
        positions[iz]  = pz + vz

        // Recolour by speed (mix between A and B)
        const t = Math.min(1, sp / SPEED_MAX)
        const col = tmpColor.lerpColors(cfg.colorA, cfg.colorB, t)
        colors[ix] = col.r; colors[iy] = col.g; colors[iz] = col.b
      }

      ;(geom.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(geom.attributes.color    as THREE.BufferAttribute).needsUpdate = true

      // Trail fade
      ;(fadeMat as THREE.MeshBasicMaterial).opacity = cfg.trail
      renderer.render(fadeScene, fadeCam)
      renderer.render(scene, camera)

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    // ── Cleanup ─────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      geom.dispose()
      mat.dispose()
      markerGeom.dispose()
      markerMat.dispose()
      fadeGeom.dispose()
      fadeMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  // ── Camera + MediaPipe pipeline ──────────────────────────────
  const startCamera = useCallback(async () => {
    if (cameraOn) return
    setStatus('loading-mp')
    setErrorMsg('')
    try {
      // Get webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }, audio: false,
      })
      const video = videoRef.current!
      video.srcObject = stream
      await new Promise<void>((res) => {
        video.onloadedmetadata = () => { video.play(); res() }
      })

      // Dynamic import of MediaPipe (CDN ESM)
      const mp = await import(/* @vite-ignore */
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`,
      )
      const wasmBase = `${window.location.origin}${WASM_BASE}`
      const vision = await mp.FilesetResolver.forVisionTasks(wasmBase)
      const landmarker = (await mp.HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      })) as HandLandmarkerInstance

      landmarkerRef.current = landmarker
      setCameraOn(true)
      setStatus('ready')

      // ── Hand-tracking loop ─────────────────────────────────
      const canvas = handCanvasRef.current!
      const ctx = canvas.getContext('2d')!
      let lastTs = -1
      const trackLoop = () => {
        const v = videoRef.current
        const lm = landmarkerRef.current
        if (!v || !lm || v.readyState < 2) {
          requestAnimationFrame(trackLoop); return
        }
        const ts = performance.now()
        if (ts === lastTs) { requestAnimationFrame(trackLoop); return }
        lastTs = ts
        let res: HandResult | null = null
        try { res = lm.detectForVideo(v, ts) } catch { res = null }

        // Draw landmarks on the small overlay canvas (mirrored)
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.scale(-1, 1)              // mirror
        ctx.translate(-canvas.width, 0)
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        ctx.restore()

        const hands = res?.landmarks ?? []
        setHandsDetected(hands.length)
        if (hands.length === 0) {
          handStateRef.current.gesture = 'none'
          handStateRef.current.target = null
          setGesture('none')
        } else {
          // Use first hand
          const lmList = hands[0]
          const g = detectGesture(lmList)
          // Map hand centre → 3D (x normalised, y inverted, z = depth from wrist landmark)
          const c = mid(lmList[0], mid(lmList[5], lmList[17]))
          const tx = (1 - c.x - 0.5) * 24    // mirror x for natural feel
          const ty = (0.5 - c.y) * 16
          const tz = -((c.z) * 30)
          handStateRef.current.target = new THREE.Vector3(tx, ty, tz)

          if (g === 'point') {
            // Point direction: from MCP (5) → tip (8)
            const a = lmList[5], b = lmList[8]
            const dx = -(b.x - a.x)  // mirror x
            const dy = -(b.y - a.y)
            const dz = -(b.z - a.z)
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
            handStateRef.current.direction = new THREE.Vector3(dx / len, dy / len, dz / len)
          } else {
            handStateRef.current.direction = null
          }

          handStateRef.current.gesture = g
          handStateRef.current.timestamp = performance.now()
          setGesture(g)

          // Draw landmark dots + connections (mirrored coords)
          ctx.save()
          ctx.scale(-1, 1)
          ctx.translate(-canvas.width, 0)
          ctx.fillStyle = '#22d3ee'
          ctx.strokeStyle = '#a5f3fc'
          ctx.lineWidth = 1.5
          const conns = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [5, 9], [9, 10], [10, 11], [11, 12],
            [9, 13], [13, 14], [14, 15], [15, 16],
            [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
          ]
          ctx.beginPath()
          conns.forEach(([a, b]) => {
            ctx.moveTo(lmList[a].x * canvas.width, lmList[a].y * canvas.height)
            ctx.lineTo(lmList[b].x * canvas.width, lmList[b].y * canvas.height)
          })
          ctx.stroke()
          lmList.forEach((p) => {
            ctx.beginPath()
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 2.5, 0, Math.PI * 2)
            ctx.fill()
          })
          ctx.restore()
        }

        requestAnimationFrame(trackLoop)
      }
      requestAnimationFrame(trackLoop)
    } catch (err) {
      setStatus('error')
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
      setErrorMsg(msg)
      console.error('[GestureSwarm] init error', err)
    }
  }, [cameraOn])

  const stopCamera = useCallback(() => {
    const v = videoRef.current
    if (v?.srcObject) {
      const tracks = (v.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
      v.srcObject = null
    }
    if (landmarkerRef.current?.close) {
      try { landmarkerRef.current.close() } catch { /* noop */ }
    }
    landmarkerRef.current = null
    setCameraOn(false)
    setStatus('idle')
    setGesture('none')
    setHandsDetected(0)
    handStateRef.current = { target: null, direction: null, gesture: 'none', timestamp: 0 }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  // ── HUD content ──────────────────────────────────────────────
  const gestureLabel = useMemo(() => ({
    open:  { text: 'MỞ TAY · ĐẨY',   icon: <Hand     className="h-4 w-4" />, color: 'text-rose-300 border-rose-400/40 bg-rose-500/10' },
    fist:  { text: 'NẮM TAY · HÚT',  icon: <Power    className="h-4 w-4" />, color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' },
    point: { text: 'CHỈ · BAY THEO', icon: <Pointer  className="h-4 w-4" />, color: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10' },
    none:  { text: 'CHƯA NHẬN',      icon: <Sparkles className="h-4 w-4" />, color: 'text-white/50 border-white/15 bg-white/5' },
  }[gesture]), [gesture])

  return (
    <div className="fixed inset-0 bg-[#06061a] text-white overflow-hidden">
      {/* 3D canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 p-3 bg-gradient-to-b from-black/60 to-transparent">
        <Link
          to="/dashboard/labtwin/labs"
          className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 text-sm font-medium px-2.5 py-1.5 rounded-lg bg-black/30 backdrop-blur"
        >
          <ChevronLeft className="h-4 w-4" /> Labs
        </Link>
        <h1 className="text-base md:text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-300" /> Murmuration AI · Gesture Swarm
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/50 font-mono">{fps} fps</span>
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${gestureLabel.color} flex items-center gap-1.5`}>
            {gestureLabel.icon}{gestureLabel.text}
          </span>
        </div>
      </div>

      {/* Hand camera preview (top-right) */}
      <div className="absolute top-16 right-3 z-20 w-[200px] md:w-[260px]">
        <div className="aspect-[4/3] bg-black/60 rounded-xl border border-white/15 overflow-hidden relative shadow-2xl">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={handCanvasRef} className="absolute inset-0 w-full h-full" />
          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 text-xs text-white/60">
              {status === 'loading-mp' ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin mb-2 text-cyan-300" />
                  Đang tải MediaPipe…
                </>
              ) : status === 'error' ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-rose-400 mb-2" />
                  <p className="text-rose-300 font-semibold">Lỗi camera</p>
                  <p className="text-white/50 text-[11px] mt-1 line-clamp-2">{errorMsg}</p>
                </>
              ) : (
                <>
                  <Camera className="h-7 w-7 mb-2 text-white/40" />
                  <p>Bật camera để điều khiển bằng cử chỉ</p>
                </>
              )}
            </div>
          )}
          {cameraOn && (
            <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-[10px] font-mono">
              {handsDetected} hand{handsDetected !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button
          onClick={cameraOn ? stopCamera : startCamera}
          disabled={status === 'loading-mp'}
          className={`mt-2 w-full text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            cameraOn
              ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200'
          } disabled:opacity-50`}
        >
          {cameraOn ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
          {cameraOn ? 'Tắt camera' : status === 'loading-mp' ? 'Đang khởi tạo…' : 'Bật camera'}
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="max-w-3xl mx-auto bg-black/40 backdrop-blur rounded-2xl border border-white/10 p-3 md:p-4 flex items-center gap-3 md:gap-4 flex-wrap">
          {/* Particles */}
          <label className="flex items-center gap-2 text-xs flex-1 min-w-[160px]">
            <span className="text-white/60 w-12">Hạt</span>
            <input
              type="range" min={200} max={2000} step={50}
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              className="flex-1 accent-cyan-400"
            />
            <span className="text-white/80 font-mono w-10 text-right">{particleCount}</span>
          </label>

          {/* Trail */}
          <label className="flex items-center gap-2 text-xs flex-1 min-w-[160px]">
            <span className="text-white/60 w-12">Vệt</span>
            <input
              type="range" min={0.04} max={1} step={0.02}
              value={trail}
              onChange={(e) => setTrail(Number(e.target.value))}
              className="flex-1 accent-cyan-400"
            />
            <span className="text-white/80 font-mono w-10 text-right">{trail.toFixed(2)}</span>
          </label>

          {/* Colors */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-white/60">Màu A</span>
              <input type="color" value={colorA} onChange={(e) => setColorA(e.target.value)}
                     className="h-7 w-9 bg-transparent rounded cursor-pointer border border-white/20" />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-white/60">Màu B</span>
              <input type="color" value={colorB} onChange={(e) => setColorB(e.target.value)}
                     className="h-7 w-9 bg-transparent rounded cursor-pointer border border-white/20" />
            </label>
          </div>

          <button
            onClick={() => {
              setParticleCount(1000)
              setTrail(0.18)
              setColorA('#22d3ee')
              setColorB('#a855f7')
            }}
            className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        <p className="text-center text-[11px] text-white/40 mt-2 max-w-2xl mx-auto">
          {cameraOn
            ? '✋ Mở tay = đẩy · ✊ Nắm tay = hút · 👉 Chỉ ngón trỏ = bay theo'
            : 'Bật camera ở góc phải để điều khiển bằng cử chỉ — hoặc click chuột trái (hút) / phải (đẩy) trên không gian 3D.'}
        </p>
      </div>
    </div>
  )
}
