/**
 * Aura — R3F Sandbox Catalog (Vite clone)
 *
 * Clone of Next.js /dashboard/aura
 * Dark-first Tailwind, no shadcn, React Router v6, native HTML.
 */

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_SIMS } from './r3f'
import {
  ArrowLeft, Box, Atom, Beaker, Orbit, Waves, Zap,
  FlaskConical, RotateCcw, Sparkles, ChevronRight, Gem,
  GalleryHorizontalEnd, MousePointer, Activity,
  Layers, Wind, Magnet, Globe, Mountain, Boxes,
  Droplets, Dna, Building2, CircleDot, Shirt,
  Footprints, Triangle, Plus, Download, Trash2, Edit3, Save,
  Home, X, LayoutGrid,
} from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES & DATA
// ─────────────────────────────────────────────
interface SimEntry {
  id: string
  title: string
  description: string
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>
  category: 'basics' | 'chemistry' | 'physics' | 'astronomy' | 'interactive' | 'shaders' | 'biology' | 'procedural' | 'performance' | 'fpv'
  color: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  standalone?: boolean
}

const SIMULATIONS: SimEntry[] = [
  // ── ⭐ FEATURED — FPV Drone Sandbox + WebXR (đặt đầu trang) ──
  {
    id: 'fpv-drone-vr',
    title: '🚁 FPV Drone Sandbox + VR',
    description: 'Bay quadcopter trong môi trường procedural với race gates, địa hình đồi núi, rừng cây, tòa nhà, hangar, water tower. Hỗ trợ tay cầm FPV/RC TX (USB joystick mode), gamepad chuẩn, joystick ảo trên điện thoại, hoặc bàn phím. Vào VR qua WebXR cho Meta Quest/Vision Pro.',
    icon: Wind,
    category: 'fpv',
    color: '#ec4899',
    difficulty: 'Advanced',
  },
  {
    id: 'interactive-box',
    title: 'Interactive Shapes',
    description: 'Classic R3F example: spinning shapes, hover color change, click to scale — the canonical sandbox demo',
    icon: Box,
    category: 'basics',
    color: '#10b981',
    difficulty: 'Beginner',
  },
  {
    id: 'water-molecule',
    title: 'Water Molecule (H₂O)',
    description: '3D model of water molecule with Oxygen, Hydrogen atoms and chemical bonds',
    icon: Atom,
    category: 'chemistry',
    color: '#3b82f6',
    difficulty: 'Beginner',
  },
  {
    id: 'chemistry-lab',
    title: 'Chemistry Lab',
    description: 'Lab equipment: glass beakers with colored liquids and rising bubbles',
    icon: FlaskConical,
    category: 'chemistry',
    color: '#06b6d4',
    difficulty: 'Beginner',
  },
  {
    id: 'pendulum',
    title: 'Pendulum',
    description: 'System of 3 pendulums oscillating with different amplitudes and periods',
    icon: Waves,
    category: 'physics',
    color: '#f59e0b',
    difficulty: 'Intermediate',
  },
  {
    id: 'solar-system',
    title: 'Thái Dương Hệ',
    description: 'Mặt Trời và 8 hành tinh (Sao Thuỷ → Sao Hải Vương), Trái Đất có Mặt Trăng, Sao Thổ có vành đai — mô phỏng cơ học quỹ đạo Kepler',
    icon: Orbit,
    category: 'astronomy',
    color: '#fbbf24',
    difficulty: 'Intermediate',
  },
  {
    id: 'collision',
    title: "Newton's Cradle",
    description: 'Elastic collision and conservation of momentum simulation',
    icon: Zap,
    category: 'physics',
    color: '#a855f7',
    difficulty: 'Advanced',
  },
  {
    id: 'frosted-glass',
    title: 'Frosted Glass Lens',
    description: 'MeshTransmissionMaterial glass effect — pointer-following lens with hover magnification',
    icon: Gem,
    category: 'basics',
    color: '#e879f9',
    difficulty: 'Advanced',
  },
  {
    id: 'carousel',
    title: '3D Carousel Gallery',
    description: 'Scroll-driven 3D card carousel with BentPlaneGeometry, pointer camera, and sine-wave banner',
    icon: GalleryHorizontalEnd,
    category: 'interactive',
    color: '#f43f5e',
    difficulty: 'Advanced',
    standalone: true,
  },
  {
    id: 'particles',
    title: 'Particle Field',
    description: 'Mouse-reactive 800-particle instanced field — repulsion, burst effect, real-time color mixing',
    icon: MousePointer,
    category: 'interactive',
    color: '#06b6d4',
    difficulty: 'Intermediate',
  },
  {
    id: 'swarm',
    title: 'Attract / Repel Swarm',
    description: 'Particles chase or flee from cursor — click to toggle attract/repel mode with velocity damping',
    icon: Magnet,
    category: 'interactive',
    color: '#10b981',
    difficulty: 'Intermediate',
  },
  {
    id: 'wave-shader',
    title: 'Wave Shader',
    description: 'Custom GLSL vertex/fragment shader — mouse ripples, wireframe toggle, color presets, frequency control',
    icon: Wind,
    category: 'shaders',
    color: '#0ea5e9',
    difficulty: 'Advanced',
  },
  {
    id: 'audio-wave',
    title: 'Audio Visualizer',
    description: 'Simulated audio visualizer with bass/mid/treble frequency bands driving vertex displacement',
    icon: Activity,
    category: 'shaders',
    color: '#8b5cf6',
    difficulty: 'Intermediate',
  },
  {
    id: 'portal',
    title: 'Layered Portal',
    description: 'Drag-to-rotate depth layers with parallax, hover highlight, Bezier connections, double-click reset',
    icon: Layers,
    category: 'interactive',
    color: '#f59e0b',
    difficulty: 'Advanced',
  },
  {
    id: 'galaxy',
    title: 'Galaxy Generator',
    description: 'Spiral galaxy with 15,000+ particles, twinkling stars, color gradients from warm center to cool edges',
    icon: Globe,
    category: 'astronomy',
    color: '#7c3aed',
    difficulty: 'Intermediate',
    standalone: true,
  },
  {
    id: 'galaxy-field',
    title: 'Galaxy Particle Field',
    description: '5,000-particle galaxy with pointer-follow camera and auto-rotation — sandbox version',
    icon: Sparkles,
    category: 'astronomy',
    color: '#6366f1',
    difficulty: 'Intermediate',
  },
  {
    id: 'terrain',
    title: 'Procedural Terrain',
    description: 'GLSL-powered terrain with height-based coloring: water → grass → mountain → snow, animated morphing',
    icon: Mountain,
    category: 'procedural',
    color: '#22c55e',
    difficulty: 'Advanced',
  },
  {
    id: 'terrain-fly',
    title: 'Terrain Flyover',
    description: 'Standalone terrain scene with Sky, fog, and orbiting camera — full procedural landscape',
    icon: Mountain,
    category: 'procedural',
    color: '#16a34a',
    difficulty: 'Advanced',
    standalone: true,
  },
  {
    id: 'instanced-boxes',
    title: 'Instanced Boxes (1000)',
    description: 'InstancedMesh performance demo: 1000 boxes with independent rotation, hover proximity highlight',
    icon: Boxes,
    category: 'performance',
    color: '#f97316',
    difficulty: 'Intermediate',
  },
  {
    id: 'instanced-flow',
    title: 'Particle Flow',
    description: '2000 instanced spheres flowing along helical & Lissajous curves — velocity-based coloring',
    icon: Wind,
    category: 'performance',
    color: '#0ea5e9',
    difficulty: 'Intermediate',
  },
  {
    id: 'ocean',
    title: 'Ocean Waves',
    description: 'Custom GLSL ocean shader with Gerstner-like waves, Fresnel coloring, mouse ripple interaction',
    icon: Droplets,
    category: 'shaders',
    color: '#0891b2',
    difficulty: 'Advanced',
  },
  {
    id: 'ocean-sunset',
    title: 'Ocean Sunset',
    description: 'Full ocean scene with sunset sky, bobbing buoys, fog and dramatic low camera angle',
    icon: Droplets,
    category: 'shaders',
    color: '#f59e0b',
    difficulty: 'Advanced',
    standalone: true,
  },
  {
    id: 'dna-helix',
    title: 'DNA Double Helix',
    description: 'Rotating DNA with 20 base pairs (A-T, G-C), color-coded nucleotides, hover tooltips',
    icon: Dna,
    category: 'biology',
    color: '#ec4899',
    difficulty: 'Intermediate',
  },
  {
    id: 'dna-detail',
    title: 'DNA Detail View',
    description: 'Zoomed educational view: 5 base pairs with labels, hydrogen bonds, click-to-highlight nucleotides',
    icon: Dna,
    category: 'biology',
    color: '#d946ef',
    difficulty: 'Beginner',
  },
  {
    id: 'voxel-city',
    title: 'Voxel City',
    description: 'Procedural city with ~225 buildings using InstancedMesh, hover info, auto-rotation',
    icon: Building2,
    category: 'procedural',
    color: '#64748b',
    difficulty: 'Intermediate',
  },
  {
    id: 'city-night',
    title: 'City at Night',
    description: 'Nighttime city with emissive windows, street lamps, animated cars, stars and atmospheric fog',
    icon: Building2,
    category: 'procedural',
    color: '#1e293b',
    difficulty: 'Advanced',
  },
  {
    id: 'raymarching',
    title: 'Raymarching SDF',
    description: 'Real-time raymarching shader: smooth-union of animated SDF spheres, AO, mouse interaction',
    icon: CircleDot,
    category: 'shaders',
    color: '#ef4444',
    difficulty: 'Advanced',
  },
  {
    id: 'metaballs',
    title: 'Metaballs',
    description: '6 metaballs with iridescent coloring, smooth blending, click to spawn temporary extra blobs',
    icon: CircleDot,
    category: 'shaders',
    color: '#a855f7',
    difficulty: 'Advanced',
  },
  {
    id: 'cloth-sim',
    title: 'Cloth Simulation',
    description: 'Spring-mass cloth on 30×30 grid with Verlet integration, gravity, wind, drag interaction',
    icon: Shirt,
    category: 'physics',
    color: '#8b5cf6',
    difficulty: 'Advanced',
  },
  {
    id: 'flag',
    title: 'Flag in Wind',
    description: 'Flag pinned to pole with strong wind physics, pointer-responsive wind direction',
    icon: Shirt,
    category: 'physics',
    color: '#dc2626',
    difficulty: 'Intermediate',
  },
  {
    id: 'shoe-configurator',
    title: 'Shoe Configurator',
    description: 'Interactive 3D shoe with 8 customizable parts, 12 color swatches, click parts to change colors',
    icon: Footprints,
    category: 'interactive',
    color: '#f472b6',
    difficulty: 'Intermediate',
    standalone: true,
  },
  {
    id: 'shoe-display',
    title: 'Shoe Display',
    description: 'Animated 3D shoe model with gentle floating motion — GLTF/Draco loader demo',
    icon: Footprints,
    category: 'basics',
    color: '#fb923c',
    difficulty: 'Beginner',
  },
  {
    id: 'prime',
    title: 'Prism Refraction',
    description: 'Mouse-controlled beam refracts through a glass prism creating rainbow spectrum — Bloom, LUT post-processing',
    icon: Triangle,
    category: 'shaders',
    color: '#c084fc',
    difficulty: 'Advanced',
    standalone: true,
  },
  {
    id: 'prime-simple',
    title: 'Prism Scene (Sandbox)',
    description: 'Simplified prism refraction scene for sandbox embedding — beam, rainbow, flare effects',
    icon: Triangle,
    category: 'shaders',
    color: '#818cf8',
    difficulty: 'Advanced',
  },
  // ── 🌑 Eclipse Simulations ──────────────────────────────────
  {
    id: 'solar-eclipse',
    title: '🌑 Nhật Thực (Solar Eclipse)',
    description: 'Giả lập hiện tượng nhật thực: Mặt Trăng che khuất Mặt Trời khi đi qua giữa Trái Đất và Mặt Trời. Quan sát các giai đoạn: bán phần, toàn phần (corona vành nhật hoa), rồi trở lại bình thường.',
    icon: CircleDot,
    category: 'astronomy',
    color: '#f59e0b',
    difficulty: 'Intermediate',
  },
  {
    id: 'lunar-eclipse',
    title: '🌕 Nguyệt Thực (Lunar Eclipse)',
    description: 'Giả lập hiện tượng nguyệt thực: Trái Đất che khuất ánh sáng Mặt Trời chiếu vào Mặt Trăng. Mặt Trăng chuyển sang màu đỏ cam (Blood Moon) khi đi vào vùng bóng tối hoàn toàn (umbra). Có nhãn bán ảnh / bóng tối.',
    icon: Globe,
    category: 'astronomy',
    color: '#ef4444',
    difficulty: 'Intermediate',
  },
  // (FPV entry moved to top of array — featured)
]

