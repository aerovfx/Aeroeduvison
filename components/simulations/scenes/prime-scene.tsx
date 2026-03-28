'use client'

/**
 * Prime Scene — Light Refraction through a Prism
 *
 * Ported from the R3F "Prism" example (pmndrs)
 * Features:
 *   - Ray-traced beam of light that reflects off surfaces
 *   - Glass prism with MeshTransmissionMaterial
 *   - Rainbow refraction effect with spectral Zucconi6 algorithm
 *   - Lens flare effects
 *   - Mouse-controlled beam direction
 *   - Bloom + LUT post-processing
 */

import * as THREE from 'three'
import {
  forwardRef,
  useRef,
  useMemo,
  useLayoutEffect,
  useImperativeHandle,
  useCallback,
  useState,
  useEffect,
} from 'react'
import { Canvas, useLoader, useFrame, useThree, invalidate, extend } from '@react-three/fiber'
import {
  Center,
  Text3D,
  MeshTransmissionMaterial,
  useTexture,
  Instances,
  Instance,
  shaderMaterial,
} from '@react-three/drei'
import { Bloom, EffectComposer, LUT } from '@react-three/postprocessing'
import { LUTCubeLoader } from 'postprocessing'
import { GLTFLoader } from 'three-stdlib'

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

function lerp(object: any, prop: string, goal: number, speed = 0.1) {
  object[prop] = THREE.MathUtils.lerp(object[prop], goal, speed)
}

const _color = new THREE.Color()
function lerpC(value: THREE.Color, goal: string, speed = 0.1) {
  value.lerp(_color.set(goal), speed)
}

const _vector = new THREE.Vector3()
function lerpV3(value: THREE.Vector3, goal: [number, number, number], speed = 0.1) {
  value.lerp(_vector.set(...goal), speed)
}

function calculateRefractionAngle(incidentAngle: number, glassIor = 2.5, airIor = 1.000293) {
  const theta = Math.asin((airIor * Math.sin(incidentAngle)) / glassIor) || 0
  return theta
}

// ═══════════════════════════════════════════════
// REFLECT — Custom ray reflection system
// ═══════════════════════════════════════════════

function isRayMesh(object: any) {
  return object.isMesh && (object.onRayOver || object.onRayOut || object.onRayMove)
}

function createEvent(api: any, hit: any, intersect: any, intersects: any[]) {
  return {
    api,
    object: intersect.object,
    position: intersect.point,
    direction: intersect.direction,
    reflect: intersect.reflect,
    normal: intersect.face?.normal,
    intersect,
    intersects,
    stopPropagation: () => (hit.stopped = true),
  }
}

