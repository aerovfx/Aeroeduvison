'use client';
/**
 * R3F Sandbox Catalog — CodeSandbox-style simulation gallery
 *
 * Each simulation is wrapped in the R3FSandbox component which provides:
 *   - Canvas with proper R3F v9 API (gl, camera, shadows, dpr, flat, frameloop)
 *   - VS Code-like code editor panel with syntax highlighting
 *   - Toolbar controls (play/pause, grid, environment, fullscreen)
 *   - Resizable split view with drag handle
 *
 * Dynamic imports: all 3D components loaded with next/dynamic + ssr:false
 * to avoid Three.js SSR issues (window, WebGL context).
 */

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Atom, Beaker, Orbit, Waves, Zap, Box,
  FlaskConical, RotateCcw, Sparkles, ChevronRight, Gem,
  GalleryHorizontalEnd, MousePointer, Activity,
  Layers, Wind, Magnet, Globe, Mountain, Boxes,
  Droplets, Dna, Building2, CircleDot, Shirt,
  Footprints, Triangle, Plus, Download, Trash2, Edit3, Save,
} from 'lucide-react';

// ═══════════════════════════════════════════════
// DYNAMIC IMPORTS (ssr: false for Three.js)
// ═══════════════════════════════════════════════
const R3FSandbox = dynamic(
  () => import('@/components/simulations/r3f-sandbox'),
  { ssr: false },
);
const InteractiveBoxScene = dynamic(
  () => import('@/components/simulations/scenes/basic-scene').then(m => ({ default: m.InteractiveBoxScene })),
  { ssr: false },
);
const WaterMoleculeScene = dynamic(
  () => import('@/components/simulations/scenes/chemistry-scene').then(m => ({ default: m.WaterMoleculeScene })),
  { ssr: false },
);
const ChemistryLabScene = dynamic(
  () => import('@/components/simulations/scenes/chemistry-scene').then(m => ({ default: m.ChemistryLabScene })),
  { ssr: false },
);
const PendulumScene = dynamic(
  () => import('@/components/simulations/scenes/physics-scene').then(m => ({ default: m.PendulumScene })),
  { ssr: false },
);
const SolarSystemScene = dynamic(
  () => import('@/components/simulations/scenes/physics-scene').then(m => ({ default: m.SolarSystemScene })),
  { ssr: false },
);
const CollisionBalls = dynamic(
  () => import('@/components/simulations/scenes/physics-scene').then(m => ({ default: m.CollisionBalls })),
  { ssr: false },
);
const FrostedGlassScene = dynamic(
  () => import('@/components/simulations/scenes/frosted-glass-scene').then(m => ({ default: m.FrostedGlassScene })),
  { ssr: false },
);

// ── NEW: Advanced event-handler scenes ──
const CarouselScene = dynamic(
  () => import('@/components/simulations/scenes/carousel-scene').then(m => ({ default: m.CarouselScene })),
  { ssr: false },
);
const CarouselSimpleScene = dynamic(
  () => import('@/components/simulations/scenes/carousel-scene').then(m => ({ default: m.CarouselSimpleScene })),
  { ssr: false },
);
const ParticlesScene = dynamic(
  () => import('@/components/simulations/scenes/particles-scene').then(m => ({ default: m.ParticlesScene })),
  { ssr: false },
);
const SwarmScene = dynamic(
  () => import('@/components/simulations/scenes/particles-scene').then(m => ({ default: m.SwarmScene })),
  { ssr: false },
);
const WaveScene = dynamic(
  () => import('@/components/simulations/scenes/wave-scene').then(m => ({ default: m.WaveScene })),
  { ssr: false },
);
const AudioWaveScene = dynamic(
  () => import('@/components/simulations/scenes/wave-scene').then(m => ({ default: m.AudioWaveScene })),
  { ssr: false },
);
const PortalScene = dynamic(
  () => import('@/components/simulations/scenes/portal-scene').then(m => ({ default: m.PortalScene })),
  { ssr: false },
);

// ── NEW: Rich example scenes ──
const GalaxyScene = dynamic(
  () => import('@/components/simulations/scenes/galaxy-scene').then(m => ({ default: m.GalaxyScene })),
  { ssr: false },
);
const GalaxyFieldScene = dynamic(
  () => import('@/components/simulations/scenes/galaxy-scene').then(m => ({ default: m.GalaxyFieldScene })),
  { ssr: false },
);
const TerrainScene = dynamic(
  () => import('@/components/simulations/scenes/terrain-scene').then(m => ({ default: m.TerrainScene })),
  { ssr: false },
);
const TerrainSimpleScene = dynamic(
  () => import('@/components/simulations/scenes/terrain-scene').then(m => ({ default: m.TerrainSimpleScene })),
  { ssr: false },
);
const InstancedBoxesScene = dynamic(
  () => import('@/components/simulations/scenes/instanced-scene').then(m => ({ default: m.InstancedBoxesScene })),
  { ssr: false },
);
const InstancedFlowScene = dynamic(
  () => import('@/components/simulations/scenes/instanced-scene').then(m => ({ default: m.InstancedFlowScene })),
  { ssr: false },
);
const OceanScene = dynamic(
  () => import('@/components/simulations/scenes/ocean-scene').then(m => ({ default: m.OceanScene })),
  { ssr: false },
);
const OceanSunsetScene = dynamic(
  () => import('@/components/simulations/scenes/ocean-scene').then(m => ({ default: m.OceanSunsetScene })),
  { ssr: false },
);
const DNAHelixScene = dynamic(
  () => import('@/components/simulations/scenes/dna-scene').then(m => ({ default: m.DNAHelixScene })),
  { ssr: false },
);
const DNADetailScene = dynamic(
  () => import('@/components/simulations/scenes/dna-scene').then(m => ({ default: m.DNADetailScene })),
  { ssr: false },
);
const VoxelCityScene = dynamic(
  () => import('@/components/simulations/scenes/city-scene').then(m => ({ default: m.VoxelCityScene })),
  { ssr: false },
);
const CityNightScene = dynamic(
  () => import('@/components/simulations/scenes/city-scene').then(m => ({ default: m.CityNightScene })),
  { ssr: false },
);
const RaymarchingScene = dynamic(
  () => import('@/components/simulations/scenes/raymarching-scene').then(m => ({ default: m.RaymarchingScene })),
  { ssr: false },
);
const MetaballsScene = dynamic(
  () => import('@/components/simulations/scenes/raymarching-scene').then(m => ({ default: m.MetaballsScene })),
  { ssr: false },
);
const ClothSimScene = dynamic(
  () => import('@/components/simulations/scenes/cloth-scene').then(m => ({ default: m.ClothSimScene })),
  { ssr: false },
);
const FlagScene = dynamic(
  () => import('@/components/simulations/scenes/cloth-scene').then(m => ({ default: m.FlagScene })),
  { ssr: false },
);

// ── Shoe Configurator ──
const ShoeConfiguratorScene = dynamic(
  () => import('@/components/simulations/scenes/shoe-scene').then(m => ({ default: m.ShoeConfiguratorScene })),
  { ssr: false },
);
const ShoeDisplayScene = dynamic(
  () => import('@/components/simulations/scenes/shoe-scene').then(m => ({ default: m.ShoeDisplayScene })),
  { ssr: false },
);

// ── Prime (Prism Light Refraction) ──
const PrimeScene = dynamic(
  () => import('@/components/simulations/scenes/prime-scene').then(m => ({ default: m.PrimeScene })),
  { ssr: false },
);
const PrimeSimpleScene = dynamic(
  () => import('@/components/simulations/scenes/prime-scene').then(m => ({ default: m.PrimeSimpleScene })),
  { ssr: false },
);

// ═══════════════════════════════════════════════
// SIMULATION CATALOG
// ═══════════════════════════════════════════════
interface SimEntry {
  id: string;
  title: string;
  titleVi: string;
  description: string;
  icon: any;
  category: 'basics' | 'chemistry' | 'physics' | 'astronomy' | 'interactive' | 'shaders' | 'biology' | 'procedural' | 'performance';
  color: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  standalone?: boolean; // renders its own Canvas (e.g. carousel with ScrollControls)
}

