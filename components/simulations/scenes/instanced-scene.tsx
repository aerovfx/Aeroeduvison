'use client';
/**
 * High-Performance Instanced Rendering — THREE.InstancedMesh patterns
 *
 * Demonstrates high-performance rendering with instanced geometry:
 *   InstancedBoxesScene — 1000 rotating boxes in a sphere pattern
 *   InstancedFlowScene  — 2000 flowing particles along 3D curves
 *
 * Key techniques:
 *   THREE.InstancedMesh       — single draw call for many instances
 *   tempObject.updateMatrix() — per-instance transformation matrix
 *   mesh.setMatrixAt(i, mat)  — apply matrix to instance i
 *   mesh.instanceMatrix.needsUpdate — commit updates to GPU
 *   setColorAt() + morphingColors — per-instance color variation
 *   useFrame + mouse picking   — interactive instance highlighting
 */

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED BOXES SCENE — 1000 rotating boxes in sphere pattern
// ═══════════════════════════════════════════════════════════════════════════

const BOXES_COUNT = 1000;
const BOXES_RADIUS = 5;
const HOVER_RADIUS = 0.8;

interface BoxInstanceData {
  position: THREE.Vector3;
  baseRotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  color: THREE.Color;
}

export function InstancedBoxesScene() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const [hoveredInstance, setHoveredInstance] = useState<number | null>(null);
  const [animating, setAnimating] = useState(true);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  // Pre-generate box instances with positions and rotations
  const boxesData = useMemo(() => {
    const data: BoxInstanceData[] = [];
    for (let i = 0; i < BOXES_COUNT; i++) {
      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(-1 + (2 * i) / BOXES_COUNT);
      const theta = Math.sqrt(BOXES_COUNT * Math.PI) * phi;

      const x = BOXES_RADIUS * Math.cos(theta) * Math.sin(phi);
      const y = BOXES_RADIUS * Math.sin(theta) * Math.sin(phi);
      const z = BOXES_RADIUS * Math.cos(phi);

      // Random rotation axes and speeds
      const vx = (Math.random() - 0.5) * 2;
      const vy = (Math.random() - 0.5) * 2;
      const vz = (Math.random() - 0.5) * 2;
      const speed = 0.3 + Math.random() * 0.7;

      // Color based on position: HSL cycling through angle
      const hue = (Math.atan2(y, x) / Math.PI + 1) * 0.5;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);

      data.push({
        position: new THREE.Vector3(x, y, z),
        baseRotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          'XYZ'
        ),
        angularVelocity: new THREE.Vector3(vx, vy, vz).normalize().multiplyScalar(speed),
        color,
      });
    }
    return data;
  }, []);

  // Initialize colors in InstancedMesh
  useMemo(() => {
    if (!meshRef.current) return;
    boxesData.forEach((data, i) => {
      meshRef.current.setColorAt(i, data.color);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [boxesData]);

  // Handle pointer move for hover detection
  const handlePointerMove = useCallback(
    (e: any) => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const camera = useThree().camera;
      raycasterRef.current.setFromCamera(pointerRef.current, camera);

      if (meshRef.current) {
        const intersection = raycasterRef.current.intersectObject(meshRef.current);
        if (intersection.length > 0) {
          const instanceId = intersection[0].instanceId;
          setHoveredInstance(instanceId ?? null);
        } else {
          setHoveredInstance(null);
        }
      }
    },
    []
  );

  // Handle click to toggle animation
  const handleClick = useCallback(() => {
    setAnimating((a) => !a);
  }, []);

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current || !animating) return;

    const dt = Math.min(delta, 0.05);

    boxesData.forEach((data, i) => {
      // Accumulate rotation
      data.baseRotation.x += data.angularVelocity.x * dt;
      data.baseRotation.y += data.angularVelocity.y * dt;
      data.baseRotation.z += data.angularVelocity.z * dt;

      // Update position with slight bounce
      const bounceFactor = Math.sin(state.clock.elapsedTime * 0.5 + i * 0.01) * 0.1;
      tempObject.position.copy(data.position).multiplyScalar(1 + bounceFactor);
      tempObject.rotation.copy(data.baseRotation);
      tempObject.scale.set(1, 1, 1);

      // Highlight nearby instances when hovering
      if (hoveredInstance !== null) {
        const dist = tempObject.position.distanceTo(
          boxesData[hoveredInstance].position
        );
        if (dist < HOVER_RADIUS) {
          tempObject.scale.set(1.2, 1.2, 1.2);
        }
      }

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group onPointerMove={handlePointerMove} onClick={handleClick}>
      <ambientLight intensity={0.6} />
      <spotLight
        position={[8, 8, 8]}
        angle={0.3}
        penumbra={1}
        intensity={1}
        castShadow
      />
      <pointLight position={[-8, -8, -8]} intensity={0.4} />

      <instancedMesh
        ref={meshRef}
        args={[
          new THREE.BoxGeometry(0.3, 0.3, 0.3),
          new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.3 }),
          BOXES_COUNT,
        ]}
        castShadow
        receiveShadow
      />

      <Html position={[0, 6, 0]} center distanceFactor={1.5}>
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          {animating ? 'Click to pause' : 'Click to play'} | Hover to highlight
        </div>
      </Html>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED FLOW SCENE — 2000 particles flowing along curves
// ═══════════════════════════════════════════════════════════════════════════

const FLOW_PARTICLE_COUNT = 2000;
const FLOW_SPEED_BASE = 2.0;
const FLOW_SPEED_VAR = 1.5;

interface FlowParticleData {
  position: THREE.Vector3;
  baseSpeed: number;
  phase: number;
  pathType: 'helix' | 'lissajous' | 'sineWave';
  offset: number;
}

export function InstancedFlowScene() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  // Pre-generate flow particle data
  const flowData = useMemo(() => {
    const data: FlowParticleData[] = [];
    const pathTypes: Array<'helix' | 'lissajous' | 'sineWave'> = [
      'helix',
      'lissajous',
      'sineWave',
    ];

    for (let i = 0; i < FLOW_PARTICLE_COUNT; i++) {
      const speed = FLOW_SPEED_BASE + (Math.random() - 0.5) * FLOW_SPEED_VAR;
      const pathType = pathTypes[i % 3];

      data.push({
        position: new THREE.Vector3(0, 0, 0),
        baseSpeed: speed,
        phase: Math.random() * Math.PI * 2,
        pathType,
        offset: i,
      });
    }
    return data;
  }, []);

  // Initialize instance colors (blue for slow, red for fast)
  useMemo(() => {
    if (!meshRef.current) return;
    const tempColor = new THREE.Color();
    flowData.forEach((data, i) => {
      // Map speed to hue: slow = blue (240°), fast = red (0°)
      const speedNorm = (data.baseSpeed - FLOW_SPEED_BASE + FLOW_SPEED_VAR * 0.5) / FLOW_SPEED_VAR;
      const hue = (1 - Math.max(0, Math.min(1, speedNorm))) * 240; // 240 = blue, 0 = red
      tempColor.setHSL(hue / 360, 0.9, 0.55);
      meshRef.current.setColorAt(i, tempColor);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [flowData]);

  // Animation loop: particles follow parametric curves
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const t = state.clock.elapsedTime;

    flowData.forEach((data, i) => {
      // Time parameter advances based on speed
      const time = t * data.baseSpeed + data.phase;

      // Compute position based on path type
      switch (data.pathType) {
        case 'helix': {
          // Helix: x = r*cos(t), y = r*sin(t), z = t
          const radius = 1.5;
          const angle = time;
          const progress = (time % (Math.PI * 4)) / (Math.PI * 4);
          tempObject.position.set(
            radius * Math.cos(angle),
            (progress - 0.5) * 4, // vertical scroll
            radius * Math.sin(angle)
          );
          break;
        }

        case 'lissajous': {
          // Lissajous: x = sin(at), y = sin(bt), z = sin(ct)
          const a = 2,
            b = 3,
            c = 5;
          tempObject.position.set(
            Math.sin(a * time) * 1.5,
            Math.sin(b * time) * 1.5,
            Math.sin(c * time) * 1.5
          );
          break;
        }

        case 'sineWave': {
          // Wave: x = t, y = sin(t), z = sin(t + offset)
          const progress = (time % (Math.PI * 4)) / (Math.PI * 4);
          tempObject.position.set(
            (progress - 0.5) * 6, // horizontal scroll
            Math.sin(time) * 1.5,
            Math.cos(time + data.offset * 0.1) * 1.5
          );
          break;
        }
      }

      // Tiny scale for flow particles
      tempObject.scale.set(0.15, 0.15, 0.15);
      tempObject.rotation.set(0, 0, 0);

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <spotLight
        position={[6, 6, 6]}
        angle={0.4}
        penumbra={1}
        intensity={0.8}
      />
      <pointLight position={[-6, -6, -6]} intensity={0.3} color="#4f46e5" />

      <instancedMesh
        ref={meshRef}
        args={[
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshStandardMaterial({
            metalness: 0.6,
            roughness: 0.2,
            emissive: '#1a1a2e',
          }),
          FLOW_PARTICLE_COUNT,
        ]}
      />

      <Html position={[0, 4, 0]} center distanceFactor={1.5}>
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          2000 particles flowing along helixes, Lissajous, &amp; sine waves
        </div>
      </Html>
    </group>
  );
}
