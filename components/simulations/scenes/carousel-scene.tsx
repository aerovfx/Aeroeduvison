'use client';
/**
 * 3D Carousel Gallery Scene — inspired by cydstumpel.nl
 * Ref: https://codesandbox.io/p/sandbox/9s2wd9
 *
 * Features:
 *   ScrollControls + useScroll — infinite scroll-driven rotation
 *   BentPlaneGeometry         — custom curved card geometry
 *   MeshSineMaterial          — animated sine-wave banner
 *   easing.damp3              — smooth camera + scale interpolation
 *   Image (drei)              — texture-mapped 3D image component
 *
 * Event handlers demonstrated:
 *   onPointerOver / onPointerOut — card hover scaling
 *   onClick                     — card selection
 *   useScroll().delta           — scroll velocity tracking
 *   state.pointer              — pointer position for camera follow
 */

import * as THREE from 'three';
import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ScrollControls, useScroll,
  Environment, Html, Text, Float,
  MeshDistortMaterial,
} from '@react-three/drei';
import { easing } from 'maath';

// Import custom utilities
import '../r3f-utils';

// ═══════════════════════════════════════════════
// Color palette for procedural card backgrounds
// ═══════════════════════════════════════════════
const CARD_COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#a855f7', '#ef4444',
  '#3b82f6', '#14b8a6', '#f97316', '#84cc16',
];

const CARD_LABELS = [
  'Quantum Physics', 'Organic Chemistry', 'Fluid Dynamics',
  'Neural Networks', 'Thermodynamics', 'Electromagnetics',
  'Cell Biology', 'Data Structures', 'Wave Mechanics',
  'Optics Lab', 'Calculus III', 'Robotics',
];

// ═══════════════════════════════════════════════
// Rig — camera controller responding to scroll + pointer
// ═══════════════════════════════════════════════
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame((state, delta) => {
    // Rotate contents based on scroll offset (full 360° rotation)
    ref.current.rotation.y = -scroll.offset * (Math.PI * 2);

    // Raycasts every frame rather than just on pointer-move
    state.events.update?.();

    // Smooth camera follow — pointer.x for horizontal, pointer.y for vertical
    easing.damp3(
      state.camera.position,
      [-state.pointer.x * 2, state.pointer.y + 1.5, 10],
      0.3,
      delta,
    );

    // Always look at center
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={ref} rotation={[0, 0, 0.15]}>
      {children}
    </group>
  );
}

// ═══════════════════════════════════════════════
// Card — individual carousel card with hover effects
// ═══════════════════════════════════════════════
interface CardProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  label: string;
  index: number;
  onSelect?: (index: number) => void;
}