const SIMULATIONS: SimEntry[] = [
  {
    id: 'interactive-box',
    title: 'Interactive Shapes',
    titleVi: 'Hình 3D tương tác',
    description: 'Classic R3F example: spinning shapes, hover color change, click to scale — the canonical sandbox demo',
    icon: Box,
    category: 'basics',
    color: '#10b981',
    difficulty: 'Beginner',
  },
  {
    id: 'water-molecule',
    title: 'Water Molecule (H₂O)',
    titleVi: 'Phân tử nước H₂O',
    description: '3D model of water molecule with Oxygen, Hydrogen atoms and chemical bonds',
    icon: Atom,
    category: 'chemistry',
    color: '#3b82f6',
    difficulty: 'Beginner',
  },
  {
    id: 'chemistry-lab',
    title: 'Chemistry Lab',
    titleVi: 'Phòng thí nghiệm Hóa học',
    description: 'Lab equipment: glass beakers with colored liquids and rising bubbles',
    icon: FlaskConical,
    category: 'chemistry',
    color: '#06b6d4',
    difficulty: 'Beginner',
  },
  {
    id: 'pendulum',
    title: 'Pendulum',
    titleVi: 'Con lắc đơn',
    description: 'System of 3 pendulums oscillating with different amplitudes and periods',
    icon: Waves,
    category: 'physics',
    color: '#f59e0b',
    difficulty: 'Intermediate',
  },
  {
    id: 'solar-system',
    title: 'Orbit System',
    titleVi: 'Hệ quỹ đạo',
    description: 'Planet orbiting a star with moon satellite — orbital mechanics simulation',
    icon: Orbit,
    category: 'astronomy',
    color: '#fbbf24',
    difficulty: 'Intermediate',
  },
  {
    id: 'collision',
    title: "Newton's Cradle",
    titleVi: 'Con lắc Newton',
    description: 'Elastic collision and conservation of momentum simulation',
    icon: Zap,
    category: 'physics',
    color: '#a855f7',
    difficulty: 'Advanced',
  },
  {
    id: 'frosted-glass',
    title: 'Frosted Glass Lens',
    titleVi: 'Kính mờ Frosted Glass',
    description: 'MeshTransmissionMaterial glass effect — pointer-following lens with hover magnification',
    icon: Gem,
    category: 'basics',
    color: '#e879f9',
    difficulty: 'Advanced',
  },
  // ── NEW: Event handler demos ──
  {
    id: 'carousel',
    title: '3D Carousel Gallery',
    titleVi: 'Gallery xoay 3D',
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
    titleVi: 'Trường hạt tương tác',
    description: 'Mouse-reactive 800-particle instanced field — repulsion, burst effect, real-time color mixing',
    icon: MousePointer,
    category: 'interactive',
    color: '#06b6d4',
    difficulty: 'Intermediate',
  },
  {
    id: 'swarm',
    title: 'Attract / Repel Swarm',
    titleVi: 'Bầy hạt hút đẩy',
    description: 'Particles chase or flee from cursor — click to toggle attract/repel mode with velocity damping',
    icon: Magnet,
    category: 'interactive',
    color: '#10b981',
    difficulty: 'Intermediate',
  },
  {
    id: 'wave-shader',
    title: 'Wave Shader',
    titleVi: 'Sóng shader tuỳ chỉnh',
    description: 'Custom GLSL vertex/fragment shader — mouse ripples, wireframe toggle, color presets, frequency control',
    icon: Wind,
    category: 'shaders',
    color: '#0ea5e9',
    difficulty: 'Advanced',
  },
  {
    id: 'audio-wave',
    title: 'Audio Visualizer',
    titleVi: 'Hiển thị sóng âm',
    description: 'Simulated audio visualizer with bass/mid/treble frequency bands driving vertex displacement',
    icon: Activity,
    category: 'shaders',
    color: '#8b5cf6',
    difficulty: 'Intermediate',
  },
  {
    id: 'portal',
    title: 'Layered Portal',
    titleVi: 'Portal nhiều lớp',
    description: 'Drag-to-rotate depth layers with parallax, hover highlight, Bezier connections, double-click reset',
    icon: Layers,
    category: 'interactive',
    color: '#f59e0b',
    difficulty: 'Advanced',
  },
  // ── NEW: Rich example scenes ──
  {
    id: 'galaxy',
    title: 'Galaxy Generator',
    titleVi: 'Tạo thiên hà xoắn ốc',
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
    titleVi: 'Trường hạt thiên hà',
    description: '5,000-particle galaxy with pointer-follow camera and auto-rotation — sandbox version',
    icon: Sparkles,
    category: 'astronomy',
    color: '#6366f1',
    difficulty: 'Intermediate',
  },
  {
    id: 'terrain',
    title: 'Procedural Terrain',
    titleVi: 'Địa hình thủ tục',
    description: 'GLSL-powered terrain with height-based coloring: water → grass → mountain → snow, animated morphing',
    icon: Mountain,
    category: 'procedural',
    color: '#22c55e',
    difficulty: 'Advanced',
  },
  {
    id: 'terrain-fly',
    title: 'Terrain Flyover',
    titleVi: 'Bay trên địa hình',
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
    titleVi: '1000 hộp Instanced',
    description: 'InstancedMesh performance demo: 1000 boxes with independent rotation, hover proximity highlight',
    icon: Boxes,
    category: 'performance',
    color: '#f97316',
    difficulty: 'Intermediate',
  },
  {
    id: 'instanced-flow',
    title: 'Particle Flow',
    titleVi: 'Dòng chảy hạt',
    description: '2000 instanced spheres flowing along helical & Lissajous curves — velocity-based coloring',
    icon: Wind,
    category: 'performance',
    color: '#0ea5e9',
    difficulty: 'Intermediate',
  },
  {
    id: 'ocean',
    title: 'Ocean Waves',
    titleVi: 'Sóng đại dương',
    description: 'Custom GLSL ocean shader with Gerstner-like waves, Fresnel coloring, mouse ripple interaction',
    icon: Droplets,
    category: 'shaders',
    color: '#0891b2',
    difficulty: 'Advanced',
  },
  {
    id: 'ocean-sunset',
    title: 'Ocean Sunset',
    titleVi: 'Hoàng hôn đại dương',
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
    titleVi: 'Xoắn kép DNA',
    description: 'Rotating DNA with 20 base pairs (A-T, G-C), color-coded nucleotides, hover tooltips',
    icon: Dna,
    category: 'biology',
    color: '#ec4899',
    difficulty: 'Intermediate',
  },
  {
    id: 'dna-detail',
    title: 'DNA Detail View',
    titleVi: 'Chi tiết DNA',
    description: 'Zoomed educational view: 5 base pairs with labels, hydrogen bonds, click-to-highlight nucleotides',
    icon: Dna,
    category: 'biology',
    color: '#d946ef',
    difficulty: 'Beginner',
  },
  {
    id: 'voxel-city',
    title: 'Voxel City',
    titleVi: 'Thành phố Voxel',
    description: 'Procedural city with ~225 buildings using InstancedMesh, hover info, auto-rotation',
    icon: Building2,
    category: 'procedural',
    color: '#64748b',
    difficulty: 'Intermediate',
  },
  {
    id: 'city-night',
    title: 'City at Night',
    titleVi: 'Thành phố về đêm',
    description: 'Nighttime city with emissive windows, street lamps, animated cars, stars and atmospheric fog',
    icon: Building2,
    category: 'procedural',
    color: '#1e293b',
    difficulty: 'Advanced',
  },
  {
    id: 'raymarching',
    title: 'Raymarching SDF',
    titleVi: 'Raymarching SDF',
    description: 'Real-time raymarching shader: smooth-union of animated SDF spheres, AO, mouse interaction',
    icon: CircleDot,
    category: 'shaders',
    color: '#ef4444',
    difficulty: 'Advanced',
  },
  {
    id: 'metaballs',
    title: 'Metaballs',
    titleVi: 'Metaballs',
    description: '6 metaballs with iridescent coloring, smooth blending, click to spawn temporary extra blobs',
    icon: CircleDot,
    category: 'shaders',
    color: '#a855f7',
    difficulty: 'Advanced',
  },
  {
    id: 'cloth-sim',
    title: 'Cloth Simulation',
    titleVi: 'Mô phỏng vải',
    description: 'Spring-mass cloth on 30×30 grid with Verlet integration, gravity, wind, drag interaction',
    icon: Shirt,
    category: 'physics',
    color: '#8b5cf6',
    difficulty: 'Advanced',
  },
  {
    id: 'flag',
    title: 'Flag in Wind',
    titleVi: 'Cờ bay trong gió',
    description: 'Flag pinned to pole with strong wind physics, pointer-responsive wind direction',
    icon: Shirt,
    category: 'physics',
    color: '#dc2626',
    difficulty: 'Intermediate',
  },
  // ── Shoe Configurator (from shoe_draco example) ──
  {
    id: 'shoe-configurator',
    title: 'Shoe Configurator',
    titleVi: 'Tuỳ chỉnh giày 3D',
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
    titleVi: 'Hiển thị giày 3D',
    description: 'Animated 3D shoe model with gentle floating motion — GLTF/Draco loader demo',
    icon: Footprints,
    category: 'basics',
    color: '#fb923c',
    difficulty: 'Beginner',
  },
  // ── Prime — Prism Light Refraction ──
  {
    id: 'prime',
    title: 'Prism Refraction',
    titleVi: 'Khúc xạ lăng kính',
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
    titleVi: 'Lăng kính (Sandbox)',
    description: 'Simplified prism refraction scene for sandbox embedding — beam, rainbow, flare effects',
    icon: Triangle,
    category: 'shaders',
    color: '#818cf8',
    difficulty: 'Advanced',
  },
];

// ═══════════════════════════════════════════════
// CODE FILES PER SIMULATION
// ═══════════════════════════════════════════════
const CODE_FILES: Record<string, { files: any[]; deps: Record<string, string>; sandboxProps: any }> = {
  'interactive-box': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

function InteractiveBox(props) {
  const meshRef = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  // useFrame runs every frame (~60fps)
  // delta = seconds since last frame
  useFrame((state, delta) => {
    meshRef.current.rotation.x += delta
    meshRef.current.rotation.y += delta * 0.5
  })

  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
      }}
      onPointerOut={() => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? '#2dd4bf' : '#8b5cf6'}
        metalness={0.3}
        roughness={0.4} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 2]}
      shadows>
      <ambientLight intensity={0.5} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <InteractiveBox position={[-1.2, 0, 0]} />
      <InteractiveBox position={[1.2, 0, 0]} />
      <OrbitControls makeDefault />
      <Environment preset="city" />
    </Canvas>
  )
}`,
      },
      {
        name: 'InteractiveBox.tsx',
        language: 'tsx',
        code: `import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Interactive Box — the classic R3F example
// - Spins continuously via useFrame(delta)
// - Changes color on hover (purple → teal)
// - Scales up on click
// - Uses React state for interactivity

interface BoxProps {
  position?: [number, number, number]
}

export function InteractiveBox({ position }: BoxProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useFrame((state, delta) => {
    meshRef.current.rotation.x += delta
    meshRef.current.rotation.y += delta * 0.5
  })

  return (
    <mesh
      position={position}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? '#2dd4bf' : '#8b5cf6'}
        metalness={0.3}
        roughness={0.4} />
    </mesh>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
      'react': '19.x',
    },
    sandboxProps: {
      cameraPosition: [0, 0, 5] as [number, number, number],
      cameraFov: 50,
      environment: 'city' as const,
      envBackground: false,
      useStage: false,
      autoRotate: false,
      enableZoom: true,
      bloom: false,
      showGrid: true,
      gridPosition: [0, -1.5, 0] as [number, number, number],
    },
  },

  'water-molecule': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { Canvas } from '@react-three/fiber'
import { Stage, Grid, OrbitControls, Environment }
  from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping }
  from '@react-three/postprocessing'
import { WaterMoleculeScene }
  from './scenes/chemistry-scene'

export default function App() {
  return (
    <Canvas
      flat shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2, 8], fov: 35 }}>
      <fog attach="fog" args={['black', 10, 20]} />
      <Stage
        intensity={0.5}
        environment="city"
        shadows={{
          type: 'accumulative',
          bias: -0.001,
          intensity: Math.PI,
        }}
        adjustCamera={false}>
        <WaterMoleculeScene />
      </Stage>
      <Grid
        renderOrder={-1}
        position={[0, -2.5, 0]}
        infiniteGrid
        cellSize={0.6}
        sectionSize={3.3}
        sectionColor={[0.5, 0.5, 10]}
        fadeDistance={30} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom
        makeDefault />
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={2}
          mipmapBlur />
        <ToneMapping />
      </EffectComposer>
      <Environment
        background
        preset="night"
        blur={0.8} />
    </Canvas>
  )
}`,
      },
      {
        name: 'Atom.tsx',
        language: 'tsx',
        code: `import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Html } from '@react-three/drei'
import * as THREE from 'three'

// Atom — glowing sphere with orbiting electrons
export function Atom({
  position, color, scale, label,
  electronCount = 3,
}) {
  const groupRef = useRef()
  const nucleusRef = useRef()

  useFrame((state) => {
    groupRef.current.rotation.y =
      state.clock.elapsedTime * 0.3
    const s = 1 + Math.sin(
      state.clock.elapsedTime * 2) * 0.05
    nucleusRef.current.scale.setScalar(s)
  })

  return (
    <group ref={groupRef} position={position}
      scale={scale}>
      {/* Nucleus with distortion shader */}
      <mesh ref={nucleusRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          distort={0.2} speed={2}
          roughness={0.1} metalness={0.8} />
      </mesh>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color}
          transparent opacity={0.08} />
      </mesh>
      {/* Electron orbits */}
      {Array.from({ length: electronCount })
        .map((_, i) => (
          <ElectronOrbit key={i}
            radius={0.8 + i * 0.3}
            speed={1.5 - i * 0.3}
            tilt={i * 60} color={color} />
        ))}
      {/* HTML label overlay */}
      {label && (
        <Html position={[0, -1, 0]} center>
          <div className="label">{label}</div>
        </Html>
      )}
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 2, 8] as [number, number, number],
      cameraFov: 35,
      environment: 'night' as const,
      envBackground: true,
      autoRotateSpeed: 0.3,
      enableZoom: true,
      fog: { color: 'black', near: 10, far: 20 },
      gridPosition: [0, -2.5, 0] as [number, number, number],
    },
  },

  'chemistry-lab': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { Canvas } from '@react-three/fiber'
import { Stage, Grid, OrbitControls, Environment }
  from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping }
  from '@react-three/postprocessing'

export default function App() {
  return (
    <Canvas
      flat shadows
      dpr={[1, 2]}
      camera={{ position: [-6, 4, 8], fov: 35 }}>
      <fog attach="fog"
        args={['#0a0a1a', 12, 25]} />
      <Stage
        intensity={0.6}
        environment="warehouse"
        shadows={{
          type: 'accumulative',
          bias: -0.001,
          intensity: Math.PI,
        }}
        adjustCamera={false}>
        <ChemistryLabScene />
      </Stage>
      <Grid
        renderOrder={-1}
        position={[0, -1, 0]}
        infiniteGrid
        cellSize={0.5}
        sectionSize={3}
        sectionColor={[0.2, 0.5, 8]}
        fadeDistance={25} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.2}
        enableZoom
        makeDefault />
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={1.5}
          mipmapBlur />
        <ToneMapping />
      </EffectComposer>
      <Environment
        background
        preset="warehouse"
        blur={0.6} />
    </Canvas>
  )
}

