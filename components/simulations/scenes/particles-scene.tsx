'use client';
/**
 * Interactive Particle Field — mouse-reactive particles
 *
 * Event handlers demonstrated:
 *   onPointerMove — real-time mouse position tracking in 3D space
 *   onPointerDown / onPointerUp — burst effect on click
 *   useThree().pointer — normalized device coordinates
 *   useFrame state.pointer — alternative pointer access
 *
 * Techniques:
 *   InstancedMesh     — GPU-instanced rendering for 1000+ particles
 *   Custom attributes — per-particle scale, speed, phase
 *   Mouse repulsion   — particles flee from cursor
 *   Click burst       — explosion effect on mouse down
 */

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Html, Text } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Particle system constants
// ═══════════════════════════════════════════════
const PARTICLE_COUNT = 800;
const FIELD_SIZE = 8;
const REPULSION_RADIUS = 2.5;
const REPULSION_STRENGTH = 0.8;
const BURST_STRENGTH = 3.0;

// ═══════════════════════════════════════════════
// ParticleField — main interactive particle system
// ═══════════════════════════════════════════════
export function ParticleField() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mousePos = useRef(new THREE.Vector3(0, 0, 0));
  const burstRef = useRef(0); // burst countdown
  const [hitCount, setHitCount] = useState(0);

  // Pre-compute particle initial positions and properties
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * FIELD_SIZE,
        (Math.random() - 0.5) * FIELD_SIZE,
        (Math.random() - 0.5) * FIELD_SIZE,
      ),
      vel: new THREE.Vector3(0, 0, 0),
      basePos: new THREE.Vector3(
        (Math.random() - 0.5) * FIELD_SIZE,
        (Math.random() - 0.5) * FIELD_SIZE,
        (Math.random() - 0.5) * FIELD_SIZE,
      ),
      speed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.05,
      colorT: Math.random(), // 0..1 for color mixing
    }));
  }, []);

  // Colors
  const color1 = useMemo(() => new THREE.Color('#06b6d4'), []);
  const color2 = useMemo(() => new THREE.Color('#a855f7'), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // ── Event handlers ──

  // Track mouse position in 3D via invisible plane
  const handlePointerMove = useCallback((e: any) => {
    if (e.point) {
      mousePos.current.copy(e.point);
    }
  }, []);

  // Burst effect on click
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    burstRef.current = 1.0;
    setHitCount(c => c + 1);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const dt = Math.min(delta, 0.05);
    const mouse = mousePos.current;

    // Decay burst
    if (burstRef.current > 0) {
      burstRef.current = Math.max(0, burstRef.current - dt * 2);
    }

    particles.forEach((p, i) => {
      const t = state.clock.elapsedTime;

      // Base floating motion
      p.pos.x = p.basePos.x + Math.sin(t * p.speed + p.phase) * 0.3;
      p.pos.y = p.basePos.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.3;
      p.pos.z = p.basePos.z + Math.sin(t * p.speed * 0.5 + p.phase * 2) * 0.2;

      // Mouse repulsion
      const dx = p.pos.x - mouse.x;
      const dy = p.pos.y - mouse.y;
      const dz = p.pos.z - mouse.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < REPULSION_RADIUS && dist > 0.01) {
        const force = (1 - dist / REPULSION_RADIUS) * REPULSION_STRENGTH;
        const burstForce = burstRef.current * BURST_STRENGTH;
        const totalForce = force + burstForce;
        p.pos.x += (dx / dist) * totalForce * dt * 5;
        p.pos.y += (dy / dist) * totalForce * dt * 5;
        p.pos.z += (dz / dist) * totalForce * dt * 5;
      }

      // Scale pulsing
      const scaleMultiplier = dist < REPULSION_RADIUS
        ? 1 + (1 - dist / REPULSION_RADIUS) * 1.5
        : 1;

      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale * scaleMultiplier);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Per-instance color
      tempColor.copy(color1).lerp(color2, p.colorT + Math.sin(t + p.phase) * 0.2);
      meshRef.current.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Invisible interaction plane — captures pointer events */}
      <mesh
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        visible={false}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Instanced particle mesh */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          transparent
          opacity={0.8}
          toneMapped={false}
          vertexColors
        />
      </instancedMesh>

      {/* Hit counter */}
      <Html position={[0, FIELD_SIZE / 2 + 0.5, 0]} center>
        <div className="text-center">
          <div className="text-[0.5rem] text-white/20 font-mono">
            Clicks: {hitCount}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Attracting Swarm — particles that chase the cursor
// ═══════════════════════════════════════════════
export function AttractingSwarm() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mousePos = useRef(new THREE.Vector3(0, 0, 0));
  const [mode, setMode] = useState<'attract' | 'repel'>('attract');

  const particles = useMemo(() => {
    return Array.from({ length: 500 }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
      ),
      vel: new THREE.Vector3(0, 0, 0),
      scale: 0.02 + Math.random() * 0.04,
      damping: 0.92 + Math.random() * 0.05,
    }));
  }, []);

  const color1 = useMemo(() => new THREE.Color('#10b981'), []);
  const color2 = useMemo(() => new THREE.Color('#f59e0b'), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const handlePointerMove = useCallback((e: any) => {
    if (e.point) mousePos.current.copy(e.point);
  }, []);

  // Toggle attract/repel on click
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    setMode(m => m === 'attract' ? 'repel' : 'attract');
  }, []);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    const mouse = mousePos.current;
    const sign = mode === 'attract' ? 1 : -1;

    particles.forEach((p, i) => {
      // Force toward/away from mouse
      const dx = mouse.x - p.pos.x;
      const dy = mouse.y - p.pos.y;
      const dz = mouse.z - p.pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

      const force = sign * 2.0 / (dist * dist + 1);
      p.vel.x += (dx / dist) * force * dt;
      p.vel.y += (dy / dist) * force * dt;
      p.vel.z += (dz / dist) * force * dt;

      // Apply velocity with damping
      p.pos.add(p.vel);
      p.vel.multiplyScalar(p.damping);

      const speed = p.vel.length();
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale * (1 + speed * 3));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Color based on speed
      tempColor.copy(color1).lerp(color2, Math.min(speed * 5, 1));
      meshRef.current.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, 500]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial transparent opacity={0.7} toneMapped={false} vertexColors />
      </instancedMesh>

      <Html position={[0, -4, 0]} center>
        <div className="text-center">
          <div className="text-[0.5rem] text-white/25 font-mono">
            Mode: <span className={mode === 'attract' ? 'text-emerald-400/60' : 'text-amber-400/60'}>
              {mode}
            </span>
            <span className="text-white/15 ml-2">(click to toggle)</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Combined export
// ═══════════════════════════════════════════════
export function ParticlesScene() {
  return <ParticleField />;
}

export function SwarmScene() {
  return <AttractingSwarm />;
}
