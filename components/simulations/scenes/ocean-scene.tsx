'use client';

import * as THREE from 'three';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';

// Ocean shader material
const oceanVertexShader = `
  uniform float uTime;
  uniform vec2 uMousePos;
  uniform float uMouseInfluence;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vWave;

  void main() {
    vec3 pos = position;

    // Multiple wave layers (Gerstner-like)
    float wave = 0.0;
    float freq1 = 0.5;
    float amp1 = 0.5;
    float speed1 = 0.5;

    float freq2 = 0.25;
    float amp2 = 0.3;
    float speed2 = 0.3;

    float freq3 = 0.35;
    float amp3 = 0.2;
    float speed3 = 0.7;

    wave += sin(pos.x * freq1 + uTime * speed1) * amp1;
    wave += sin(pos.z * freq2 + uTime * speed2) * amp2;
    wave += sin((pos.x + pos.z) * freq3 + uTime * speed3) * amp3;

    // Mouse-based wave disturbance
    float distToMouse = distance(pos.xz, uMousePos);
    float mouseWave = exp(-distToMouse * distToMouse * 2.0) * sin(uTime * 3.0 + distToMouse * 5.0) * uMouseInfluence;
    wave += mouseWave;

    pos.y += wave;

    // Calculate normal using wave gradients
    float epsilon = 0.01;
    float waveX = 0.0;
    waveX += sin((pos.x + epsilon) * freq1 + uTime * speed1) * amp1;
    waveX += sin((pos.x + epsilon) * freq2 + uTime * speed2) * amp2;
    waveX += sin(((pos.x + epsilon) + pos.z) * freq3 + uTime * speed3) * amp3;

    float waveZ = 0.0;
    waveZ += sin(pos.x * freq1 + uTime * speed1) * amp1;
    waveZ += sin((pos.z + epsilon) * freq2 + uTime * speed2) * amp2;
    waveZ += sin((pos.x + (pos.z + epsilon)) * freq3 + uTime * speed3) * amp3;

    float dWavedX = (waveX - wave) / epsilon;
    float dWavedZ = (waveZ - wave) / epsilon;

    vNormal = normalize(vec3(-dWavedX, 1.0, -dWavedZ));
    vPosition = pos;
    vWave = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const oceanFragmentShader = `
  uniform vec3 uSunPos;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vWave;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vPosition);

    // Fresnel effect
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.0);

    // Color based on depth
    vec3 deepColor = vec3(0.05, 0.2, 0.4);
    vec3 shallowColor = vec3(0.1, 0.6, 0.8);
    vec3 baseColor = mix(deepColor, shallowColor, fresnel);

    // Specular highlights
    vec3 sunDir = normalize(uSunPos - vPosition);
    vec3 halfDir = normalize(viewDir + sunDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.6;

    // Final color
    vec3 finalColor = baseColor + specular * vec3(1.0, 1.0, 0.9);

    // Fog-like effect
    float depth = length(cameraPosition - vPosition);
    float fogFactor = smoothstep(0.0, 150.0, depth);
    vec3 fogColor = vec3(0.5, 0.7, 1.0);
    finalColor = mix(finalColor, fogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface OceanSceneProps {
  scale?: number;
}

// OceanScene - No Canvas (for R3FSandbox wrapper)
export function OceanScene({ scale = 50 }: OceanSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [mousePos, setMousePos] = useState<[number, number]>([0, 0]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMousePos: { value: new THREE.Vector2(mousePos[0], mousePos[1]) },
      uMouseInfluence: { value: 2.0 },
      uSunPos: { value: new THREE.Vector3(10, 20, 10) },
    }),
    [mousePos]
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    setMousePos([x * scale * 0.5, y * scale * 0.5]);
  }, [scale]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += 0.016;
      materialRef.current.uniforms.uMousePos.value.set(mousePos[0], mousePos[1]);
      // Animate sun position
      materialRef.current.uniforms.uSunPos.value.set(
        Math.cos(state.clock.elapsedTime * 0.3) * 20,
        15 + Math.sin(state.clock.elapsedTime * 0.5) * 5,
        Math.sin(state.clock.elapsedTime * 0.3) * 20
      );
    }
  });

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: oceanVertexShader,
    fragmentShader: oceanFragmentShader,
    side: THREE.DoubleSide,
  });
  materialRef.current = material;

  return (
    <mesh ref={meshRef} material={material} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[scale, scale, 256, 256]} />
    </mesh>
  );
}

// Buoy - floating object for OceanSunsetScene
interface BuoyProps {
  position: [number, number, number];
  frequency?: number;
  amplitude?: number;
}

function Buoy({ position, frequency = 0.5, amplitude = 0.5 }: BuoyProps) {
  const buoyRef = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (buoyRef.current) {
      buoyRef.current.position.y =
        initialY + Math.sin(state.clock.elapsedTime * frequency) * amplitude;
      buoyRef.current.rotation.z += 0.01;
    }
  });

  return (
    <mesh ref={buoyRef} position={position}>
      <cylinderGeometry args={[0.3, 0.4, 0.8, 8]} />
      <meshPhongMaterial color="#ff6b35" />
    </mesh>
  );
}

// OceanSunsetScene - Standalone with Canvas
export function OceanSunsetScene() {
  return (
    <Canvas
      camera={{
        position: [0, 2, 15],
        fov: 75,
        near: 0.1,
        far: 500,
      }}
    >
      {/* Sky gradient - sunset colors */}
      <color attach="background" args={['#ff9966']} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#ff9966', 20, 200]} />

      {/* Ocean */}
      <OceanScene scale={200} />

      {/* Floating buoys */}
      <Buoy position={[-15, 0, -20]} frequency={0.8} amplitude={0.6} />
      <Buoy position={[10, 0, -30]} frequency={0.6} amplitude={0.5} />
      <Buoy position={[20, 0, 0]} frequency={0.7} amplitude={0.7} />
      <Buoy position={[-5, 0, 15]} frequency={0.5} amplitude={0.4} />

      {/* Simple floating sphere for visual interest */}
      <mesh position={[30, 1, -40]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshPhongMaterial color="#ffaa44" emissive="#ff8844" />
      </mesh>

      {/* Orbit controls for interaction */}
      <OrbitControls
        autoRotate
        autoRotateSpeed={1}
        enableZoom={true}
        enablePan={true}
      />
    </Canvas>
  );
}