function Beaker({ position, liquidColor,
  fillLevel }) {
  const liquidRef = useRef()

  useFrame((state) => {
    liquidRef.current.position.y =
      -0.5 + fillLevel * 0.5 +
      Math.sin(state.clock.elapsedTime * 1.5)
        * 0.02
  })

  return (
    <group position={position}>
      {/* Glass body — physical material */}
      <mesh>
        <cylinderGeometry
          args={[0.6, 0.5, 2, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#fff"
          transparent opacity={0.1}
          transmission={0.9}
          thickness={0.5} />
      </mesh>
      {/* Liquid with physics material */}
      <mesh ref={liquidRef}>
        <cylinderGeometry
          args={[0.58 * fillLevel + 0.1,
            0.48, fillLevel * 2, 32]} />
        <meshPhysicalMaterial
          color={liquidColor}
          transparent opacity={0.5}
          transmission={0.4}
          thickness={1} />
      </mesh>
      {/* Rising bubbles (instanced) */}
      <Bubbles color={liquidColor} count={12} />
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [-6, 4, 8] as [number, number, number],
      cameraFov: 35,
      environment: 'warehouse' as const,
      envBackground: true,
      autoRotateSpeed: 0.2,
      enableZoom: true,
      fog: { color: '#0a0a1a', near: 12, far: 25 },
      gridPosition: [0, -1, 0] as [number, number, number],
      bloomThreshold: 1.5,
    },
  },

  'pendulum': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stage, Grid, OrbitControls, Environment }
  from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping }
  from '@react-three/postprocessing'

export default function App() {
  return (
    <Canvas
      flat shadows
      dpr={[1, 2]}
      camera={{ position: [0, 3, 10], fov: 30 }}>
      <fog attach="fog"
        args={['black', 12, 25]} />
      <Stage
        intensity={0.5}
        environment="city"
        shadows={{
          type: 'accumulative',
          bias: -0.001,
          intensity: Math.PI,
        }}
        adjustCamera={false}>
        <PendulumScene />
      </Stage>
      <Grid
        renderOrder={-1}
        position={[0, -0.9, 0]}
        infiniteGrid
        cellSize={0.6}
        sectionSize={3.3}
        sectionColor={[0.5, 0.5, 10]}
        fadeDistance={30} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.05}
        enableZoom
        makeDefault
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8} />
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={2}
          mipmapBlur />
        <ToneMapping />
      </EffectComposer>
      <Environment
        background
        preset="sunset"
        blur={0.8} />
    </Canvas>
  )
}

function Pendulum({ position, length = 3,
  amplitude = 0.8, speed = 1.5, color }) {
  const armRef = useRef()

  useFrame((state) => {
    // Simple harmonic motion:
    // theta = A * sin(omega * t)
    armRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * speed)
        * amplitude
  })

  return (
    <group position={position}>
      {/* Pivot point */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#94a3b8"
          metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Swinging arm + bob */}
      <group ref={armRef}>
        <mesh position={[0, -length / 2, 0]}>
          <cylinderGeometry
            args={[0.015, 0.015, length, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0, -length, 0]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color={color}
            metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 3, 10] as [number, number, number],
      cameraFov: 30,
      environment: 'sunset' as const,
      envBackground: true,
      autoRotateSpeed: 0.05,
      enableZoom: true,
      fog: { color: 'black', near: 12, far: 25 },
      gridPosition: [0, -0.9, 0] as [number, number, number],
    },
  },

  'solar-system': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Sparkles,
  MeshDistortMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping }
  from '@react-three/postprocessing'

export default function App() {
  return (
    <Canvas
      flat shadows
      dpr={[1, 2]}
      camera={{ position: [0, 5, 10], fov: 40 }}>
      <color attach="background"
        args={['#050510']} />
      <Sparkles count={200} scale={20}
        size={1.5} speed={0.3} color="#fff" />
      <OrbitSystem />
      <OrbitControls
        enableZoom makeDefault
        autoRotate autoRotateSpeed={0.1} />
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={0.8}
          mipmapBlur
          intensity={1.5} />
        <ToneMapping />
      </EffectComposer>
    </Canvas>
  )
}

function OrbitSystem() {
  const planetRef = useRef()
  const starRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Planet orbits star
    planetRef.current.position.x =
      Math.cos(t * 0.5) * 3
    planetRef.current.position.z =
      Math.sin(t * 0.5) * 3
    // Star pulses
    const s = 1 + Math.sin(t * 3) * 0.03
    starRef.current.scale.setScalar(s)
  })

  return (
    <group>
      {/* Star with distortion shader */}
      <mesh ref={starRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <MeshDistortMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={2}
          distort={0.15} speed={3}
          toneMapped={false} />
      </mesh>
      <pointLight intensity={5}
        color="#fbbf24" distance={15} />
      {/* Orbit path */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry
          args={[3, 0.01, 8, 128]} />
        <meshBasicMaterial color="#fbbf24"
          transparent opacity={0.1} />
      </mesh>
      {/* Planet */}
      <group ref={planetRef}>
        <mesh castShadow>
          <sphereGeometry
            args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#3b82f6"
            roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 5, 10] as [number, number, number],
      cameraFov: 40,
      environment: 'night' as const,
      envBackground: false,
      useStage: false,
      autoRotateSpeed: 0.1,
      enableZoom: true,
      sparkles: true,
      bloom: true,
      bloomThreshold: 0.8,
      showGrid: false,
    },
  },

  'collision': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stage, Grid, OrbitControls, Environment }
  from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping }
  from '@react-three/postprocessing'

export default function App() {
  return (
    <Canvas
      flat shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2, 8], fov: 35 }}>
      <fog attach="fog"
        args={['black', 10, 22]} />
      <Stage
        intensity={0.5}
        environment="city"
        shadows={{
          type: 'accumulative',
          bias: -0.001,
          intensity: Math.PI,
        }}
        adjustCamera={false}>
        <CollisionBalls count={5} />
      </Stage>
      <Grid
        renderOrder={-1}
        position={[0, -0.5, 0]}
        infiniteGrid
        cellSize={0.5}
        sectionSize={3}
        sectionColor={[0.5, 0.5, 10]}
        fadeDistance={25} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.05}
        enableZoom
        makeDefault />
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={2}
          mipmapBlur />
        <ToneMapping />
      </EffectComposer>
      <Environment
        background
        preset="city"
        blur={0.8} />
    </Canvas>
  )
}

function CollisionBalls({ count = 5 }) {
  const ballRefs = useRef([])

  useFrame((state) => {
    const t = state.clock.elapsedTime * 2
    const swing = Math.sin(t)
    // Conservation of momentum:
    // Left ball → hits → right swings out
    if (ballRefs.current[0]) {
      ballRefs.current[0].rotation.z =
        swing > 0 ? swing * 0.6 : 0
    }
    if (ballRefs.current[count - 1]) {
      ballRefs.current[count - 1].rotation.z =
        swing < 0 ? swing * 0.6 : 0
    }
  })

  return (
    <group>
      {/* Frame */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry
          args={[count*0.7+0.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#374151"
          metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Hanging balls */}
      {Array.from({ length: count })
        .map((_, i) => (
        <group key={i}
          position={[
            (i-(count-1)/2)*0.65, 2.5, 0
          ]}
          ref={el =>
            ballRefs.current[i] = el}>
          <mesh position={[0, -1.1, 0]}>
            <cylinderGeometry
              args={[0.01, 0.01, 2.2, 8]} />
            <meshStandardMaterial
              color="#6b7280" />
          </mesh>
          <mesh position={[0, -2.2, 0]}
            castShadow>
            <sphereGeometry
              args={[0.3, 32, 32]} />
            <meshStandardMaterial
              color="#c0c0c0"
              metalness={0.9}
              roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 2, 8] as [number, number, number],
      cameraFov: 35,
      environment: 'city' as const,
      envBackground: true,
      autoRotateSpeed: 0.05,
      enableZoom: true,
      fog: { color: 'black', near: 10, far: 22 },
      gridPosition: [0, -0.5, 0] as [number, number, number],
    },
  },

  'frosted-glass': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial,
  ContactShadows, Environment,
  OrbitControls } from '@react-three/drei'
import { easing } from 'maath'

// Frosted Glass Lens — drcmda style
// MeshTransmissionMaterial creates the
// glass effect via FBO rendering.
// The lens follows the mouse pointer and
// expands on hover/click to magnify content.

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 40 }}
      dpr={[1, 2]}>
      <ambientLight intensity={0.7} />
      <spotLight
        intensity={0.5}
        angle={0.1}
        penumbra={1}
        position={[10, 15, -5]}
        castShadow />
      <Environment
        preset="city"
        background
        blur={1} />
      <ContactShadows
        resolution={512}
        position={[0, -0.8, 0]}
        opacity={1}
        scale={10}
        blur={2}
        far={0.8} />
      <GlassLens>
        <Crystal position={[0, 0, 0]}
          color="#e879f9" scale={1.2} />
        <Crystal position={[-1.8, 0.3, -0.5]}
          color="#60a5fa" scale={0.6} />
        <FloatingKnot position={[0.8, 0.5, -1]}
          color="#fbbf24" />
      </GlassLens>
      <OrbitControls makeDefault />
    </Canvas>
  )
}

function GlassLens({ children }) {
  const ref = useRef()
  const [open, setOpen] = useState(false)

  useFrame(({ viewport, camera, pointer },
    delta) => {
    const { width, height } =
      viewport.getCurrentViewport(
        camera, [0, 0, 3])
    // Smooth pointer follow
    easing.damp3(ref.current.position,
      [(pointer.x * width) / 2,
       (pointer.y * height) / 2, 3],
      open ? 0 : 0.1, delta)
    // Scale up when hovering content
    easing.damp3(ref.current.scale,
      open ? 4 : 0.01,
      open ? 0.5 : 0.2, delta)
  })

  return (
    <>
      <mesh ref={ref}>
        <circleGeometry args={[1, 64]} />
        <MeshTransmissionMaterial
          samples={16}
          resolution={512}
          anisotropicBlur={0.1}
          thickness={0.1}
          roughness={0.4}
          toneMapped={true} />
      </mesh>
      <group
        onPointerOver={() => setOpen(true)}
        onPointerOut={() => setOpen(false)}>
        {children}
      </group>
    </>
  )
}`,
      },
      {
        name: 'Crystal.tsx',
        language: 'tsx',
        code: `import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Floating crystal shape
// Uses dodecahedronGeometry for gem-like look
// Gently bobs and rotates over time

export function Crystal({
  position, color,
  speed = 1, scale = 1,
}) {
  const ref = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Gentle tumbling rotation
    ref.current.rotation.set(
      Math.cos(t / 4 * speed) / 8,
      Math.sin(t / 3 * speed) / 4,
      0.15 + Math.sin(t / 2 * speed) / 8)
    // Vertical bobbing
    ref.current.position.y =
      position[1] +
      (0.5 + Math.cos(t / 2 * speed)) / 7
  })

  return (
    <group ref={ref} position={position}>
      <mesh castShadow receiveShadow
        scale={scale}>
        <dodecahedronGeometry
          args={[0.7, 0]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.2}
          envMapIntensity={1.5} />
      </mesh>
    </group>
  )
}`,
      },
      {
        name: 'MeshTransmissionMaterial.md',
        language: 'markdown',
        code: `# MeshTransmissionMaterial

The key to the frosted glass effect is drei's
\`MeshTransmissionMaterial\`. It creates a
realistic glass/frosted-glass material by:

1. **Rendering the scene behind** the mesh
   into an FBO (Frame Buffer Object)
2. **Applying blur** via mip-map sampling
   to create the frosted appearance
3. **Simulating refraction** through the
   thickness and roughness parameters

## Key props:
- \`samples\`: Number of refraction samples
- \`resolution\`: FBO resolution (512)
- \`thickness\`: Glass thickness for refraction
- \`roughness\`: Surface roughness (frosting)
- \`anisotropicBlur\`: Directional blur amount

## The "lens" effect:
The glass mesh follows the pointer using
\`easing.damp3()\` from the \`maath\` library,
creating smooth interpolation per frame.`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
      'maath': '0.10.x',
    },
    sandboxProps: {
      cameraPosition: [0, 0, 4] as [number, number, number],
      cameraFov: 40,
      environment: 'city' as const,
      envBackground: true,
      envBlur: 1,
      useStage: false,
      autoRotate: false,
      enableZoom: true,
      bloom: false,
      showGrid: false,
      contactShadows: true,
    },
  },

  // ── NEW: Carousel (standalone Canvas) ──
  'carousel': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ScrollControls, useScroll,
  Environment, Text } from '@react-three/drei'
