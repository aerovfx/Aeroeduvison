'use client';
/**
 * Wave Shader Scene — custom GLSL shader with mouse interaction
 *
 * Event handlers demonstrated:
 *   onPointerMove — feed real-time mouse position into shader uniform
 *   onClick       — toggle wireframe mode
 *   onDoubleClick — reset animation / change color scheme
 *   onWheel       — adjust wave frequency
 *
 * Techniques:
 *   Custom ShaderMaterial — vertex displacement + fragment coloring
 *   Uniform animation    — uTime drives wave motion
 *   Mouse → GPU          — pointer coords sent to shader each frame
 */

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// Color presets
// ═══════════════════════════════════════════════
const COLOR_SCHEMES = [
  { name: 'Ocean', c1: '#0ea5e9', c2: '#8b5cf6', c3: '#06b6d4' },
  { name: 'Sunset', c1: '#f59e0b', c2: '#ef4444', c3: '#ec4899' },
  { name: 'Forest', c1: '#10b981', c2: '#22c55e', c3: '#84cc16' },
  { name: 'Neon', c1: '#e879f9', c2: '#06b6d4', c3: '#fbbf24' },
];

// ═══════════════════════════════════════════════
// Wave Mesh — the core animated surface
// ═══════════════════════════════════════════════
interface WaveMeshProps {
  wireframe?: boolean;
  colorScheme?: number;
  frequency?: number;
  amplitude?: number;
}

