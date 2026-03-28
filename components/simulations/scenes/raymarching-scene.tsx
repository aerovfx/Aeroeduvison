'use client';

import * as THREE from 'three';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

// Common raymarching shader code
const RAYMARCHING_GLSL = `
uniform vec3 spherePositions[4];
uniform float sphereRadii[4];
uniform vec3 sphereColors[4];
uniform vec3 cameraPos;
uniform vec3 cameraDir;
uniform float time;
uniform vec2 mousePos;

const int MAX_STEPS = 128;
const float MAX_DIST = 100.0;
const float EPSILON = 0.001;
const float AMBIENT_OCCLUSION_STRENGTH = 0.3;

// SDF: Sphere
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// SDF: Smooth union
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Scene SDF - compute distance to nearest object
vec4 sceneSDF(vec3 p) {
  float d = MAX_DIST;
  vec3 color = vec3(0.5);
  int closestIndex = -1;

  // Union all spheres with smooth blending
  for (int i = 0; i < 4; i++) {
    float sphere = sdSphere(p - spherePositions[i], sphereRadii[i]);
    float prevD = d;
    d = opSmoothUnion(d, sphere, 0.3);

    // Track which sphere is closest for coloring
    if (sphere < 0.5) {
      closestIndex = i;
    }
  }

  if (closestIndex >= 0) {
    color = sphereColors[closestIndex];
  }

  return vec4(color, d);
}

// Compute normal via central differences
vec3 computeNormal(vec3 p) {
  const float h = 0.001;
  vec3 n;
  n.x = sceneSDF(p + vec3(h, 0, 0)).w - sceneSDF(p - vec3(h, 0, 0)).w;
  n.y = sceneSDF(p + vec3(0, h, 0)).w - sceneSDF(p - vec3(0, h, 0)).w;
  n.z = sceneSDF(p + vec3(0, 0, h)).w - sceneSDF(p - vec3(0, 0, h)).w;
  return normalize(n);
}

// Ambient occlusion approximation
float computeAO(vec3 p, vec3 n) {
  float ao = 1.0;
  float step = 0.1;
  for (int i = 1; i <= 5; i++) {
    float dist = sceneSDF(p + n * step * float(i)).w;
    ao -= (step * float(i) - dist) / pow(2.0, float(i)) * AMBIENT_OCCLUSION_STRENGTH;
  }
  return clamp(ao, 0.0, 1.0);
}

void main() {
  // Ray setup
  vec2 uv = gl_FragCoord.xy / vec2(1920.0, 1080.0);
  uv = uv * 2.0 - 1.0;

  vec3 ro = cameraPos;
  vec3 rd = normalize(vec3(uv * 1.5, 1.0));

  // Raymarching
  float t = 0.0;
  vec3 finalColor = vec3(0.1);

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;

    if (t > MAX_DIST) break;

    vec4 sdfResult = sceneSDF(p);
    float d = sdfResult.w;
    vec3 objColor = sdfResult.xyz;

    if (d < EPSILON) {
      // Hit - compute lighting
      vec3 normal = computeNormal(p);
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));

      float diffuse = max(0.0, dot(normal, lightDir));
      float ao = computeAO(p, normal);

      finalColor = objColor * (0.3 + diffuse * 0.7) * ao;
      break;
    }

    t += d;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface RaymarchingSceneProps {
  width?: number;
  height?: number;
}

// ============================================================================
// RaymarchingScene: Animated blobs with mouse interaction
// ============================================================================
export function RaymarchingScene({ width = 1920, height = 1080 }: RaymarchingSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseRef = useRef<[number, number]>([0, 0]);

  const uniforms = useMemo(
    () => ({
      spherePositions: {
        value: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1.5, 0, 0),
          new THREE.Vector3(-0.75, 1, 0),
          new THREE.Vector3(-0.75, -1, 0),
        ],
      },
      sphereRadii: { value: [0.8, 0.6, 0.5, 0.5] },
      sphereColors: {
        value: [
          new THREE.Color(0.2, 0.8, 0.4),
          new THREE.Color(0.8, 0.2, 0.6),
          new THREE.Color(0.4, 0.4, 0.8),
          new THREE.Color(0.9, 0.6, 0.2),
        ],
      },
      cameraPos: { value: new THREE.Vector3(0, 0, 3.5) },
      cameraDir: { value: new THREE.Vector3(0, 0, -1) },
      time: { value: 0 },
      mousePos: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  const vertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    ${RAYMARCHING_GLSL}
  `;

  useFrame(({ gl }) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.time.value += 0.016;

    const positions = materialRef.current.uniforms.spherePositions.value;
    const t = materialRef.current.uniforms.time.value;

    // Animate sphere positions - orbiting and bouncing
    positions[0].x = Math.sin(t * 0.5) * 1.2;
    positions[0].y = Math.cos(t * 0.3) * 0.8;

    positions[1].x = 1.5 + Math.sin(t * 0.7) * 0.5;
    positions[1].y = Math.cos(t * 0.5) * 0.8;

    positions[2].x = -0.75 + Math.sin(t * 0.4) * 0.6;
    positions[2].y = 1 + Math.cos(t * 0.6) * 0.4;

    positions[3].x = -0.75 + Math.sin(t * 0.6) * 0.6;
    positions[3].y = -1 + Math.cos(t * 0.4) * 0.4;

    // Apply mouse position to first sphere
    materialRef.current.uniforms.spherePositions.value = positions;
    materialRef.current.uniforms.mousePos.value.set(
      mouseRef.current[0],
      mouseRef.current[1]
    );
  });

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current[0] = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current[1] = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ============================================================================
// MetaballsScene: Rainbow iridescent metaballs with click interaction
// ============================================================================