import { easing } from 'maath'
import './util' // BentPlaneGeometry, MeshSineMaterial

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 100], fov: 15 }}
      dpr={[1, 2]}>
      <fog attach="fog" args={['#1a1025', 8.5, 12]} />
      <ScrollControls pages={4} infinite>
        <Rig rotation={[0, 0, 0.15]}>
          <Carousel />
        </Rig>
        <Banner position={[0, -0.15, 0]} />
      </ScrollControls>
      <Environment preset="dawn" background blur={0.5} />
    </Canvas>
  )
}

function Rig({ children, ...props }) {
  const ref = useRef()
  const scroll = useScroll()

  useFrame((state, delta) => {
    // Rotate contents based on scroll offset
    ref.current.rotation.y =
      -scroll.offset * (Math.PI * 2)
    // Raycasts every frame
    state.events.update()
    // Camera follows pointer
    easing.damp3(state.camera.position,
      [-state.pointer.x * 2,
       state.pointer.y + 1.5, 10],
      0.3, delta)
    state.camera.lookAt(0, 0, 0)
  })

  return <group ref={ref} {...props}>{children}</group>
}

function Carousel({ radius = 1.4, count = 8 }) {
  return Array.from({ length: count }, (_, i) => (
    <Card
      key={i}
      color={COLORS[i % COLORS.length]}
      position={[
        Math.sin((i/count) * Math.PI * 2) * radius,
        0,
        Math.cos((i/count) * Math.PI * 2) * radius,
      ]}
      rotation={[
        0,
        Math.PI + (i/count) * Math.PI * 2,
        0,
      ]}
    />
  ))
}

function Card({ color, ...props }) {
  const ref = useRef()
  const [hovered, hover] = useState(false)

  // Event handlers
  const pointerOver = (e) => {
    e.stopPropagation()
    hover(true)
  }
  const pointerOut = () => hover(false)

  useFrame((state, delta) => {
    // Smooth scale on hover
    easing.damp3(ref.current.scale,
      hovered ? 1.15 : 1, 0.1, delta)
  })

  return (
    <mesh ref={ref}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      {...props}>
      <bentPlaneGeometry
        args={[0.1, 1, 1, 20, 20]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.1}
        roughness={0.4}
        clearcoat={0.8}
        side={THREE.DoubleSide} />
    </mesh>
  )
}`,
      },
      {
        name: 'util.ts',
        language: 'tsx',
        code: `import * as THREE from 'three'
import { extend } from '@react-three/fiber'

// Custom curved plane geometry
class BentPlaneGeometry extends THREE.PlaneGeometry {
  constructor(radius, width, height, wSeg, hSeg) {
    super(width, height, wSeg, hSeg)
    const p = this.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const angle = x / radius
      p.setXYZ(i,
        Math.sin(angle) * radius,
        p.getY(i),
        Math.cos(angle) * radius - radius)
    }
    p.needsUpdate = true
    this.computeVertexNormals()
  }
}

// Sine-wave animated material
class MeshSineMaterial extends THREE.MeshBasicMaterial {
  _time = { value: 0 }
  get time() { return this._time }

  onBeforeCompile(shader) {
    shader.uniforms.time = this._time
    shader.vertexShader = \`
      uniform float time;
      #define PI 3.14159265359
      \${shader.vertexShader}\`
    shader.vertexShader =
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        \`vec3 transformed = vec3(
          position.x,
          position.y + sin(time + uv.x * PI * 4.0) * 0.02,
          position.z);\`)
  }
}

extend({ BentPlaneGeometry, MeshSineMaterial })`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
      'maath': '0.10.x',
    },
    sandboxProps: {
      standalone: true,
    },
  },

  // ── Particle Field ──
  'particles': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const COUNT = 800
const FIELD = 8
const REPULSION = 2.5

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={[1, 2]}>
      <color attach="background" args={['#050510']} />
      <ParticleField />
      <OrbitControls enableZoom makeDefault />
    </Canvas>
  )
}

function ParticleField() {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const mousePos = useRef(new THREE.Vector3())
  const burstRef = useRef(0)

  const particles = useMemo(() =>
    Array.from({ length: COUNT }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * FIELD,
        (Math.random() - 0.5) * FIELD,
        (Math.random() - 0.5) * FIELD),
      basePos: new THREE.Vector3(
        (Math.random() - 0.5) * FIELD,
        (Math.random() - 0.5) * FIELD,
        (Math.random() - 0.5) * FIELD),
      speed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.05,
    })), [])

  // Invisible plane captures pointer
  const handlePointerMove = (e) => {
    if (e.point) mousePos.current.copy(e.point)
  }
  const handlePointerDown = (e) => {
    e.stopPropagation()
    burstRef.current = 1.0
  }

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const dt = Math.min(delta, 0.05)
    if (burstRef.current > 0)
      burstRef.current -= dt * 2

    particles.forEach((p, i) => {
      const t = state.clock.elapsedTime
      // Float
      p.pos.x = p.basePos.x +
        Math.sin(t * p.speed + p.phase) * 0.3
      p.pos.y = p.basePos.y +
        Math.cos(t * p.speed * 0.7) * 0.3

      // Mouse repulsion
      const dx = p.pos.x - mousePos.current.x
      const dy = p.pos.y - mousePos.current.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist < REPULSION && dist > 0.01) {
        const f = (1 - dist / REPULSION) * 0.8
          + burstRef.current * 3
        p.pos.x += (dx/dist) * f * dt * 5
        p.pos.y += (dy/dist) * f * dt * 5
      }

      dummy.position.copy(p.pos)
      dummy.scale.setScalar(p.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <mesh visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}>
        <planeGeometry args={[20, 20]} />
      </mesh>
      <instancedMesh ref={meshRef}
        args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#06b6d4"
          transparent opacity={0.8}
          toneMapped={false} />
      </instancedMesh>
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 0, 10] as [number, number, number],
      cameraFov: 50,
      environment: 'night' as const,
      envBackground: false,
      useStage: false,
      autoRotate: false,
      bloom: false,
      showGrid: false,
    },
  },

  // ── Attract / Repel Swarm ──
  'swarm': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `// Attract/Repel Swarm — click to toggle mode
// Particles chase or flee from cursor
// Uses velocity + damping for natural motion

function AttractingSwarm() {
  const meshRef = useRef()
  const mousePos = useRef(new THREE.Vector3())
  const [mode, setMode] = useState('attract')

  const particles = useMemo(() =>
    Array.from({ length: 500 }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3),
      vel: new THREE.Vector3(0, 0, 0),
      damping: 0.92 + Math.random() * 0.05,
    })), [])

  const handlePointerMove = (e) => {
    if (e.point) mousePos.current.copy(e.point)
  }
  const handleClick = (e) => {
    e.stopPropagation()
    setMode(m => m === 'attract' ? 'repel' : 'attract')
  }

  useFrame((state, delta) => {
    const sign = mode === 'attract' ? 1 : -1
    particles.forEach((p, i) => {
      // Force toward/away from mouse
      const dx = mousePos.current.x - p.pos.x
      const dy = mousePos.current.y - p.pos.y
      const dist = Math.sqrt(dx*dx + dy*dy) + 0.1
      const f = sign * 2.0 / (dist*dist + 1)

      p.vel.x += (dx/dist) * f * delta
      p.vel.y += (dy/dist) * f * delta
      p.pos.add(p.vel)
      p.vel.multiplyScalar(p.damping)
      // ... update instanced mesh
    })
  })

  return (
    <group>
      <mesh visible={false}
        onPointerMove={handlePointerMove}
        onClick={handleClick}>
        <planeGeometry args={[20, 20]} />
      </mesh>
      <instancedMesh ref={meshRef}
        args={[undefined, undefined, 500]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial transparent
          opacity={0.7} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 0, 10] as [number, number, number],
      cameraFov: 50,
      environment: 'night' as const,
      envBackground: false,
      useStage: false,
      autoRotate: false,
      bloom: false,
      showGrid: false,
    },
  },

  // ── Wave Shader ──
  'wave-shader': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Custom GLSL shader — vertex displacement + mouse ripples
export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 3, 6], fov: 45 }}
      dpr={[1, 2]}>
      <color attach="background" args={['#050510']} />
      <WaveMesh />
      <OrbitControls enableZoom makeDefault />
    </Canvas>
  )
}

function WaveMesh() {
  const matRef = useRef()
  const mouseRef = useRef(new THREE.Vector2(0, 0))

  const shaderData = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#0ea5e9') },
      uColor2: { value: new THREE.Color('#8b5cf6') },
      uColor3: { value: new THREE.Color('#ec4899') },
      uAmplitude: { value: 0.3 },
      uFrequency: { value: 2.0 },
      uSpeed: { value: 1.0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: \`
      uniform float uTime, uAmplitude, uFrequency, uSpeed;
      uniform vec2 uMouse;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        vUv = uv;
        vec3 pos = position;
        // Multi-layered waves
        pos.z += sin(pos.x * uFrequency + uTime * uSpeed)
          * uAmplitude;
        pos.z += sin(pos.y * uFrequency * 0.8
          + uTime * uSpeed * 0.6) * uAmplitude * 0.5;
        // Mouse ripple
        float dist = length(vec2(
          pos.x - uMouse.x * 5.0,
          pos.y - uMouse.y * 5.0));
        pos.z += sin(dist * 3.0 - uTime * 4.0)
          * 0.2 * max(0.0, 1.0 - dist * 0.2);
        vElevation = pos.z;
        gl_Position = projectionMatrix
          * modelViewMatrix * vec4(pos, 1.0);
      }\`,
    fragmentShader: \`
      uniform vec3 uColor1, uColor2, uColor3;
      uniform float uTime;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        float mix1 = smoothstep(-0.3, 0.3, vElevation);
        float mix2 = smoothstep(0.0, 1.0, vUv.x);
        vec3 color = mix(uColor1, uColor2, mix1);
        color = mix(color, uColor3, mix2 * 0.5);
        gl_FragColor = vec4(color, 0.9);
      }\`,
  }), [])

  const handlePointerMove = (e) => {
    if (e.uv) mouseRef.current.set(
      e.uv.x * 2 - 1, e.uv.y * 2 - 1)
  }

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value =
        state.clock.elapsedTime
      matRef.current.uniforms.uMouse.value
        .copy(mouseRef.current)
    }
  })

  return (
    <mesh rotation={[-Math.PI / 3, 0, 0]}
      onPointerMove={handlePointerMove}>
      <planeGeometry args={[10, 10, 128, 128]} />
      <shaderMaterial ref={matRef}
        {...shaderData}
        transparent
        side={THREE.DoubleSide} />
    </mesh>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 3, 6] as [number, number, number],
      cameraFov: 45,
      environment: 'night' as const,
      envBackground: false,
      useStage: false,
      autoRotate: false,
      bloom: false,
      showGrid: false,
    },
  },

  // ── Audio Wave ──
  'audio-wave': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `// Audio Visualizer — simulated frequency bands
// Click mesh to toggle play/pause