const CATEGORY_COLORS: Record<string, string> = {
  basics: '#10b981',
  chemistry: '#06b6d4',
  physics: '#f59e0b',
  astronomy: '#fbbf24',
  interactive: '#f43f5e',
  shaders: '#0ea5e9',
  biology: '#ec4899',
  procedural: '#22c55e',
  performance: '#f97316',
  fpv: '#ec4899',         // pink hồng cho FPV/VR sandbox
}

// ─────────────────────────────────────────────
// USER SANDBOX — persisted to localStorage
// ─────────────────────────────────────────────
interface UserSandbox {
  id: string
  title: string
  createdAt: number
  files: { name: string; language: string; code: string; active?: boolean }[]
  deps: Record<string, string>
}

const USER_SANDBOX_KEY = 'r3f-user-sandboxes'

const BLANK_TEMPLATE_FILES = [
  { name: 'src/App.js', language: 'js', active: true, code: `import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

function RotatingBox() {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.x += delta * 0.5
    ref.current.rotation.y += delta * 0.3
  })
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#61dafb" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <RotatingBox />
      <OrbitControls />
      <Environment preset="city" />
    </Canvas>
  )
}` },
  { name: 'src/styles.css', language: 'css', code: `* { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; }
body { background: #0a0a0f; }` },
]

