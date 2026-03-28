'use client';
/**
 * Chemistry Scenes — molecule models, lab equipment, particle systems
 *
 * Uses R3F v9 patterns:
 *   useFrame   — animation per frame with delta time
 *   useRef     — direct Three.js object access
 *   useMemo    — cached geometry/math computations
 *   drei       — Float, Html, MeshDistortMaterial helpers
 *   instancing — InstancedMesh for efficient bubble particles
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Atom — glowing nucleus + orbiting electrons
// ═══════════════════════════════════════════════
interface AtomProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  label?: string;
  electronCount?: number;
}

export function Atom({
  position = [0, 0, 0],
  color = '#06b6d4',
  scale = 1,
  label,
  electronCount = 3,
}: AtomProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const nucleusRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.3;
    // Subtle pulse on nucleus
    nucleusRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Nucleus with distortion shader */}
      <mesh ref={nucleusRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          distort={0.2}
          speed={2}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      {/* Electron orbits */}
      {Array.from({ length: electronCount }).map((_, i) => (
        <ElectronOrbit
          key={i}
          radius={0.8 + i * 0.3}
          speed={1.5 - i * 0.3}
          tilt={i * 60}
          color={color}
        />
      ))}
      {/* HTML label overlay */}
      {label && (
        <Html position={[0, -1, 0]} center>
          <div className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10">
            <span className="text-[0.55rem] text-white/70 font-bold">{label}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function ElectronOrbit({
  radius,
  speed,
  tilt,
  color,
}: {
  radius: number;
  speed: number;
  tilt: number;
  color: string;
}) {
  const electronRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    electronRef.current.position.x = Math.cos(t) * radius;
    electronRef.current.position.z = Math.sin(t) * radius;
  });

  return (
    <group rotation={[THREE.MathUtils.degToRad(tilt), 0, THREE.MathUtils.degToRad(tilt * 0.5)]}>
      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.008, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Electron sphere */}
      <mesh ref={electronRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════
// Bond — cylinder connecting two atoms
// ═══════════════════════════════════════════════
interface BondProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}

export function Bond({ start, end, color = '#ffffff' }: BondProps) {
  const mid = useMemo<[number, number, number]>(
    () => [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2],
    [start, end],
  );
  const length = useMemo(
    () => Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2),
    [start, end],
  );
  const rotation = useMemo(() => {
    const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize();
    return new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    );
  }, [start, end]);

  return (
    <mesh position={mid} rotation={rotation}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} metalness={0.3} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Beaker — glass container with animated liquid + bubbles
// ═══════════════════════════════════════════════
interface BeakerProps {
  position?: [number, number, number];
  liquidColor?: string;
  fillLevel?: number;
  showBubbles?: boolean;
}

export function Beaker({
  position = [0, 0, 0],
  liquidColor = '#06b6d4',
  fillLevel = 0.6,
  showBubbles = true,
}: BeakerProps) {
  const liquidRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    // Gentle liquid wobble
    liquidRef.current.position.y =
      -0.5 + fillLevel * 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
  });

  return (
    <group position={position}>
      {/* Glass body — open cylinder with physical material */}
      <mesh>
        <cylinderGeometry args={[0.6, 0.5, 2, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          roughness={0}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
      {/* Glass bottom */}
      <mesh position={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.15} transmission={0.8} />
      </mesh>
      {/* Liquid */}
      <mesh ref={liquidRef} position={[0, -0.5 + fillLevel * 0.5, 0]}>
        <cylinderGeometry args={[0.58 * fillLevel + 0.1, 0.48, fillLevel * 2, 32]} />
        <meshPhysicalMaterial
          color={liquidColor}
          transparent
          opacity={0.5}
          roughness={0.1}
          transmission={0.4}
          thickness={1}
        />
      </mesh>
      {/* Rising bubbles (instanced mesh for performance) */}
      {showBubbles && <Bubbles position={position} count={12} color={liquidColor} />}
    </group>
  );
}

// ═══════════════════════════════════════════════
// Bubbles — instanced mesh particles rising in liquid
// ═══════════════════════════════════════════════
function Bubbles({
  position = [0, 0, 0] as [number, number, number],
  count = 15,
  color = '#06b6d4',
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-compute particle properties once
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 0.8,
        z: (Math.random() - 0.5) * 0.8,
        speed: 0.3 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
        scale: 0.02 + Math.random() * 0.04,
      })),
    [count],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      const t = state.clock.elapsedTime * p.speed + p.offset;
      const y = ((t % 2) / 2) * 2 - 1;
      dummy.position.set(
        p.x + Math.sin(t * 2) * 0.05,
        y,
        p.z + Math.cos(t * 2) * 0.05,
      );
      dummy.scale.setScalar(p.scale * (1 - Math.abs(y) * 0.3));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════
// Water Molecule Scene (H₂O)
// ═══════════════════════════════════════════════
export function WaterMoleculeScene() {
  const ref = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.15;
    ref.current.position.y = Math.sin(t * 0.5) * 0.1;
  });

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={ref}>
        {/* Oxygen (red, larger) */}
        <Atom position={[0, 0, 0]} color="#ef4444" scale={1.2} label="O" electronCount={3} />
        {/* Hydrogen 1 (blue, smaller) */}
        <Atom position={[-1.5, -1, 0.5]} color="#3b82f6" scale={0.7} label="H" electronCount={1} />
        {/* Hydrogen 2 */}
        <Atom position={[1.5, -1, 0.5]} color="#3b82f6" scale={0.7} label="H" electronCount={1} />
        {/* Chemical bonds */}
        <Bond start={[0, 0, 0]} end={[-1.5, -1, 0.5]} color="#94a3b8" />
        <Bond start={[0, 0, 0]} end={[1.5, -1, 0.5]} color="#94a3b8" />
      </group>
    </Float>
  );
}

// ═══════════════════════════════════════════════
// Chemistry Lab Scene — beakers with colored liquids
// ═══════════════════════════════════════════════
export function ChemistryLabScene() {
  return (
    <group>
      <Beaker position={[-2, 0, 0]} liquidColor="#06b6d4" fillLevel={0.7} />
      <Beaker position={[0, 0, 0]} liquidColor="#a855f7" fillLevel={0.5} />
      <Beaker position={[2, 0, 0]} liquidColor="#22c55e" fillLevel={0.6} />
      {/* Lab table surface */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 4]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  );
}