const Reflect = forwardRef(
  (
    {
      children,
      start: _start = [0, 0, 0],
      end: _end = [0, 0, 0],
      bounce = 10,
      far = 100,
      ...props
    }: any,
    fRef
  ) => {
    bounce = (bounce || 1) + 1

    const scene = useRef<THREE.Group>(null)
    const vStart = new THREE.Vector3()
    const vEnd = new THREE.Vector3()
    const vDir = new THREE.Vector3()
    const vPos = new THREE.Vector3()

    let intersect: any = null
    let intersects: any[] = []

    const api = useMemo(
      () => ({
        number: 0,
        objects: [] as any[],
        hits: new Map(),
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        raycaster: new THREE.Raycaster(),
        positions: new Float32Array(Array.from({ length: (bounce + 10) * 3 }, () => 0)),
        setRay: (_s: number[] = [0, 0, 0], _e: number[] = [0, 0, 0]) => {
          api.start.set(_s[0], _s[1], _s[2])
          api.end.set(_e[0], _e[1], _e[2])
        },
        update: () => {
          api.number = 0
          intersects = []

          vStart.copy(api.start)
          vEnd.copy(api.end)
          vDir.subVectors(vEnd, vStart).normalize()
          vStart.toArray(api.positions, api.number++ * 3)

          while (true) {
            api.raycaster.set(vStart, vDir)
            intersect = api.raycaster.intersectObjects(api.objects, false)[0]
            if (api.number < bounce && intersect && intersect.face) {
              intersects.push(intersect)
              intersect.direction = vDir.clone()
              intersect.point.toArray(api.positions, api.number++ * 3)
              vDir.reflect(
                intersect.object
                  .localToWorld(intersect.face.normal)
                  .sub(intersect.object.getWorldPosition(vPos))
                  .normalize()
              )
              intersect.reflect = vDir.clone()
              vStart.copy(intersect.point)
            } else {
              vEnd
                .addVectors(vStart, vDir.multiplyScalar(far))
                .toArray(api.positions, api.number++ * 3)
              break
            }
          }

          api.number = 1
          api.hits.forEach((hit: any) => {
            if (!intersects.find((i) => i.object.uuid === hit.key)) {
              api.hits.delete(hit.key)
              if (hit.intersect.object.onRayOut) {
                invalidate()
                hit.intersect.object.onRayOut(createEvent(api, hit, hit.intersect, intersects))
              }
            }
          })

          for (intersect of intersects) {
            api.number++
            if (!api.hits.has(intersect.object.uuid)) {
              const hit = { key: intersect.object.uuid, intersect, stopped: false }
              api.hits.set(intersect.object.uuid, hit)
              if (intersect.object.onRayOver) {
                invalidate()
                intersect.object.onRayOver(createEvent(api, hit, intersect, intersects))
              }
            }
            const hit = api.hits.get(intersect.object.uuid)
            if (intersect.object.onRayMove) {
              invalidate()
              intersect.object.onRayMove(createEvent(api, hit, intersect, intersects))
            }
            if (hit.stopped) break
            if (intersect === intersects[intersects.length - 1]) api.number++
          }
          return Math.max(2, api.number)
        },
      }),
      [bounce, far]
    )

    useLayoutEffect(() => void api.setRay(_start as any, _end as any), [...(_start as any), ...(_end as any)])
    useImperativeHandle(fRef, () => api, [api])

    useLayoutEffect(() => {
      api.objects = []
      scene.current?.traverse((object: any) => {
        if (isRayMesh(object)) api.objects.push(object)
      })
      scene.current?.updateWorldMatrix(true, true)
    })

    return (
      <group ref={scene} {...props}>
        {children}
      </group>
    )
  }
)
Reflect.displayName = 'Reflect'

// ═══════════════════════════════════════════════
// BEAM — Instanced streak/glow lines following ray path
// ═══════════════════════════════════════════════