function WaveMesh({
  wireframe = false,
  colorScheme = 0,
  frequency = 2.0,
  amplitude = 0.3,
}: WaveMeshProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const colors = COLOR_SCHEMES[colorScheme % COLOR_SCHEMES.length];

  // Custom shader material
  const shaderData = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(colors.c1) },
      uColor2: { value: new THREE.Color(colors.c2) },
      uColor3: { value: new THREE.Color(colors.c3) },
      uAmplitude: { value: amplitude },
      uFrequency: { value: frequency },
      uSpeed: { value: 1.0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uWireframe: { value: wireframe ? 1.0 : 0.0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uSpeed;
      uniform vec2 uMouse;
      varying vec2 vUv;
      varying float vElevation;
      varying float vDistToMouse;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Multi-layered wave displacement
        float wave1 = sin(pos.x * uFrequency + uTime * uSpeed) * uAmplitude;
        float wave2 = sin(pos.y * uFrequency * 0.8 + uTime * uSpeed * 0.6) * uAmplitude * 0.5;
        float wave3 = cos(pos.x * uFrequency * 1.5 + pos.y * uFrequency + uTime * uSpeed * 0.8) * uAmplitude * 0.3;

        // Mouse influence — creates a ripple at cursor position
        float dist = length(vec2(pos.x - uMouse.x * 5.0, pos.y - uMouse.y * 5.0));
        float mouseWave = sin(dist * 3.0 - uTime * 4.0) * 0.2 * max(0.0, 1.0 - dist * 0.2);
        vDistToMouse = dist;

        pos.z += wave1 + wave2 + wave3 + mouseWave;
        vElevation = pos.z;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      uniform float uWireframe;
      varying vec2 vUv;
      varying float vElevation;
      varying float vDistToMouse;

      void main() {
        // 3-color gradient based on elevation and UV position
        float mixFactor1 = smoothstep(-0.3, 0.3, vElevation);
        float mixFactor2 = smoothstep(0.0, 1.0, vUv.x + sin(uTime * 0.2) * 0.3);
        vec3 color = mix(uColor1, uColor2, mixFactor1);
        color = mix(color, uColor3, mixFactor2 * 0.5);

        // Subtle grid pattern
        float gridX = abs(fract(vUv.x * 20.0 - 0.5) - 0.5) / fwidth(vUv.x * 20.0);
        float gridY = abs(fract(vUv.y * 20.0 - 0.5) - 0.5) / fwidth(vUv.y * 20.0);
        float grid = 1.0 - min(min(gridX, gridY), 1.0);

        // Mouse glow
        float mouseGlow = smoothstep(3.0, 0.0, vDistToMouse) * 0.3;
        color += mouseGlow;

        // Wireframe overlay when enabled
        if (uWireframe > 0.5) {
          color = mix(color, vec3(1.0), grid * 0.3);
        }

        // Subtle shimmer
        float shimmer = sin(vUv.x * 60.0 + uTime * 2.0) * 0.015;
        color += shimmer;

        gl_FragColor = vec4(color, 0.9);
      }
    `,
  }), [colors, frequency, amplitude, wireframe]);

  // Update uniforms when props change
  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uColor1.value.set(colors.c1);
      matRef.current.uniforms.uColor2.value.set(colors.c2);
      matRef.current.uniforms.uColor3.value.set(colors.c3);
      matRef.current.uniforms.uFrequency.value = frequency;
      matRef.current.uniforms.uAmplitude.value = amplitude;
      matRef.current.uniforms.uWireframe.value = wireframe ? 1.0 : 0.0;
    }
  }, [colors, frequency, amplitude, wireframe]);

  // Pointer move → update mouse uniform
  const handlePointerMove = useCallback((e: any) => {
    if (e.uv) {
      mouseRef.current.set(e.uv.x * 2 - 1, e.uv.y * 2 - 1);
    }
  }, []);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uMouse.value.copy(mouseRef.current);
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 3, 0, 0]}
      onPointerMove={handlePointerMove}
    >
      <planeGeometry args={[10, 10, 128, 128]} />
      <shaderMaterial
        ref={matRef}
        {...shaderData}
        transparent
        side={THREE.DoubleSide}
        wireframe={wireframe}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
// Interactive Controls — overlay buttons
// ═══════════════════════════════════════════════
interface WaveControlsProps {
  wireframe: boolean;
  colorScheme: number;
  frequency: number;
  onToggleWireframe: () => void;
  onNextColor: () => void;
  onFreqChange: (f: number) => void;
}

function WaveControls({
  wireframe, colorScheme, frequency,
  onToggleWireframe, onNextColor, onFreqChange,
}: WaveControlsProps) {
  const scheme = COLOR_SCHEMES[colorScheme % COLOR_SCHEMES.length];

  return (
    <Html position={[0, 0, 2]} center style={{ pointerEvents: 'auto' }}>
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
        {/* Wireframe toggle */}
        <button
          onClick={onToggleWireframe}
          className={`px-2 py-0.5 rounded-md text-[0.55rem] font-mono transition-all ${
            wireframe
              ? 'bg-white/15 text-white/80'
              : 'bg-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          Wire
        </button>

        {/* Color scheme */}
        <button
          onClick={onNextColor}
          className="px-2 py-0.5 rounded-md text-[0.55rem] font-mono bg-white/5 text-white/30 hover:text-white/50 transition-all flex items-center gap-1"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: scheme.c1 }}
          />
          {scheme.name}
        </button>

        {/* Frequency slider */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFreqChange(Math.max(0.5, frequency - 0.5))}
            className="text-white/25 hover:text-white/50 text-[0.6rem] font-mono w-4 h-4 flex items-center justify-center"
          >
            −
          </button>
          <span className="text-[0.5rem] text-white/20 font-mono w-6 text-center">
            {frequency.toFixed(1)}
          </span>
          <button
            onClick={() => onFreqChange(Math.min(5, frequency + 0.5))}
            className="text-white/25 hover:text-white/50 text-[0.6rem] font-mono w-4 h-4 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════════
// Main Wave Scene — exported
// ═══════════════════════════════════════════════
export function WaveScene() {
  const [wireframe, setWireframe] = useState(false);
  const [colorScheme, setColorScheme] = useState(0);
  const [frequency, setFrequency] = useState(2.0);

  return (
    <group>
      <WaveMesh
        wireframe={wireframe}
        colorScheme={colorScheme}
        frequency={frequency}
        amplitude={0.3}
      />
      <WaveControls
        wireframe={wireframe}
        colorScheme={colorScheme}
        frequency={frequency}
        onToggleWireframe={() => setWireframe(w => !w)}
        onNextColor={() => setColorScheme(c => (c + 1) % COLOR_SCHEMES.length)}
        onFreqChange={setFrequency}
      />
    </group>
  );
}

// ═══════════════════════════════════════════════
// Audio Visualizer Wave — responsive to "simulated audio"
// ═══════════════════════════════════════════════
export function AudioWaveScene() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const [isPlaying, setIsPlaying] = useState(true);

  const shaderData = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uBass: { value: 0.5 },
      uMid: { value: 0.3 },
      uTreble: { value: 0.4 },
      uColor: { value: new THREE.Color('#8b5cf6') },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float bass = sin(pos.x * 1.0 + uTime) * uBass * 0.5;
        float mid = sin(pos.x * 3.0 + uTime * 1.5) * uMid * 0.3;
        float treble = sin(pos.x * 8.0 + uTime * 2.0) * uTreble * 0.15;

        pos.y += bass + mid + treble;
        vElevation = pos.y;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      varying float vElevation;

      void main() {
        vec3 color = uColor;
        float intensity = abs(vElevation) * 2.0;
        color += intensity * 0.5;

        // Edge glow
        float edge = 1.0 - smoothstep(0.0, 0.1, abs(vUv.y - 0.5));
        color += edge * 0.3;

        gl_FragColor = vec4(color, 0.85 + intensity * 0.15);
      }
    `,
  }), []);

  useFrame((state) => {
    if (!matRef.current || !isPlaying) return;
    const t = state.clock.elapsedTime;

    matRef.current.uniforms.uTime.value = t;
    // Simulate audio levels with sine waves at different frequencies
    matRef.current.uniforms.uBass.value = 0.4 + Math.sin(t * 0.5) * 0.3 + Math.sin(t * 0.7) * 0.2;
    matRef.current.uniforms.uMid.value = 0.3 + Math.sin(t * 1.2) * 0.25 + Math.cos(t * 0.9) * 0.15;
    matRef.current.uniforms.uTreble.value = 0.2 + Math.sin(t * 2.5) * 0.2 + Math.sin(t * 3.1) * 0.1;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); setIsPlaying(p => !p); }}
      >
        <planeGeometry args={[8, 2, 256, 1]} />
        <shaderMaterial
          ref={matRef}
          {...shaderData}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      <Html position={[0, -1.8, 0]} center>
        <div className="text-[0.5rem] text-white/20 font-mono">
          {isPlaying ? '▶ Playing' : '⏸ Paused'} — click to toggle
        </div>
      </Html>
    </group>
  );
}