function loadUserSandboxes(): UserSandbox[] {
  try {
    const raw = localStorage.getItem(USER_SANDBOX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveUserSandboxes(sandboxes: UserSandbox[]) {
  try {
    localStorage.setItem(USER_SANDBOX_KEY, JSON.stringify(sandboxes))
  } catch { /* quota exceeded */ }
}

function downloadProject(sandbox: UserSandbox) {
  const content = JSON.stringify({ name: sandbox.title, files: sandbox.files, dependencies: sandbox.deps }, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sandbox.title.toLowerCase().replace(/\s+/g, '-')}.r3f.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────
// SANDBOX PLACEHOLDER (no Three.js in Vite)
// ─────────────────────────────────────────────
function SandboxPlaceholder({ sim, color }: { sim: SimEntry; color: string }) {
  const Icon = sim.icon
  return (
    <div
      className="w-full rounded-2xl flex flex-col items-center justify-center border border-white/[0.06]"
      style={{ height: 'calc(100vh - 120px)', background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%)' }}
    >
      {/* Animated glow orb */}
      <div className="relative mb-8">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${color}30 0%, ${color}08 60%, transparent 100%)`,
            boxShadow: `0 0 60px ${color}20, 0 0 120px ${color}10`,
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}
          >
            <Icon className="h-8 w-8" style={{ color }} />
          </div>
        </div>
        {/* orbit ring */}
        <div
          className="absolute inset-0 rounded-full border border-dashed animate-spin"
          style={{ borderColor: `${color}20`, animationDuration: '8s' }}
        />
      </div>

      <h2 className="text-xl font-bold text-white/80 mb-2">{sim.title}</h2>
      <p className="text-sm text-white/30 text-center max-w-sm px-6 leading-relaxed mb-6">{sim.description}</p>

      <div className="flex items-center gap-3">
        <span
          className="px-3 py-1 rounded-full text-xs font-medium border"
          style={{ color: CATEGORY_COLORS[sim.category], borderColor: `${CATEGORY_COLORS[sim.category]}30`, background: `${CATEGORY_COLORS[sim.category]}10` }}
        >
          {sim.category}
        </span>
        <span className="px-3 py-1 rounded-full text-xs text-white/30 border border-white/[0.08]">
          {sim.difficulty}
        </span>
      </div>

      <p className="mt-8 text-xs text-white/15">
        3D sandbox available in the full Next.js build
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// USER SANDBOX EDITOR PLACEHOLDER
// ─────────────────────────────────────────────
function UserSandboxEditor({
  sandbox,
  onBack,
  onSave,
  onDownload,
  saved,
}: {
  sandbox: UserSandbox
  onBack: () => void
  onSave: () => void
  onDownload: () => void
  saved: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-[#0a0a0f] dark:text-white">
      {/* Top bar — prominent navigation */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between bg-[#0a0a0f]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all"
            title="Quay lại danh sách Aura"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Aura</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all"
            title="Về Dashboard chính"
          >
            <Home className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <span className="h-5 w-px bg-white/10 mx-1" />
          <span className="text-sm font-semibold text-white">
            {sandbox.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Save className="h-3 w-3" /> Saved
            </span>
          )}
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 bg-muted dark:bg-white/[0.04] hover:bg-accent border transition-all"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/80 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600/80 dark:hover:bg-cyan-500 transition-all"
          >
            <Save className="h-3 w-3" />
            Save
          </button>
        </div>
      </div>

      {/* Editor placeholder */}
      <div className="p-4">
        <div
          className="w-full rounded-2xl border border-white/[0.06] flex"
          style={{ height: 'calc(100vh - 120px)', background: '#0d1117' }}
        >
          {/* File tree */}
          <div className="w-48 border-r border-white/[0.06] p-3 flex flex-col gap-1 shrink-0">
            <p className="text-[0.6rem] uppercase tracking-wider text-white/25 font-semibold px-2 mb-1">Files</p>
            {sandbox.files.map((f, i) => (
              <button
                key={i}
                className={`text-left px-2 py-1.5 rounded text-xs transition-colors ${f.active ? 'bg-cyan-500/10 text-cyan-300' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Code view */}
          <div className="flex-1 p-4 overflow-auto">
            <pre className="text-xs text-white/40 font-mono leading-relaxed whitespace-pre-wrap">
              {sandbox.files.find(f => f.active)?.code ?? sandbox.files[0]?.code}
            </pre>
          </div>

          {/* Preview panel */}
          <div className="w-72 border-l border-white/[0.06] flex flex-col items-center justify-center gap-4 shrink-0">
            <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <RotateCcw className="h-7 w-7 text-cyan-400/50 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/50">{sandbox.title}</p>
              <p className="text-xs text-white/20 mt-1">{sandbox.files.length} files</p>
            </div>
            <p className="text-[0.65rem] text-white/15 px-4 text-center">
              Live preview available in the full Next.js build
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────
export default function AuraPage() {
  const navigate = useNavigate()
  const [activeSim, setActiveSim] = useState<string | null>(null)
  const [userSandboxes, setUserSandboxes] = useState<UserSandbox[]>([])
  const [editingUserSandbox, setEditingUserSandbox] = useState<UserSandbox | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setUserSandboxes(loadUserSandboxes())
  }, [])

  // User: "có nút back để dễ dàng trở lại giao diện chính thức khi đang ở trong các mô phỏng"
  // ESC để thoát mô phỏng nhanh (rất hữu ích khi sim đang fullscreen pointer-locked)
  useEffect(() => {
    if (!activeSim) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Nếu sim đang pointer-locked (vd FPV drone) thì ESC sẽ unlock trước
        // Pressing ESC again sẽ trigger handler này → thoát về catalog
        if (!document.pointerLockElement) {
          setActiveSim(null)
          setEditingUserSandbox(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeSim])

  const createNewSandbox = useCallback(() => {
    const id = `user-${Date.now()}`
    const newSandbox: UserSandbox = {
      id,
      title: `My Sandbox ${userSandboxes.length + 1}`,
      createdAt: Date.now(),
      files: BLANK_TEMPLATE_FILES.map(f => ({ ...f })),
      deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    }
    const updated = [...userSandboxes, newSandbox]
    setUserSandboxes(updated)
    saveUserSandboxes(updated)
    setEditingUserSandbox(newSandbox)
    setActiveSim(id)
  }, [userSandboxes])

  const openUserSandbox = useCallback((sandbox: UserSandbox) => {
    setEditingUserSandbox({ ...sandbox, files: sandbox.files.map(f => ({ ...f })) })
    setActiveSim(sandbox.id)
  }, [])

  const handleSave = useCallback(() => {
    if (!editingUserSandbox) return
    const updated = userSandboxes.some(s => s.id === editingUserSandbox.id)
      ? userSandboxes.map(s => s.id === editingUserSandbox.id ? editingUserSandbox : s)
      : [...userSandboxes, editingUserSandbox]
    setUserSandboxes(updated)
    saveUserSandboxes(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editingUserSandbox, userSandboxes])

  const handleDeleteSandbox = useCallback((id: string) => {
    const updated = userSandboxes.filter(s => s.id !== id)
    setUserSandboxes(updated)
    saveUserSandboxes(updated)
  }, [userSandboxes])

  const handleBack = useCallback(() => {
    setActiveSim(null)
    setEditingUserSandbox(null)
  }, [])

  // ── USER SANDBOX EDITING VIEW ──
  if (editingUserSandbox && activeSim?.startsWith('user-')) {
    return (
      <UserSandboxEditor
        sandbox={editingUserSandbox}
        onBack={handleBack}
        onSave={handleSave}
        onDownload={() => downloadProject(editingUserSandbox)}
        saved={saved}
      />
    )
  }

  // ── BUILT-IN SIMULATION VIEW ──
  if (activeSim) {
    const currentSim = SIMULATIONS.find(s => s.id === activeSim)
    if (currentSim) {
      const SimComponent = ALL_SIMS[activeSim]
      const simColor = CATEGORY_COLORS[currentSim.category]
      return (
        <div className="min-h-screen bg-background text-foreground dark:bg-[#0a0a0f] dark:text-white flex flex-col relative">
          {/* Top bar — prominent navigation */}
          <div className="px-4 py-2.5 border-b border-white/10 shrink-0 flex items-center gap-2 bg-[#0a0a0f]/95 backdrop-blur-md sticky top-0 z-20">
            <button
              onClick={() => setActiveSim(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all"
              title="Quay lại danh sách mô phỏng (ESC)"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Mô phỏng</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all"
              title="Về Dashboard chính"
            >
              <Home className="h-4 w-4" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <div className="h-5 w-px bg-white/10 mx-1" />

            <span className="text-sm font-semibold text-white truncate flex-1 min-w-0">
              {currentSim.title}
            </span>

            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
              style={{ color: simColor, borderColor: `${simColor}50`, background: `${simColor}15` }}
            >
              {currentSim.category}
            </span>

            <span className="hidden lg:inline text-[10px] text-white/30 uppercase tracking-wider px-2 border border-white/10 rounded-md py-0.5 font-mono shrink-0">
              ESC để thoát
            </span>
          </div>

          {/* Floating exit button — ALWAYS visible on bottom-left, ngay cả khi sim fullscreen */}
          <button
            onClick={() => setActiveSim(null)}
            className="fixed bottom-4 left-4 z-50 group flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-white bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 hover:border-cyan-400/60 transition-all shadow-lg hover:shadow-cyan-500/20"
            title="Thoát mô phỏng (ESC)"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
          >
            <X className="h-4 w-4 group-hover:rotate-90 transition-transform" />
            <span className="hidden group-hover:inline">Thoát mô phỏng</span>
            <span className="group-hover:hidden text-xs text-white/70">ESC</span>
          </button>
          <div className="flex-1" style={{ minHeight: 0 }}>
            {SimComponent ? (
              <Suspense fallback={
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
                  </div>
                </div>
              }>
                <div style={{ width: '100%', height: 'calc(100vh - 57px)' }}>
                  <SimComponent />
                </div>
              </Suspense>
            ) : (
              <div className="p-4">
                <SandboxPlaceholder sim={currentSim} color={currentSim.color} />
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  // ── CATALOG VIEW ──
  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-[#0a0a0f] dark:text-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-6">
        {/* Top crumbs — link về Dashboard luôn visible */}
        <div className="flex items-center gap-2 mb-4 text-[11px] uppercase tracking-wider">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-white/40 hover:text-cyan-400 transition-colors"
            title="Về Dashboard chính"
          >
            <Home className="h-3 w-3" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3 text-white/20" />
          <span className="text-white/60 font-semibold">Aura</span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Box className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white/90">Aura</h1>
            <p className="text-sm text-white/30">
              Interactive 3D simulations powered by React Three Fiber
            </p>
          </div>
          {/* Right-side: Dashboard shortcut for visibility */}
          <button
            onClick={() => navigate('/dashboard')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 hover:border-purple-500/40 transition-all"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Trở lại Dashboard
          </button>
        </div>
      </div>

      {/* ── ⭐ FEATURED — FPV Drone Sandbox + VR (hero card) ── */}
      <div className="px-6 pb-6">
        <h2 className="text-sm font-semibold text-pink-700 dark:text-pink-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>★</span> Featured Sandbox
        </h2>
        <button
          onClick={() => setActiveSim('fpv-drone-vr')}
          className="group w-full text-left rounded-2xl overflow-hidden relative transition-all duration-300 hover:scale-[1.005]"
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.18) 0%, rgba(139,92,246,0.18) 50%, rgba(6,182,212,0.18) 100%)',
            border: '1px solid rgba(236,72,153,0.4)',
            boxShadow: '0 8px 32px rgba(236,72,153,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Animated glow lines */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at top right, rgba(236,72,153,0.3), transparent 60%), radial-gradient(ellipse at bottom left, rgba(6,182,212,0.25), transparent 60%)',
          }} />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Left: Icon + giant emoji */}
            <div className="flex-shrink-0 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl"
                style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3))', border: '1px solid rgba(236,72,153,0.5)' }}>
                🚁
              </div>
              <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            </div>
            {/* Middle: Title + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-xl md:text-2xl font-bold text-white">FPV Drone Sandbox + VR</h3>
                <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider"
                  style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}>
                  ⭐ Featured
                </span>
                <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider"
                  style={{ color: '#a78bfa', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)' }}>
                  WebXR VR
                </span>
                <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider"
                  style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  📱 Mobile
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-3">
                Bay quadcopter trong môi trường procedural — đồi núi, rừng cây, tòa nhà, hangar, water tower,
                billboards, scaffolds. 5 cấp độ tăng dần từ hover cơ bản đến full course pro.
              </p>
              <div className="flex items-center gap-3 flex-wrap text-xs text-white/50">
                <span>🎮 Tay cầm RC TX</span>
                <span>•</span>
                <span>📱 Joystick ảo</span>
                <span>•</span>
                <span>⌨️ Bàn phím</span>
                <span>•</span>
                <span>🥽 Meta Quest / Vision Pro</span>
              </div>
            </div>
            {/* Right: CTA */}
            <div className="flex-shrink-0">
              <div className="px-5 py-3 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-transform group-hover:translate-x-1"
                style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', boxShadow: '0 4px 16px rgba(236,72,153,0.4)' }}>
                Bắt đầu bay →
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* ── Your Sandboxes ── */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Your Sandboxes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create new */}
          <button
            onClick={createNewSandbox}
            className="group text-left p-5 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-cyan-500/40 hover:bg-cyan-500/[0.03] transition-all duration-300 flex flex-col items-center justify-center min-h-[140px]"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3 group-hover:bg-cyan-500/20 transition-colors">
              <Plus className="h-6 w-6 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
            </div>
            <span className="text-sm font-medium text-white/40 group-hover:text-white/70 transition-colors">Create New Sandbox</span>
            <span className="text-[0.65rem] text-white/20 group-hover:text-white/35 mt-1 transition-colors">Start from blank R3F template</span>
          </button>

          {/* User sandboxes */}
          {userSandboxes.map(sandbox => (
            <div
              key={sandbox.id}
              className="group relative text-left p-5 rounded-2xl bg-cyan-500/[0.02] border border-cyan-500/[0.1] hover:border-cyan-500/[0.25] hover:bg-cyan-500/[0.04] transition-all duration-300"
            >
              <button onClick={() => openUserSandbox(sandbox)} className="w-full text-left">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Edit3 className="h-5 w-5 text-cyan-400/60" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[0.6rem] text-cyan-400/50 border border-cyan-500/20 bg-cyan-500/5">
                    custom
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white/80 group-hover:text-white/95 transition-colors mb-1">
                  {sandbox.title}
                </h3>
                <p className="text-xs text-white/25 group-hover:text-white/35 transition-colors">
                  {sandbox.files.length} files · Created {new Date(sandbox.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-1 mt-3 text-[0.6rem] text-white/15 group-hover:text-cyan-400/40 transition-colors">
                  <Edit3 className="h-3 w-3" />
                  <span>Open &amp; edit</span>
                </div>
              </button>
              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete "${sandbox.title}"?`)) handleDeleteSandbox(sandbox.id)
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-white/0 group-hover:text-white/20 hover:!text-red-400 hover:!bg-red-500/10 transition-all"
                title="Delete sandbox"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Built-in Simulations ── */}
      <div className="px-6 pb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Built-in Simulations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SIMULATIONS.filter(s => s.id !== 'fpv-drone-vr').map(sim => {
            const Icon = sim.icon
            return (
              <button
                key={sim.id}
                onClick={() => setActiveSim(sim.id)}
                className="group text-left p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${sim.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: sim.color }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-[0.6rem] font-medium border"
                      style={{
                        color: CATEGORY_COLORS[sim.category],
                        borderColor: `${CATEGORY_COLORS[sim.category]}30`,
                        backgroundColor: `${CATEGORY_COLORS[sim.category]}08`,
                      }}
                    >
                      {sim.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[0.6rem] text-white/30 border border-white/[0.06]">
                      {sim.difficulty}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white/80 group-hover:text-white/95 transition-colors mb-1">
                  {sim.title}
                </h3>
                <p className="text-xs text-white/25 group-hover:text-white/35 transition-colors leading-relaxed">
                  {sim.description}
                </p>
                <div className="flex items-center gap-1 mt-3 text-[0.6rem] text-white/15 group-hover:text-white/30 transition-colors">
                  <ChevronRight className="h-3 w-3" />
                  <span>Open sandbox</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