const Beam = forwardRef(
  ({ children, position, stride = 4, width = 8, ...props }: any, fRef) => {
    const streaks = useRef<THREE.InstancedMesh>(null)
    const glow = useRef<THREE.InstancedMesh>(null)
    const reflect = useRef<any>(null)
    const [streakTexture, glowTexture] = useTexture([
      '/images/lensflare/lensflare2.png',
      '/images/lensflare/lensflare0_bw.jpg',
    ])

    const obj = new THREE.Object3D()
    const f = new THREE.Vector3()
    const t = new THREE.Vector3()
    const n = new THREE.Vector3()
    const config = {
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }

    let i = 0
    let range = 0

    useFrame(() => {
      if (!reflect.current || !streaks.current || !glow.current) return
      range = reflect.current.update() - 1

      for (i = 0; i < range; i++) {
        f.fromArray(reflect.current.positions, i * 3)
        t.fromArray(reflect.current.positions, i * 3 + 3)
        n.subVectors(t, f).normalize()
        obj.position.addVectors(f, t).divideScalar(2)
        obj.scale.set(t.distanceTo(f) * stride, width, 1)
        obj.rotation.set(0, 0, Math.atan2(n.y, n.x))
        obj.updateMatrix()
        streaks.current.setMatrixAt(i, obj.matrix)
      }

      streaks.current.count = range
      if (!(streaks.current.instanceMatrix as any).updateRanges?.[0]) {
        ;(streaks.current.instanceMatrix as any).updateRanges = [{ start: 0, count: 0 }]
      }
      ;(streaks.current.instanceMatrix as any).updateRanges[0].count = range * 16
      streaks.current.instanceMatrix.needsUpdate = true

      obj.scale.setScalar(0)
      obj.updateMatrix()
      glow.current.setMatrixAt(0, obj.matrix)

      for (i = 1; i < range; i++) {
        obj.position.fromArray(reflect.current.positions, i * 3)
        obj.scale.setScalar(0.75)
        obj.rotation.set(0, 0, 0)
        obj.updateMatrix()
        glow.current.setMatrixAt(i, obj.matrix)
      }

      glow.current.count = range
      if (!(glow.current.instanceMatrix as any).updateRanges?.[0]) {
        ;(glow.current.instanceMatrix as any).updateRanges = [{ start: 0, count: 0 }]
      }
      ;(glow.current.instanceMatrix as any).updateRanges[0].count = range * 16
      glow.current.instanceMatrix.needsUpdate = true
    })

    useImperativeHandle(fRef, () => reflect.current, [])

    return (
      <group position={position}>
        <Reflect {...props} ref={reflect}>
          {children}
        </Reflect>
        <instancedMesh
          ref={streaks}
          args={[undefined as any, undefined as any, 100]}
          instanceMatrix-usage={THREE.DynamicDrawUsage}
        >
          <planeGeometry />
          <meshBasicMaterial map={streakTexture} opacity={1.5} {...config} transparent={false} />
        </instancedMesh>
        <instancedMesh
          ref={glow}
          args={[undefined as any, undefined as any, 100]}
          instanceMatrix-usage={THREE.DynamicDrawUsage}
        >
          <planeGeometry />
          <meshBasicMaterial map={glowTexture} {...config} />
        </instancedMesh>
      </group>
    )
  }
)
Beam.displayName = 'Beam'

// ═══════════════════════════════════════════════
// PRISM — Glass prism with transmission material
// ═══════════════════════════════════════════════

