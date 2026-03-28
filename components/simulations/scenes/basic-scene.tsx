'use client';
/**
 * Basic R3F Scene — the classic CodeSandbox spinning box example
 * Ref: https://codesandbox.io/p/sandbox/9s2wd9
 *
 * Demonstrates core R3F concepts:
 *   useRef   — direct mesh access
 *   useState — React state for interactivity
 *   useFrame — per-frame animation loop (delta-based)
 *   Events   — onClick, onPointerOver, onPointerOut
 */

import { useRef, useState, useCallback } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Interactive Box — the canonical R3F example
// Spins every frame, changes color on hover, scales on click
// ═══════════════════════════════════════════════
interface BoxProps {
  position?: [number, number, number];
  color?: string;
  hoverColor?: string;
}

function InteractiveBox({
  position = [0, 0, 0],
  color = '#8b5cf6',
  hoverColor = '#2dd4bf',
}: BoxProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  // useFrame runs every rendered frame (~60fps)
  // delta = seconds since last frame — use for frame-rate-independent animation
  useFrame((_state, delta) => {
    meshRef.current.rotation.x += delta;
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <mesh
      position={position}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? hoverColor : color}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Interactive Sphere — floats with sine wave, hover + click
// ═══════════════════════════════════════════════
interface SphereProps {
  position?: [number, number, number];
  color?: string;
  hoverColor?: string;
}

function InteractiveSphere({
  position = [0, 0, 0],
  color = '#3b82f6',
  hoverColor = '#f59e0b',
}: SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const baseY = position[1];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Gentle vertical bobbing
    meshRef.current.position.y = baseY + Math.sin(t * 2) * 0.2;
    meshRef.current.rotation.z = t * 0.5;
  });

  return (
    <mesh
      position={position}
      ref={meshRef}
      scale={active ? 1.4 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <sphereGeometry args={[0.7, 32, 32]} />
      <meshStandardMaterial
        color={hovered ? hoverColor : color}
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Interactive Torus — spinning donut
// ═══════════════════════════════════════════════
interface TorusProps {
  position?: [number, number, number];
  color?: string;
  hoverColor?: string;
}

function InteractiveTorus({
  position = [0, 0, 0],
  color = '#10b981',
  hoverColor = '#ef4444',
}: TorusProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((_state, delta) => {
    meshRef.current.rotation.x += delta * 0.8;
    meshRef.current.rotation.y += delta * 0.3;
  });

  return (
    <mesh
      position={position}
      ref={meshRef}
      scale={active ? 1.3 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <torusGeometry args={[0.6, 0.25, 16, 32]} />
      <meshStandardMaterial
        color={hovered ? hoverColor : color}
        metalness={0.4}
        roughness={0.3}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Interactive Cone — wobbles when hovered
// ═══════════════════════════════════════════════
function InteractiveCone({ position = [0, 0, 0] as [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.6;
    if (hovered) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 4) * 0.15;
    }
  });

  return (
    <mesh
      position={position}
      ref={meshRef}
      scale={active ? 1.4 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <coneGeometry args={[0.5, 1.2, 32]} />
      <meshStandardMaterial
        color={hovered ? '#f472b6' : '#a855f7'}
        metalness={0.4}
        roughness={0.3}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Exported combined scene — 4 interactive shapes
// ═══════════════════════════════════════════════
export function InteractiveBoxScene() {
  return (
    <group>
      {/* Lighting setup */}
      <ambientLight intensity={0.5} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        intensity={1}
        castShadow
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Interactive shapes arranged in a line */}
      <InteractiveBox position={[-2.5, 0, 0]} />
      <InteractiveSphere position={[-0.8, 0, 0]} />
      <InteractiveTorus position={[0.9, 0, 0]} />
      <InteractiveCone position={[2.5, 0, 0]} />
    </group>
  );
}
