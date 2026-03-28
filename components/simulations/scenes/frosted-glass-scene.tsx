'use client';
/**
 * Frosted Glass Scene — inspired by drcmda's CodeSandbox demos
 *
 * Features:
 *   MeshTransmissionMaterial — realistic frosted-glass refraction
 *   Pointer-following        — glass circle follows mouse via easing
 *   Click/hover expansion    — lens magnifies content behind it
 *   Floating shapes          — crystal, torus knot, orbit ring
 *   ContactShadows           — grounded realism
 *
 * Key drei/maath APIs:
 *   MeshTransmissionMaterial — FBO-based glass rendering
 *   easing.damp3 / dampC    — smooth interpolation per frame
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, ContactShadows } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Glass Lens — follows pointer, expands on hover
// ═══════════════════════════════════════════════
function GlassLens({ children }: { children?: React.ReactNode }) {
  const ref = useRef<THREE.Mesh>(null!);
  const [open, setOpen] = useState(false);

  useFrame(({ viewport, camera, pointer }, delta) => {
    const { width, height } = viewport.getCurrentViewport(camera, [0, 0, 3]);

    // Smooth pointer follow with easing.damp3
    easing.damp3(
      ref.current.position,
      [(pointer.x * width) / 2, (pointer.y * height) / 2, 3],
      open ? 0 : 0.1,
      delta,
    );

    // Scale up when hovering content
    easing.damp3(
      ref.current.scale,
      open ? [4, 4, 4] : [0.01, 0.01, 0.01],
      open ? 0.5 : 0.2,
      delta,
    );

    // Color shift on state change
    easing.dampC(
      (ref.current.material as THREE.MeshPhysicalMaterial).color,
      open ? '#f0f0f0' : '#cccccc',
      0.1,
      delta,
    );
  });

  return (
    <>
      {/* The frosted glass circle — follows pointer */}
      <mesh ref={ref}>
        <circleGeometry args={[1, 64]} />
        <MeshTransmissionMaterial
          samples={16}
          resolution={512}
          anisotropicBlur={0.1}
          thickness={0.1}
          roughness={0.4}
          toneMapped={true}
        />
      </mesh>
      {/* Interactive group — content behind the glass */}
      <group
        onPointerOver={() => setOpen(true)}
        onPointerOut={() => setOpen(false)}
        onPointerDown={() => setOpen(true)}
        onPointerUp={() => setOpen(false)}
      >
        {children}
      </group>
    </>
  );
}

// ═══════════════════════════════════════════════
// Crystal — floating dodecahedron with gentle motion
// ═══════════════════════════════════════════════
interface CrystalProps {
  position: [number, number, number];
  color: string;
  speed?: number;
  scale?: number;
}

function Crystal({ position, color, speed = 1, scale = 1 }: CrystalProps) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Gentle tumbling rotation
    ref.current.rotation.set(
      Math.cos((t / 4) * speed) / 8,
      Math.sin((t / 3) * speed) / 4,
      0.15 + Math.sin((t / 2) * speed) / 8,
    );
    // Vertical bobbing
    ref.current.position.y = position[1] + (0.5 + Math.cos((t / 2) * speed)) / 7;
  });

  return (
    <group ref={ref} position={position}>
      <mesh castShadow receiveShadow scale={scale}>
        <dodecahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Floating Torus Knot
// ═══════════════════════════════════════════════
interface FloatingKnotProps {
  position: [number, number, number];
  color: string;
}

function FloatingKnot({ position, color }: FloatingKnotProps) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.sin(t * 0.3) * 0.3;
    ref.current.rotation.y = t * 0.2;
    ref.current.position.y = position[1] + Math.sin(t * 0.5) * 0.15;
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      <torusKnotGeometry args={[0.4, 0.15, 128, 32]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.15} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Orbit Ring — ring of small spheres
// ═══════════════════════════════════════════════
interface OrbitRingProps {
  radius?: number;
  count?: number;
  color?: string;
  speed?: number;
}

function OrbitRing({ radius = 1.2, count = 8, color = '#60a5fa', speed = 0.5 }: OrbitRingProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * speed;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            castShadow
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.1}
            />
          </mesh>
        );
      })}
      {/* Orbit path ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.005, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Exported Scene
// ═══════════════════════════════════════════════
export function FrostedGlassScene() {
  return (
    <>
      <GlassLens>
        {/* Main crystal — center piece */}
        <Crystal position={[0, 0, 0]} color="#e879f9" speed={1} scale={1.2} />
        {/* Secondary shapes */}
        <Crystal position={[-1.8, 0.3, -0.5]} color="#60a5fa" speed={0.7} scale={0.6} />
        <Crystal position={[1.6, -0.2, 0.3]} color="#34d399" speed={1.3} scale={0.5} />
        {/* Torus knot */}
        <FloatingKnot position={[0.8, 0.5, -1]} color="#fbbf24" />
        {/* Orbiting particles */}
        <OrbitRing radius={1.5} count={12} color="#c084fc" speed={0.3} />
      </GlassLens>
      <ContactShadows
        resolution={512}
        position={[0, -0.8, 0]}
        opacity={1}
        scale={10}
        blur={2}
        far={0.8}
      />
    </>
  );
}