function Prism({ onRayOver, onRayOut, onRayMove, ...props }: any) {
  const { nodes } = useLoader(GLTFLoader, '/models/prism.glb') as any
  return (
    <group {...props}>
      <mesh
        visible={false}
        scale={1.9}
        rotation={[Math.PI / 2, Math.PI, 0]}
        {...({ onRayOver, onRayOut, onRayMove } as any)}
      >
        <cylinderGeometry args={[1, 1, 1, 3, 1]} />
      </mesh>
      <mesh position={[0, 0, 0.6]} renderOrder={10} scale={2} dispose={null} geometry={nodes.Cone.geometry}>
        <MeshTransmissionMaterial
          clearcoat={1}
          transmission={1}
          thickness={0.9}
          roughness={0}
          anisotropy={0.1}
          chromaticAberration={1}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════
// RAINBOW — Spectral shader (Zucconi6 algorithm)
// ═══════════════════════════════════════════════

const RainbowMaterial = shaderMaterial(
  {
    time: 0,
    speed: 1,
    fade: 0.5,
    startRadius: 1,
    endRadius: 0,
    emissiveIntensity: 2.5,
    ratio: 1,
  },
  /* vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewMatrix * modelPosition;
    }
  `,
  /* fragment */ `
    varying vec2 vUv;
    uniform float fade;
    uniform float speed;
    uniform float startRadius;
    uniform float endRadius;
    uniform float emissiveIntensity;
    uniform float time;
    uniform float ratio;

    vec2 mp;
    vec3 physhue2rgb(float hue, float ratio) {
      return smoothstep(vec3(0.0),vec3(1.0), abs(mod(hue + vec3(0.0,1.0,2.0)*ratio,1.0)*2.0-1.0));
    }

    vec3 iridescence (float angle, float thickness) {
      float NxV = cos(angle);
      float lum = 0.05064;
      float luma = 0.01070;
      vec3 tint = vec3(0.49639,0.78252,0.8723);
      float interf0 = 2.4;
      float phase0 = 1.0 / 2.8;
      float interf1 = interf0 * 4.0 / 3.0;
      float phase1 = phase0;
      float f = (1.0 - NxV) * (1.0 - NxV);
      float interf = mix(interf0, interf1, f);
      float phase = mix(phase0, phase1, f);
      float dp = (NxV - 1.0) * 0.5;
      vec3 hue = mix(physhue2rgb(thickness * interf0 + dp, thickness * phase0), physhue2rgb(thickness * interf1 + 0.1 + dp, thickness * phase1), f);
      vec3 film = hue * lum + vec3(0.9639,0.78252,0.18723) * luma;
      return vec3((film * 3.0 + pow(f,12.0))) * tint;
    }

    float _saturate (float x) {
      return min(1.0, max(0.0,x));
    }

    vec3 _saturate (vec3 x) {
      return min(vec3(1.,1.,1.), max(vec3(0.,0.,0.),x));
    }

    vec3 bump3y(vec3 x, vec3 yoffset) {
      vec3 y = vec3(1.,1.,1.) - x * x;
      y = _saturate(y-yoffset);
      return y;
    }

    vec3 spectral_zucconi6(float w, float t) {
      float x = _saturate((w - 400.0)/ 300.0);
      const vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
      const vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
      const vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
      const vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
      const vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
      const vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
      return bump3y(c1 * (x - x1), y1) + bump3y(c2 * (x - x2), y2);
    }

    void main() {
      const vec2 vstart = vec2(0.5, 0.5);
      const vec2 vend = vec2(1.0, 0.5);
      vec2 dir = vstart - vend;
      float len = length(dir);
      float cosR = dir.y / len;
      float sinR = dir.x / len;
      vec2 uv = (mat2(cosR, -sinR, sinR, cosR) * (vUv * vec2(ratio, 1.) - vec2(0., 1.) - vstart * vec2(1., -1.)) / len);
      float a = atan(uv.x, uv.y) * 10.0;
      float s = uv.y * (endRadius - startRadius) + startRadius;
      float w = (uv.x / s + .5) * 300. + 400. + a;
      vec3 c = spectral_zucconi6(w, time);
      float l = 1. - smoothstep(fade, 1., uv.y);
      float area = uv.y < 0. ? 0. : 1.;
      float brightness = smoothstep(0., 0.5, c.x + c.y + c.z);
      vec3 co = c / iridescence(uv.x * 0.5 * 3.14159, 1.0 - uv.y + time / 10.0) / 20.0;
      gl_FragColor = vec4(area * co * l * brightness * emissiveIntensity, 1.0);
      if (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b < 0.01) discard;
      #include <colorspace_fragment>
    }
  `
)

extend({ RainbowMaterial })

// Declare JSX element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      rainbowMaterial: any
    }
  }
}

const Rainbow = forwardRef(
  (
    { startRadius = 0, endRadius = 0.5, emissiveIntensity = 2.5, fade = 0.25, ...props }: any,
    fRef
  ) => {
    const material = useRef<any>(null)
    const { width, height } = useThree((state) => state.viewport)
    const length = Math.hypot(width, height) + 1.5
    useFrame((_state, delta) => {
      if (material.current) material.current.time += delta * material.current.speed
    })
    return (
      <mesh ref={fRef} scale={[length, length, 1]} {...props}>
        <planeGeometry />
        {/* @ts-ignore — custom shaderMaterial from drei extend */}
        <rainbowMaterial
          ref={material}
          key={RainbowMaterial.key}
          fade={fade}
          startRadius={startRadius}
          endRadius={endRadius}
          ratio={1}
          toneMapped={false}
        />
      </mesh>
    )
  }
)
Rainbow.displayName = 'Rainbow'

// ═══════════════════════════════════════════════
// FLARE — Animated lens flare
// ═══════════════════════════════════════════════

