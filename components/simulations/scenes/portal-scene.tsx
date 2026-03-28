'use client';
/**
 * Portal Scene — drag-to-rotate gallery with depth layers
 *
 * Event handlers demonstrated:
 *   onPointerDown / onPointerUp / onPointerMove — drag gesture
 *   onPointerEnter / onPointerLeave — depth layer hover
 *   onDoubleClick — reset view / toggle mode
 *   useFrame state.pointer — continuous pointer tracking
 *
 * Techniques:
 *   Layered depth       — parallax effect between foreground/background
 *   Drag rotation       — manual rotation via pointer delta
 *   Lerp interpolation  — smooth drag deceleration
 *   Render layers       — selective rendering per group
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Text, RoundedBox, MeshDistortMaterial, Float } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Draggable Group — captures pointer drag events
// ═══════════════════════════════════════════════
function DraggableGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null!);
  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    prevPointer.current = { x: e.clientX || 0, y: e.clientY || 0 };
    // Capture pointer for smooth dragging
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging.current) return;
    const dx = (e.clientX || 0) - prevPointer.current.x;
    const dy = (e.clientY || 0) - prevPointer.current.y;
    prevPointer.current = { x: e.clientX || 0, y: e.clientY || 0 };
    velocity.current = { x: dy * 0.003, y: dx * 0.003 };
    targetRotation.current.x += dy * 0.003;
    targetRotation.current.y += dx * 0.003;
  }, []);

  const handleDoubleClick = useCallback((e: any) => {
    e.stopPropagation();
    targetRotation.current = { x: 0, y: 0 };
    velocity.current = { x: 0, y: 0 };
  }, []);

  useFrame((_state, delta) => {
    if (!isDragging.current) {
      // Momentum decay
      velocity.current.x *= 0.95;
      velocity.current.y *= 0.95;
      targetRotation.current.x += velocity.current.x;
      targetRotation.current.y += velocity.current.y;
    }

    // Smooth interpolation toward target
    easing.damp(groupRef.current.rotation, 'x', targetRotation.current.x, 0.15, delta);
    easing.damp(groupRef.current.rotation, 'y', targetRotation.current.y, 0.15, delta);
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </group>
  );
}

// ═══════════════════════════════════════════════
// Depth Layer — a floating panel at specific z-depth
// ═══════════════════════════════════════════════
interface DepthLayerProps {
  position: [number, number, number];
  color: string;
  label: string;
  size?: [number, number];
}

function DepthLayer({ position, color, label, size = [2, 1.5] }: DepthLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((_state, delta) => {
    easing.damp3(
      meshRef.current.scale,
      hovered ? [1.05, 1.05, 1.05] : [1, 1, 1],
      0.1,
      delta,
    );
  });

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[size[0], size[1], 0.05]}
        radius={0.05}
        smoothness={4}
        onPointerEnter={(e: any) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshPhysicalMaterial
          color={color}
          metalness={0.1}
          roughness={0.3}
          clearcoat={0.5}
          transparent
          opacity={hovered ? 0.95 : 0.8}
        />
      </RoundedBox>

      {/* Label */}
      <Text
        position={[0, 0, 0.04]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {label}
      </Text>

      {/* Hover glow */}
      {hovered && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[size[0] + 0.1, size[1] + 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════
// Floating Orb — background decoration
// ═══════════════════════════════════════════════
function FloatingOrb({ position, color, size = 0.2 }: {
  position: [number, number, number];
  color: string;
  size?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 0.8 + position[0]) * 0.2;
    ref.current.rotation.y = t * 0.3;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </Float>
  );
}

// ═══════════════════════════════════════════════
// Connection Line — links between layers
// ═══════════════════════════════════════════════
function ConnectionLine({ start, end, color = '#ffffff' }: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}) {
  const ref = useRef<THREE.Group>(null!);

  const geometry = useMemo(() => {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(start[0], (start[1] + end[1]) / 2, (start[2] + end[2]) / 2),
      new THREE.Vector3(end[0], (start[1] + end[1]) / 2, (start[2] + end[2]) / 2),
      new THREE.Vector3(...end),
    );
    const points = curve.getPoints(32);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [start, end]);

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 }),
    [color],
  );

  return (
    <group ref={ref}>
      <primitive object={new THREE.Line(geometry, material)} />
    </group>
  );
}

// ═══════════════════════════════════════════════
// Main Portal Scene — exported
// ═══════════════════════════════════════════════
export function PortalScene() {
  return (
    <group>
      <DraggableGroup>
        {/* Background layer */}
        <DepthLayer position={[0, 0, -2]} color="#1e293b" label="Data Layer" size={[3, 2]} />

        {/* Middle layers */}
        <DepthLayer position={[-1, 0.5, -1]} color="#0f766e" label="API" size={[1.2, 0.8]} />
        <DepthLayer position={[1, -0.3, -1]} color="#7c3aed" label="Auth" size={[1, 0.7]} />
        <DepthLayer position={[0, -0.8, -0.5]} color="#be185d" label="Cache" size={[1.5, 0.6]} />

        {/* Foreground layer */}
        <DepthLayer position={[0, 0.2, 0]} color="#0ea5e9" label="Frontend" size={[2, 1.2]} />

        {/* Connection lines */}
        <ConnectionLine start={[0, 0.2, 0]} end={[-1, 0.5, -1]} color="#06b6d4" />
        <ConnectionLine start={[0, 0.2, 0]} end={[1, -0.3, -1]} color="#8b5cf6" />
        <ConnectionLine start={[-1, 0.5, -1]} end={[0, 0, -2]} color="#14b8a6" />
        <ConnectionLine start={[1, -0.3, -1]} end={[0, 0, -2]} color="#7c3aed" />
        <ConnectionLine start={[0, -0.8, -0.5]} end={[0, 0, -2]} color="#ec4899" />

        {/* Decorative orbs */}
        <FloatingOrb position={[-2, 1, -1.5]} color="#06b6d4" size={0.15} />
        <FloatingOrb position={[2, -0.5, -0.5]} color="#8b5cf6" size={0.12} />
        <FloatingOrb position={[0, 1.5, -1]} color="#f59e0b" size={0.1} />
        <FloatingOrb position={[-1.5, -1, 0.5]} color="#10b981" size={0.13} />
      </DraggableGroup>

      {/* Instructions */}
      <Html position={[0, -2.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="text-[0.5rem] text-white/20 font-mono text-center">
          Drag to rotate · Hover layers · Double-click to reset
        </div>
      </Html>
    </group>
  );
}
