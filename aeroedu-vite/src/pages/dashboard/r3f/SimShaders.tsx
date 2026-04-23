import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { OrbitControls, Stars, Sky, Environment, Float, Text } from '@react-three/drei'
import * as THREE from 'three'

const canvasStyle: React.CSSProperties = { width: '100%', height: '100%' }
const BG = '#0a0a0f'

// ============================================================================
// 1. WAVE SHADER
// ============================================================================
const waveVert = `
  uniform float uTime;
  uniform float uFreq;
  uniform float uAmp;
  varying vec3 vPos;
  void main() {
    vec3 p = position;
    p.z += sin(p.x * uFreq + uTime) * uAmp;
    p.z += sin(p.y * uFreq * 0.8 + uTime * 1.2) * uAmp * 0.7;
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const waveFrag = `
  varying vec3 vPos;
  void main() {
    float c = (vPos.z + 1.0) * 0.5;
    vec3 col = mix(vec3(0.0, 0.3, 0.8), vec3(0.2, 0.9, 1.0), c);
    gl_FragColor = vec4(col, 1.0);
  }
`

function WaveScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFreq: { value: 1.5 },
      uAmp: { value: 0.8 },
    }),
    []
  )
  return (
    <>
      <mesh rotation-x={-Math.PI / 4}>
        <planeGeometry args={[10, 10, 100, 100]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={waveVert}
          fragmentShader={waveFrag}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
      <OrbitControls autoRotate autoRotateSpeed={0.3} />
    </>
  )
}

function WaveShaderSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 5, 8], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <WaveScene />
    </Canvas>
  )
}

// ============================================================================
// 2. TERRAIN
// ============================================================================
const terrainVert = `
  uniform float uTime;
  varying float vHeight;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for(int i=0;i<5;i++){
      v+=a*noise(p);
      p*=2.0;
      a*=0.5;
    }
    return v;
  }

  void main() {
    vec3 p = position;
    float h = fbm(p.xy * 0.3) * 4.0;
    p.z = h;
    vHeight = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const terrainFrag = `
  varying float vHeight;
  void main() {
    vec3 col;
    if (vHeight < 0.2) col = vec3(0.1, 0.3, 0.8);
    else if (vHeight < 0.8) col = vec3(0.2, 0.6, 0.1);
    else if (vHeight < 2.0) col = vec3(0.5, 0.4, 0.3);
    else col = vec3(0.9, 0.95, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`

function TerrainScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  return (
    <>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[10, 10, 150, 150]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={terrainVert}
          fragmentShader={terrainFrag}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
      <OrbitControls autoRotate autoRotateSpeed={0.3} />
    </>
  )
}

function TerrainSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 8, 8], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <TerrainScene />
    </Canvas>
  )
}

// ============================================================================
// 3. TERRAIN FLY
// ============================================================================
function TerrainFlyScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  return (
    <>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[10, 10, 150, 150]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={terrainVert}
          fragmentShader={terrainFrag}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Sky sunPosition={[100, 10, 100]} turbidity={10} rayleigh={2} />
      <fog attach="fog" args={['#87ceeb', 8, 30]} />
      <OrbitControls autoRotate autoRotateSpeed={0.3} />
    </>
  )
}

function TerrainFlySim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 8, 8], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <TerrainFlyScene />
    </Canvas>
  )
}

// ============================================================================
// 4. OCEAN
// ============================================================================
const oceanVert = `
  uniform float uTime;
  varying vec3 vNorm;
  varying vec3 vPos;
  void main() {
    vec3 p = position;
    float w1 = sin(p.x * 0.5 + uTime * 1.2) * 0.3;
    float w2 = sin(p.y * 0.3 + uTime * 0.8) * 0.2;
    float w3 = sin((p.x + p.y) * 0.4 + uTime * 1.5) * 0.15;
    p.z = w1 + w2 + w3;
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const oceanFrag = `
  varying vec3 vPos;
  void main() {
    float depth = (-vPos.z + 0.5) * 0.5;
    vec3 shallow = vec3(0.0, 0.5, 0.8);
    vec3 deep = vec3(0.0, 0.1, 0.4);
    float fresnel = 0.4 + 0.6 * pow(1.0 - abs(vPos.z), 2.0);
    vec3 col = mix(deep, shallow, depth);
    col += vec3(0.8, 0.9, 1.0) * fresnel * 0.3;
    gl_FragColor = vec4(col, 0.95);
  }