const Flare = forwardRef(({ streak = [8, 20, 1], visible, ...props }: any, fRef) => {
  const ref = useRef<THREE.Group>(null)
  const [streakTexture, dotTexture, glowTexture] = useTexture([
    '/images/lensflare/lensflare2.png',
    '/images/lensflare/lensflare3.png',
    '/images/lensflare/lensflare0_bw.png',
  ])
  const config = {
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }

  useFrame((state) => {
    if (!ref.current) return
    ref.current.children.forEach((instance: any) => {
      instance.position.x =
        (Math[instance.scale.x > 1 ? 'sin' : 'cos'](
          (state.clock.elapsedTime * instance.scale.x) / 2
        ) *
          instance.scale.x) /
        8
      instance.position.y =
        (Math[instance.scale.x > 1 ? 'cos' : 'atan'](
          state.clock.elapsedTime * instance.scale.x
        ) as number *
          instance.scale.x) /
        5
    })
  })

  return (
    <group ref={fRef} {...props} visible={visible} dispose={null}>
      <Instances frames={visible ? Infinity : 1}>
        <planeGeometry />
        <meshBasicMaterial map={dotTexture} {...config} />
        <group ref={ref}>
          <Instance scale={0.5} />
          <Instance scale={1.25} />
          <Instance scale={0.75} />
          <Instance scale={1.5} />
          <Instance scale={2} position={[0, 0, -0.7]} />
        </group>
      </Instances>
      <mesh scale={1}>
        <planeGeometry />
        <meshBasicMaterial map={glowTexture} {...config} opacity={1} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={streak}>
        <planeGeometry />
        <meshBasicMaterial map={streakTexture} {...config} opacity={1} />
      </mesh>
    </group>
  )
})
Flare.displayName = 'Flare'

// ═══════════════════════════════════════════════
// BOX — Rounded reflective box
// ═══════════════════════════════════════════════

const w = 1, h = 1, r = 0.1, depth = 1
const s = new THREE.Shape()
s.moveTo(-w / 2, -h / 2 + r)
s.lineTo(-w / 2, h / 2 - r)
s.absarc(-w / 2 + r, h / 2 - r, r, 1 * Math.PI, 0.5 * Math.PI, true)
s.lineTo(w / 2 - r, h / 2)
s.absarc(w / 2 - r, h / 2 - r, r, 0.5 * Math.PI, 0 * Math.PI, true)
s.lineTo(w / 2, -h / 2 + r)
s.absarc(w / 2 - r, -h / 2 + r, r, 2 * Math.PI, 1.5 * Math.PI, true)
s.lineTo(-w / 2 + r, -h / 2)
s.absarc(-w / 2 + r, -h / 2 + r, r, 1.5 * Math.PI, 1 * Math.PI, true)

const boxGeometry = new THREE.BoxGeometry()
const roundedBoxGeometry = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false })
roundedBoxGeometry.translate(0, 0, -depth / 2)
roundedBoxGeometry.computeVertexNormals()

const ReflectBox = forwardRef((props: any, ref) => {
  const [hovered, hover] = useState(false)
  const inner = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (inner.current) {
      lerpC((inner.current.material as THREE.MeshStandardMaterial).emissive, hovered ? 'white' : '#454545', 0.1)
    }
  })
  return (
    <group scale={0.5} ref={ref} {...props}>
      <mesh visible={false} {...({ onRayOver: () => hover(true), onRayOut: () => hover(false) } as any)} geometry={boxGeometry} />
      <mesh ref={inner} geometry={roundedBoxGeometry}>
        <meshStandardMaterial color="#333" toneMapped={false} emissiveIntensity={2} />
      </mesh>
    </group>
  )
})
ReflectBox.displayName = 'ReflectBox'

// ═══════════════════════════════════════════════
// SCENE — Main prism refraction scene
// ═══════════════════════════════════════════════