function Card({ position, rotation, color, label, index, onSelect }: CardProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Event handlers — demonstrated patterns:
  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();       // Prevent event bubbling to parent meshes
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    setClicked(!clicked);
    onSelect?.(index);
  }, [clicked, index, onSelect]);

  useFrame((_state, delta) => {
    // Smooth scale interpolation on hover
    easing.damp3(
      meshRef.current.scale,
      hovered ? [1.15, 1.15, 1.15] : [1, 1, 1],
      0.1,
      delta,
    );
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
      >
        {/* BentPlaneGeometry — curved card surface */}
        <bentPlaneGeometry args={[0.1, 1, 1.4, 20, 20]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.1}
          roughness={0.4}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Card label */}
      <Text
        position={[0, -0.85, 0.05]}
        fontSize={0.07}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        font={undefined}
      >
        {label}
      </Text>

      {/* Glow indicator when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.05, 1.45]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Selection indicator */}
      {clicked && (
        <Html position={[0, 0.85, 0.1]} center>
          <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[0.5rem] font-bold whitespace-nowrap">
            Selected
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════
// Carousel — arranges cards in a circle
// ═══════════════════════════════════════════════
interface CarouselProps {
  radius?: number;
  count?: number;
  onSelect?: (index: number) => void;
}

function Carousel({ radius = 1.4, count = 8, onSelect }: CarouselProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <Card
            key={i}
            index={i}
            color={CARD_COLORS[i % CARD_COLORS.length]}
            label={CARD_LABELS[i % CARD_LABELS.length]}
            position={[
              Math.sin(angle) * radius,
              0,
              Math.cos(angle) * radius,
            ]}
            rotation={[0, Math.PI + angle, 0]}
            onSelect={onSelect}
          />
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════
// Banner — scrolling text cylinder with sine wave
// ═══════════════════════════════════════════════
function Banner(props: any) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const scroll = useScroll();
  const matRef = useRef<any>(null!);

  // Procedural text texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#0ea5e9');
    gradient.addColorStop(0.33, '#8b5cf6');
    gradient.addColorStop(0.66, '#ec4899');
    gradient.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Repeating text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = '  AEROEDUVISION  ●  R3F SANDBOX  ●  INTERACTIVE 3D LAB  ●  ';
    for (let i = 0; i < 3; i++) {
      ctx.fillText(text, canvas.width / 6 + (i * canvas.width / 3), canvas.height / 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
  }, []);

  useFrame((_state, delta) => {
    // Scroll velocity drives sine wave speed
    if (matRef.current?._time) {
      matRef.current._time.value += Math.abs(scroll.delta) * 4;
    }
    // Scroll the texture
    if (texture) {
      texture.offset.x += delta / 2;
    }
  });

  return (
    <mesh ref={meshRef} {...props}>
      <cylinderGeometry args={[1.6, 1.6, 0.14, 128, 16, true]} />
      <meshSineMaterial
        ref={matRef}
        map={texture}
        map-anisotropy={16}
        side={THREE.DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Center Orb — floating distorted sphere in the middle
// ═══════════════════════════════════════════════
function CenterOrb() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.2;
    ref.current.rotation.z = Math.sin(t * 0.5) * 0.1;
    ref.current.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.3, 64, 64]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          emissive="#4c1d95"
          emissiveIntensity={0.5}
          distort={0.4}
          speed={3}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

// ═══════════════════════════════════════════════
// Status HUD — shows scroll position + selected card
// ═══════════════════════════════════════════════
function ScrollHUD() {
  const ref = useRef<HTMLDivElement>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (ref.current) {
      const pct = Math.round(scroll.offset * 100);
      ref.current.textContent = `Scroll: ${pct}%`;
    }
  });

  return (
    <Html
      position={[0, -1.2, 0]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={ref}
        className="text-[0.5rem] text-white/30 font-mono bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full"
      >
        Scroll: 0%
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════════
// Main exported scene — wraps everything in Canvas + ScrollControls
// This scene manages its own Canvas because ScrollControls needs
// to be a direct child of Canvas.
// ═══════════════════════════════════════════════
export function CarouselScene() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 100], fov: 15 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <fog attach="fog" args={['#1a1025', 8.5, 12]} />

        <ScrollControls pages={4} infinite>
          <Rig>
            <Carousel count={10} onSelect={setSelectedCard} />
            <CenterOrb />
          </Rig>
          <Banner position={[0, -0.15, 0]} />
          <ScrollHUD />
        </ScrollControls>

        <Environment preset="dawn" background blur={0.5} />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 pointer-events-none z-10">
        <div className="text-white/60 text-xs font-mono">
          <span className="text-white/30">Scroll</span> to rotate
          <span className="text-white/30 mx-2">|</span>
          <span className="text-white/30">Hover</span> cards
          <span className="text-white/30 mx-2">|</span>
          <span className="text-white/30">Click</span> to select
        </div>
        {selectedCard !== null && (
          <div className="mt-2 text-xs text-cyan-400/80 font-mono">
            Selected: {CARD_LABELS[selectedCard % CARD_LABELS.length]}
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0a0a0f] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
    </div>
  );
}

// ═══════════════════════════════════════════════
// Simplified version that works inside the R3FSandbox wrapper
// (no ScrollControls — uses auto-rotation instead)
// ═══════════════════════════════════════════════
export function CarouselSimpleScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const count = 8;
  const radius = 2.5;

  useFrame((state, delta) => {
    // Auto-rotate
    groupRef.current.rotation.y += delta * 0.15;

    // Camera follows pointer
    easing.damp3(
      state.camera.position,
      [-state.pointer.x * 2, state.pointer.y * 1.5 + 1, 8],
      0.3,
      delta,
    );
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <Card
            key={i}
            index={i}
            color={CARD_COLORS[i % CARD_COLORS.length]}
            label={CARD_LABELS[i % CARD_LABELS.length]}
            position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
            rotation={[0, Math.PI + angle, 0]}
            onSelect={setSelectedCard}
          />
        );
      })}
      <CenterOrb />
    </group>
  );
}