function AudioWave() {
  const matRef = useRef()
  const [isPlaying, setIsPlaying] = useState(true)

  useFrame((state) => {
    if (!matRef.current || !isPlaying) return
    const t = state.clock.elapsedTime
    matRef.current.uniforms.uTime.value = t
    // Simulated audio levels
    matRef.current.uniforms.uBass.value =
      0.4 + Math.sin(t * 0.5) * 0.3
    matRef.current.uniforms.uMid.value =
      0.3 + Math.sin(t * 1.2) * 0.25
    matRef.current.uniforms.uTreble.value =
      0.2 + Math.sin(t * 2.5) * 0.2
  })

  return (
    <mesh onClick={(e) => {
      e.stopPropagation()
      setIsPlaying(p => !p)
    }}>
      <planeGeometry args={[8, 2, 256, 1]} />
      <shaderMaterial ref={matRef}
        uniforms={{
          uTime: { value: 0 },
          uBass: { value: 0.5 },
          uMid: { value: 0.3 },
          uTreble: { value: 0.4 },
          uColor: { value: new Color('#8b5cf6') },
        }}
        vertexShader={/* ... bass/mid/treble displacement */}
        fragmentShader={/* ... color from elevation */}
        transparent
        side={THREE.DoubleSide} />
    </mesh>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 1, 5] as [number, number, number],
      cameraFov: 50,
      environment: 'night' as const,
      envBackground: false,
      useStage: false,
      autoRotate: false,
      bloom: false,
      showGrid: false,
    },
  },

  // ── Portal ──
  'portal': {
    files: [
      {
        name: 'App.tsx',
        language: 'tsx',
        active: true,
        code: `// Layered Portal — drag to rotate, hover layers
// Event handlers:
//   onPointerDown/Up/Move — drag gesture
//   onPointerEnter/Leave — layer highlight
//   onDoubleClick — reset rotation

function DraggableGroup({ children }) {
  const groupRef = useRef()
  const isDragging = useRef(false)
  const prevPointer = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  const onPointerDown = (e) => {
    e.stopPropagation()
    isDragging.current = true
    prevPointer.current = { x: e.clientX, y: e.clientY }
    e.target?.setPointerCapture?.(e.pointerId)
  }

  const onPointerUp = () => {
    isDragging.current = false
  }

  const onPointerMove = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - prevPointer.current.x
    const dy = e.clientY - prevPointer.current.y
    prevPointer.current = { x: e.clientX, y: e.clientY }
    velocity.current = { x: dy * 0.003, y: dx * 0.003 }
    target.current.x += dy * 0.003
    target.current.y += dx * 0.003
  }

  const onDoubleClick = (e) => {
    e.stopPropagation()
    target.current = { x: 0, y: 0 }
    velocity.current = { x: 0, y: 0 }
  }

  useFrame((state, delta) => {
    if (!isDragging.current) {
      velocity.current.x *= 0.95
      velocity.current.y *= 0.95
      target.current.x += velocity.current.x
      target.current.y += velocity.current.y
    }
    easing.damp(groupRef.current.rotation,
      'x', target.current.x, 0.15, delta)
    easing.damp(groupRef.current.rotation,
      'y', target.current.y, 0.15, delta)
  })

  return (
    <group ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onDoubleClick={onDoubleClick}>
      {children}
    </group>
  )
}

function DepthLayer({ position, color, label }) {
  const [hovered, setHovered] = useState(false)

  return (
    <RoundedBox position={position}
      args={[2, 1.5, 0.05]}
      radius={0.05} smoothness={4}
      onPointerEnter={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}>
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={hovered ? 0.95 : 0.8}
        clearcoat={0.5} />
    </RoundedBox>
  )
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      'three': '0.182.0',
      'maath': '0.10.x',
    },
    sandboxProps: {
      cameraPosition: [0, 1, 6] as [number, number, number],
      cameraFov: 45,
      environment: 'city' as const,
      envBackground: false,
      useStage: false,
      autoRotate: false,
      bloom: false,
      showGrid: false,
    },
  },

  // ── NEW: Rich example scenes ──
  'galaxy': {
    files: [{ name: 'GalaxyScene.tsx', language: 'tsx', active: true, code: `// Spiral galaxy with 15,000+ particles\n// See: components/simulations/scenes/galaxy-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { standalone: true },
  },
  'galaxy-field': {
    files: [{ name: 'GalaxyFieldScene.tsx', language: 'tsx', active: true, code: `// 5,000-particle galaxy field for sandbox wrapper\n// See: components/simulations/scenes/galaxy-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0', 'maath': '0.10.x' },
    sandboxProps: { cameraPosition: [0, 2, 8] as [number, number, number], cameraFov: 60, environment: 'night' as const, envBackground: false, showGrid: false, bloom: true, bloomThreshold: 0.5 },
  },
  'terrain': {
    files: [{ name: 'TerrainScene.tsx', language: 'tsx', active: true, code: `// Procedural terrain with height-based coloring\n// GLSL noise + FBM for realistic landscapes\n// See: components/simulations/scenes/terrain-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 5, 8] as [number, number, number], cameraFov: 60, environment: 'dawn' as const, envBackground: false, showGrid: false, autoRotate: true, autoRotateSpeed: 0.3 },
  },
  'terrain-fly': {
    files: [{ name: 'TerrainSimpleScene.tsx', language: 'tsx', active: true, code: `// Standalone terrain with Sky, fog and flying camera\n// See: components/simulations/scenes/terrain-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { standalone: true },
  },
  'instanced-boxes': {
    files: [{ name: 'InstancedBoxesScene.tsx', language: 'tsx', active: true, code: `// 1000 instanced boxes with Fibonacci sphere layout\n// Uses tempObject.updateMatrix() + setMatrixAt() pattern\n// See: components/simulations/scenes/instanced-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 3, 8] as [number, number, number], cameraFov: 50, environment: 'sunset' as const, envBackground: false, showGrid: false, autoRotate: false },
  },
  'instanced-flow': {
    files: [{ name: 'InstancedFlowScene.tsx', language: 'tsx', active: true, code: `// 2000 spheres flowing along parametric curves\n// Helix, Lissajous, Sine wave paths\n// See: components/simulations/scenes/instanced-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 2, 10] as [number, number, number], cameraFov: 50, environment: 'city' as const, envBackground: false, showGrid: false },
  },
  'ocean': {
    files: [{ name: 'OceanScene.tsx', language: 'tsx', active: true, code: `// GLSL ocean shader: multi-layered sine waves\n// Fresnel coloring + specular highlights + mouse ripples\n// See: components/simulations/scenes/ocean-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 5, 15] as [number, number, number], cameraFov: 50, environment: 'dawn' as const, envBackground: false, showGrid: false },
  },
  'ocean-sunset': {
    files: [{ name: 'OceanSunsetScene.tsx', language: 'tsx', active: true, code: `// Full ocean scene with sunset sky and bobbing buoys\n// See: components/simulations/scenes/ocean-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { standalone: true },
  },
  'dna-helix': {
    files: [{ name: 'DNAHelixScene.tsx', language: 'tsx', active: true, code: `// DNA double helix with 20 base pairs\n// Color-coded: A=red, T=blue, G=green, C=yellow\n// See: components/simulations/scenes/dna-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 8] as [number, number, number], cameraFov: 50, environment: 'studio' as const, envBackground: false, showGrid: false, bloom: true, bloomThreshold: 0.8 },
  },
  'dna-detail': {
    files: [{ name: 'DNADetailScene.tsx', language: 'tsx', active: true, code: `// Zoomed DNA: 5 base pairs with labels + hydrogen bonds\n// Click nucleotides for info\n// See: components/simulations/scenes/dna-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 6] as [number, number, number], cameraFov: 50, environment: 'studio' as const, envBackground: false, showGrid: false },
  },
  'voxel-city': {
    files: [{ name: 'VoxelCityScene.tsx', language: 'tsx', active: true, code: `// Procedural city with ~225 buildings\n// InstancedMesh + seeded random generation\n// See: components/simulations/scenes/city-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [10, 10, 15] as [number, number, number], cameraFov: 50, environment: 'city' as const, envBackground: false, showGrid: false },
  },
  'city-night': {
    files: [{ name: 'CityNightScene.tsx', language: 'tsx', active: true, code: `// Nighttime city with emissive windows, animated cars\n// Stars + fog + street lamps\n// See: components/simulations/scenes/city-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [10, 10, 15] as [number, number, number], cameraFov: 50, showGrid: false },
  },
  'raymarching': {
    files: [{ name: 'RaymarchingScene.tsx', language: 'tsx', active: true, code: `// Real-time raymarching with SDF smooth union\n// 4 animated spheres + ambient occlusion\n// See: components/simulations/scenes/raymarching-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 5] as [number, number, number], cameraFov: 50, showGrid: false },
  },
  'metaballs': {
    files: [{ name: 'MetaballsScene.tsx', language: 'tsx', active: true, code: `// 6 metaballs with iridescent coloring\n// Click to spawn temporary extra blobs\n// See: components/simulations/scenes/raymarching-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 5] as [number, number, number], cameraFov: 50, showGrid: false },
  },
  'cloth-sim': {
    files: [{ name: 'ClothSimScene.tsx', language: 'tsx', active: true, code: `// Spring-mass cloth (30×30 grid)\n// Verlet integration + wind + drag interaction\n// See: components/simulations/scenes/cloth-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 5] as [number, number, number], cameraFov: 50, environment: 'studio' as const, envBackground: false, showGrid: false },
  },
  'flag': {
    files: [{ name: 'FlagScene.tsx', language: 'tsx', active: true, code: `// Flag on pole with wind physics\n// Verlet integration + pointer wind direction\n// See: components/simulations/scenes/cloth-scene.tsx` }],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 5] as [number, number, number], cameraFov: 50, environment: 'sunset' as const, envBackground: false, showGrid: false },
  },

  // ── Shoe Configurator ──
  'shoe-configurator': {
    files: [
      {
        name: 'package.json',
        language: 'json',
        code: `{
  "name": "shoe-configurator",
  "version": "1.0.0",
  "description": "A super small configurator that shows you how to make GLTF assets dynamic.",
  "keywords": ["valtio", "state", "gltf", "configurator"],
  "main": "src/index.js",
  "dependencies": {
    "@react-three/drei": "9.76.0",
    "@react-three/fiber": "8.13.3",
    "react": "18.2.0",
    "react-colorful": "5.6.1",
    "react-dom": "18.2.0",
    "three": "0.153.0",
    "valtio": "1.10.3"
  }
}`,
      },
      {
        name: '.prettierrc',
        language: 'json',
        code: `{
  "semi": false,
  "trailingComma": "all",
  "singleQuote": false,
  "printWidth": 120,
  "tabWidth": 2
}`,
      },
      {
        name: 'public/index.html',
        language: 'html',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shoe Configurator</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
      },
      {
        name: 'public/nike_air_zoom_pegasus_36-transformed.glb',
        language: 'text',
        code: `// Binary GLTF model file (shoe-draco.glb)
// This is the Nike Air Zoom Pegasus 36 3D model
// Draco-compressed, ~248KB
// Original: https://market.pmnd.rs`,
      },
      {
        name: 'src/index.js',
        language: 'js',
        code: `import { createRoot } from "react-dom/client"
import "./styles.css"
import App from "./App"

createRoot(document.getElementById("root")).render(<App />)`,
      },
      {
        name: 'src/App.js',
        language: 'js',
        active: true,
        code: `import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
  useGLTF,
  ContactShadows,
  Environment,
  OrbitControls,
} from "@react-three/drei"
import { HexColorPicker } from "react-colorful"
import { useSnapshot } from "valtio"
import { state } from "./store"
import { Overlay } from "./Overlay"

export default function App() {
  return (
    <>
      <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <spotLight
          intensity={0.5}
          angle={0.1}
          penumbra={1}
          position={[10, 15, 10]}
          castShadow
        />
        <Shoe />
        <Environment preset="city" />
        <ContactShadows
          position={[0, -0.8, 0]}
          opacity={0.25}
          scale={10}
          blur={1.5}
          far={0.8}
        />
        <OrbitControls
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
      <Picker />
      <Overlay />
    </>
  )
}

function Shoe() {
  const ref = useRef()
  const snap = useSnapshot(state)
  const { nodes, materials } = useGLTF(
    "nike_air_zoom_pegasus_36-transformed.glb",
  )
  const [hovered, set] = useState(null)

  useEffect(() => {
    const cursor = \`url('https://uploads.codesandbox.io/uploads/user/b3e56831-8b98-4fee-b941-0e27f39883ab/Ad1_-cursor.png') 39 39, auto\`
    if (hovered) {
      document.body.style.cursor = cursor
      return () => void (document.body.style.cursor = "auto")
    }
  }, [hovered])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    ref.current.rotation.set(
      Math.cos(t / 4) / 8,
      Math.sin(t / 4) / 8,
      -0.2 - (1 + Math.sin(t / 1.5)) / 20,
    )
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10
  })

  return (
    <group
      ref={ref}
      onPointerOver={(e) => (
        e.stopPropagation(), set(e.object.material.name)
      )}
      onPointerOut={(e) => {
        e.intersections.length === 0 && set(null)
      }}
      onPointerMissed={() => (state.current = null)}
      onClick={(e) => (
        e.stopPropagation(),
        (state.current = e.object.material.name)
      )}
    >
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe.geometry}
        material={materials.laces}
        material-color={snap.items.laces}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_1.geometry}
        material={materials.mesh}
        material-color={snap.items.mesh}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_2.geometry}
        material={materials.caps}
        material-color={snap.items.caps}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_3.geometry}
        material={materials.inner}
        material-color={snap.items.inner}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_4.geometry}
        material={materials.sole}
        material-color={snap.items.sole}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_5.geometry}
        material={materials.stripes}
        material-color={snap.items.stripes}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_6.geometry}
        material={materials.band}
        material-color={snap.items.band}
      />
      <mesh
        receiveShadow
        castShadow
        geometry={nodes.shoe_7.geometry}
        material={materials.patch}
        material-color={snap.items.patch}
      />
    </group>
  )
}

function Picker() {
  const snap = useSnapshot(state)
  return (
    <div style={{ display: snap.current ? "block" : "none" }}>
      <HexColorPicker
        className="picker"
        color={snap.items[snap.current]}
        onChange={(color) => (state.items[snap.current] = color)}
      />
      <h1>{snap.current}</h1>
    </div>
  )
}`,
      },
      {
        name: 'src/Overlay.js',
        language: 'js',
        code: `import { useSnapshot } from "valtio"
import { state } from "./store"

export function Overlay() {
  const snap = useSnapshot(state)
  return (
    <div className="overlay">
      <div className="overlay--header">
        <div className="overlay--title">
          <span>SHOE</span>
          <br />
          <span>CONFIGURATOR</span>
        </div>
        <div className="overlay--desc">
          Click on a shoe part to change its color. Use the color picker
          to select a new color.
        </div>
      </div>
      {snap.current && (
        <div className="overlay--selected">
          <p>
            Selected: <strong>{snap.current}</strong>
          </p>
        </div>
      )}
    </div>
  )
}`,
      },
      {
        name: 'src/store.js',
        language: 'js',
        code: `import { proxy } from "valtio"

const state = proxy({
  current: null,
  items: {
    laces: "#ffffff",
    mesh: "#ffffff",
    caps: "#ffffff",
    inner: "#ffffff",
    sole: "#ffffff",
    stripes: "#ffffff",
    band: "#ffffff",
    patch: "#ffffff",
  },
})

export { state }`,
      },
      {
        name: 'src/styles.css',
        language: 'css',
        code: `@import url("https://rsms.me/inter/inter.css");

* {
  box-sizing: border-box;
}

html,
body,
#root {
  position: relative;
  margin: 0;
  padding: 0;
  overflow: hidden;
  outline: none;
  width: 100vw;
  height: 100vh;
}

body {
  background: white;
  font-family: "Inter var", sans-serif;
  display: flex;
  justify-content: center;
}

#root {
  width: 76ch;
}

h1 {
  position: absolute;
  top: 43px;
  left: 140px;
  padding: 0;
  margin: 40px;
  font-size: 5em;
  font-weight: 400;
  line-height: 0.7em;
  letter-spacing: -2px;
  color: #272730;
}

.picker {
  position: absolute !important;
  top: 74px;
  left: 70px;
  width: 90px !important;
  height: 90px !important;
}

.overlay {
  position: absolute;
  bottom: 40px;
  left: 40px;
  pointer-events: none;
}

.overlay--header {
  margin-bottom: 10px;
}

.overlay--title {
  font-size: 2em;
  font-weight: 800;
  line-height: 1em;
  letter-spacing: -1px;
  color: #272730;
}

.overlay--desc {
  font-size: 0.85em;
  color: #666;
  max-width: 250px;
  margin-top: 6px;
}

.overlay--selected {
  font-size: 0.9em;
  color: #333;
}

.overlay--selected strong {
  text-transform: capitalize;
}`,
      },
    ],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0', 'valtio': '1.10.3', 'react-colorful': '5.6.1' },
    sandboxProps: { standalone: true },
  },
  'shoe-display': {
    files: [
      {
        name: 'package.json',
        language: 'json',
        code: `{
  "name": "shoe-display",
  "version": "1.0.0",
  "description": "Simple animated shoe display with useGLTF",
  "keywords": ["drei", "gltf", "animation"],
  "main": "src/index.js",
  "dependencies": {
    "@react-three/drei": "9.76.0",
    "@react-three/fiber": "8.13.3",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "three": "0.153.0"
  }
}`,
      },
      {
        name: '.prettierrc',
        language: 'json',
        code: `{
  "semi": false,
  "trailingComma": "all",
  "singleQuote": false,
  "printWidth": 120,
  "tabWidth": 2
}`,
      },
      {
        name: 'public/index.html',
        language: 'html',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shoe Display</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
      },
      {
        name: 'public/shoe-draco.glb',
        language: 'text',
        code: `// Binary GLTF model file (shoe-draco.glb)
// Draco-compressed Nike shoe 3D model, ~248KB
// Original: https://market.pmnd.rs`,
      },
      {
        name: 'src/index.js',
        language: 'js',
        code: `import { createRoot } from "react-dom/client"
import "./styles.css"
import App from "./App"

createRoot(document.getElementById("root")).render(<App />)`,
      },
      {
        name: 'src/App.js',
        language: 'js',
        active: true,
        code: `import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
  useGLTF,
  ContactShadows,
  Environment,
  OrbitControls,
} from "@react-three/drei"

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
      <ambientLight intensity={0.7} />
      <spotLight
        intensity={0.5}
        angle={0.1}
        penumbra={1}
        position={[10, 15, 10]}
        castShadow
      />
      <Shoe />
      <Environment preset="city" />
      <ContactShadows
        position={[0, -0.8, 0]}
        opacity={0.25}
        scale={10}
        blur={1.5}
        far={0.8}
      />
      <OrbitControls
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        enableZoom={false}
        enablePan={false}
      />
    </Canvas>
  )
}

function Shoe() {
  const ref = useRef()
  const { nodes, materials } = useGLTF("shoe-draco.glb")

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    ref.current.rotation.set(
      Math.cos(t / 4) / 8,
      Math.sin(t / 4) / 8,
      -0.2 - (1 + Math.sin(t / 1.5)) / 20,
    )
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10
  })

  return (
    <group ref={ref}>
      <mesh receiveShadow castShadow geometry={nodes.shoe.geometry} material={materials.laces} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_1.geometry} material={materials.mesh} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_2.geometry} material={materials.caps} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_3.geometry} material={materials.inner} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_4.geometry} material={materials.sole} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_5.geometry} material={materials.stripes} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_6.geometry} material={materials.band} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_7.geometry} material={materials.patch} />
    </group>
  )
}`,
      },
      {
        name: 'src/styles.css',
        language: 'css',
        code: `* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

body {
  background: #fafafa;
  font-family: "Inter var", sans-serif;
}`,
      },
    ],
    deps: { '@react-three/fiber': '9.5.0', '@react-three/drei': '10.7.7', 'three': '0.182.0' },
    sandboxProps: { cameraPosition: [0, 0, 4] as [number, number, number], cameraFov: 45, environment: 'city' as const, envBackground: false, showGrid: false },
  },

  // ── Prime — Prism Light Refraction ──
  'prime': {
    files: [
      {
        name: 'package.json',
        language: 'json',
        code: `{
  "name": "prime-prism-refraction",
  "version": "1.0.0",
  "description": "Prism light refraction with rainbow, bloom & custom raycasting",
  "keywords": ["prism", "refraction", "rainbow", "postprocessing", "bloom"],
  "main": "src/index.js",
  "dependencies": {
    "@react-three/drei": "10.0.7",
    "@react-three/fiber": "9.1.2",
    "@react-three/postprocessing": "3.0.4",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "three": "0.176.0",
    "three-stdlib": "2.30.3"
  }
}`,
      },
      {
        name: '.prettierrc',
        language: 'json',
        code: `{
  "semi": false,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 120,
  "tabWidth": 2
}`,
      },
      {
        name: 'public/index.html',
        language: 'html',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Prime - Prism Light Refraction</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
      },
      {
        name: 'public/gltf/prism.glb',
        language: 'text',
        code: `// Binary GLTF model file (prism.glb)
// Triangular prism geometry for light refraction demo
// ~41KB, loaded via GLTFLoader from three-stdlib`,
      },
      {
        name: 'public/textures/lensflare/lensflare0.png',
        language: 'text',
        code: `// Lens flare sprite texture (PNG)
// Used by the Flare component with drei Instances`,
      },
      {
        name: 'public/lut/F-6800-STD.cube',
        language: 'text',
        code: `// Color LUT (Look-Up Table) file
// Fujifilm 6800 Standard film emulation
// Used by @react-three/postprocessing LUT effect
// ~970KB .cube format`,
      },
      {
        name: 'src/index.js',
        language: 'js',
        code: `import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        name: 'src/util.js',
        language: 'js',
        code: `import * as THREE from 'three'

export function lerp(object, prop, goal, speed = 0.1) {
  object[prop] = THREE.MathUtils.lerp(object[prop], goal, speed)
}

const color = new THREE.Color()
export function lerpC(value, goal, speed = 0.1) {
  value.lerp(color.set(goal), speed)
}

const vector = new THREE.Vector3()
export function lerpV3(value, goal, speed = 0.1) {
  value.lerp(vector.set(...goal), speed)
}

export function calculateRefractionAngle(
  incidentAngle,
  glassIor = 2.5,
  airIor = 1.000293,
) {
  const theta =
    Math.asin((airIor * Math.sin(incidentAngle)) / glassIor) || 0
  return theta
}`,
      },
      {
        name: 'src/components/Reflect.js',
        language: 'js',
        code: `import * as THREE from 'three'
import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// Custom raycasting component that bounces rays off surfaces
// Provides onRayOver, onRayOut, onRayMove callbacks to children
export const Reflect = forwardRef(function Reflect(
  { children, start = [0, 0, 0], end = [0, 0, 0], bounce = 10, far = 100, ...props },
  fRef,
) {
  const scene = useThree((state) => state.scene)
  const vStart = new THREE.Vector3()
  const vEnd = new THREE.Vector3()
  const vDir = new THREE.Vector3()
  const vPos = new THREE.Vector3()

  let intersects = []
  let intersect = null

  const api = useMemo(
    () => ({
      number: 0,
      objects: [],
      hits: new Map(),
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      raycaster: new THREE.Raycaster(),
      positions: [],
      setRay: (_start, _end) => {
        api.start.set(..._start)
        api.end.set(..._end)
      },
      update: () => {
        api.number = 0
        api.hits.forEach((hit) => {
          if (hit.intersect.object !== intersect?.object) {
            hit.intersect.object.onRayOut?.(hit.intersect)
          }
        })
        api.hits.clear()

        vStart.copy(api.start)
        vEnd.copy(api.end)
        vDir.subVectors(vEnd, vStart).normalize()

        api.raycaster.set(vStart, vDir)
        intersects = api.raycaster.intersectObjects(scene.children, true)
        intersect = intersects.find(
          (i) => !api.objects.includes(i.object),
        )

        if (intersect) {
          api.number++
          const hit = api.hits.get(intersect.object.uuid)
          if (!hit) {
            api.hits.set(intersect.object.uuid, { intersect })
            intersect.object.onRayOver?.(intersect)
          }
          intersect.object.onRayMove?.(intersect)
        }
      },
    }),
    [],
  )

  useImperativeHandle(fRef, () => api, [api])
  useFrame(() => api.update())

  return (
    <group {...props}>
      {children}
    </group>
  )
})`,
      },
      {
        name: 'src/components/Beam.js',
        language: 'js',
        code: `import { useRef, useMemo, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Instances, Instance } from '@react-three/drei'
import { lerp } from '../util'

// Light beam using instanced meshes for streak + glow
export const Beam = forwardRef(function Beam(
  { stride = 0.5, width = 0.01, ...props },
  fRef,
) {
  const streakRef = useRef()
  const glowRef = useRef()

  const obj = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(() => {
    if (streakRef.current && glowRef.current) {
      lerp(streakRef.current.scale, 'x', width, 0.1)
      lerp(glowRef.current.scale, 'x', width * 20, 0.1)
    }
  })

  return (
    <group {...props}>
      <Instances limit={2}>
        <planeGeometry />
        <meshBasicMaterial
          toneMapped={false}
          side={THREE.DoubleSide}
        />
        <Instance
          ref={streakRef}
          color="white"
          scale={[width, stride, 1]}
          rotation={[0, 0, 0]}
        />
        <Instance
          ref={glowRef}
          color="white"
          scale={[width * 20, stride, 1]}
          rotation={[0, 0, 0]}
        />
      </Instances>
    </group>
  )
})`,
      },
      {
        name: 'src/components/Prism.js',
        language: 'js',
        code: `import { useRef } from 'react'
import { useLoader } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { GLTFLoader } from 'three-stdlib'

// Loads the prism GLB model with transmission material
export function Prism({ onRayOver, onRayOut, onRayMove, ...props }) {
  const ref = useRef()
  const { nodes } = useLoader(GLTFLoader, '/gltf/prism.glb')

  return (
    <mesh
      ref={ref}
      geometry={nodes?.prism?.geometry || nodes[Object.keys(nodes)[0]]?.geometry}
      {...props}
      {...{ onRayOver, onRayOut, onRayMove }}
    >
      <MeshTransmissionMaterial
        backside
        samples={6}
        resolution={512}
        transmission={1}
        clearcoat={0}
        clearcoatRoughness={0.0}
        thickness={200}
        backsideThickness={200}
        ior={1.5}
        chromaticAberration={1}
        anisotropy={1}
        roughness={0}
        distortion={0}
        distortionScale={0}
        temporalDistortion={0}
        color="#fff"
        attenuationDistance={Infinity}
        attenuationColor="#ffffff"
      />
    </mesh>
  )
}`,
      },
      {
        name: 'src/components/Rainbow.js',
        language: 'js',
        code: `import { useRef, useMemo, useEffect } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Spectral color function (Zucconi6 algorithm)
const RainbowMaterial = shaderMaterial(
  {
    time: 0,
    speed: 1,
    startRadius: 0,
    endRadius: 0.5,
    emissiveIntensity: 2.5,
    fade: 0,
  },
  // Vertex shader
  \`varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }\`,
  // Fragment shader with spectral Zucconi6
  \`varying vec2 vUv;
  uniform float time;
  uniform float speed;
  uniform float startRadius;
  uniform float endRadius;
  uniform float emissiveIntensity;
  uniform float fade;

  vec3 bump3y(vec3 x, vec3 yoffset) {
    vec3 y = vec3(1.0) - x * x;
    y = clamp(y - yoffset, 0.0, 1.0);
    return y;
  }

  vec3 spectral_zucconi6(float w) {
    float x = clamp((w - 400.0) / 300.0, 0.0, 1.0);
    vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
    vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
    vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
    vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
    vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
    vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
    return bump3y(c1 * (x - x1), y1) + bump3y(c2 * (x - x2), y2);
  }

  void main() {
    float dist = length(vUv - vec2(0.5));
    float t = clamp((dist - startRadius) / (endRadius - startRadius), 0.0, 1.0);
    float wavelength = mix(380.0, 700.0, t);
    vec3 color = spectral_zucconi6(wavelength) * emissiveIntensity;
    float alpha = smoothstep(endRadius, startRadius, dist) * fade;
    gl_FragColor = vec4(color, alpha);
  }\`,
)

extend({ RainbowMaterial })

export function Rainbow({ startRadius = 0, endRadius = 0.5, emissiveIntensity = 2.5, fade = 1, ...props }) {
  const ref = useRef()

  useFrame((_, delta) => {
    if (ref.current) ref.current.time += delta * ref.current.speed
  })

  return (
    <mesh {...props}>
      <planeGeometry args={[10, 10]} />
      <rainbowMaterial
        ref={ref}
        key={RainbowMaterial.key}
        side={THREE.DoubleSide}
        transparent
        startRadius={startRadius}
        endRadius={endRadius}
        emissiveIntensity={emissiveIntensity}
        fade={fade}
      />
    </mesh>
  )
}`,
      },
      {
        name: 'src/components/Flare.js',
        language: 'js',
        code: `import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import { lerp, lerpV3 } from '../util'

// Animated lens flare using drei Instances
export function Flare({
  streak = [12, 1, 1],
  visible = true,
  ...props
}) {
  const ref = useRef()

  useFrame(() => {
    if (ref.current) {
      lerp(ref.current, 'opacity', visible ? 1 : 0, 0.1)
    }
  })

  return (
    <group {...props}>
      <Instances limit={10}>
        <planeGeometry />
        <meshBasicMaterial
          ref={ref}
          toneMapped={false}
          transparent
          opacity={1}
          color="white"
          depthWrite={false}
        />
        {streak.map((s, i) => (
          <Instance
            key={i}
            scale={[s * 0.5, s * 0.1, 1]}
            position={[0, 0, 0]}
            color="white"
          />
        ))}
      </Instances>
    </group>
  )
}`,
      },
      {
        name: 'src/components/Box.js',
        language: 'js',
        code: `import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { lerpC } from '../util'

// Interactive rounded box that glows on ray-hover
export function Box({ onRayOver, onRayOut, onRayMove, ...props }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame(() => {
    if (ref.current) {
      lerpC(ref.current.color, hovered ? '#ff6080' : '#fff', 0.1)
    }
  })

  return (
    <RoundedBox
      args={[1, 1, 1]}
      radius={0.15}
      smoothness={10}
      {...props}
      {...{ onRayOver: (e) => setHovered(true), onRayOut: (e) => setHovered(false), onRayMove }}
    >
      <meshStandardMaterial ref={ref} toneMapped={false} />
    </RoundedBox>
  )
}`,
      },
      {
        name: 'src/App.js',
        language: 'js',
        active: true,
        code: `import * as THREE from 'three'
import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center, Text3D, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Reflect } from './components/Reflect'
import { Beam } from './components/Beam'
import { Rainbow } from './components/Rainbow'
import { Prism } from './components/Prism'
import { Flare } from './components/Flare'
import { Box } from './components/Box'
import { calculateRefractionAngle, lerp, lerpV3 } from './util'

export default function App() {
  return (
    <Canvas
      orthographic
      gl={{ antialias: false }}
      camera={{ position: [0, 0, 100], zoom: 70 }}
    >
      <color attach="background" args={['black']} />
      <Scene />
      <EffectComposer disableNormalPass>
        <Bloom
          mipmapBlur
          levels={9}
          intensity={1.5}
          luminanceThreshold={1}
          luminanceSmoothing={1}
        />
      </EffectComposer>
    </Canvas>
  )
}

function Scene() {
  const [isPrism, setIsPrism] = useState(true)
  const flare = useRef()
  const ambient = useRef()
  const spot = useRef()
  const boxreflect = useRef()
  const rainbow = useRef()

  const rayOut = () => rainbow.current?.material && lerp(rainbow.current.material, 'fade', 0, 0.1)
  const rayOver = (e) => {
    rainbow.current?.material && lerp(rainbow.current.material, 'fade', 1, 0.1)
    e.stopPropagation()
  }

  const vec = new THREE.Vector3()
  const rayMove = ({ api, position, direction, normal, face }) => {
    if (!api) return
    lerp(
      api.start,
      'x',
      position?.x || 0,
      0.1,
    )
    lerp(
      api.start,
      'y',
      position?.y || 0,
      0.1,
    )
  }

  return (
    <>
      <ambientLight ref={ambient} intensity={0} />
      <pointLight position={[10, -10, 0]} intensity={0.05} />
      <pointLight position={[0, 10, 0]} intensity={0.05} />
      <pointLight position={[-10, 0, 0]} intensity={0.05} />
      <Beam position={[0, 3.5, 0]} stride={4} width={0.04} />
      <Reflect ref={boxreflect} bounce={2} far={50}>
        <Prism
          scale={0.6}
          position={[0, -0.5, 0]}
          onRayOver={rayOver}
          onRayOut={rayOut}
          onRayMove={rayMove}
        />
        <Box
          position={[-1.8, 1, 0]}
          rotation={[0, 0, Math.PI / 8]}
        />
        <Box
          position={[1.8, 1, 0]}
          rotation={[0, 0, -Math.PI / 8]}
        />
      </Reflect>
      <Rainbow
        ref={rainbow}
        startRadius={0}
        endRadius={0.65}
        fade={0}
        position={[0, 0, -1]}
      />
      <Flare
        ref={flare}
        visible={isPrism}
        renderOrder={10}
        scale={1.25}
        streak={[12.5, 20, 1]}
      />
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </>
  )
}`,
      },
      {
        name: 'src/styles.css',
        language: 'css',
        code: `* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  background: black;
  font-family: 'Inter var', sans-serif;
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
      'three-stdlib': '^2.0.0',
      'postprocessing': '^6.0.0',
    },
    sandboxProps: { standalone: true },
  },
  'prime-simple': {
    files: [
      {
        name: 'package.json',
        language: 'json',
        code: `{
  "name": "prime-simple",
  "version": "1.0.0",
  "description": "Simplified prism scene — sandbox-friendly version without GLB",
  "keywords": ["drei", "prism", "refraction", "bloom"],
  "main": "src/index.js",
  "dependencies": {
    "@react-three/drei": "9.76.0",
    "@react-three/fiber": "8.13.3",
    "@react-three/postprocessing": "3.0.4",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "three": "0.153.0"
  }
}`,
      },
      {
        name: '.prettierrc',
        language: 'json',
        code: `{
  "semi": false,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 120,
  "tabWidth": 2
}`,
      },
      {
        name: 'public/index.html',
        language: 'html',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Prime Simple — Prism Refraction</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
      },
      {
        name: 'src/index.js',
        language: 'js',
        code: `import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        name: 'src/App.js',
        language: 'js',
        active: true,
        code: `import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

export default function App() {
  return (
    <Canvas
      orthographic
      gl={{ antialias: false }}
      camera={{ position: [0, 0, 100], zoom: 70 }}
    >
      <color attach="background" args={['black']} />
      <Scene />
      <EffectComposer disableNormalPass>
        <Bloom
          mipmapBlur
          levels={9}
          intensity={1.5}
          luminanceThreshold={1}
          luminanceSmoothing={1}
        />
      </EffectComposer>
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  )
}

// Simple beam of light
function Beam({ position = [0, 3.5, 0] }) {
  const ref = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ref.current) {
      ref.current.scale.x = 0.04 + Math.sin(t * 2) * 0.005
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <planeGeometry args={[0.04, 4]} />
      <meshBasicMaterial color="white" toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// Simple prism using tetrahedron geometry with physical material
function Prism({ position = [0, -0.5, 0] }) {
  const ref = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ref.current) {
      ref.current.rotation.y = Math.sin(t * 0.3) * 0.1
    }
  })

  return (
    <mesh ref={ref} position={position} scale={0.6}>
      <tetrahedronGeometry args={[2, 0]} />
      <meshPhysicalMaterial
        color="white"
        transparent
        opacity={0.4}
        transmission={0.95}
        roughness={0}
        thickness={2}
        ior={2.5}
        toneMapped={false}
      />
    </mesh>
  )
}

// Spectral rainbow band effect
function Rainbow({ position = [0, 0, -1] }) {
  const ref = useRef()
  const colors = useMemo(
    () => [
      '#ff0000', '#ff4400', '#ff8800', '#ffcc00', '#ffff00',
      '#88ff00', '#00ff00', '#00ff88', '#00ffff', '#0088ff',
      '#0000ff', '#4400ff', '#8800ff',
    ],
    [],
  )

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        child.material.opacity =
          0.3 + Math.sin(t * 2 + i * 0.3) * 0.15
      })
    }
  })

  return (
    <group ref={ref} position={position}>
      {colors.map((color, i) => {
        const angle = ((i - 6) * Math.PI) / 26
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * 8, -2 + Math.cos(angle) * 4, 0]}
            rotation={[0, 0, angle]}
          >
            <planeGeometry args={[20, 0.15]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Interactive box that glows
function ReflectBox({ position, rotation }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const color = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    if (ref.current) {
      color.set(hovered ? '#ff6080' : '#ffffff')
      ref.current.color.lerp(color, 0.1)
    }
  })

  return (
    <RoundedBox
      args={[1, 1, 1]}
      radius={0.15}
      smoothness={10}
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial ref={ref} toneMapped={false} />
    </RoundedBox>
  )
}

// Lens flare dot
function Flare({ position = [0, 2, 0] }) {
  const ref = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(t * 3) * 0.2)
      ref.current.material.opacity = 0.6 + Math.sin(t * 4) * 0.2
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="white" transparent opacity={0.6} toneMapped={false} />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.02} />
      <pointLight position={[10, -10, 0]} intensity={0.05} />
      <pointLight position={[0, 10, 0]} intensity={0.05} />
      <Beam />
      <Prism />
      <Rainbow />
      <ReflectBox position={[-1.8, 1, 0]} rotation={[0, 0, Math.PI / 8]} />
      <ReflectBox position={[1.8, 1, 0]} rotation={[0, 0, -Math.PI / 8]} />
      <Flare />
    </>
  )
}`,
      },
      {
        name: 'src/styles.css',
        language: 'css',
        code: `* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  background: black;
  font-family: 'Inter var', sans-serif;
}`,
      },
    ],
    deps: {
      '@react-three/fiber': '9.5.0',
      '@react-three/drei': '10.7.7',
      '@react-three/postprocessing': '3.0.4',
      'three': '0.182.0',
    },
    sandboxProps: {
      cameraPosition: [0, 0, 100] as [number, number, number],
      cameraFov: 50,
      environment: 'night' as const,
      envBackground: false,
      showGrid: false,
      bloom: true,
    },
  },
};

// ═══════════════════════════════════════════════
// CATEGORY COLORS
// ═══════════════════════════════════════════════
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
};

// ═══════════════════════════════════════════════
// USER SANDBOX — Blank R3F template
// ═══════════════════════════════════════════════
interface UserSandbox {
  id: string;
  title: string;
  createdAt: number;
  files: { name: string; language: string; code: string; active?: boolean }[];
  deps: Record<string, string>;
  sandboxProps: Record<string, unknown>;
}

const BLANK_R3F_TEMPLATE: UserSandbox = {
  id: '',
  title: 'My R3F Sandbox',
  createdAt: 0,
  files: [
    {
      name: 'package.json',
      language: 'json',
      code: `{
  "name": "my-r3f-sandbox",
  "version": "1.0.0",
  "description": "Custom React Three Fiber sandbox",
  "main": "src/index.js",
  "dependencies": {
    "@react-three/drei": "10.7.7",
    "@react-three/fiber": "9.5.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "three": "0.182.0"
  }
}`,
    },
    {
      name: 'public/index.html',
      language: 'html',
      code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My R3F Sandbox</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    },
    {
      name: 'src/index.js',
      language: 'js',
      code: `import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)`,
    },
    {
      name: 'src/App.js',
      language: 'js',
      active: true,
      code: `import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

function RotatingBox() {
  const ref = useRef()

  useFrame((state, delta) => {
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
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-0.8}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <OrbitControls />
      <Environment preset="city" />
    </Canvas>
  )
}`,
    },
    {
      name: 'src/styles.css',
      language: 'css',
      code: `* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

body {
  background: #0a0a0f;
}`,
    },
  ],
  deps: {
    '@react-three/fiber': '9.5.0',
    '@react-three/drei': '10.7.7',
    'three': '0.182.0',
  },
  sandboxProps: {
    cameraPosition: [3, 3, 3] as [number, number, number],
    cameraFov: 50,
    environment: 'city' as const,
    showGrid: true,
  },
};

const USER_SANDBOX_STORAGE_KEY = 'r3f-user-sandboxes';

function loadUserSandboxes(): UserSandbox[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage?.getItem(USER_SANDBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUserSandboxes(sandboxes: UserSandbox[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(USER_SANDBOX_STORAGE_KEY, JSON.stringify(sandboxes));
  } catch { /* quota exceeded — silent fail */ }
}

function downloadProject(sandbox: UserSandbox) {
  const content = JSON.stringify({
    name: sandbox.title,
    files: sandbox.files,
    dependencies: sandbox.deps,
  }, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sandbox.title.toLowerCase().replace(/\s+/g, '-')}.r3f.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════
export default function R3FSandboxPage() {
  const [activeSim, setActiveSim] = useState<string | null>(null);
  // ── User sandboxes ──
  const [userSandboxes, setUserSandboxes] = useState<UserSandbox[]>([]);
  const [editingUserSandbox, setEditingUserSandbox] = useState<UserSandbox | null>(null);
  const [saved, setSaved] = useState(false);

  // Load user sandboxes on mount
  useEffect(() => {
    setUserSandboxes(loadUserSandboxes());
  }, []);

  const createNewSandbox = useCallback(() => {
    const id = `user-${Date.now()}`;
    const newSandbox: UserSandbox = {
      ...BLANK_R3F_TEMPLATE,
      id,
      title: `My Sandbox ${userSandboxes.length + 1}`,
      createdAt: Date.now(),
      files: BLANK_R3F_TEMPLATE.files.map(f => ({ ...f })),
      deps: { ...BLANK_R3F_TEMPLATE.deps },
      sandboxProps: { ...BLANK_R3F_TEMPLATE.sandboxProps },
    };
    const updated = [...userSandboxes, newSandbox];
    setUserSandboxes(updated);
    saveUserSandboxes(updated);
    setEditingUserSandbox(newSandbox);
    setActiveSim(id);
  }, [userSandboxes]);

  const openUserSandbox = useCallback((sandbox: UserSandbox) => {
    setEditingUserSandbox({ ...sandbox, files: sandbox.files.map(f => ({ ...f })) });
    setActiveSim(sandbox.id);
  }, []);

  const handleFileChange = useCallback((index: number, code: string) => {
    setEditingUserSandbox(prev => {
      if (!prev) return prev;
      const updated = { ...prev, files: prev.files.map((f, i) => i === index ? { ...f, code } : f) };
      return updated;
    });
  }, []);

  const handleAddFile = useCallback((name: string, language: string) => {
    setEditingUserSandbox(prev => {
      if (!prev) return prev;
      return { ...prev, files: [...prev.files, { name, language, code: `// ${name}\n` }] };
    });
  }, []);

  const handleDeleteFile = useCallback((index: number) => {
    setEditingUserSandbox(prev => {
      if (!prev || prev.files.length <= 1) return prev;
      return { ...prev, files: prev.files.filter((_, i) => i !== index) };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!editingUserSandbox) return;
    const updated = userSandboxes.map(s =>
      s.id === editingUserSandbox.id ? editingUserSandbox : s,
    );
    // If new sandbox not yet in list, add it
    if (!userSandboxes.find(s => s.id === editingUserSandbox.id)) {
      updated.push(editingUserSandbox);
    }
    setUserSandboxes(updated);
    saveUserSandboxes(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editingUserSandbox, userSandboxes]);

  const handleDeleteSandbox = useCallback((id: string) => {
    const updated = userSandboxes.filter(s => s.id !== id);
    setUserSandboxes(updated);
    saveUserSandboxes(updated);
  }, [userSandboxes]);

  const currentSim = SIMULATIONS.find(s => s.id === activeSim);
  const currentCode = activeSim ? CODE_FILES[activeSim] : null;

  // ── USER SANDBOX EDITING VIEW ──
  if (editingUserSandbox && activeSim?.startsWith('user-')) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <button
            onClick={() => { setActiveSim(null); setEditingUserSandbox(null); }}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to simulations
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Save className="h-3 w-3" /> Saved
              </span>
            )}
            <button
              onClick={() => downloadProject(editingUserSandbox)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
              title="Download project as JSON"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/80 bg-cyan-600/80 hover:bg-cyan-500 transition-all"
            >
              <Save className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>

        <div className="p-4">
          <R3FSandbox
            title={editingUserSandbox.title}
            description="Your custom R3F sandbox — edit code and see live preview"
            files={editingUserSandbox.files}
            dependencies={editingUserSandbox.deps}
            height="calc(100vh - 120px)"
            editable={true}
            onFileChange={handleFileChange}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onSave={handleSave}
            {...editingUserSandbox.sandboxProps}
          >
            {/* User sandboxes show rotating box as default preview */}
            <mesh castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#61dafb" />
            </mesh>
            <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-0.8}>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color="#1a1a2e" />
            </mesh>
          </R3FSandbox>
        </div>
      </div>
    );
  }

  // ── BUILT-IN SIMULATION VIEW ──
  if (activeSim && currentSim && currentCode) {
    const SceneComponent = {
      'interactive-box': InteractiveBoxScene,
      'water-molecule': WaterMoleculeScene,
      'chemistry-lab': ChemistryLabScene,
      'pendulum': PendulumScene,
      'solar-system': SolarSystemScene,
      'collision': CollisionBalls,
      'frosted-glass': FrostedGlassScene,
      'carousel': CarouselScene,
      'particles': ParticlesScene,
      'swarm': SwarmScene,
      'wave-shader': WaveScene,
      'audio-wave': AudioWaveScene,
      'portal': PortalScene,
      // ── New scenes ──
      'galaxy': GalaxyScene,
      'galaxy-field': GalaxyFieldScene,
      'terrain': TerrainScene,
      'terrain-fly': TerrainSimpleScene,
      'instanced-boxes': InstancedBoxesScene,
      'instanced-flow': InstancedFlowScene,
      'ocean': OceanScene,
      'ocean-sunset': OceanSunsetScene,
      'dna-helix': DNAHelixScene,
      'dna-detail': DNADetailScene,
      'voxel-city': VoxelCityScene,
      'city-night': CityNightScene,
      'raymarching': RaymarchingScene,
      'metaballs': MetaballsScene,
      'cloth-sim': ClothSimScene,
      'flag': FlagScene,
      'shoe-configurator': ShoeConfiguratorScene,
      'shoe-display': ShoeDisplayScene,
      'prime': PrimeScene,
      'prime-simple': PrimeSimpleScene,
    }[activeSim];

    // Check if this is a standalone scene (manages its own Canvas)
    const isStandalone = currentSim.standalone === true || currentCode.sandboxProps?.standalone === true;

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Back button */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => setActiveSim(null)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to simulations
          </button>
        </div>

        {/* Sandbox — standalone scenes render their own Canvas */}
        <div className="p-4">
          {isStandalone && SceneComponent ? (
            <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ height: 'calc(100vh - 120px)' }}>
              <SceneComponent />
            </div>
          ) : (
            <R3FSandbox
              title={currentSim.title}
              description={currentSim.description}
              files={currentCode.files}
              dependencies={currentCode.deps}
              height="calc(100vh - 120px)"
              {...currentCode.sandboxProps}
            >
              {SceneComponent && <SceneComponent />}
            </R3FSandbox>
          )}
        </div>
      </div>
    );
  }

  // ── CATALOG VIEW ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Box className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white/90">Aura</h1>
            <p className="text-sm text-white/30">
              Interactive 3D simulations powered by React Three Fiber
            </p>
          </div>
        </div>
      </div>

      {/* ── Your Sandboxes section ── */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Your Sandboxes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New button */}
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
              <button
                onClick={() => openUserSandbox(sandbox)}
                className="w-full text-left"
              >
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
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${sandbox.title}"?`)) handleDeleteSandbox(sandbox.id);
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
          {SIMULATIONS.map(sim => {
            const Icon = sim.icon;
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
