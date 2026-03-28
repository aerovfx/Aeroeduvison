'use client';

import * as THREE from 'three';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Cloud } from '@react-three/drei';

// Simple hash-based noise function
function hash(x: number, y: number): number {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

// Smoothstep interpolation
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Perlin-like noise using hash
function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const xs = smoothstep(xf);
  const ys = smoothstep(yf);

  const h00 = hash(xi, yi);
  const h10 = hash(xi + 1, yi);
  const h01 = hash(xi, yi + 1);
  const h11 = hash(xi + 1, yi + 1);

  const x0 = h00 + xs * (h10 - h00);
  const x1 = h01 + xs * (h11 - h01);
  return x0 + ys * (x1 - x0);
}

// Fractional Brownian Motion for richer terrain
function fbm(x: number, y: number, offset: number = 0): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < 5; i++) {
    value += amplitude * noise(x * frequency + offset, y * frequency + offset);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

// Vertex shader for terrain
const terrainVertexShader = `
  uniform float uTime;
  uniform float uNoiseOffset;

  varying float vHeight;
  varying vec3 vNormal;

  // Hash-based noise function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float smoothstep(float t) {
    return t * t * (3.0 - 2.0 * t);
  }

  float noise(vec2 p) {
    vec2 pi = floor(p);
    vec2 pf = p - pi;

    vec2 s = vec2(smoothstep(pf.x), smoothstep(pf.y));

    float h00 = hash(pi);
    float h10 = hash(pi + vec2(1.0, 0.0));
    float h01 = hash(pi + vec2(0.0, 1.0));
    float h11 = hash(pi + vec2(1.0, 1.0));

    float x0 = h00 + s.x * (h10 - h00);
    float x1 = h01 + s.x * (h11 - h01);
    return x0 + s.y * (x1 - x0);
  }

  float fbm(vec2 p, float offset) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise((p * frequency) + offset);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return value / maxValue;
  }

  void main() {
    vHeight = fbm(position.xz * 0.5, uNoiseOffset);

    // Apply ripple effect from clicked positions
    vec3 pos = position;
    pos.y = vHeight * 3.0;

    // Calculate normal
    float eps = 0.1;
    float h_x_plus = fbm((position.xz + vec2(eps, 0.0)) * 0.5, uNoiseOffset) * 3.0;
    float h_x_minus = fbm((position.xz - vec2(eps, 0.0)) * 0.5, uNoiseOffset) * 3.0;
    float h_z_plus = fbm((position.xz + vec2(0.0, eps)) * 0.5, uNoiseOffset) * 3.0;
    float h_z_minus = fbm((position.xz - vec2(0.0, eps)) * 0.5, uNoiseOffset) * 3.0;

    vec3 tangent = normalize(vec3(eps, h_x_plus - h_x_minus, 0.0));
    vec3 bitangent = normalize(vec3(0.0, h_z_plus - h_z_minus, eps));
    vNormal = normalize(cross(tangent, bitangent));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment shader for height-based coloring
const terrainFragmentShader = `
  varying float vHeight;
  varying vec3 vNormal;

  void main() {
    // Height-based coloring
    vec3 color;

    if (vHeight < 0.3) {
      // Deep blue water
      color = mix(vec3(0.1, 0.2, 0.4), vec3(0.2, 0.4, 0.6), smoothstep(0.0, 0.3, vHeight));
    } else if (vHeight < 0.45) {
      // Green lowland
      color = mix(vec3(0.2, 0.4, 0.6), vec3(0.2, 0.6, 0.2), smoothstep(0.3, 0.45, vHeight));
    } else if (vHeight < 0.7) {
      // Brown mountain
      color = mix(vec3(0.2, 0.6, 0.2), vec3(0.6, 0.4, 0.2), smoothstep(0.45, 0.7, vHeight));
    } else {
      // White snow
      color = mix(vec3(0.6, 0.4, 0.2), vec3(0.9, 0.9, 0.95), smoothstep(0.7, 1.0, vHeight));
    }

    // Simple lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float diffuse = max(dot(vNormal, lightDir), 0.3);
    color *= diffuse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface TerrainMeshProps {
  animated?: boolean;
  onTerrainClick?: (point: THREE.Vector3) => void;
}

function TerrainMesh({ animated = true, onTerrainClick }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [noiseOffset, setNoiseOffset] = useState(0);
  const [ripples, setRipples] = useState<Array<{ pos: THREE.Vector3; time: number }>>([]);

  const geometry = useMemo(() => {
    const size = 20;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uNoiseOffset: { value: 0 },
      },
      side: THREE.DoubleSide,
      wireframe: false,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  useFrame((state, delta) => {
    if (!materialRef.current) return;

    if (animated) {
      const newOffset = state.clock.elapsedTime * 0.3;
      setNoiseOffset(newOffset);
      materialRef.current.uniforms.uNoiseOffset.value = newOffset;
    }

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

    // Update ripples
    setRipples((prev) =>
      prev
        .map((ripple) => ({
          ...ripple,
          time: ripple.time + delta,
        }))
        .filter((ripple) => ripple.time < 2)
    );
  });

  const handleClick = useCallback(
    (event: THREE.Intersection<THREE.Object3D>) => {
      if (event.point) {
        setRipples((prev) => [
          ...prev,
          { pos: event.point.clone(), time: 0 },
        ]);
        onTerrainClick?.(event.point);
      }
    },
    [onTerrainClick]
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={(e) => handleClick(e.intersections[0])}
    />
  );
}

interface TerrainSceneProps {
  animated?: boolean;
}

export function TerrainScene({ animated = true }: TerrainSceneProps) {
  return (
    <>
      <TerrainMesh animated={animated} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
    </>
  );
}

function TerrainSimpleSceneContent() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;

    if (cameraRef.current) {
      const camera = cameraRef.current;
      camera.position.x = Math.sin(timeRef.current * 0.2) * 15;
      camera.position.z = timeRef.current * 5;
      camera.position.y = 8 + Math.sin(timeRef.current * 0.3) * 2;
      camera.lookAt(camera.position.x, 2, camera.position.z + 10);
    }
  });

  return (
    <>
      <color attach="background" args={[0.5, 0.7, 0.95]} />
      <fog attach="fog" args={[0x87ceeb, 30, 100]} />

      <Sky
        distance={45000}
        sunPosition={[100, 20, 100]}
        inclination={0.6}
        azimuth={0.25}
      />

      <TerrainMesh animated={true} />

      <Cloud
        position={[-20, 15, -10]}
        scale={[8, 4, 8]}
        speed={0.5}
        opacity={0.4}
      />
      <Cloud
        position={[20, 18, 20]}
        scale={[10, 5, 10]}
        speed={0.3}
        opacity={0.3}
      />

      <ambientLight intensity={0.7} />
      <directionalLight
        position={[100, 20, 100]}
        intensity={1.2}
        castShadow
      />

      <perspectiveCamera ref={cameraRef} position={[0, 8, -5]} />
      <OrbitControls />
    </>
  );
}

export function TerrainSimpleScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, -5], fov: 75 }}
      style={{ width: '100%', height: '100%' }}
    >
      <TerrainSimpleSceneContent />
    </Canvas>
  );
}