interface MetaballState {
  positions: THREE.Vector3[];
  colors: THREE.Color[];
  radii: number[];
}

const METABALL_GLSL = `
#define MAX_METABALLS 7
#define MAX_STEPS 128

uniform vec3 metaballPositions[MAX_METABALLS];
uniform float metaballRadii[MAX_METABALLS];
uniform int metaballCount;
uniform float time;
uniform vec3 cameraPos;

const float MAX_DIST = 100.0;
const float EPSILON = 0.001;

// Iridescent color from normal direction
vec3 getIridescentColor(vec3 normal) {
  vec3 color = vec3(0.5);
  color.r += 0.5 * sin(normal.x * 3.14159 + time * 0.5);
  color.g += 0.5 * sin(normal.y * 3.14159 + time * 0.7 + 2.0);
  color.b += 0.5 * sin(normal.z * 3.14159 + time * 0.3 + 4.0);
  return clamp(color, 0.0, 1.0);
}

float sceneSDF(vec3 p) {
  float d = MAX_DIST;

  for (int i = 0; i < MAX_METABALLS; i++) {
    if (i >= metaballCount) break;
    float sphere = length(p - metaballPositions[i]) - metaballRadii[i];

    // Smooth union for metaball blending
    float h = clamp(0.5 + 0.5 * (sphere - d) / 0.4, 0.0, 1.0);
    d = mix(sphere, d, h) - 0.4 * h * (1.0 - h);
  }

  return d;
}

vec3 computeNormal(vec3 p) {
  const float h = 0.001;
  float d = sceneSDF(p);
  vec3 n = vec3(
    sceneSDF(p + vec3(h, 0, 0)) - d,
    sceneSDF(p + vec3(0, h, 0)) - d,
    sceneSDF(p + vec3(0, 0, h)) - d
  );
  return normalize(n);
}

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(1920.0, 1080.0);
  uv = uv * 2.0 - 1.0;

  vec3 ro = cameraPos;
  vec3 rd = normalize(vec3(uv * 1.5, 1.0));

  float t = 0.0;
  vec3 finalColor = vec3(0.05, 0.08, 0.15);

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;

    if (t > MAX_DIST) break;

    float d = sceneSDF(p);

    if (d < EPSILON) {
      vec3 normal = computeNormal(p);
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));

      float diffuse = max(0.2, dot(normal, lightDir));
      float fresnel = pow(1.0 - dot(-rd, normal), 2.0);

      vec3 iridescent = getIridescentColor(normal);
      finalColor = iridescent * diffuse + fresnel * 0.5;
      break;
    }

    t += d;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function MetaballsScene({ width = 1920, height = 1080 }: RaymarchingSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [state, setState] = useState<MetaballState>({
    positions: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(-1.5, 1.5, 0),
      new THREE.Vector3(-1.5, -1.5, 0),
      new THREE.Vector3(0.5, -1, 0.5),
      new THREE.Vector3(-0.5, 1, -0.5),
    ],
    colors: [
      new THREE.Color(0.3, 0.6, 1.0),
      new THREE.Color(1.0, 0.3, 0.7),
      new THREE.Color(0.2, 1.0, 0.5),
      new THREE.Color(1.0, 0.9, 0.2),
      new THREE.Color(0.6, 0.2, 1.0),
      new THREE.Color(0.8, 0.5, 0.3),
    ],
    radii: [0.6, 0.5, 0.4, 0.4, 0.35, 0.35],
  });

  const uniforms = useMemo(
    () => ({
      metaballPositions: {
        value: state.positions,
      },
      metaballRadii: {
        value: state.radii,
      },
      metaballCount: { value: state.positions.length },
      time: { value: 0 },
      cameraPos: { value: new THREE.Vector3(0, 0, 4) },
    }),
    [state.positions, state.radii]
  );

  const vertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = METABALL_GLSL;

  useFrame(() => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.time.value += 0.016;

    // Animate metaballs - gentle orbiting motion
    const t = materialRef.current.uniforms.time.value;
    const positions = materialRef.current.uniforms.metaballPositions.value;

    for (let i = 0; i < positions.length; i++) {
      const angle = (i / positions.length) * Math.PI * 2;
      const radius = 1.5 + Math.sin(i * 0.7) * 0.5;
      positions[i].x = Math.cos(t * 0.3 + angle) * radius;
      positions[i].y = Math.sin(t * 0.2 + angle) * radius;
      positions[i].z = Math.sin(t * 0.25 + i) * 0.5;
    }

    materialRef.current.uniforms.metaballPositions.value = positions;
  });

  // Handle click to add temporary metaball
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (state.positions.length < 7) {
        setState((prev) => ({
          ...prev,
          positions: [...prev.positions, new THREE.Vector3(x * 2, y * 2, 0)],
          colors: [...prev.colors, new THREE.Color(Math.random(), Math.random(), Math.random())],
          radii: [...prev.radii, 0.3],
        }));

        // Remove after 3 seconds
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            positions: prev.positions.slice(0, -1),
            colors: prev.colors.slice(0, -1),
            radii: prev.radii.slice(0, -1),
          }));
        }, 3000);
      }
    },
    [state.positions.length]
  );

  return (
    <mesh ref={meshRef} onClick={handleClick}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