`

function OceanScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} color="#ffffff" />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[20, 20, 100, 100]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={oceanVert}
          fragmentShader={oceanFrag}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
      <OrbitControls autoRotate={false} />
    </>
  )
}

function OceanSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 5, 10], fov: 55 }}>
      <color attach="background" args={[BG]} />
      <OceanScene />
    </Canvas>
  )
}

// ============================================================================
// 5. OCEAN SUNSET
// ============================================================================
function OceanSunsetScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} color="#ffffff" />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[20, 20, 100, 100]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={oceanVert}
          fragmentShader={oceanFrag}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Sky
        sunPosition={[1, 0.1, 0]}
        turbidity={8}
        rayleigh={3}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <fog attach="fog" args={['#ff7a44', 5, 50]} />
      <OrbitControls autoRotate={false} />
    </>
  )
}

function OceanSunsetSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 2, 12], fov: 55 }}>
      <color attach="background" args={[BG]} />
      <OceanSunsetScene />
    </Canvas>
  )
}

// ============================================================================
// 6. GALAXY
// ============================================================================
function GalaxyField({ count = 15000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const arms = 3
    for (let i = 0; i < count; i++) {
      const armIdx = i % arms
      const t = Math.random()
      const radius = t * 6
      const angle = t * Math.PI * 6 + (armIdx * Math.PI * 2) / arms
      const spread = (1 - t) * 0.5 + 0.1
      positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3 * (1 - t)
      positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * spread
      const c = new THREE.Color()
      c.setHSL(0.15 - t * 0.35, 0.8 + t * 0.2, 0.6 + t * 0.2)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [count])

  useFrame((_s, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} vertexColors sizeAttenuation />
    </points>
  )
}

function GalaxyScene() {
  return (
    <>
      <GalaxyField count={15000} />
      <Stars radius={100} depth={50} count={5000} factor={4} />
      <OrbitControls autoRotate autoRotateSpeed={0.05} />
    </>
  )
}

function GalaxySim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 8, 12], fov: 55 }}>
      <color attach="background" args={[BG]} />
      <GalaxyScene />
    </Canvas>
  )
}

// ============================================================================
// 7. GALAXY FIELD
// ============================================================================
function GalaxyFieldScene() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(() => {
    const { camera, pointer } = useThree()
    if (camera) {
      camera.position.x += (pointer.x * 3 - camera.position.x) * 0.02
      camera.position.y += (pointer.y * 3 - camera.position.y) * 0.02
    }
  })
  return (
    <>
      <group ref={groupRef}>
        <GalaxyField count={5000} />
      </group>
      <Stars radius={100} depth={50} count={3000} factor={4} />
    </>
  )
}

function GalaxyFieldSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 5, 10], fov: 55 }}>
      <color attach="background" args={[BG]} />
      <GalaxyFieldScene />
    </Canvas>
  )
}

// ============================================================================
// 8. VOXEL CITY
// ============================================================================
function VoxelCity() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const count = 15 * 15
  const heights = useMemo(
    () => Float32Array.from({ length: count }, () => 0.5 + Math.random() * 4),
    []
  )

  useEffect(() => {
    if (!meshRef.current) return
    let idx = 0
    for (let z = 0; z < 15; z++) {
      for (let x = 0; x < 15; x++) {
        const h = heights[idx]
        dummy.position.set((x - 7) * 1.2, h / 2, (z - 7) * 1.2)
        dummy.scale.set(0.9, h, 0.9)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(idx, dummy.matrix)
        const brightness = 0.2 + (h / 4.5) * 0.5
        meshRef.current.setColorAt(
          idx,
          new THREE.Color(brightness, brightness * 1.1, brightness * 1.3)
        )
        idx++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [heights, dummy])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

function VoxelCityScene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[20, 0.1, 20]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <VoxelCity />
      <OrbitControls autoRotate autoRotateSpeed={0.3} />
    </>
  )
}

function VoxelCitySim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [8, 12, 12], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <VoxelCityScene />
    </Canvas>
  )
}

// ============================================================================
// 9. CITY NIGHT
// ============================================================================
function CityNight() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const count = 15 * 15
  const heights = useMemo(
    () => Float32Array.from({ length: count }, () => 0.5 + Math.random() * 4),
    []
  )

  useEffect(() => {
    if (!meshRef.current) return
    let idx = 0
    for (let z = 0; z < 15; z++) {
      for (let x = 0; x < 15; x++) {
        const h = heights[idx]
        dummy.position.set((x - 7) * 1.2, h / 2, (z - 7) * 1.2)
        dummy.scale.set(0.9, h, 0.9)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(idx, dummy.matrix)
        // Warm yellow/orange for glowing windows
        const windowGlow = 0.2 + Math.random() * 0.4
        meshRef.current.setColorAt(
          idx,
          new THREE.Color(windowGlow * 1.5, windowGlow * 1.2, windowGlow * 0.3)
        )
        idx++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [heights, dummy])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

function CityNightScene() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 8, 0]} intensity={1.5} color="#ff9800" />
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[20, 0.1, 20]} />
        <meshStandardMaterial color="#0a0a1a" />
      </mesh>
      <CityNight />
      <Stars radius={100} depth={50} count={5000} factor={4} />
      <fog attach="fog" args={['#1a1a3a', 5, 40]} />
      <OrbitControls autoRotate autoRotateSpeed={0.3} />
    </>
  )
}

function CityNightSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [8, 10, 12], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <CityNightScene />
    </Canvas>
  )
}

// ============================================================================
// 10. RAYMARCHING
// ============================================================================
const rmVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const rmFrag = `
  uniform float uTime;
  varying vec2 vUv;

  float sdSphere(vec3 p, float r) { return length(p) - r; }
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  float smin(float a, float b, float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
  }

  float map(vec3 p) {
    float t = uTime;
    vec3 p1 = p - vec3(sin(t)*1.0, cos(t*0.7)*0.5, 0.0);
    vec3 p2 = p - vec3(cos(t*1.3)*0.8, sin(t*0.9)*0.8, sin(t)*0.3);
    vec3 p3 = p - vec3(-cos(t*0.8)*1.2, -sin(t*1.1)*0.4, cos(t*0.6)*0.5);
    float s1 = sdSphere(p1, 0.6);
    float s2 = sdSphere(p2, 0.5);
    float s3 = sdSphere(p3, 0.45);
    return smin(smin(s1, s2, 0.3), s3, 0.3);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 0.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.5));

    float t = 0.0;
    for (int i = 0; i < 80; i++) {
      vec3 p = ro + rd * t;
      float d = map(p);
      if (d < 0.001) break;
      t += d;
      if (t > 20.0) break;
    }

    vec3 col = vec3(0.05, 0.05, 0.08);
    if (t < 20.0) {
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);
      vec3 light = normalize(vec3(1.0, 2.0, 3.0));
      float diff = max(dot(n, light), 0.0);
      float amb = 0.2;
      vec3 baseCol = 0.5 + 0.5 * cos(uTime * 0.3 + n * 2.0 + vec3(0.0, 2.0, 4.0));
      col = baseCol * (amb + diff * 0.8);
      vec3 r = reflect(-light, n);
      col += pow(max(dot(r, -rd), 0.0), 32.0) * 0.5;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`

function RaymarchScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={rmVert}
        fragmentShader={rmFrag}
        uniforms={{ uTime: { value: 0 } }}
        depthTest={false}
      />
    </mesh>
  )
}

function RaymarchingSim() {
  return (
    <Canvas
      style={canvasStyle}
      camera={{ position: [0, 0, 1], fov: 90, near: 0.01, far: 1000 }}
      orthographic={false}
    >
      <color attach="background" args={[BG]} />
      <RaymarchScene />
    </Canvas>
  )
}

// ============================================================================
// 11. METABALLS
// ============================================================================
const metaballsFrag = `
  uniform float uTime;
  varying vec2 vUv;

  float metaball(vec2 p, vec2 c) {
    vec2 d = p - c;
    return 1.0 / (dot(d, d) + 0.001);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= 1.77;
    float t = uTime;

    float sum = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float angle = t * (0.5 + fi * 0.2) + fi * 1.257;
      float r = 0.4 + fi * 0.08;
      vec2 c = vec2(cos(angle)*r, sin(angle*(1.0+fi*0.1))*r*0.8);
      sum += metaball(uv, c);
    }

    float threshold = 8.0;
    float alpha = smoothstep(threshold - 1.0, threshold + 1.0, sum);

    vec3 col = 0.5 + 0.5 * cos(sum * 0.1 + uTime * 0.5 + vec3(0.0, 2.0, 4.0));
    col = mix(vec3(0.05), col, alpha);

    gl_FragColor = vec4(col, 1.0);
  }