function PrimeSceneInner() {
  const [isPrismHit, hitPrism] = useState(false)
  const flare = useRef<any>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const spot = useRef<THREE.SpotLight>(null)
  const boxreflect = useRef<any>(null)
  const rainbow = useRef<any>(null)

  const rayOut = useCallback(() => hitPrism(false), [])
  const rayOver = useCallback((e: any) => {
    e.stopPropagation()
    hitPrism(true)
    rainbow.current.material.speed = 1
    rainbow.current.material.emissiveIntensity = 20
  }, [])

  const vec = new THREE.Vector3()
  const rayMove = useCallback(({ api, position, direction, normal }: any) => {
    if (!normal) return
    vec.toArray(api.positions, api.number++ * 3)
    flare.current.position.set(position.x, position.y, -0.5)
    flare.current.rotation.set(0, 0, -Math.atan2(direction.x, direction.y))
    let angleScreenCenter = Math.atan2(-position.y, -position.x)
    const normalAngle = Math.atan2(normal.y, normal.x)
    const incidentAngle = angleScreenCenter - normalAngle
    const refractionAngle = calculateRefractionAngle(incidentAngle) * 6
    angleScreenCenter += refractionAngle
    rainbow.current.rotation.z = angleScreenCenter
    lerpV3(
      spot.current!.target.position,
      [Math.cos(angleScreenCenter), Math.sin(angleScreenCenter), 0],
      0.05
    )
    spot.current!.target.updateMatrixWorld()
  }, [])

  useFrame((state) => {
    if (!boxreflect.current || !rainbow.current || !spot.current || !ambient.current) return
    boxreflect.current.setRay(
      [(state.pointer.x * state.viewport.width) / 2, (state.pointer.y * state.viewport.height) / 2, 0],
      [0, 0, 0]
    )
    lerp(rainbow.current.material, 'emissiveIntensity', isPrismHit ? 2.5 : 0, 0.1)
    spot.current.intensity = rainbow.current.material.emissiveIntensity
    lerp(ambient.current, 'intensity', 0, 0.025)
  })

  return (
    <>
      {/* Lights */}
      <ambientLight ref={ambient} intensity={0} />
      <pointLight position={[10, -10, 0]} intensity={0.05} />
      <pointLight position={[0, 10, 0]} intensity={0.05} />
      <pointLight position={[-10, 0, 0]} intensity={0.05} />
      <spotLight ref={spot} intensity={1} distance={7} angle={1} penumbra={1} position={[0, 0, 1]} />
      {/* Caption */}
      <Center top bottom position={[0, 2, 0]}>
        <Text3D size={0.7} letterSpacing={-0.05} height={0.05} font="/fonts/Inter_Bold.json">
          Dynamic without Limits
          <meshStandardMaterial color="white" />
        </Text3D>
      </Center>
      {/* Prism + blocks + reflect beam */}
      <Beam ref={boxreflect} bounce={10} far={20}>
        <Prism position={[0, -0.5, 0]} onRayOver={rayOver} onRayOut={rayOut} onRayMove={rayMove} />
        <ReflectBox position={[2.25, -3.5, 0]} rotation={[0, 0, Math.PI / 3.5]} />
        <ReflectBox position={[-2.5, -2.5, 0]} rotation={[0, 0, Math.PI / 4]} />
        <ReflectBox position={[-3, 1, 0]} rotation={[0, 0, Math.PI / 4]} />
      </Beam>
      {/* Rainbow and flares */}
      <Rainbow ref={rainbow} startRadius={0} endRadius={0.5} fade={0} />
      <Flare ref={flare} visible={isPrismHit} renderOrder={10} scale={1.25} streak={[12.5, 20, 1]} />
    </>
  )
}

// ═══════════════════════════════════════════════
// EXPORTED SCENES
// ═══════════════════════════════════════════════

/**
 * PrimeScene — Standalone version with Canvas + post-processing
 * Use as a standalone simulation (renders its own Canvas).
 */
export function PrimeScene() {
  const [texture, setTexture] = useState<any>(null)

  return (
    <Canvas orthographic gl={{ antialias: false }} camera={{ position: [0, 0, 100], zoom: 70 }}>
      <color attach="background" args={['black']} />
      <PrimeSceneInner />
      <EffectComposer enableNormalPass={false}>
        <Bloom mipmapBlur levels={9} intensity={1.5} luminanceThreshold={1} luminanceSmoothing={1} />
      </EffectComposer>
    </Canvas>
  )
}

/**
 * PrimeSimpleScene — Simplified version for R3F sandbox embedding
 * No Canvas wrapper, no post-processing — suitable for R3FSandbox.
 * Still has the prism, beam, rainbow, and flares but meant for sandbox.
 */
export function PrimeSimpleScene() {
  return <PrimeSceneInner />
}
