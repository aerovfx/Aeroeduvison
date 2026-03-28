'use client';

import * as THREE from 'three';
import { useRef, useMemo, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { easing } from 'maath';

/**
 * Galaxy geometry generator with instanced particles
 * Creates spiral arm formations with color and size variations
 */
interface GalaxyGeometryData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

interface GalaxyConfig {
  particleCount: number;
  branches: number;
  spin: number;
  randomness: number;
  innerColor: THREE.Color;
  outerColor: THREE.Color;
}

const generateGalaxyGeometry = (config: GalaxyConfig): GalaxyGeometryData => {
  const { particleCount, branches, spin, randomness, innerColor, outerColor } =
    config;

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    // Position index
    const i3 = i * 3;

    // Distance from center (0 to 1)
    const distance = Math.random();

    // Angle based on branch assignment and spin
    const branchAngle = ((i % branches) / branches) * Math.PI * 2;
    const spinAngle = distance * spin;
    const angle = branchAngle + spinAngle;

    // Randomness adds spread around spiral arms
    const randomX = (Math.random() - 0.5) * randomness * distance;
    const randomY = (Math.random() - 0.5) * randomness * distance;
    const randomZ = (Math.random() - 0.5) * randomness * distance;

    // Position using cylindrical coordinates
    positions[i3] = Math.cos(angle) * distance + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(angle) * distance + randomZ;

    // Color interpolation: inner = warm (orange/red), outer = cool (blue)
    const mixedColor = new THREE.Color().lerpColors(
      innerColor,
      outerColor,
      distance
    );
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    // Size: larger in center, smaller at edges
    sizes[i] = distance * 2;
  }

  return { positions, colors, sizes };
};

/**
 * Standalone Galaxy Scene with its own Canvas
 * Interactive galaxy with mouse-following camera and auto-rotation
 */
const GalaxyCore = () => {
  const meshRef = useRef<THREE.Points>(null!);
  const cameraRef = useRef({ x: 0, y: 0 });

  const [config] = useState<GalaxyConfig>({
    particleCount: 15000,
    branches: Math.floor(Math.random() * 6) + 3, // 3-8 branches
    spin: (Math.random() - 0.5) * 20,
    randomness: Math.random() * 2,
    innerColor: new THREE.Color(0xff6030),
    outerColor: new THREE.Color(0x1e3c72),
  });

  const { geometry, material } = useMemo(() => {
    const data = generateGalaxyGeometry(config);

    // Create geometry
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));

    // Custom material with vertex shader for size variation and opacity twinkle
    const mat = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      transparent: true,
      vertexColors: true,
    });

    return { geometry: geom, material: mat };
  }, [config]);

  const { camera, pointer } = useThree();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const elapsedTime = clock.getElapsedTime();

    // Auto-rotation
    meshRef.current.rotation.z += 0.0001;
    meshRef.current.rotation.x = Math.sin(elapsedTime * 0.00005) * 0.3;

    // Subtle camera following with easing
    cameraRef.current.x = pointer.x * 3;
    cameraRef.current.y = pointer.y * 3;

    camera.position.x += (cameraRef.current.x - camera.position.x) * 0.01;
    camera.position.y += (cameraRef.current.y - camera.position.y) * 0.01;

    // Twinkling effect on material
    const opacity = 0.8 + Math.sin(elapsedTime * 3) * 0.2;
    if (meshRef.current.material instanceof THREE.PointsMaterial) {
      (meshRef.current.material as THREE.PointsMaterial).opacity = opacity;
    }
  });

  return (
    <>
      <Stars radius={100} count={500} factor={4} fade speed={1} />
      <points ref={meshRef} geometry={geometry} material={material} />
      <OrbitControls autoRotate autoRotateSpeed={0.1} />
    </>
  );
};

export const GalaxyScene: React.FC = () => {
  return (
    <Canvas
      camera={{
        position: [0, 3, 3],
        fov: 75,
        aspect: typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1,
        near: 0.1,
        far: 1000,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <GalaxyCore />
    </Canvas>
  );
};

/**
 * Galaxy Field Scene for use inside R3FSandbox wrapper
 * Simplified version with 5000 particles, compatible with parent Canvas
 */
export const GalaxyFieldScene: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null!);
  const targetCameraRef = useRef({ x: 0, y: 0, z: 0 });

  const [config] = useState<GalaxyConfig>({
    particleCount: 5000,
    branches: Math.floor(Math.random() * 6) + 3,
    spin: (Math.random() - 0.5) * 15,
    randomness: Math.random() * 1.5,
    innerColor: new THREE.Color(0xff6030),
    outerColor: new THREE.Color(0x1e3c72),
  });

  const { geometry, material } = useMemo(() => {
    const data = generateGalaxyGeometry(config);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 2.5,
      sizeAttenuation: true,
      transparent: true,
      vertexColors: true,
    });

    return { geometry: geom, material: mat };
  }, [config]);

  const { camera, pointer } = useThree();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const elapsedTime = clock.getElapsedTime();

    // Auto-rotation
    meshRef.current.rotation.z += 0.0008;
    meshRef.current.rotation.x = Math.sin(elapsedTime * 0.0002) * 0.25;

    // Pointer-following camera with easing
    targetCameraRef.current.x = pointer.x * 2.5;
    targetCameraRef.current.y = pointer.y * 2.5;
    targetCameraRef.current.z = 4;

    easing.damp3(
      camera.position,
      [targetCameraRef.current.x, targetCameraRef.current.y, targetCameraRef.current.z],
      0.05,
      0.1
    );

    // Twinkling effect
    const opacity = 0.75 + Math.sin(elapsedTime * 2.5 + Math.random() * Math.PI * 2) * 0.15;
    if (meshRef.current.material instanceof THREE.PointsMaterial) {
      (meshRef.current.material as THREE.PointsMaterial).opacity = opacity;
    }
  });

  return (
    <>
      <Stars radius={80} count={300} factor={3} fade speed={0.5} />
      <points ref={meshRef} geometry={geometry} material={material} />
    </>
  );
};