`

function MetaballsScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={rmVert}
        fragmentShader={metaballsFrag}
        uniforms={{ uTime: { value: 0 } }}
        depthTest={false}
      />
    </mesh>
  )
}

function MetaballsSim() {
  return (
    <Canvas
      style={canvasStyle}
      camera={{ position: [0, 0, 1], fov: 90, near: 0.01, far: 1000 }}
      orthographic={false}
    >
      <color attach="background" args={[BG]} />
      <MetaballsScene />
    </Canvas>
  )
}

// ============================================================================
// 12. PORTAL
// ============================================================================
function PortalScene() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ pointer }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += (pointer.x * 0.3 - groupRef.current.rotation.y) * 0.05
      groupRef.current.rotation.x += (-pointer.y * 0.2 - groupRef.current.rotation.x) * 0.05
    }
  })
  const layers = [
    { z: 0, scale: 3.0, color: '#7c3aed', opacity: 0.15 },
    { z: -0.5, scale: 2.4, color: '#4f46e5', opacity: 0.2 },
    { z: -1.0, scale: 1.8, color: '#2563eb', opacity: 0.3 },
    { z: -1.5, scale: 1.2, color: '#0891b2', opacity: 0.5 },
    { z: -2.0, scale: 0.6, color: '#0d9488', opacity: 0.8 },
  ]
  return (
    <group ref={groupRef}>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, 0, l.z]} scale={l.scale}>
          <ringGeometry args={[0.3, 0.5, 64]} />
          <meshBasicMaterial color={l.color} transparent opacity={l.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0, -2.5]}>
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

function PortalSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 5], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <Stars radius={100} depth={50} count={5000} factor={4} />
      <PortalScene />
    </Canvas>
  )
}

// ============================================================================
// 13. PRISM
// ============================================================================
function PrismScene() {
  const prismRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (prismRef.current) prismRef.current.rotation.y = clock.getElapsedTime() * 0.3
  })
  const prismGeo = useMemo(() => {
    return new THREE.CylinderGeometry(0.8, 0.8, 2, 3)
  }, [])
  const rainbowColors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#8b00ff']
  return (
    <>
      <mesh ref={prismRef} geometry={prismGeo}>
        <meshPhysicalMaterial
          transmission={0.9}
          roughness={0}
          metalness={0}
          ior={1.5}
          thickness={1}
          color="#ffffff"
        />
      </mesh>
      <mesh position={[-3, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {rainbowColors.map((color, i) => {
        const angle = (i - rainbowColors.length / 2) * 0.08
        return (
          <mesh
            key={i}
            position={[1.5 + Math.sin(angle) * 1.5, Math.sin(angle * (i + 1) * 0.1) * 0.5, 0]}
            rotation-z={Math.PI / 2 - angle}
          >
            <cylinderGeometry args={[0.015, 0.015, 2, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )
      })}
      <ambientLight intensity={0.3} />
      <directionalLight position={[-5, 2, 2]} intensity={2} color="#ffffff" />
      <Environment preset="studio" />
      <OrbitControls autoRotate autoRotateSpeed={0.5} />
    </>
  )
}

function PrismSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 2, 6], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <PrismScene />
    </Canvas>
  )
}

// ============================================================================
// 14. SHOE CONFIGURATOR
// ============================================================================
const colorPalette = ['#1a1a2e', '#f97316', '#e2e8f0', '#94a3b8', '#dc2626', '#2563eb']

function ShoeConfigurator() {
  const [colors, setColors] = useState({
    sole: '#1a1a2e',
    midsole: '#f97316',
    upper: '#e2e8f0',
    heel: '#94a3b8',
  })
  const [selectedPart, setSelectedPart] = useState<string | null>(null)

  const rotatePart = (part: keyof typeof colors) => {
    const currentColorIdx = colorPalette.indexOf(colors[part])
    const nextColorIdx = (currentColorIdx + 1) % colorPalette.length
    setColors(prev => ({ ...prev, [part]: colorPalette[nextColorIdx] }))
    setSelectedPart(part)
  }

  const shoeGroupRef = useRef<THREE.Group>(null)
  const meshRefs = {
    sole: useRef<THREE.Mesh>(null),
    midsole: useRef<THREE.Mesh>(null),
    upper: useRef<THREE.Mesh>(null),
    heel: useRef<THREE.Mesh>(null),
  }

  useFrame(() => {
    if (shoeGroupRef.current) {
      shoeGroupRef.current.rotation.y += 0.005
    }
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas style={canvasStyle} camera={{ position: [0, 0, 3], fov: 50 }}>
        <color attach="background" args={[BG]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <group ref={shoeGroupRef}>
          {/* Sole */}
          <Float speed={1.5}>
            <mesh
              ref={meshRefs.sole}
              position={[0, -0.6, 0]}
              onClick={() => rotatePart('sole')}
            >
              <boxGeometry args={[0.6, 0.15, 1.2]} />
              <meshStandardMaterial color={colors.sole} metalness={0.3} roughness={0.4} />
            </mesh>
          </Float>
          {/* Midsole */}
          <Float speed={1.5}>
            <mesh
              ref={meshRefs.midsole}
              position={[0, -0.45, 0]}
              onClick={() => rotatePart('midsole')}
            >
              <boxGeometry args={[0.55, 0.2, 1.1]} />
              <meshStandardMaterial color={colors.midsole} metalness={0.1} roughness={0.3} />
            </mesh>
          </Float>
          {/* Upper */}
          <Float speed={1.5}>
            <mesh
              ref={meshRefs.upper}
              position={[0, 0.2, 0]}
              onClick={() => rotatePart('upper')}
            >
              <boxGeometry args={[0.5, 0.8, 1.0]} />
              <meshStandardMaterial color={colors.upper} metalness={0} roughness={0.5} />
            </mesh>
          </Float>
          {/* Heel */}
          <Float speed={1.5}>
            <mesh
              ref={meshRefs.heel}
              position={[-0.2, -0.3, 0.5]}
              onClick={() => rotatePart('heel')}
            >
              <boxGeometry args={[0.3, 0.4, 0.3]} />
              <meshStandardMaterial color={colors.heel} metalness={0.2} roughness={0.4} />
            </mesh>
          </Float>
        </group>
        <Environment preset="studio" />
        <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={true} />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: '14px',
          textAlign: 'center',
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
      >
        Click shoe parts to change colors
        {selectedPart && (
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
            {selectedPart}: {colors[selectedPart as keyof typeof colors]}
          </div>
        )}
      </div>
    </div>
  )
}

function ShoeConfiguratorSim() {
  return <ShoeConfigurator />
}

// ============================================================================
// EXPORT
// ============================================================================
export const shadersSimulations: Record<string, React.ComponentType> = {
  'wave-shader': WaveShaderSim,
  'terrain': TerrainSim,
  'terrain-fly': TerrainFlySim,
  'ocean': OceanSim,
  'ocean-sunset': OceanSunsetSim,
  'galaxy': GalaxySim,
  'galaxy-field': GalaxyFieldSim,
  'voxel-city': VoxelCitySim,
  'city-night': CityNightSim,
  'raymarching': RaymarchingSim,
  'metaballs': MetaballsSim,
  'portal': PortalSim,
  'prime-simple': PrismSim,
  'shoe-configurator': ShoeConfiguratorSim,
}
