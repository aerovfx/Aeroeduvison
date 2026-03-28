'use client';
/**
 * Physics Scenes — pendulum, orbital mechanics, Newton's cradle, spring-mass
 *
 * R3F v9 patterns:
 *   useFrame(state, delta) — frame-rate-independent physics
 *   useRef                 — mutable refs for simulation state
 *   useMemo                — cached geometry/computations
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Pendulum — simple harmonic motion
// ═══════════════════════════════════════════════
interface PendulumProps {
  position?: [number, number, number];
  length?: number;
  amplitude?: number;
  speed?: number;
  color?: string;
}

export function Pendulum({
  position = [0, 0, 0],
  length = 3,
  amplitude = 0.8,
  speed = 1.5,
  color = '#f59e0b',
}: PendulumProps) {
  const armRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    // Simple harmonic motion: theta = A * sin(omega * t)
    armRef.current.rotation.z = Math.sin(state.clock.elapsedTime * speed) * amplitude;
  });

  return (
    <group position={position}>
      {/* Pivot point */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Swinging arm + bob */}
      <group ref={armRef}>
        {/* String */}
        <mesh position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, length, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        {/* Bob */}
        <mesh position={[0, -length, 0]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Glow around bob */}
        <mesh position={[0, -length, 0]}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} />
        </mesh>
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Orbit System — planet orbiting a star with moon
// ═══════════════════════════════════════════════
interface OrbitSystemProps {
  position?: [number, number, number];
}

export function OrbitSystem({ position = [0, 0, 0] }: OrbitSystemProps) {
  const planetRef = useRef<THREE.Group>(null!);
  const moonRef = useRef<THREE.Group>(null!);
  const starRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Planet orbits star
    planetRef.current.position.x = Math.cos(t * 0.5) * 3;
    planetRef.current.position.z = Math.sin(t * 0.5) * 3;
    planetRef.current.rotation.y = t;

    // Moon orbits planet
    moonRef.current.position.x = Math.cos(t * 2) * 0.8;
    moonRef.current.position.z = Math.sin(t * 2) * 0.8;

    // Star pulsing
    starRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.03);
  });

  return (
    <group position={position}>
      {/* Star with distortion shader */}
      <mesh ref={starRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <MeshDistortMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={2}
          distort={0.15}
          speed={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={5} color="#fbbf24" distance={15} />

      {/* Planet orbit path */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.01, 8, 128]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.1} />
      </mesh>

      {/* Planet with moon */}
      <group ref={planetRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Moon orbit ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.005, 8, 64]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.15} />
        </mesh>
        {/* Moon */}
        <group ref={moonRef}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Spring Mass System — Hooke's law simulation
// ═══════════════════════════════════════════════
interface SpringMassProps {
  position?: [number, number, number];
  k?: number;
  mass?: number;
  damping?: number;
}

export function SpringMass({
  position = [0, 0, 0],
  k = 2,
  mass = 1,
  damping = 0.02,
}: SpringMassProps) {
  const blockRef = useRef<THREE.Mesh>(null!);
  const springRef = useRef<THREE.Group>(null!);
  const yRef = useRef(1.5);
  const vyRef = useRef(0);
  const restY = 0;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // clamp for stability
    const force = -k * (yRef.current - restY) - damping * vyRef.current;
    vyRef.current += (force / mass) * dt;
    yRef.current += vyRef.current * dt;
    blockRef.current.position.y = yRef.current - 1.5;
    springRef.current.scale.y = Math.max(0.1, (yRef.current + 2) / 3.5);
  });

  // Spring helix approximation
  const springPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const coils = 8;
    const steps = coils * 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * coils * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * 0.15, t * 2 - 1, Math.sin(angle) * 0.15));
    }
    return pts;
  }, []);

  return (
    <group position={position}>
      {/* Ceiling mount */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Spring (line geometry) */}
      <group ref={springRef} position={[0, 1, 0]}>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(springPoints.flatMap(p => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#06b6d4" linewidth={1} />
        </line>
      </group>
      {/* Mass block */}
      <mesh ref={blockRef} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Collision Balls (Newton's Cradle)
// ═══════════════════════════════════════════════
interface CollisionBallsProps {
  position?: [number, number, number];
  count?: number;
}

export function CollisionBalls({ position = [0, 0, 0], count = 5 }: CollisionBallsProps) {
  const ballRefs = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 2;
    const swing = Math.sin(t);
    // Conservation of momentum: left swings out → right swings out
    if (ballRefs.current[0]) {
      ballRefs.current[0].rotation.z = swing > 0 ? swing * 0.6 : 0;
    }
    if (ballRefs.current[count - 1]) {
      ballRefs.current[count - 1].rotation.z = swing < 0 ? swing * 0.6 : 0;
    }
  });

  return (
    <group position={position}>
      {/* Frame */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[count * 0.7 + 0.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Hanging balls */}
      {Array.from({ length: count }).map((_, i) => {
        const x = (i - (count - 1) / 2) * 0.65;
        return (
          <group
            key={i}
            position={[x, 2.5, 0]}
            ref={(el) => {
              if (el) ballRefs.current[i] = el;
            }}
          >
            {/* String */}
            <mesh position={[0, -1.1, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 2.2, 8]} />
              <meshStandardMaterial color="#6b7280" />
            </mesh>
            {/* Ball */}
            <mesh position={[0, -2.2, 0]} castShadow>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════
// Exported combined scenes
// ═══════════════════════════════════════════════
export function PendulumScene() {
  return (
    <group>
      <Pendulum position={[-2, 3, 0]} length={3} amplitude={0.7} speed={1.2} color="#f59e0b" />
      <Pendulum position={[0, 3, 0]} length={2.5} amplitude={0.5} speed={1.5} color="#06b6d4" />
      <Pendulum position={[2, 3, 0]} length={2} amplitude={0.9} speed={1.8} color="#a855f7" />
      {/* Support beam */}
      <mesh position={[0, 3.1, 0]} receiveShadow>
        <boxGeometry args={[8, 0.15, 1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function SolarSystemScene() {
  return <OrbitSystem position={[0, 0, 0]} />;
}
